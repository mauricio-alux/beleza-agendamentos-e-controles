import type { AuthSession } from "@/services/auth.service";

export type TeamProfessional = {
  id: string;
  tenant_id: string;
  usuario_id?: string | null;
  nome_publico: string;
  cargo?: string | null;
  especialidade?: string | null;
  percentual_comissao: number;
  aceita_agendamento_online: boolean;
  instagram?: string | null;
  bio?: string | null;
  ativo: boolean;
  ordem_exibicao: number;
  created_at: string;
};

export type TeamProfessionalPayload = {
  nome_publico: string;
  cargo?: string | null;
  especialidade?: string | null;
  percentual_comissao?: number;
  aceita_agendamento_online?: boolean;
  instagram?: string | null;
  bio?: string | null;
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
    throw new Error(payload.error?.message || "Nao foi possivel carregar a equipe.");
  }

  return payload.data as T;
}

async function list(session: AuthSession | null) {
  return request<TeamProfessional[]>(session, "/team");
}

async function create(session: AuthSession | null, payload: TeamProfessionalPayload) {
  return request<TeamProfessional>(session, "/team", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export const teamService = {
  list,
  create
};
