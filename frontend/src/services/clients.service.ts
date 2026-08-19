import type { AuthSession } from "@/services/auth.service";
import { API_URL } from "@/config/app-brand";

export type SalonClient = {
  id: string;
  tenant_link_id?: string | null;
  nome: string;
  telefone: string;
  email?: string | null;
  observacoes?: string | null;
  endereco?: {
    cep?: string;
    uf?: string | null;
    cidade?: string | null;
    logradouro?: string | null;
    numero?: string | null;
  } | null;
  aceita_campanhas: boolean;
  status: string;
  qtd_atendimentos: number;
  total_gasto: number;
  ultimo_atendimento?: string | null;
  created_at: string;
};

export type SalonClientPayload = {
  nome: string;
  telefone: string;
  email?: string | null;
  observacoes?: string | null;
  endereco?: {
    cep?: string;
    uf?: string;
    cidade?: string;
    logradouro?: string;
    numero?: string;
  };
  aceita_campanhas?: boolean;
  status?: "ativo" | "inativo";
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

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
    throw new Error(payload.error?.message || "Não foi possível carregar os clientes.");
  }

  return payload.data as T;
}

async function list(session: AuthSession | null) {
  return request<SalonClient[]>(session, "/clients");
}

async function create(session: AuthSession | null, payload: SalonClientPayload) {
  return request<SalonClient>(session, "/clients", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function update(session: AuthSession | null, clientId: string, payload: SalonClientPayload) {
  return request<SalonClient>(session, `/clients/${encodeURIComponent(clientId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function createBookingLink(
  session: AuthSession | null,
  clientId: string,
  slug?: string
) {
  return request<{ token: string; expires_at: string; url: string }>(
    session,
    `/clients/${encodeURIComponent(clientId)}/booking-token`,
    {
      method: "POST",
      body: JSON.stringify({ slug })
    }
  );
}

export const clientsService = {
  list,
  create,
  update,
  createBookingLink
};
