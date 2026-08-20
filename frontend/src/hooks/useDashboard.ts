"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { dashboardService, type DashboardSnapshot } from "@/services/dashboard.service";
import { useAuth } from "@/hooks/useAuth";

const DEFAULT_POLLING_INTERVAL = 60000;

export function useDashboard() {
  const { session, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const abortRef = useRef<AbortController | null>(null);
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState("");
  const [lastUpdatedAt, setLastUpdatedAt] = useState<Date | null>(null);

  const refresh = useCallback(async (mode: "initial" | "poll" | "manual" = "manual") => {
    if (!session) {
      return;
    }

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
      const nextSnapshot = await dashboardService.getSnapshot(session, controller.signal);
      setSnapshot(nextSnapshot);
      setLastUpdatedAt(new Date());
    } catch (err) {
      if (controller.signal.aborted) {
        return;
      }

      setError(err instanceof Error ? err.message : "Não foi possível carregar o dashboard.");
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
        setIsRefreshing(false);
      }
    }
  }, [session]);

  useEffect(() => {
    if (isAuthLoading) {
      return;
    }

    if (!isAuthenticated || !session) {
      setIsLoading(false);
      return;
    }

    refresh("initial");

    return () => {
      abortRef.current?.abort();
    };
  }, [isAuthLoading, isAuthenticated, refresh, session]);

  useEffect(() => {
    if (!session || !isAuthenticated) {
      return;
    }

    const interval = snapshot?.realtime?.intervalMs || DEFAULT_POLLING_INTERVAL;
    const timer = window.setInterval(() => refresh("poll"), interval);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, refresh, session, snapshot?.realtime?.intervalMs]);

  return {
    snapshot,
    isLoading: isLoading || isAuthLoading,
    isRefreshing,
    error,
    lastUpdatedAt,
    refresh: () => refresh("manual")
  };
}
