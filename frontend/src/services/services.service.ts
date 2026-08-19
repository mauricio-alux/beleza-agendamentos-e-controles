import type { AuthSession } from "@/services/auth.service";
import type { ServiceCategory } from "@/constants/service-categories";
import type { TeamSpecialty } from "@/services/team.service";
import { normalizeUserMessage } from "@/lib/messages";
import { API_URL } from "@/config/app-brand";

export type SalonService = {
  id: string;
  servico_tenant_id?: string;
  tenant_id: string;
  servico_catalogo_id?: string;
  codigo_canonico?: string;
  nome: string;
  descricao?: string | null;
  natureza?: "recorrente" | "ocasional" | string | null;
  servico_ocasional?: boolean;
  oferta_ativa?: boolean;
  disponivel_ao_tenant?: boolean;
  catalogo_ativo?: boolean;
  duracao_minutos: number | null;
  preco: number | null;
  dias_retorno_recomendado?: number | null;
  categoria?: ServiceCategory | null;
  categoria_key?: ServiceCategory | null;
  permite_online: boolean;
  ativo?: boolean;
  ordem_exibicao?: number;
  metadata?: Record<string, unknown>;
  catalogo_metadata?: Record<string, unknown>;
  taxonomy_category_key?: ServiceCategory | "";
  taxonomy_service_key?: string | null;
  is_official?: boolean;
  is_custom?: boolean;
  especialidade_ids?: string[];
  especialidades?: TeamSpecialty[];
  especialidades_config?: Array<{
    id?: string;
    servico_tenant_especialidade_id?: string;
    servico_tenant_id?: string;
    especialidade_id: string;
    duracao_minutos?: number | null;
    preco?: number | null;
    dias_retorno_recomendado?: number | null;
    aceita_agendamento_online?: boolean;
    ativo?: boolean;
    especialidade?: TeamSpecialty | null;
  }>;
};

export type ServiceCatalogSpecialty = {
  id?: string;
  especialidade_id: string;
  ativo?: boolean;
  metadata?: Record<string, unknown>;
  especialidade?: TeamSpecialty | null;
};

export type ServiceCatalog = {
  id: string;
  servico_catalogo_id?: string;
  codigo_canonico: string;
  nome: string;
  descricao?: string | null;
  categoria: ServiceCategory;
  categoria_key?: ServiceCategory;
  natureza: "recorrente" | "ocasional" | string;
  servico_ocasional?: boolean;
  ativo?: boolean;
  recomendado?: boolean;
  aplicavel?: boolean;
  tipo_negocio_ids?: string[];
  tipos_negocio?: Array<{
    id: string;
    nome?: string;
    slug?: string;
    principal?: boolean;
  }>;
  metadata?: Record<string, unknown>;
  especialidades_compativeis?: TeamSpecialty[];
  compatibilidades?: ServiceCatalogSpecialty[];
};

export type SalonServicePayload = {
  servico_catalogo_id?: string;
  codigo_canonico?: string;
  nome?: string;
  descricao?: string | null;
  duracao_minutos?: number | null;
  preco?: number | null;
  categoria?: ServiceCategory | null;
  permite_online?: boolean;
  ativo?: boolean;
  ordem_exibicao?: number;
  especialidade_ids?: string[];
  especialidades_config?: Array<{
    especialidade_id: string;
    duracao_minutos?: number | null;
    preco?: number | null;
    dias_retorno_recomendado?: number | null;
    aceita_agendamento_online?: boolean;
    ativo?: boolean;
  }>;
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
  especialidade_ids: "Especialidades vinculadas",
  especialidades_config: "Configuração por especialidade"
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

async function listCatalog(session: AuthSession | null) {
  return request<ServiceCatalog[]>(session, "/services/catalog");
}

async function detail(session: AuthSession | null, id: string) {
  return request<SalonService>(session, `/services/${id}`);
}

async function listCompatibleSpecialties(
  session: AuthSession | null,
  filters: { servico_catalogo_id?: string; codigo_canonico?: string; nome?: string; categoria?: ServiceCategory | "" | null }
) {
  const params = new URLSearchParams();
  if (filters.servico_catalogo_id) {
    params.set("servico_catalogo_id", filters.servico_catalogo_id);
  }
  if (filters.codigo_canonico) {
    params.set("codigo_canonico", filters.codigo_canonico);
  }
  if (filters.nome) {
    params.set("nome", filters.nome);
  }
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
  listCatalog,
  detail,
  listCompatibleSpecialties,
  create,
  update,
  remove
};
