"use client";

import { createContext, useCallback, useEffect, useMemo, useState } from "react";
import { authService, type AuthSession } from "@/services/auth.service";

type LoginInput = {
  email: string;
  senha: string;
  persist?: boolean;
};

type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthSession>;
  setAuthenticatedSession: (nextSession: AuthSession, persist?: boolean) => void;
  logout: () => Promise<void>;
  refreshSession: () => Promise<AuthSession | null>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function hydrateSession() {
      const storedSession = authService.getStoredSession();

      if (!storedSession) {
        if (active) setIsLoading(false);
        return;
      }

      if (active) setSession(storedSession);

      try {
        const freshContext = await authService.me(storedSession.access_token);
        const nextSession = {
          ...storedSession,
          ...freshContext
        };

        authService.saveSession(nextSession);
        if (active) setSession(nextSession);
      } catch {
        if (!storedSession.refresh_token) {
          authService.clearSession();
          if (active) setSession(null);
          return;
        }

        try {
          const refreshedSession = await authService.refreshToken(storedSession.refresh_token);
          if (active) setSession(refreshedSession);
        } catch {
          authService.clearSession();
          if (active) setSession(null);
        }
      } finally {
        if (active) setIsLoading(false);
      }
    }

    hydrateSession();

    return () => {
      active = false;
    };
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const nextSession = await authService.login(input);
    setSession(nextSession);
    return nextSession;
  }, []);

  const setAuthenticatedSession = useCallback((nextSession: AuthSession, persist = true) => {
    if (persist) {
      authService.saveSession(nextSession);
    }

    setSession(nextSession);
  }, []);

  const logout = useCallback(async () => {
    await authService.logout(session?.access_token);
    setSession(null);
  }, [session?.access_token]);

  const refreshSession = useCallback(async () => {
    if (!session?.refresh_token) {
      return null;
    }

    const nextSession = await authService.refreshToken(session.refresh_token);
    setSession(nextSession);
    return nextSession;
  }, [session?.refresh_token]);

  const value = useMemo<AuthContextValue>(
    () => ({
      session,
      isAuthenticated: Boolean(session?.access_token),
      isLoading,
      login,
      setAuthenticatedSession,
      logout,
      refreshSession
    }),
    [session, isLoading, login, setAuthenticatedSession, logout, refreshSession]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
