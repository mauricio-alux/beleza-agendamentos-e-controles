"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  agendaService,
  type AgendaAnalytics,
  type AgendaMeta,
  type AgendaSignals,
  type Appointment,
  type AvailabilityResponse
} from "@/services/agenda.service";
import { useAuth } from "@/hooks/useAuth";

function toDateInput(date: Date) {
  return date.toISOString().slice(0, 10);
}

function dayRange(date: string) {
  return {
    data_inicio: new Date(`${date}T00:00:00`).toISOString(),
    data_fim: new Date(`${date}T23:59:59`).toISOString()
  };
}

export function useAgenda() {
  const { session, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const [date, setDate] = useState(toDateInput(new Date()));
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [meta, setMeta] = useState<AgendaMeta>({ profissionais: [], servicos: [] });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [analytics, setAnalytics] = useState<AgendaAnalytics | null>(null);
  const [signals, setSignals] = useState<AgendaSignals | null>(null);
  const [isRefreshingIntelligence, setIsRefreshingIntelligence] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  const selectedProfessional = useMemo(
    () => meta.profissionais.find((item) => item.id === selectedProfessionalId) || null,
    [meta.profissionais, selectedProfessionalId]
  );
  const selectedService = useMemo(
    () => meta.servicos.find((item) => item.id === selectedServiceId) || null,
    [meta.servicos, selectedServiceId]
  );

  const loadMeta = useCallback(async () => {
    if (!session) return;
    const nextMeta = await agendaService.getMeta(session);
    setMeta(nextMeta);
    setSelectedProfessionalId((current) => current || nextMeta.profissionais[0]?.id || "");
    setSelectedServiceId((current) => current || nextMeta.servicos[0]?.id || "");
  }, [session]);

  const loadAppointments = useCallback(async () => {
    if (!session) return;
    const range = dayRange(date);
    const data = await agendaService.list(session, {
      ...range,
      profissional_id: selectedProfessionalId || undefined
    });
    setAppointments(data);
  }, [date, selectedProfessionalId, session]);

  const loadAvailability = useCallback(async () => {
    if (!session || !selectedProfessionalId || !selectedServiceId) {
      setAvailability(null);
      return;
    }

    const data = await agendaService.getAvailability(session, {
      data: date,
      profissional_id: selectedProfessionalId,
      servico_id: selectedServiceId
    });
    setAvailability(data);
  }, [date, selectedProfessionalId, selectedServiceId, session]);

  const loadIntelligence = useCallback(async () => {
    if (!session || !selectedProfessionalId) {
      setAnalytics(null);
      setSignals(null);
      return;
    }

    setIsRefreshingIntelligence(true);

    try {
      const params = {
        data: date,
        profissional_id: selectedProfessionalId,
        servico_id: selectedServiceId || undefined
      };
      const [nextAnalytics, nextSignals] = await Promise.all([
        agendaService.getAnalytics(session, params),
        agendaService.getSignals(session, params)
      ]);
      setAnalytics(nextAnalytics);
      setSignals(nextSignals);
    } finally {
      setIsRefreshingIntelligence(false);
    }
  }, [date, selectedProfessionalId, selectedServiceId, session]);

  const refresh = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError("");
    try {
      await loadMeta();
      await loadAppointments();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar a agenda.");
    } finally {
      setIsLoading(false);
    }
  }, [loadAppointments, loadMeta, session]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated) return;
    refresh();
  }, [isAuthLoading, isAuthenticated, refresh]);

  useEffect(() => {
    loadAvailability().catch((err) => {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar horarios.");
    });
  }, [loadAvailability]);

  useEffect(() => {
    loadIntelligence().catch(() => null);
  }, [loadIntelligence]);

  useEffect(() => {
    if (!session || !isAuthenticated) return;
    const timer = window.setInterval(() => {
      Promise.all([loadAppointments(), loadAvailability(), loadIntelligence()]).catch(() => null);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, loadAppointments, loadAvailability, loadIntelligence, session]);

  async function createAppointment(payload: {
    data_inicio: string;
    cliente: {
      nome: string;
      telefone: string;
      email?: string;
      endereco?: {
        cep?: string;
        uf?: string;
        cidade?: string;
        logradouro?: string;
        numero?: string;
      };
    };
    observacoes?: string;
    client_context?: {
      client_token?: string;
      device_hash?: string;
      user_agent?: string;
      timezone?: string;
      locale?: string;
    };
  }) {
    if (!session || !selectedProfessionalId || !selectedServiceId) return null;
    setIsSaving(true);
    setError("");
    try {
      const appointment = await agendaService.create(session, {
        profissional_id: selectedProfessionalId,
        servico_id: selectedServiceId,
        ...payload
      });
      await Promise.all([loadAppointments(), loadAvailability()]);
      return appointment;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Nao foi possivel criar o agendamento.");
      return null;
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmAppointment(id: string) {
    if (!session) return;
    setIsSaving(true);
    try {
      await agendaService.confirm(session, id);
      await Promise.all([loadAppointments(), loadIntelligence()]);
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelAppointment(id: string, motivo?: string) {
    if (!session) return;
    setIsSaving(true);
    try {
      await agendaService.cancel(session, id, motivo);
      await loadAppointments();
      await loadAvailability();
      await loadIntelligence();
    } finally {
      setIsSaving(false);
    }
  }

  return {
    date,
    setDate,
    selectedProfessionalId,
    setSelectedProfessionalId,
    selectedServiceId,
    setSelectedServiceId,
    selectedProfessional,
    selectedService,
    meta,
    appointments,
    availability,
    analytics,
    signals,
    smartSuggestions: availability?.smart_suggestions || availability?.slots?.slice(0, 3) || [],
    isLoading: isLoading || isAuthLoading,
    isSaving,
    isRefreshingIntelligence,
    error,
    refresh,
    createAppointment,
    confirmAppointment,
    cancelAppointment
  };
}
