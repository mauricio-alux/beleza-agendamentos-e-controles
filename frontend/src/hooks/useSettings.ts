"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  SettingsApiError,
  settingsService,
  type SettingsOperation,
  type SettingsProfile,
  type SettingsSummary,
  type SettingsTenant
} from "@/services/settings.service";
import { useAuth } from "@/hooks/useAuth";

export function useSettings() {
  const { session, isAuthenticated, isLoading: isAuthLoading, logout, refreshSession, setAuthenticatedSession } = useAuth();
  const abortRef = useRef<AbortController | null>(null);
  const [summary, setSummary] = useState<SettingsSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  const refresh = useCallback(async () => {
    if (!session) return;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    setIsLoading(true);
    setError("");

    try {
      let nextSummary: SettingsSummary;

      try {
        nextSummary = await settingsService.getSummary(session, controller.signal);
      } catch (err) {
        if (!(err instanceof SettingsApiError) || !err.isAuthError) {
          throw err;
        }

        const refreshedSession = await refreshSession();
        if (!refreshedSession) {
          await logout();
          throw new Error("Sua sessao expirou. Entre novamente para continuar.");
        }

        nextSummary = await settingsService.getSummary(refreshedSession, controller.signal);
      }

      setSummary(nextSummary);
    } catch (err) {
      if (!controller.signal.aborted) {
        setError(err instanceof Error ? err.message : "Nao foi possivel carregar as configuracoes.");
      }
    } finally {
      if (!controller.signal.aborted) {
        setIsLoading(false);
      }
    }
  }, [logout, refreshSession, session]);

  useEffect(() => {
    if (isAuthLoading) return;

    if (!isAuthenticated || !session) {
      setIsLoading(false);
      return;
    }

    refresh();

    return () => {
      abortRef.current?.abort();
    };
  }, [isAuthLoading, isAuthenticated, refresh, session]);

  const saveProfile = useCallback(async (payload: Partial<SettingsProfile>) => {
    if (!session) return null;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const profile = await settingsService.updateProfile(session, payload);
      setSummary((current) => (current ? { ...current, profile } : current));
      setAuthenticatedSession({
        ...session,
        usuario: {
          ...session.usuario,
          nome: profile.nome,
          telefone: profile.telefone,
          foto_url: profile.foto_url
        }
      });
      setSuccessMessage("Perfil atualizado.");
      return profile;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o perfil.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [session, setAuthenticatedSession]);

  const saveTenant = useCallback(async (payload: Partial<SettingsTenant>) => {
    if (!session) return null;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const tenant = await settingsService.updateTenant(session, payload);
      setSummary((current) => (current ? { ...current, tenant } : current));
      setAuthenticatedSession({
        ...session,
        tenant: {
          ...(session.tenant || {}),
          id: tenant.id,
          nome_fantasia: tenant.nome_fantasia,
          slug: tenant.slug,
          status: tenant.status,
          timezone: tenant.timezone
        }
      });
      setSuccessMessage("Dados do salao atualizados.");
      return tenant;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar o salao.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [session, setAuthenticatedSession]);

  const saveOperation = useCallback(async (payload: Partial<SettingsOperation>) => {
    if (!session) return null;

    setIsSaving(true);
    setError("");
    setSuccessMessage("");

    try {
      const operation = await settingsService.updateOperation(session, payload);
      setSummary((current) => (current ? { ...current, operation } : current));
      setSuccessMessage("Configuracoes operacionais atualizadas.");
      return operation;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel salvar a operacao.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }, [session]);

  return {
    summary,
    isLoading: isLoading || isAuthLoading,
    isSaving,
    error,
    successMessage,
    refresh,
    saveProfile,
    saveTenant,
    saveOperation
  };
}
