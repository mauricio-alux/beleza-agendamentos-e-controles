import type { AuthSession } from "@/services/auth.service";
import type { ServiceCatalog } from "@/services/services.service";
import { API_URL } from "@/config/app-brand";

export type BusinessType = {
  id: string;
  nome: string;
  slug: string;
  descricao?: string | null;
  icone?: string | null;
  ativo: boolean;
  ordem_exibicao?: number | null;
  metrics?: {
    servicos_associados: number;
    servicos_aplicaveis?: number;
    servicos_recomendados?: number;
    tenants_associados: number;
  };
};

export type BusinessTypeCatalogAssociation = {
  id?: string;
  tipo_negocio_id: string;
  servico_catalogo_id: string;
  aplicavel?: boolean;
  recomendado?: boolean;
  recomendado_deprecated?: boolean;
  ativo: boolean;
  ordem_exibicao?: number | null;
  servico_catalogo?: ServiceCatalog | null;
};

export type CatalogSpecialtyAssociation = {
  id: string;
  servico_catalogo_id: string;
  especialidade_id: string;
  ativo: boolean;
  especialidade?: {
    id: string;
    nome: string;
    ativo: boolean;
    taxonomy_category_key?: string | null;
  } | null;
};

export type TaxonomyRole = {
  id: string;
  nome: string;
  descricao?: string | null;
  categoria_profissional: "operacional" | "administrativo";
  ativo: boolean;
  metrics?: {
    especialidades: number;
  };
};

export type TaxonomySpecialty = {
  id: string;
  cargo_id: string;
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  tenant_id?: string | null;
  taxonomy_category_key?: string | null;
  is_official?: boolean;
  is_custom?: boolean;
  cargo?: TaxonomyRole | null;
};

export type OperationalProfileService = {
  id: string;
  servico_catalogo_id: string;
  recomendado: boolean;
  obrigatorio: boolean;
  ativo: boolean;
  prioridade: number;
  servico_catalogo?: ServiceCatalog | null;
};

export type OperationalProfileRole = {
  id: string;
  cargo_id: string;
  recomendado: boolean;
  principal: boolean;
  ativo: boolean;
  prioridade: number;
  cargo?: TaxonomyRole | null;
};

export type OperationalProfileDefault = {
  id: string;
  servico_catalogo_id: string;
  especialidade_id?: string | null;
  region_scope: "global" | "country" | "state" | "city";
  country?: string | null;
  state?: string | null;
  city?: string | null;
  preco_min_referencia?: number | null;
  preco_referencia?: number | null;
  preco_max_referencia?: number | null;
  duracao_minutos?: number | null;
  dias_retorno_recomendado?: number | null;
  aceita_agendamento_online: boolean;
  fonte: string;
  ativo: boolean;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
};

export type OperationalProfile = {
  id: string;
  tipo_negocio_id: string;
  tipo_negocio?: BusinessType | null;
  classificacao: "especializado" | "generalista";
  nome: string;
  descricao?: string | null;
  ativo: boolean;
  exige_confirmacao_onboarding: boolean;
  taxonomy_version: string;
  origem: string;
  metrics?: {
    servicos: number;
    cargos: number;
    defaults: number;
  };
  servicos?: OperationalProfileService[];
  cargos?: OperationalProfileRole[];
  defaults?: OperationalProfileDefault[];
  servicos_recomendados?: OperationalProfileService[];
  cargos_recomendados?: OperationalProfileRole[];
  servicos_candidatos?: BusinessTypeCatalogAssociation[];
  cargos_candidatos?: Array<{
    cargo_id: string;
    principal: boolean;
    especialidade_ids?: string[];
    cargo?: TaxonomyRole | null;
  }>;
};

export type TenantBusinessType = {
  id: string;
  tenant_id: string;
  tipo_negocio_id: string;
  principal: boolean;
  ativo: boolean;
  descricao_tipo_negocio?: string | null;
  tipo_negocio?: BusinessType | null;
};

export type TenantCatalogSegmentation = {
  tipos_tenant: TenantBusinessType[];
  recomendados: ServiceCatalog[];
  aplicaveis: ServiceCatalog[];
  catalogo_adicional: ServiceCatalog[];
};

type BusinessTypePayload = {
  nome: string;
  slug?: string;
  descricao?: string | null;
  icone?: string | null;
  ativo?: boolean;
  ordem_exibicao?: number | null;
};

type AdminCatalogPayload = {
  codigo_canonico?: string;
  nome?: string;
  descricao?: string | null;
  categoria_key?: string;
  natureza?: "recorrente" | "ocasional";
  ativo?: boolean;
  metadata?: Record<string, unknown>;
};

type AdminRolePayload = {
  nome?: string;
  descricao?: string | null;
  categoria_profissional?: "operacional" | "administrativo";
  ativo?: boolean;
};

type AdminSpecialtyPayload = {
  cargo_id?: string;
  nome?: string;
  descricao?: string | null;
  taxonomy_category_key?: string;
  ativo?: boolean;
};

