"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  agendaService,
  type AgendaAnalytics,
  type AgendaMeta,
  type AgendaSignals,
  type Appointment,
  type AvailabilityResponse
} from "@/services/agenda.service";
import { useAuth } from "@/hooks/useAuth";
import { isPastDateInput, toDateInput } from "@/components/agenda/date";

const APPOINTMENT_STATUSES_WITHOUT_CANCELED = [
  "solicitado",
  "pendente",
  "pendente_atendente",
  "pendente_cliente",
  "confirmado",
  "concluido",
  "no_show",
  "no-show",
  "reagendado",
  "expirado_atendente",
  "expirado_cliente",
  "suspeito"
];

type AgendaFilterState = {
  date: string;
  selectedProfessionalId: string;
  selectedServiceId: string;
  selectedSpecialtyId: string;
  showCanceledAppointments: boolean;
};

type UseAgendaOptions = {
  manualSearch?: boolean;
  initialDate?: string | null;
  initialProfessionalId?: string | null;
  preventPastAvailability?: boolean;
  loadInsightsInManualSearch?: boolean;
};

function buildInitialFilters(options: Pick<UseAgendaOptions, "initialDate" | "initialProfessionalId"> = {}): AgendaFilterState {
  return {
    date: options.initialDate || toDateInput(new Date()),
    selectedProfessionalId: options.initialProfessionalId || "",
    selectedServiceId: "",
    selectedSpecialtyId: "",
    showCanceledAppointments: false
  };
}

function areFiltersEqual(left: AgendaFilterState, right: AgendaFilterState) {
  return (
    left.date === right.date
    && left.selectedProfessionalId === right.selectedProfessionalId
    && left.selectedServiceId === right.selectedServiceId
    && left.selectedSpecialtyId === right.selectedSpecialtyId
    && left.showCanceledAppointments === right.showCanceledAppointments
  );
}

function getSessionRole(session: ReturnType<typeof useAuth>["session"]) {
  return session?.active_membership?.role || session?.tipo_usuario || session?.usuario?.tipo_usuario;
}

function isPersonalAgendaSession(session: ReturnType<typeof useAuth>["session"]) {
  return ["Funcionario", "Terceiro", "Profissional"].includes(getSessionRole(session) || "");
}

