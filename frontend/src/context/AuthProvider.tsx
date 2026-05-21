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
    setSession(authService.getStoredSession());
    setIsLoading(false);
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
