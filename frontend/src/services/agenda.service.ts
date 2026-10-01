import type { AuthSession } from "@/services/auth.service";
import { normalizeUserMessage } from "@/lib/messages";
import { API_URL } from "@/config/app-brand";

export type Professional = {
  id: string;
  nome_publico: string | null;
  cargo?: string | null;
  servico_ids?: string[];
  especialidade_ids?: string[];
  servico_tenant_especialidade_ids?: string[];
};

export type Service = {
  id: string;
  servico_tenant_id?: string;
  servico_catalogo_id?: string;
  codigo_canonico?: string;
  nome: string;
  duracao_minutos: number | null;
  preco: number | null;
  categoria?: string | null;
  natureza?: string | null;
  especialidades_config?: Array<{
    id: string;
    especialidade_id: string;
    nome?: string | null;
    taxonomy_category_key?: string | null;
    duracao_minutos: number | null;
    preco: number | null;
    dias_retorno_recomendado?: number | null;
  }>;
};

export type AppointmentService = {
  servico_id?: string | null;
  servico_tenant_id?: string | null;
  servico_catalogo_id?: string | null;
  servico_tenant_especialidade_id?: string | null;
  especialidade_id?: string | null;
  nome_servico: string;
  nome_especialidade?: string | null;
  duracao_minutos: number;
  valor_servico: number;
  servico?: {
    id: string;
    nome?: string | null;
    preco?: number | null;
  } | null;
};

export type Appointment = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  profissional_id: string;
  data_inicio: string;
  data_fim: string;
  status: AppointmentStatus;
  observacoes?: string | null;
  valor_total: number;
  cliente?: {
    id: string;
    nome: string;
    telefone: string;
    email?: string | null;
  };
  profissional?: Professional;
  servicos?: AppointmentService[];
  metadata?: Record<string, unknown>;
  operational_alert?: {
    type: "completion_tolerance" | "auto_completion_due";
    elapsed_minutes: number;
    remaining_minutes: number;
    message: string;
  } | null;
};

export type AppointmentStatus =
  | "solicitado"
  | "pendente"
  | "pendente_atendente"
  | "pendente_cliente"
  | "confirmado"
  | "cancelado"
  | "concluido"
  | "no_show"
  | "reagendado"
  | "expirado_atendente"
  | "expirado_cliente"
  | "suspeito";

export type AvailabilitySlot = {
  inicio: string;
  fim: string;
  hora: string;
  score: number;
  occupancy_score?: number;
  ranking_score?: number;
  slot_quality?: "otimo" | "bom" | "regular" | "baixo";
  gap_before_minutes?: number | null;
  gap_after_minutes?: number | null;
  intelligence?: {
    reduces_idle_time: boolean;
    fragmentation_risk: "low" | "medium" | "high";
    recommendation: "recommended" | "good" | "available";
  };
};

export type AvailabilityResponse = {
  data: string;
  profissional: Professional;
  servico: Service;
  duracao_minutos: number;
  slots: AvailabilitySlot[];
  smart_suggestions?: AvailabilitySlot[];
  intelligence?: {
    ranking_strategy: string;
    realtime_ready: boolean;
    ai_ready: boolean;
  };
  unavailable_reason: string | null;
  unavailability?: {
    predominant_reason:
      | "minimum_notice"
      | "outside_working_hours"
      | "service_duration"
      | "schedule_conflict"
      | "professional_unavailable"
      | "blocked_time"
      | "missing_scale"
      | "no_matching_specialty"
      | "no_professional_link"
      | "other";
    reason_counts?: Record<string, number>;
    total_candidates?: number;
    minimum_notice_minutes?: number;
    service_duration_minutes?: number;
    latest_work_end?: string | null;
    earliest_start?: string | null;
  } | null;
};

