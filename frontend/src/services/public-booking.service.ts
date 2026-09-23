import type { AvailabilityResponse, AvailabilitySlot, Professional, Service } from "@/services/agenda.service";
import { normalizeUserMessage } from "@/lib/messages";
import { API_URL } from "@/config/app-brand";
import { createSessionId } from "@/lib/session-id";

export type PublicBookingCatalog = {
  tenant: {
    id: string;
    nome_fantasia: string;
    slug: string;
  };
  link: {
    slug: string;
    titulo: string | null;
    profissional_id: string | null;
  };
  catalog_status: {
    online_services: number;
    available_services: number;
    unavailable_services: number;
  };
  profissionais: Array<Professional & { servico_ids: string[] }>;
  servicos: Service[];
};

export type PublicAvailability = {
  catalog: PublicBookingCatalog;
  availability: AvailabilityResponse;
};

export type PublicAppointmentInput = {
  profissional_id: string;
  servico_id: string;
  especialidade_id?: string;
  data_inicio: string;
  cliente?: {
    nome: string;
    telefone: string;
    data_nascimento: string;
    email?: string;
  };
  observacoes?: string;
  campanha?: string;
  origem?: string;
  sessao_id?: string;
  client_context?: {
    client_token?: string;
    user_agent?: string;
    timezone?: string;
    locale?: string;
  };
};

export type PublicAppointmentOperationalContext = {
  token: string;
  links: {
    confirmar: string;
    cancelar: string;
    reagendar: string;
  };
  message?: {
    channel: string;
    template: string;
    text: string;
  } | null;
};

export type PublicOperationalAppointment = {
  id: string;
  tenant: {
    id: string;
    slug?: string;
    nome_fantasia?: string;
  };
  cliente?: {
    nome: string;
    telefone?: string | null;
    email?: string | null;
  } | null;
  profissional?: {
    id: string;
    nome_publico?: string | null;
    cargo?: string | null;
  } | null;
  servico?: {
    id: string;
    servico_tenant_id?: string | null;
    especialidade_id?: string | null;
    nome_especialidade?: string | null;
    nome: string;
    preco?: number | null;
    duracao_minutos?: number | null;
  } | null;
  data_inicio: string;
  data_fim: string;
  status: string;
  valor_total?: number | null;
  requested_action?: "confirmar" | "cancelar" | null;
  operational?: PublicAppointmentOperationalContext | null;
};

export type PublicClientIdentity = {
  recognized: boolean;
  clientId?: string;
  token?: string;
  expires_at?: string;
  client?: {
    nome: string;
    telefone: string;
    email?: string | null;
    preferencias?: Record<string, unknown>;
    ultimos_servicos?: Array<{ servico_id?: string; nome_servico?: string }>;
    profissional_favorito?: { id: string; nome_publico?: string | null } | null;
  };
};

export type PublicClientMe = {
  nome: string;
  telefone: string;
  email?: string | null;
  endereco?: {
    cep?: string | null;
    uf?: string | null;
    cidade?: string | null;
    logradouro?: string | null;
    numero?: string | null;
  } | null;
  aceita_campanhas: boolean;
  status: string;
};

export type PublicClientMeUpdate = {
  token: string;
  nome?: string;
  telefone?: string;
  email?: string | null;
  endereco?: PublicClientMe["endereco"];
  aceita_campanhas?: boolean;
};