export function useAgenda(options: UseAgendaOptions = {}) {
  const {
    manualSearch = false,
    initialDate = null,
    initialProfessionalId = null,
    preventPastAvailability = false,
    loadInsightsInManualSearch = false
  } = options;
  const { session, isAuthenticated, isLoading: isAuthLoading } = useAuth();
  const initialFiltersRef = useRef(buildInitialFilters({ initialDate, initialProfessionalId }));
  const [date, setDate] = useState(initialFiltersRef.current.date);
  const [selectedProfessionalId, setSelectedProfessionalId] = useState("");
  const [selectedServiceId, setSelectedServiceId] = useState("");
  const [selectedSpecialtyId, setSelectedSpecialtyId] = useState("");
  const [showCanceledAppointments, setShowCanceledAppointments] = useState(false);
  const [appliedFilters, setAppliedFilters] = useState<AgendaFilterState>(initialFiltersRef.current);
  const [meta, setMeta] = useState<AgendaMeta>({ profissionais: [], servicos: [] });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [availability, setAvailability] = useState<AvailabilityResponse | null>(null);
  const [analytics, setAnalytics] = useState<AgendaAnalytics | null>(null);
  const [signals, setSignals] = useState<AgendaSignals | null>(null);
  const [isRefreshingIntelligence, setIsRefreshingIntelligence] = useState(false);
  const [isRefreshingAppointments, setIsRefreshingAppointments] = useState(false);
  const [isRefreshingAvailability, setIsRefreshingAvailability] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");
  const [availabilityErrorFields, setAvailabilityErrorFields] = useState<string[]>([]);
  const appointmentsRequestRef = useRef(0);
  const availabilityRequestRef = useRef(0);
  const didInitialLoadRef = useRef(false);
  const shouldUsePersonalAgenda = isPersonalAgendaSession(session);
  const draftFilters = useMemo<AgendaFilterState>(() => ({
    date,
    selectedProfessionalId,
    selectedServiceId,
    selectedSpecialtyId,
    showCanceledAppointments
  }), [date, selectedProfessionalId, selectedServiceId, selectedSpecialtyId, showCanceledAppointments]);
  const queryFilters = manualSearch ? appliedFilters : draftFilters;
  const hasPendingFilterChanges = manualSearch && !areFiltersEqual(draftFilters, appliedFilters);
  const availabilityConfigKey = [
    queryFilters.date,
    queryFilters.selectedProfessionalId,
    queryFilters.selectedServiceId,
    queryFilters.selectedSpecialtyId
  ].join("|");

  const selectedService = useMemo(
    () => meta.servicos.find((item) => item.id === selectedServiceId) || null,
    [meta.servicos, selectedServiceId]
  );
  const selectedServiceSpecialties = selectedService?.especialidades_config || [];
  const selectedSpecialty = selectedServiceSpecialties.find((item) => item.especialidade_id === selectedSpecialtyId) || null;
  const selectedProfessional = useMemo(
    () => meta.profissionais.find((item) => item.id === selectedProfessionalId) || null,
    [meta.profissionais, selectedProfessionalId]
  );
  const selectedProfessionalServiceIds = useMemo(
    () => new Set(selectedProfessional?.servico_ids || []),
    [selectedProfessional]
  );
  const selectedProfessionalConfigIds = useMemo(
    () => new Set(selectedProfessional?.servico_tenant_especialidade_ids || []),
    [selectedProfessional]
  );
  const loadMeta = useCallback(async () => {
    if (!session) return;
    const nextMeta = await agendaService.getMeta(session);

    setMeta(nextMeta);
    setSelectedProfessionalId((current) => (
      nextMeta.profissionais.some((professional) => professional.id === current)
        ? current
        : shouldUsePersonalAgenda
          ? nextMeta.profissionais[0]?.id || ""
          : ""
    ));
    setSelectedServiceId((current) => (nextMeta.servicos.some((service) => service.id === current) ? current : ""));
    setSelectedSpecialtyId((current) => (
      nextMeta.servicos.some((service) => service.especialidades_config?.some((config) => config.especialidade_id === current))
        ? current
        : ""
    ));
  }, [session, shouldUsePersonalAgenda]);

  const loadAppointments = useCallback(async (
    filters: AgendaFilterState = queryFilters,
    options: { reset?: boolean } = {}
  ) => {
    if (!session) return;
    const requestId = appointmentsRequestRef.current + 1;
    appointmentsRequestRef.current = requestId;
    const shouldFilterBySpecialty = Boolean(filters.selectedSpecialtyId);
    const params = {
      data: filters.date,
      profissional_id: filters.selectedProfessionalId || undefined,
      servico_id: filters.selectedServiceId || undefined,
      especialidade_id: shouldFilterBySpecialty ? filters.selectedSpecialtyId : undefined,
      status: filters.showCanceledAppointments ? undefined : APPOINTMENT_STATUSES_WITHOUT_CANCELED.join(",")
    };

    setIsRefreshingAppointments(true);
    if (options.reset !== false) {
      setAppointments([]);
    }

    try {
      const data = await agendaService.list(session, params);

      if (appointmentsRequestRef.current === requestId) {
        setAppointments(data);
      }
    } finally {
      if (appointmentsRequestRef.current === requestId) {
        setIsRefreshingAppointments(false);
      }
    }
  }, [
    queryFilters,
    session,
  ]);

  const loadAvailability = useCallback(async () => {
    const requestId = availabilityRequestRef.current + 1;
    availabilityRequestRef.current = requestId;

    setAvailability(null);
    setAvailabilityErrorFields([]);
    setError("");

    if (
      !session
      || (preventPastAvailability && isPastDateInput(queryFilters.date))
      || !queryFilters.selectedProfessionalId
      || !queryFilters.selectedServiceId
      || !queryFilters.selectedSpecialtyId
    ) {
      setIsRefreshingAvailability(false);
      return;
    }

    setIsRefreshingAvailability(true);

    try {
      const data = await agendaService.getAvailability(session, {
        data: queryFilters.date,
        profissional_id: queryFilters.selectedProfessionalId,
        servico_id: queryFilters.selectedServiceId,
        especialidade_id: queryFilters.selectedSpecialtyId
      });

      if (availabilityRequestRef.current === requestId) {
        setAvailability(data);
        setAvailabilityErrorFields([]);
        setError("");
      }
    } catch (err) {
      if (availabilityRequestRef.current === requestId) {
        setAvailability(null);
        setAvailabilityErrorFields(["professional", "service", "specialty"]);
        setError(err instanceof Error ? err.message : "Não foi possível carregar horários.");
      }
    } finally {
      if (availabilityRequestRef.current === requestId) {
        setIsRefreshingAvailability(false);
      }
    }
  }, [preventPastAvailability, queryFilters, session]);

  const loadIntelligence = useCallback(async () => {
    if (!session) {
      setAnalytics(null);
      setSignals(null);
      return;
    }

    setIsRefreshingIntelligence(true);

    try {
      const params = {
        data: queryFilters.date,
        profissional_id: queryFilters.selectedProfessionalId,
        servico_id: queryFilters.selectedServiceId || undefined,
        especialidade_id: queryFilters.selectedServiceId && queryFilters.selectedSpecialtyId ? queryFilters.selectedSpecialtyId : undefined
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
  }, [queryFilters, session]);

  const refresh = useCallback(async () => {
    if (!session) return;
    setIsLoading(true);
    setError("");
    try {
      await loadMeta();
      await loadAppointments(queryFilters);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a agenda.");
    } finally {
      setIsLoading(false);
    }
  }, [loadAppointments, loadMeta, queryFilters, session]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || didInitialLoadRef.current) return;
    didInitialLoadRef.current = true;
    refresh();
  }, [isAuthLoading, isAuthenticated, refresh]);

  useEffect(() => {
    if (isAuthLoading || !isAuthenticated || !session || isLoading) return;

    if (manualSearch) return;

    loadAppointments(queryFilters).catch((err) => {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a agenda.");
    });
  }, [
    isAuthLoading,
    isAuthenticated,
    isLoading,
    loadAppointments,
    manualSearch,
    queryFilters,
    session
  ]);

  useEffect(() => {
    if (manualSearch) return;

    loadAvailability();
  }, [
    date,
    loadAvailability,
    manualSearch,
    meta.servicos,
    selectedProfessionalId,
    selectedServiceId,
    selectedSpecialtyId,
    session
  ]);

  useEffect(() => {
    setAvailability(null);
    setAvailabilityErrorFields([]);
    setError("");
  }, [selectedProfessionalId, selectedServiceId, selectedSpecialtyId]);

  useEffect(() => {
    setSelectedServiceId((current) => (
      meta.servicos.some((service) => (
        service.id === current
        && (!selectedProfessional || selectedProfessionalServiceIds.has(service.id))
      ))
        ? current
        : ""
    ));
  }, [meta.servicos, selectedProfessional, selectedProfessionalServiceIds]);

  useEffect(() => {
    if (!selectedService) {
      setSelectedSpecialtyId("");
      return;
    }

    setSelectedSpecialtyId((current) => (
      !current || selectedService.especialidades_config?.some((config) => (
        config.especialidade_id === current
        && (!selectedProfessional || selectedProfessionalConfigIds.has(config.id))
      ))
        ? current
        : ""
    ));
  }, [selectedProfessional, selectedProfessionalConfigIds, selectedService]);

  useEffect(() => {
    if (manualSearch && !loadInsightsInManualSearch) return;

    loadIntelligence().catch(() => null);
  }, [loadInsightsInManualSearch, loadIntelligence, manualSearch]);

  useEffect(() => {
    if (!session || !isAuthenticated) return;
    const timer = window.setInterval(() => {
      if (manualSearch) {
        Promise.all([
          loadAppointments(queryFilters, { reset: false }),
          loadInsightsInManualSearch ? loadIntelligence() : Promise.resolve()
        ]).catch(() => null);
        return;
      }

      Promise.all([loadAppointments(queryFilters, { reset: false }), loadAvailability(), loadIntelligence()]).catch(() => null);
    }, 60000);

    return () => window.clearInterval(timer);
  }, [isAuthenticated, loadAppointments, loadAvailability, loadInsightsInManualSearch, loadIntelligence, manualSearch, queryFilters, session]);

  const applyFilters = useCallback(async () => {
    if (!session) return;
    const nextFilters = draftFilters;
    setAppliedFilters(nextFilters);
    setError("");
    await loadAppointments(nextFilters).catch((err) => {
      setError(err instanceof Error ? err.message : "Não foi possível carregar a agenda.");
    });
    if (loadInsightsInManualSearch) {
      await loadIntelligence().catch(() => null);
    }
  }, [draftFilters, loadAppointments, loadInsightsInManualSearch, loadIntelligence, session]);

  const clearFilters = useCallback(() => {
    const nextFilters: AgendaFilterState = {
      ...buildInitialFilters(),
      selectedProfessionalId: shouldUsePersonalAgenda ? meta.profissionais[0]?.id || "" : ""
    };
    setDate(nextFilters.date);
    setSelectedProfessionalId(nextFilters.selectedProfessionalId);
    setSelectedServiceId("");
    setSelectedSpecialtyId("");
    setShowCanceledAppointments(false);
  }, [meta.profissionais, shouldUsePersonalAgenda]);

  async function createAppointment(payload: {
    data_inicio: string;
    cliente_id?: string;
    cliente?: {
      data_nascimento?: string;
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
    if (!session || !selectedProfessionalId || !selectedServiceId || !selectedSpecialtyId) return null;
    setIsSaving(true);
    setError("");
    try {
      const appointment = await agendaService.create(session, {
        profissional_id: selectedProfessionalId,
        servico_id: selectedServiceId,
        especialidade_id: selectedSpecialtyId,
        ...payload
      });
      await Promise.all([loadAppointments(queryFilters), loadAvailability()]);
      return appointment;
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível criar o agendamento.");
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
      await Promise.all([loadAppointments(queryFilters), loadIntelligence()]);
    } finally {
      setIsSaving(false);
    }
  }

  async function cancelAppointment(id: string, motivo?: string) {
    if (!session) return;
    setIsSaving(true);
    try {
      await agendaService.cancel(session, id, motivo);
      await loadAppointments(queryFilters);
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
      await loadAppointments(queryFilters);
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
      await loadAppointments(queryFilters);
      await loadAvailability();
      await loadIntelligence();
    } finally {
      setIsSaving(false);
    }
  }

  async function rescheduleAppointment(id: string, dataInicio: string, motivo?: string) {
    if (!session) return null;
    setIsSaving(true);
    setError("");
    try {
      const appointment = await agendaService.reschedule(session, id, dataInicio, motivo);
      await loadAppointments(queryFilters);
      await loadAvailability();
      await loadIntelligence();
      return appointment;
    } catch (err) {
      setError(err instanceof Error ? err.message : "NÃ£o foi possÃ­vel reagendar este atendimento.");
      return null;
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
    selectedSpecialtyId,
    setSelectedSpecialtyId,
    showCanceledAppointments,
    setShowCanceledAppointments,
    appliedFilters,
    appliedDate: appliedFilters.date,
    hasPendingFilterChanges,
    selectedProfessional,
    selectedService,
    selectedServiceSpecialties,
    selectedSpecialty,
    meta: {
      ...meta,
      servicos: meta.servicos
    },
    appointments,
    availability,
    availabilityConfigKey,
    availabilityErrorFields,
    analytics,
    signals,
    smartSuggestions: availability?.smart_suggestions || availability?.slots?.slice(0, 3) || [],
    isPersonalAgenda: shouldUsePersonalAgenda,
    isLoading: isLoading || isAuthLoading,
    isRefreshingAppointments,
    isRefreshingAvailability,
    isSaving,
    isRefreshingIntelligence,
    error,
    refresh,
    applyFilters,
    clearFilters,
    createAppointment,
    confirmAppointment,
    cancelAppointment,
    completeAppointment,
    noShowAppointment,
    rescheduleAppointment
  };
}