export type AgendaAnalytics = {
  analytics: {
    occupancy_rate: number;
    cancellation_rate: number;
    no_show_rate: number;
    average_gap_time: number;
    slot_efficiency: number;
    agenda_fragmentation: number;
    total_work_minutes: number;
    occupied_minutes: number;
  };
  hints: Array<{
    id: string;
    title: string;
    description: string;
    severity: "low" | "medium" | "high";
  }>;
  realtime_ready: boolean;
  ai_ready: boolean;
};

export type AgendaSignals = {
  signals: Array<{
    id: string;
    label: string;
    score: number;
    context: Record<string, unknown>;
    provider: string;
  }>;
  context: {
    source: string;
    ai_ready: boolean;
    realtime_ready: boolean;
  };
};

export type AgendaMeta = {
  profissionais: Professional[];
  servicos: Service[];
};

export type CompleteAppointmentOptions = {
  confirmarConclusaoAntecipada?: boolean;
};

export type ProfessionalScheduleDay = {
  weekday: number;
  work_start_morning?: string | null;
  work_end_morning?: string | null;
  work_start_afternoon?: string | null;
  work_end_afternoon?: string | null;
  break_start?: string | null;
  break_end?: string | null;
  is_working: boolean;
  is_exception?: boolean;
};

export type ProfessionalScheduleResponse = {
  profissional: Professional;
  source: string;
  schedules: ProfessionalScheduleDay[];
};

type ApiEnvelope<T> = {
  data?: T;
  code?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
  };
};

function friendlyError(status: number, code?: string) {
  if (status === 409 || code === "SLOT_UNAVAILABLE" || code === "APPOINTMENT_CONFLICT") {
    return "Horário indisponível.";
  }

  if (status === 422) {
    return "Agendamento invalido.";
  }

  if (status === 401) {
    return "Sessao expirada. Entre novamente.";
  }

  if (status === 429 || code === "WEEKLY_BOOKING_LIMIT") {
    return "Limite de solicitacoes atingido para este cliente.";
  }

  return "Não foi possível concluir a operação. Tente novamente.";
}

