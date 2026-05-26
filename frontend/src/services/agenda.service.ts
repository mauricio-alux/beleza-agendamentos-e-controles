import type { AuthSession } from "@/services/auth.service";

export type Professional = {
  id: string;
  nome_publico: string | null;
  cargo?: string | null;
};

export type Service = {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco: number;
  categoria?: string | null;
};

export type AppointmentService = {
  servico_id: string;
  nome_servico: string;
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
  error?: {
    code?: string;
    message?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";

function friendlyError(status: number, code?: string) {
  if (status === 409 || code === "SLOT_UNAVAILABLE" || code === "APPOINTMENT_CONFLICT") {
    return "Horario indisponivel.";
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

  return "Nao foi possivel concluir a operacao. Tente novamente.";
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
    throw new Error(friendlyError(response.status, payload.error?.code));
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
  params: { data: string; profissional_id: string; servico_id: string }
) {
  return request<AvailabilityResponse>(
    session,
    `/agenda/disponibilidade${qs(params)}`
  );
}

async function getAnalytics(
  session: AuthSession | null,
  params: { data?: string; profissional_id?: string; servico_id?: string }
) {
  return request<AgendaAnalytics>(session, `/agenda/analytics${qs(params)}`);
}

async function getSignals(
  session: AuthSession | null,
  params: { data?: string; profissional_id?: string; servico_id?: string }
) {
  return request<AgendaSignals>(session, `/agenda/signals${qs(params)}`);
}

async function list(
  session: AuthSession | null,
  params: { data_inicio?: string; data_fim?: string; profissional_id?: string; status?: string }
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
  reschedule
};