type OperationalProfilePayload = {
  classificacao?: "especializado" | "generalista";
  nome?: string;
  descricao?: string | null;
  ativo?: boolean;
  exige_confirmacao_onboarding?: boolean;
  metadata?: Record<string, unknown>;
};

type OperationalProfileServicePayload = {
  servico_catalogo_id: string;
  recomendado?: boolean;
  obrigatorio?: boolean;
  ativo?: boolean;
  prioridade?: number;
  metadata?: Record<string, unknown>;
};

type OperationalProfileRolePayload = {
  cargo_id: string;
  especialidade_id?: string;
  recomendado?: boolean;
  principal?: boolean;
  ativo?: boolean;
  prioridade?: number;
  metadata?: Record<string, unknown>;
};

type OperationalProfileDefaultPayload = {
  perfil_operacional_id: string;
  servico_catalogo_id: string;
  especialidade_id?: string | null;
  region_scope?: "global" | "country" | "state" | "city";
  country?: string | null;
  state?: string | null;
  city?: string | null;
  preco_min_referencia?: number | null;
  preco_referencia?: number | null;
  preco_max_referencia?: number | null;
  duracao_minutos?: number | null;
  dias_retorno_recomendado?: number | null;
  aceita_agendamento_online?: boolean;
  vigencia_inicio?: string | null;
  vigencia_fim?: string | null;
  fonte?: string;
  metadata?: Record<string, unknown>;
};

type ApiEnvelope<T> = {
  data?: T;
  message?: string;
  code?: string;
  error?: {
    code?: string;
    message?: string;
    details?: Array<{
      path?: Array<string | number>;
      message?: string;
      code?: string;
    }> | unknown;
  };
};

export class BusinessTypesApiError extends Error {
  code?: string;
  details?: unknown;

  constructor(message: string, code?: string, details?: unknown) {
    super(message);
    this.name = "BusinessTypesApiError";
    this.code = code;
    this.details = details;
  }
}

const VALIDATION_FIELD_LABELS: Record<string, string> = {
  servicos: "Serviços do catálogo",
  servico_catalogo_id: "Serviço do catálogo",
  recomendado: "Recomendado",
  ativo: "Aplicável",
  ordem_exibicao: "Ordem de exibição",
  nome: "Nome",
  slug: "Slug",
  categoria_key: "Categoria",
  taxonomy_category_key: "Categoria oficial",
  cargo_id: "Cargo"
};

function validationDetailsMessage(payload: ApiEnvelope<unknown>) {
  const code = payload.code || payload.error?.code;
  const details = payload.error?.details;
  if (code !== "VALIDATION_ERROR" || !Array.isArray(details) || !details.length) {
    return "";
  }

  return details
    .map((detail) => {
      const path = Array.isArray(detail.path) ? detail.path : [];
      const field = String(path[path.length - 1] || path[0] || "");
      const label = VALIDATION_FIELD_LABELS[field] || field || "Campo";
      return `${label}: ${detail.message || "valor inválido."}`;
    })
    .join(" ");
}

async function request<T>(path: string, session?: AuthSession | null, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(session?.access_token ? { Authorization: `Bearer ${session.access_token}` } : {}),
      ...(init.headers || {})
    }
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || !payload.data) {
    const validationMessage = validationDetailsMessage(payload);
    throw new BusinessTypesApiError(
      validationMessage || payload.message || payload.error?.message || "Não foi possível carregar tipos de negócio.",
      payload.code || payload.error?.code,
      payload.error?.details
    );
  }

  return payload.data;
}

async function listActive() {
  return request<BusinessType[]>("/tipos-negocio/ativos");
}

async function listTenantTypes(session: AuthSession | null) {
  return request<TenantBusinessType[]>("/tipos-negocio/tenant", session);
}

async function updateTenantTypes(
  session: AuthSession | null,
  payload: {
    principal_tipo_negocio_id: string;
    tipo_negocio_ids: string[];
    descricao_tipo_negocio?: string | null;
  }
) {
  return request<TenantBusinessType[]>("/tipos-negocio/tenant", session, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

async function listTenantCatalog(session: AuthSession | null) {
  return request<TenantCatalogSegmentation>("/tipos-negocio/tenant/servicos-catalogo-disponiveis", session);
}

async function listAdmin(session: AuthSession | null, filters: Record<string, string> = {}) {
  const params = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)));
  const query = params.toString();
  return request<BusinessType[]>(`/admin/tipos-negocio${query ? `?${query}` : ""}`, session);
}