async function request<T>(session: AuthSession | null, path: string, init: RequestInit = {}) {
  if (!session?.access_token) {
    throw new Error("Sessao expirada. Entre novamente.");
  }

  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${session.access_token}`,
        ...(init.headers || {})
      }
    });
  } catch {
    throw new Error("Falha de conexao. Tente novamente.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(normalizeUserMessage(
      payload.message || payload.error?.message || friendlyError(response.status, payload.error?.code),
      "error",
      payload.code || payload.error?.code
    ));
  }

  return payload.data as T;
}

function qs(params: Record<string, string | undefined>) {
  const search = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) search.set(key, value);
  });
  const value = search.toString();
  return value ? `?${value}` : "";
}

const TENANT_LOCAL_TIME_ZONE = "America/Sao_Paulo";

function slotLocalSortValue(slot: AvailabilitySlot) {
  const date = new Date(slot.inicio);

  if (!Number.isNaN(date.getTime())) {
    const parts = new Intl.DateTimeFormat("en-US", {
      timeZone: TENANT_LOCAL_TIME_ZONE,
      hour: "2-digit",
      minute: "2-digit",
      hour12: false
    }).formatToParts(date);
    const hour = Number(parts.find((part) => part.type === "hour")?.value || 0);
    const minute = Number(parts.find((part) => part.type === "minute")?.value || 0);
    return hour * 60 + minute;
  }

  const [hour, minute] = slot.hora.split(":").map(Number);
  return (hour || 0) * 60 + (minute || 0);
}

function sortSlotsByTenantLocalTime(slots: AvailabilitySlot[] = []) {
  return [...slots].sort((left, right) => (
    slotLocalSortValue(left) - slotLocalSortValue(right)
    || left.inicio.localeCompare(right.inicio)
  ));
}

function normalizeAvailability(data: AvailabilityResponse) {
  const sortedSlots = sortSlotsByTenantLocalTime(data.slots || []);

  return {
    ...data,
    slots: sortedSlots,
    smart_suggestions: sortSlotsByTenantLocalTime(data.smart_suggestions || sortedSlots.slice(0, 3))
  };
}

async function getMeta(session: AuthSession | null) {
  return request<AgendaMeta>(session, "/agenda/meta");
}

async function getProfessionalSchedule(session: AuthSession | null, professionalId: string) {
  return request<ProfessionalScheduleResponse>(session, `/agenda/profissionais/${professionalId}/agenda`);
}

async function updateProfessionalSchedule(
  session: AuthSession | null,
  professionalId: string,
  schedules: ProfessionalScheduleDay[]
) {
  return request<ProfessionalScheduleResponse>(session, `/agenda/profissionais/${professionalId}/agenda`, {
    method: "PATCH",
    body: JSON.stringify({ schedules })
  });
}

async function getAvailability(
  session: AuthSession | null,
  params: { data: string; profissional_id: string; servico_id: string; especialidade_id?: string }
) {
  const data = await request<AvailabilityResponse>(
    session,
    `/agenda/disponibilidade${qs(params)}`
  );
  return normalizeAvailability(data);
}

async function getAnalytics(
  session: AuthSession | null,
  params: { data?: string; profissional_id?: string; servico_id?: string; especialidade_id?: string }
) {
  return request<AgendaAnalytics>(session, `/agenda/analytics${qs(params)}`);
}

async function getSignals(
  session: AuthSession | null,
  params: { data?: string; profissional_id?: string; servico_id?: string; especialidade_id?: string }
) {
  return request<AgendaSignals>(session, `/agenda/signals${qs(params)}`);
}

async function list(
  session: AuthSession | null,
  params: {
    data?: string;
    data_inicio?: string;
    data_fim?: string;
    profissional_id?: string;
    servico_id?: string;
    especialidade_id?: string;
    status?: string;
  }
) {
  return request<Appointment[]>(session, `/agenda${qs(params)}`);
}

async function getById(session: AuthSession | null, id: string) {
  return request<Appointment>(session, `/agenda/${id}`);
}

async function create(
  session: AuthSession | null,
  payload: {
    profissional_id: string;
    servico_id: string;
    especialidade_id?: string;
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
  }
) {
  return request<Appointment>(session, "/agenda", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function cancel(session: AuthSession | null, id: string, motivo?: string) {
  return request<Appointment>(session, `/agenda/${id}/cancelar`, {
    method: "PATCH",
    body: JSON.stringify({ motivo })
  });
}

async function confirm(session: AuthSession | null, id: string) {
  return request<Appointment>(session, `/agenda/${id}/confirmar`, {
    method: "PATCH"
  });
}

async function complete(
  session: AuthSession | null,
  id: string,
  motivo?: string,
  options: CompleteAppointmentOptions = {}
) {
  return request<Appointment>(session, `/agenda/${id}/concluir`, {
    method: "PATCH",
    body: JSON.stringify({
      motivo,
      confirmar_conclusao_antecipada: options.confirmarConclusaoAntecipada || undefined
    })
  });
}

async function noShow(session: AuthSession | null, id: string, motivo?: string) {
  return request<Appointment>(session, `/agenda/${id}/no-show`, {
    method: "PATCH",
    body: JSON.stringify({ motivo })
  });
}

async function reschedule(session: AuthSession | null, id: string, data_inicio: string, motivo?: string) {
  return request<Appointment>(session, `/agenda/${id}/reagendar`, {
    method: "PATCH",
    body: JSON.stringify({ data_inicio, motivo })
  });
}

export const agendaService = {
  getMeta,
  getProfessionalSchedule,
  updateProfessionalSchedule,
  getAvailability,
  getAnalytics,
  getSignals,
  list,
  getById,
  create,
  cancel,
  confirm,
  complete,
  noShow,
  reschedule
};
