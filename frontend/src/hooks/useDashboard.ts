"use client";

import { useCallback, useEffect, useState } from "react";
import { dashboardService, type DashboardSnapshot } from "@/services/dashboard.service";
import { useAuth } from "@/hooks/useAuth";

export function useDashboard() {
  const { session, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [snapshot, setSnapshot] = useState<DashboardSnapshot | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState("");

  const refresh = useCallback(async () => {
    if (!session) {
      return;
    }

    setIsLoading(true);
    setError("");

    try {
      const nextSnapshot = await dashboardService.getSnapshot(session);
      setSnapshot(nextSnapshot);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar o dashboard.");
    } finally {
      setIsLoading(false);
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

    refresh();
  }, [isAuthLoading, isAuthenticated, refresh, session]);

  return {
    snapshot,
    isLoading: isLoading || isAuthLoading,
    error,
    refresh
  };
}
