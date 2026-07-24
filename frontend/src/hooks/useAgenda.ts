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
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function getSessionRole(session: ReturnType<typeof useAuth>["session"]) {
  return session?.active_membership?.role || session?.tipo_usuario || session?.usuario?.tipo_usuario;
}

function isPersonalAgendaSession(session: ReturnType<typeof useAuth>["session"]) {
  return ["Funcionario", "Terceiro", "Profissional"].includes(getSessionRole(session) || "");
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
  const shouldUsePersonalAgenda = isPersonalAgendaSession(session);

  const selectedProfessional = useMemo(
    () => meta.profissionais.find((item) => item.id === selectedProfessionalId) || null,
    [meta.profissionais, selectedProfessionalId]
  );
  const availableServices = useMemo(() => {
    if (!selectedProfessional) return meta.servicos;
    const serviceIds = new Set(selectedProfessional.servico_ids || []);
    return meta.servicos.filter((service) => serviceIds.has(service.id));
  }, [meta.servicos, selectedProfessional]);
  const availabilityService = useMemo(
    () => availableServices.find((item) => item.id === selectedServiceId) || null,
    [availableServices, selectedServiceId]
  );
  const selectedService = useMemo(
    () => meta.servicos.find((item) => item.id === selectedServiceId) || null,
    [meta.servicos, selectedServiceId]
  );

  const loadMeta = useCallback(async () => {
    if (!session) return;
    const nextMeta = await agendaService.getMeta(session);

    console.log("[agenda-list-debug] frontend meta", {
      professionals_count: nextMeta.profissionais.length,
      services_count: nextMeta.servicos.length,
      professional_ids: nextMeta.profissionais.map((professional) => professional.id),
      service_ids: nextMeta.servicos.map((service) => service.id)
    });

    setMeta(nextMeta);
    setSelectedProfessionalId((current) => (
      nextMeta.profissionais.some((professional) => professional.id === current)
        ? current
        : shouldUsePersonalAgenda
          ? nextMeta.profissionais[0]?.id || ""
          : ""
    ));
    setSelectedServiceId((current) => (nextMeta.servicos.some((service) => service.id === current) ? current : ""));
  }, [session, shouldUsePersonalAgenda]);

  const loadAppointments = useCallback(async () => {
    if (!session) return;
    const tenantId = session.tenant?.id || session.active_membership?.tenant_id || session.tenant_id || null;
    const params = {
      data: date,
      profissional_id: selectedProfessionalId || undefined,
      servico_id: selectedServiceId || undefined
    };

    console.log("[agenda-list-debug] frontend request", {
      tenant_id: tenantId,
      selected_date: date,
      params
    });

    const data = await agendaService.list(session, params);

    console.log("[agenda-list-debug] frontend response", {
      tenant_id: tenantId,
      selected_date: date,
      count: data.length,
      statuses: data.map((appointment) => appointment.status),
      appointment_ids: data.map((appointment) => appointment.id)
    });

    setAppointments(data);
  }, [date, selectedProfessionalId, selectedServiceId, session]);

  const loadAvailability = useCallback(async () => {
    if (!session || !selectedProfessionalId || !selectedServiceId || !availabilityService) {
      setAvailability(null);
      return;
    }

    const data = await agendaService.getAvailability(session, {
      data: date,
      profissional_id: selectedProfessionalId,
      servico_id: selectedServiceId
    });
    setAvailability(data);
  }, [availabilityService, date, selectedProfessionalId, selectedServiceId, session]);

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
    if (isAuthLoading || !isAuthenticated || !session || isLoading) return;

    loadAppointments().catch((err) => {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar a agenda.");
    });
  }, [
    date,
    isAuthLoading,
    isAuthenticated,
    isLoading,
    loadAppointments,
    selectedProfessionalId,
    selectedServiceId,
    session
  ]);

  useEffect(() => {
    loadAvailability().catch((err) => {
      setError(err instanceof Error ? err.message : "Nao foi possivel carregar horarios.");
    });
  }, [loadAvailability]);

  useEffect(() => {
    setSelectedServiceId((current) => (
      meta.servicos.some((service) => service.id === current)
        ? current
        : ""
    ));
  }, [meta.servicos]);

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

  async function completeAppointment(
    id: string,
    motivo?: string,
    options: { confirmarConclusaoAntecipada?: boolean } = {}
  ) {
    if (!session) return;
    setIsSaving(true);
    try {
      await agendaService.complete(session, id, motivo, options);
      await loadAppointments();
      await loadAvailability();
      await loadIntelligence();
    } finally {
      setIsSaving(false);
    }
  }

  async function noShowAppointment(id: string, motivo?: string) {
    if (!session) return;
    setIsSaving(true);
    try {
      await agendaService.noShow(session, id, motivo);
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
    meta: {
      ...meta,
      servicos: meta.servicos
    },
    appointments,
    availability,
    analytics,
    signals,
    smartSuggestions: availability?.smart_suggestions || availability?.slots?.slice(0, 3) || [],
    isPersonalAgenda: shouldUsePersonalAgenda,
    isLoading: isLoading || isAuthLoading,
    isSaving,
    isRefreshingIntelligence,
    error,
    refresh,
    createAppointment,
    confirmAppointment,
    cancelAppointment,
    completeAppointment,
    noShowAppointment
  };
}