export type PublicIdentityInput = {
  token?: string;
  campanha?: string;
  origem?: string;
  sessao_id?: string;
  lookup_only?: boolean;
  cliente?: {
    nome: string;
    telefone: string;
    data_nascimento: string;
    email?: string;
  };
  contexto?: {
    referrer?: string;
    user_agent?: string;
    timezone?: string;
    locale?: string;
  };
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

// Pending operations live only in memory, never in PWA storage or URLs.
const identityAttempts = new Map<string, { id: string; pending?: Promise<unknown> }>();
function request<T>(path: string, init: RequestInit = {}): Promise<T> {
  const body = init.method === 'POST' && typeof init.body === 'string' ? JSON.parse(init.body) : null;
  const identityOperation = body && ((path.endsWith('/identity') && body.cliente && !body.token)
    || path.endsWith('/access/locate') || (path.endsWith('/appointments') && body.cliente && !body.client_context?.client_token));
  if (!identityOperation) return performRequest<T>(path, init);
  const key = JSON.stringify([path, body]);
  let attempt = identityAttempts.get(key);
  if (attempt?.pending) return attempt.pending as Promise<T>;
  if (!attempt) {
    // Bound failed attempts without evicting an in-flight operation.
    if (identityAttempts.size >= 32) {
      const old = [...identityAttempts].find(([, value]) => !value.pending);
      if (old) identityAttempts.delete(old[0]);
    }
    attempt = { id: body.request_id || createSessionId() };
    identityAttempts.set(key, attempt);
  }
  const current = attempt;
  const pending = performRequest<T>(path, { ...init, body: JSON.stringify({ ...body, request_id: current.id }) })
    .then(result => { identityAttempts.delete(key); return result; })
    .catch(error => { current.pending = undefined; throw error; });
  current.pending = pending;
  return pending;
}

async function performRequest<T>(path: string, init: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });
  } catch {
    throw new Error("Não foi possível conectar ao agendamento. Tente novamente.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(normalizeUserMessage(
      payload.message || payload.error?.message || "Não foi possível concluir a solicitação.",
      "error",
      payload.code || payload.error?.code
    ));
  }

  return payload.data as T;
}

export function getPublicBookingCatalog(slug: string) {
  return request<PublicBookingCatalog>(`/public/booking/${encodeURIComponent(slug)}`);
}

export function getPublicAvailability(
  slug: string,
  input: { data: string; profissional_id: string; servico_id: string; especialidade_id?: string }
) {
  const search = new URLSearchParams(input);
  return request<PublicAvailability>(
    `/public/booking/${encodeURIComponent(slug)}/availability?${search.toString()}`
  );
}

export function identifyPublicBookingClient(slug: string, input: PublicIdentityInput) {
  return request<PublicClientIdentity>(`/public/booking/${encodeURIComponent(slug)}/identity`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getUpcomingPublicAppointments(slug: string, token: string) {
  const search = new URLSearchParams({ token });
  return request<{ appointments: PublicOperationalAppointment[] }>(
    `/public/booking/${encodeURIComponent(slug)}/client/appointments/upcoming?${search.toString()}`
  );
}

export function locatePublicAccess(input: { telefone: string; data_nascimento: string; slug?: string }) {
  return request<{ tenants?: Array<{ slug: string; displayName: string }>; slug?: string; identity?: PublicClientIdentity }>(
    '/public/booking/access/locate', { method: 'POST', body: JSON.stringify(input) }
  );
}

export function getPublicClientMe(slug: string, token: string) {
  const search = new URLSearchParams({ token });
  return request<PublicClientMe>(
    `/public/booking/${encodeURIComponent(slug)}/client/me?${search.toString()}`
  );
}

export function updatePublicClientMe(slug: string, input: PublicClientMeUpdate) {
  return request<PublicClientMe>(`/public/booking/${encodeURIComponent(slug)}/client/me`, {
    method: "PATCH",
    body: JSON.stringify(input)
  });
}

export function createPublicAppointment(slug: string, input: PublicAppointmentInput) {
  return request<{
    id: string;
    status: string;
    data_inicio: string;
    data_fim: string;
    operational?: PublicAppointmentOperationalContext | null;
  }>(`/public/booking/${encodeURIComponent(slug)}/appointments`, {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function getPublicAppointmentByToken(token: string) {
  return request<PublicOperationalAppointment>(
    `/public/booking/appointments/token/${encodeURIComponent(token)}`
  );
}

export function getPublicAppointmentActionContext(token: string, command?: "confirmar" | "cancelar") {
  const search = new URLSearchParams({ tk: token });
  if (command) search.set("cmd", command);

  return request<PublicOperationalAppointment>(
    `/public/booking/appointments/action?${search.toString()}`
  );
}

export function runPublicAppointmentAction(input: {
  token: string;
  cmd: "confirmar" | "cancelar";
  motivo?: string;
}) {
  return request<PublicOperationalAppointment>("/public/booking/appointments/action", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export function reschedulePublicAppointment(input: {
  token: string;
  data_inicio: string;
  motivo?: string;
}) {
  return request<PublicOperationalAppointment>("/public/booking/appointments/reschedule", {
    method: "POST",
    body: JSON.stringify(input)
  });
}

export type { AvailabilitySlot };
