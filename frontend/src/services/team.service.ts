import type { AuthSession } from "@/services/auth.service";
import type { ServiceCategory } from "@/constants/service-categories";
import { normalizeUserMessage } from "@/lib/messages";
import { API_URL } from "@/config/app-brand";

export type TeamProfessional = {
  id: string;
  tenant_id: string;
  usuario_id?: string | null;
  nome_publico: string;
  cargo_id?: string | null;
  cargo?: string | null;
  cargo_ref?: TeamRole | null;
  especialidade?: string | null;
  especialidade_ids?: string[];
  especialidades?: TeamSpecialty[];
  servico_ids?: string[];
  servicos?: Array<{ id: string; nome: string }>;
  tipo_usuario?: TeamUserRole | null;
  vinculo_tipo?: string | null;
  possui_acesso?: boolean;
  permissoes_sugeridas?: string[];
  percentual_comissao: number;
  aceita_agendamento_online: boolean;
  instagram?: string | null;
  bio?: string | null;
  ativo: boolean;
  ordem_exibicao: number;
  created_at: string;
};

export type TeamUserRole =
  | "Administrador"
  | "Autonomo"
  | "Funcionario"
  | "Terceiro"
  | "Profissional Adm";

export type TeamRole = {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria_profissional?: "operacional" | "administrativo" | null;
  ativo: boolean;
};

export type TeamRolePayload = {
  nome: string;
  descricao?: string | null;
  categoria_profissional?: "operacional" | "administrativo";
  ativo?: boolean;
};

export type TeamSpecialty = {
  id: string;
  cargo_id: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  catalogo_ativo?: boolean;
  tenant_ativo?: boolean;
  tenant_id?: string | null;
  taxonomy_category_key?: ServiceCategory | "";
  is_official?: boolean;
  is_custom?: boolean;
  cargo?: TeamRole | null;
};

export type TeamSpecialtyPayload = {
  cargo_id: string;
  nome: string;
  taxonomy_category_key?: ServiceCategory | "";
  descricao?: string | null;
  ativo?: boolean;
};

export type TeamProfessionalPayload = {
  nome_publico: string;
  cargo_id: string;
  especialidade_ids?: string[];
  servico_ids?: string[];
  tipo_usuario?: TeamUserRole;
  criar_acesso?: boolean;
  email?: string;
  telefone?: string;
  senha_temporaria?: string;
  percentual_comissao?: number;
  aceita_agendamento_online?: boolean;
  ativo?: boolean;
  instagram?: string | null;
  bio?: string | null;
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
    throw new Error(normalizeUserMessage(payload.message || payload.error?.message, "error", payload.code || payload.error?.code));
  }

  return payload.data as T;
}

async function list(session: AuthSession | null) {
  return request<TeamProfessional[]>(session, "/team");
}

async function getById(session: AuthSession | null, id: string) {
  return request<TeamProfessional>(session, `/team/${id}`);
}

async function listRoles(session: AuthSession | null, tipoUsuario?: TeamUserRole, options: { contextual?: boolean } = {}) {
  const params = new URLSearchParams();
  if (tipoUsuario) {
    params.set("tipo_usuario", tipoUsuario);
  }
  if (options.contextual) {
    params.set("contextual", "true");
  }
  const query = params.toString();
  return request<TeamRole[]>(session, `/cargos${query ? `?${query}` : ""}`);
}

async function createRole(session: AuthSession | null, payload: TeamRolePayload) {
  return request<TeamRole>(session, "/cargos", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateRole(session: AuthSession | null, id: string, payload: Partial<TeamRolePayload>) {
  return request<TeamRole>(session, `/cargos/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function removeRole(session: AuthSession | null, id: string) {
  return request<TeamRole>(session, `/cargos/${id}`, {
    method: "DELETE"
  });
}

async function listSpecialties(session: AuthSession | null, cargoId: string) {
  return request<TeamSpecialty[]>(session, `/cargos/${cargoId}/especialidades`);
}

async function listAllSpecialties(session: AuthSession | null, options: { includeInactive?: boolean } = {}) {
  const query = options.includeInactive ? "?include_inactive=true" : "";
  return request<TeamSpecialty[]>(session, `/especialidades${query}`);
}

async function updateSpecialtyStatus(session: AuthSession | null, id: string, ativo: boolean) {
  return request<TeamSpecialty>(session, `/especialidades/${id}/status`, {
    method: "PATCH",
    body: JSON.stringify({ ativo })
  });
}

async function createSpecialty(session: AuthSession | null, payload: TeamSpecialtyPayload) {
  return request<TeamSpecialty>(session, "/especialidades", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateSpecialty(session: AuthSession | null, id: string, payload: Partial<TeamSpecialtyPayload>) {
  return request<TeamSpecialty>(session, `/especialidades/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function removeSpecialty(session: AuthSession | null, id: string) {
  return request<TeamSpecialty>(session, `/especialidades/${id}`, {
    method: "DELETE"
  });
}

async function create(session: AuthSession | null, payload: TeamProfessionalPayload) {
  return request<TeamProfessional>(session, "/team", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function update(session: AuthSession | null, id: string, payload: Partial<TeamProfessionalPayload>) {
  return request<TeamProfessional>(session, `/team/${id}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function remove(session: AuthSession | null, id: string) {
  return request<{ id: string; removed: boolean }>(session, `/team/${id}`, {
    method: "DELETE"
  });
}

export const teamService = {
  list,
  getById,
  listRoles,
  createRole,
  updateRole,
  removeRole,
  listSpecialties,
  listAllSpecialties,
  updateSpecialtyStatus,
  createSpecialty,
  updateSpecialty,
  removeSpecialty,
  create,
  update,
  remove
};