async function createAdmin(session: AuthSession | null, payload: BusinessTypePayload) {
  return request<BusinessType>("/admin/tipos-negocio", session, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateAdmin(session: AuthSession | null, id: string, payload: Partial<BusinessTypePayload>) {
  return request<BusinessType>(`/admin/tipos-negocio/${id}`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function updateStatus(session: AuthSession | null, id: string, ativo: boolean) {
  return request<BusinessType>(`/admin/tipos-negocio/${id}/status`, session, {
    method: "PATCH",
    body: JSON.stringify({ ativo })
  });
}

async function listAdminCatalog(session: AuthSession | null) {
  return request<ServiceCatalog[]>("/admin/tipos-negocio-catalogo", session);
}

async function createAdminCatalog(session: AuthSession | null, payload: AdminCatalogPayload) {
  return request<ServiceCatalog>("/admin/tipos-negocio-catalogo", session, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateAdminCatalog(session: AuthSession | null, id: string, payload: AdminCatalogPayload) {
  return request<ServiceCatalog>(`/admin/tipos-negocio-catalogo/${id}`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function listAdminSpecialties(session: AuthSession | null) {
  return request<Array<{ id: string; nome: string; taxonomy_category_key?: string | null }>>("/admin/tipos-negocio-especialidades", session);
}

async function listAdminCatalogSpecialties(session: AuthSession | null, id: string) {
  return request<CatalogSpecialtyAssociation[]>(`/admin/tipos-negocio-catalogo/${id}/especialidades`, session);
}

async function replaceAdminCatalogSpecialties(session: AuthSession | null, id: string, especialidadeIds: string[]) {
  return request<CatalogSpecialtyAssociation[]>(`/admin/tipos-negocio-catalogo/${id}/especialidades`, session, {
    method: "PUT",
    body: JSON.stringify({ especialidade_ids: especialidadeIds })
  });
}

async function listAdminTypeServices(session: AuthSession | null, id: string) {
  return request<BusinessTypeCatalogAssociation[]>(`/admin/tipos-negocio/${id}/servicos`, session);
}

async function replaceAdminTypeServices(
  session: AuthSession | null,
  id: string,
  servicos: Array<{
    servico_catalogo_id: string;
    ativo?: boolean;
    ordem_exibicao?: number | null;
  }>
) {
  return request<BusinessTypeCatalogAssociation[]>(`/admin/tipos-negocio/${id}/servicos`, session, {
    method: "PUT",
    body: JSON.stringify({ servicos })
  });
}

async function listAdminRoles(session: AuthSession | null) {
  return request<TaxonomyRole[]>("/admin/taxonomia/cargos", session);
}

async function createAdminRole(session: AuthSession | null, payload: AdminRolePayload) {
  return request<TaxonomyRole>("/admin/taxonomia/cargos", session, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateAdminRole(session: AuthSession | null, id: string, payload: AdminRolePayload) {
  return request<TaxonomyRole>(`/admin/taxonomia/cargos/${id}`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function listAdminGlobalSpecialties(session: AuthSession | null) {
  return request<TaxonomySpecialty[]>("/admin/taxonomia/especialidades", session);
}

async function createAdminSpecialty(session: AuthSession | null, payload: AdminSpecialtyPayload) {
  return request<TaxonomySpecialty>("/admin/taxonomia/especialidades", session, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateAdminSpecialty(session: AuthSession | null, id: string, payload: AdminSpecialtyPayload) {
  return request<TaxonomySpecialty>(`/admin/taxonomia/especialidades/${id}`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function listOperationalProfiles(session: AuthSession | null) {
  return request<OperationalProfile[]>("/admin/taxonomia/perfis-operacionais", session);
}

async function updateOperationalProfile(session: AuthSession | null, id: string, payload: OperationalProfilePayload) {
  return request<OperationalProfile>(`/admin/taxonomia/perfis-operacionais/${id}`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function upsertOperationalProfileService(session: AuthSession | null, id: string, payload: OperationalProfileServicePayload) {
  return request<OperationalProfileService>(`/admin/taxonomia/perfis-operacionais/${id}/servicos`, session, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

async function upsertOperationalProfileRole(session: AuthSession | null, id: string, payload: OperationalProfileRolePayload) {
  return request<OperationalProfileRole>(`/admin/taxonomia/perfis-operacionais/${id}/cargos`, session, {
    method: "PUT",
    body: JSON.stringify(payload)
  });
}

async function createOperationalProfileDefault(session: AuthSession | null, payload: OperationalProfileDefaultPayload) {
  return request<OperationalProfileDefault>("/admin/taxonomia/perfis-operacionais/defaults", session, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateOperationalProfileDefault(session: AuthSession | null, id: string, payload: Partial<OperationalProfileDefaultPayload>) {
  return request<OperationalProfileDefault>(`/admin/taxonomia/perfis-operacionais/defaults/${id}`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export const businessTypesService = {
  listActive,
  listTenantTypes,
  updateTenantTypes,
  listTenantCatalog,
  listAdmin,
  createAdmin,
  updateAdmin,
  updateStatus,
  listAdminCatalog,
  createAdminCatalog,
  updateAdminCatalog,
  listAdminSpecialties,
  listAdminCatalogSpecialties,
  replaceAdminCatalogSpecialties,
  listAdminTypeServices,
  replaceAdminTypeServices,
  listAdminRoles,
  createAdminRole,
  updateAdminRole,
  listAdminGlobalSpecialties,
  createAdminSpecialty,
  updateAdminSpecialty,
  listOperationalProfiles,
  updateOperationalProfile,
  upsertOperationalProfileService,
  upsertOperationalProfileRole,
  createOperationalProfileDefault,
  updateOperationalProfileDefault
};
