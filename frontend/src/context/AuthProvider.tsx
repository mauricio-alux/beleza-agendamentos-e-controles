"use client";

import { createContext, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { authService, AuthRequestError, validateSession, type AuthSession } from "@/services/auth.service";

type LoginInput = { email: string; senha: string; persist?: boolean };
export type SessionValidation = { session: AuthSession | null; hadSession: boolean };
type AuthContextValue = {
  session: AuthSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (input: LoginInput) => Promise<AuthSession>;
  setAuthenticatedSession: (session: AuthSession, persist?: boolean) => void;
  logout: () => Promise<void>;
  refreshSession: (rejected?: AuthSession) => Promise<AuthSession | null>;
  invalidateSession: (expected: AuthSession) => void;
  revalidateSession: () => Promise<SessionValidation>;
};

export const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const current = useRef<AuthSession | null>(null);
  const revision = useRef(0);
  const pending = useRef<Promise<SessionValidation> | null>(null);
  const refreshPending = useRef<Promise<AuthSession | null> | null>(null);
  const hadInvalidSession = useRef(false);

  const revalidateSession = useCallback(() => {
    if (refreshPending.current) return refreshPending.current.then(session => ({ session, hadSession: true }));
    if (pending.current) return pending.current;
    const generation = revision.current;
    // Only entry without an accepted session blocks the application shell.
    // Background revalidation has local pending state in its consumer.
    if (!current.current) setIsLoading(true);
    const candidate = current.current || authService.getStoredSession();
    const hadSession = Boolean(candidate) || hadInvalidSession.current;
    const operation = validateSession(candidate).then((validated) => {
      if (generation !== revision.current) throw new Error("A sess?o mudou. Tente novamente.");
      if (!validated && candidate) authService.clearSession();
      current.current = validated;
      hadInvalidSession.current = hadSession && !validated;
      if (validated && authService.getStoredSession()) authService.saveSession(validated);
      setSession(validated);
      return { session: validated, hadSession };
    }).finally(() => {
      if (pending.current === operation) pending.current = null;
      setIsLoading(false);
    });
    pending.current = operation;
    return operation;
  }, []);

  useEffect(() => {
    // Recoverable failures leave stored credentials intact; /app offers retry.
    void revalidateSession().catch(() => undefined);
  }, [revalidateSession]);

  const setAuthenticatedSession = useCallback((next: AuthSession, persist = true) => {
    revision.current++;
    refreshPending.current = null;
    pending.current = null;
    hadInvalidSession.current = false;
    current.current = next;
    if (persist) authService.saveSession(next);
    setSession(next);
  }, []);

  const login = useCallback(async (input: LoginInput) => {
    const next = await authService.login(input);
    setAuthenticatedSession(next, false);
    return next;
  }, [setAuthenticatedSession]);

  const logout = useCallback(async () => {
    revision.current++;
    refreshPending.current = null;
    pending.current = null;
    hadInvalidSession.current = false;
    const token = current.current?.access_token;
    current.current = null;
    setSession(null);
    await authService.logout(token);
  }, []);

  const invalidateSession = useCallback((expected: AuthSession) => {
    if (current.current !== expected) return;
    revision.current++;
    pending.current = null;
    refreshPending.current = null;
    hadInvalidSession.current = true;
    current.current = null;
    authService.clearSession();
    setSession(null);
  }, []);

  const refreshSession = useCallback((rejected?: AuthSession): Promise<AuthSession | null> => {
    const candidate = current.current;
    if (!candidate) return Promise.resolve(null);
    // A late 401 must not rotate an already replaced session again.
    if (rejected && rejected !== candidate) return Promise.resolve(candidate);
    if (refreshPending.current) return refreshPending.current;
    if (pending.current) return pending.current.then(result => result.session);
    if (!candidate.refresh_token) {
      invalidateSession(candidate);
      return Promise.resolve(null);
    }
    const generation = revision.current;
    const persist = authService.getStoredSession()?.access_token === candidate.access_token;
    const operation = authService.refreshToken(candidate.refresh_token, false).then(next => {
      if (generation !== revision.current || current.current !== candidate) return null;
      // Do not move an in-flight operation into another account or tenant.
      if (next.usuario.id !== candidate.usuario.id || next.tenant?.id !== candidate.tenant?.id) {
        invalidateSession(candidate);
        return null;
      }
      current.current = next;
      if (persist) authService.saveSession(next);
      setSession(next);
      return next;
    }).catch(error => {
      if (generation === revision.current && error instanceof AuthRequestError && [400, 401, 403].includes(error.status)) {
        invalidateSession(candidate);
      }
      throw error;
    }).finally(() => {
      if (refreshPending.current === operation) refreshPending.current = null;
    });
    refreshPending.current = operation;
    return operation;
  }, [invalidateSession]);

  const value = useMemo(() => ({
    session, isAuthenticated: Boolean(session?.access_token), isLoading,
    login, setAuthenticatedSession, logout, refreshSession, revalidateSession, invalidateSession
  }), [session, isLoading, login, setAuthenticatedSession, logout, refreshSession, revalidateSession, invalidateSession]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
