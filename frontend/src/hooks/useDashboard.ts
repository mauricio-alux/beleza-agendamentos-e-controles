"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardService, DashboardRequestError, type DashboardSnapshot } from "@/services/dashboard.service";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_POLLING_INTERVAL = 60000;

export function useDashboard() {
  const auth = useAuth();
  const { session, isAuthenticated, isLoading: isAuthLoading } = auth;
  const authRef = useRef(auth);
  authRef.current = auth;
  const running = useRef(false);
  const scope = session ? `${session.usuario.id}:${session.tenant?.id || ""}` : null;
  const abortRef = useRef<AbortController | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async (mode: "initial" | "poll" | "manual" = "manual") => {
    const { session, refreshSession, invalidateSession } = authRef.current;
    if (!session || running.current) {
      return;
    }
    running.current = true;
    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;

    if (mode === "initial") {
      setIsLoading(true);
    } else {
      setIsRefreshing(true);
    }

    setError("");

    try {
      let nextSnapshot: DashboardSnapshot;
      try {
        nextSnapshot = await dashboardService.getSnapshot(session, controller.signal);
      } catch (err) {
        if (controller.signal.aborted || !(err instanceof DashboardRequestError) || err.status !== 401) throw err;
        const renewed = await refreshSession(session);
        if (controller.signal.aborted) return;
        if (!renewed) throw new Error("Sua sessão expirou. Faça login novamente.");
        if (renewed.usuario.id !== session.usuario.id || renewed.tenant?.id !== session.tenant?.id) return;
        try {
          nextSnapshot = await dashboardService.getSnapshot(renewed, controller.signal);
        } catch (retryError) {
          if (!controller.signal.aborted && retryError instanceof DashboardRequestError && retryError.status === 401) {
            invalidateSession(renewed);
          }
          throw retryError;
        }
      }
      if (controller.signal.aborted) return;
      setSnapshot(nextSnapshot);
      setLastUpdatedAt(new Date());
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }

      setError(err instanceof Error ? err.message : "Não foi possível carregar o dashboard.");
    } finally {
      if (abortRef.current === controller) running.current = false;
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, []);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated || !session) {
      setSnapshot(null);
      setIsLoading(false);
      return;
    }

    setSnapshot(null);
    refresh("initial");

    return () => {
      abortRef.current?.abort();
      running.current = false;
    };
  }, [isAuthLoading, isAuthenticated, refresh, scope]);

  useEffect(() => {
    if (!session || !isAuthenticated) {
      return;
    }

    const interval = snapshot?.realtime?.intervalMs || DEFAULT_POLLING_INTERVAL;
    const timer = window.setInterval(() => refresh("poll"), interval);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, refresh, scope, snapshot?.realtime?.intervalMs]);

  return {
    snapshot,
    isLoading: isLoading || isAuthLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh: () => refresh("manual")
  };
}
