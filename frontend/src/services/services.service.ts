import type { AuthSession } from "@/services/auth.service";
import type { ServiceCategory } from "@/constants/service-categories";

export type SalonService = {
  id: string;
  tenant_id: string;
  nome: string;
  descricao?: string | null;
  duracao_minutos: number;
  preco: number;
  categoria?: ServiceCategory | null;
  permite_online: boolean;
  ordem_exibicao: number;
};

export type SalonServicePayload = {
  nome: string;
  descricao?: string | null;
  duracao_minutos: number;
  preco: number;
  categoria?: ServiceCategory | null;
  permite_online?: boolean;
  ordem_exibicao?: number;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";

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
    throw new Error(payload.error?.message || "Nao foi possivel carregar os servicos.");
  }

  return payload.data as T;
}

async function list(session: AuthSession | null) {
  return request<SalonService[]>(session, "/services");
}

async function create(session: AuthSession | null, payload: SalonServicePayload) {
  return request<SalonService>(session, "/services", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function update(session: AuthSession | null, id: string, payload: Partial<SalonServicePayload>) {
  return request<SalonService>(session, `/services/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function remove(session: AuthSession | null, id: string) {
  return request<SalonService>(session, `/services/${id}`, {
    method: "DELETE"
  });
}

export const servicesService = {
  list,
  create,
  update,
  remove
};
