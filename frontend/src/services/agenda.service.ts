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
};

export type Appointment = {
  id: string;
  tenant_id: string;
  cliente_id: string;
  profissional_id: string;
  data_inicio: string;
  data_fim: string;
  status: "pendente" | "confirmado" | "cancelado" | "concluido" | "no_show" | "reagendado";
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
};

export type AvailabilitySlot = {
  inicio: string;
  fim: string;
  hora: string;
  score: number;
};

export type AvailabilityResponse = {
  data: string;
  profissional: Professional;
  servico: Service;
  duracao_minutos: number;
  slots: AvailabilitySlot[];
  unavailable_reason: string | null;
};

export type AgendaMeta = {
  profissionais: Professional[];
  servicos: Service[];
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

async function getAvailability(
  session: AuthSession | null,
  params: { data: string; profissional_id: string; servico_id: string }
) {
  return request<AvailabilityResponse>(
    session,
    `/agenda/disponibilidade${qs(params)}`
  );
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
    cliente: { nome: string; telefone: string; email?: string };
    observacoes?: string;
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
  getAvailability,
  list,
  getById,
  create,
  cancel,
  confirm,
  reschedule
};
