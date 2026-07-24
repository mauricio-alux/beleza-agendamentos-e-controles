import type { AuthSession } from "@/services/auth.service";
import type { ServiceCategory } from "@/constants/service-categories";
import type { TeamSpecialty } from "@/services/team.service";
import { normalizeUserMessage } from "@/lib/messages";
import { API_URL } from "@/config/app-brand";

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
  metadata?: Record<string, unknown>;
  taxonomy_category_key?: ServiceCategory | "";
  taxonomy_service_key?: string | null;
  is_official?: boolean;
  is_custom?: boolean;
  especialidade_ids?: string[];
  especialidades?: TeamSpecialty[];
};

export type SalonServicePayload = {
  nome: string;
  descricao?: string | null;
  duracao_minutos: number;
  preco: number;
  categoria?: ServiceCategory | null;
  permite_online?: boolean;
  ordem_exibicao?: number;
  especialidade_ids?: string[];
};

type ApiEnvelope<T> = {
  data?: T;
  code?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{
      path?: Array<string | number>;
      message?: string;
    }>;
  };
};

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  nome: "Nome do servico",
  duracao_minutos: "Duracao",
  preco: "Preco",
  categoria: "Categoria",
  especialidade_ids: "Especialidades vinculadas"
};

function getValidationDetailsMessage(payload: ApiEnvelope<unknown>) {
  const details = payload.error?.details;
  if ((payload.code || payload.error?.code) !== "VALIDATION_ERROR" || !details?.length) {
    return "";
  }

  return details
    .map((detail) => {
      const field = String(detail.path?.[0] || "");
      const label = VALIDATION_FIELD_LABELS[field] || field || "Campo";
      return `${label}: ${detail.message || "valor invalido."}`;
    })
    .join(" ");
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
    const validationMessage = getValidationDetailsMessage(payload);
    if (validationMessage) {
      throw new Error(validationMessage);
    }

    throw new Error(normalizeUserMessage(payload.message || payload.error?.message, "error", payload.code || payload.error?.code));
  }

  return payload.data as T;
}

async function list(session: AuthSession | null, filters: { especialidadeIds?: string[] } = {}) {
  const params = new URLSearchParams();
  if (filters.especialidadeIds?.length) {
    params.set("especialidade_ids", filters.especialidadeIds.join(","));
  }
  const query = params.toString();
  return request<SalonService[]>(session, `/services${query ? `?${query}` : ""}`);
}

async function listCompatibleSpecialties(
  session: AuthSession | null,
  filters: { nome: string; categoria: ServiceCategory | "" | null }
) {
  const params = new URLSearchParams();
  params.set("nome", filters.nome);
  if (filters.categoria) {
    params.set("categoria", filters.categoria);
  }

  return request<TeamSpecialty[]>(session, `/services/compatible-specialties?${params.toString()}`);
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
  listCompatibleSpecialties,
  create,
  update,
  remove
};
