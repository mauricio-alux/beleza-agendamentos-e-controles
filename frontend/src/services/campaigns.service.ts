import type { AuthSession } from "@/services/auth.service";
import { API_URL } from "@/config/app-brand";

export type CampaignTemplate = {
  id: string;
  nome: string;
  canal: "whatsapp";
  tipo: string;
  conteudo: string;
  variaveis: string[];
  aprovado_provider: boolean;
  provider_template_name?: string | null;
  language?: string | null;
  categoria_provider?: string | null;
  metadata?: Record<string, string | number | boolean | null>;
};

export type CampaignCoupon = {
  id: string;
  codigo: string;
  nome?: string | null;
  descricao?: string | null;
  tipo_desconto: "valor" | "percentual" | "preco_promocional";
  valor_desconto?: number | null;
  percentual_desconto?: number | null;
  data_fim?: string | null;
  limite_uso?: number | null;
  total_usos?: number | null;
  ativo: boolean;
  servicos?: Array<{
    escopo?: "geral" | "servico" | "especialidade" | "combinacao" | "servico_legado";
    servico_id?: string | null;
    servico_tenant_id?: string | null;
    especialidade_id?: string | null;
    servico_tenant_especialidade_id?: string | null;
  }>;
};

export type CampaignServiceSpecialtyConfig = {
  id: string;
  especialidade_id: string;
  nome?: string | null;
  preco?: number | null;
  duracao_minutos?: number | null;
  dias_retorno_recomendado?: number | null;
  aceita_agendamento_online?: boolean | null;
  ativo?: boolean | null;
};

export type CampaignService = {
  id: string;
  servico_tenant_id?: string | null;
  servico_catalogo_id?: string | null;
  codigo_canonico?: string | null;
  nome: string;
  categoria?: string | null;
  natureza?: string | null;
  preco?: number | null;
  especialidades_config?: CampaignServiceSpecialtyConfig[];
};

export type CampaignAudienceMetrics = {
  found: number;
  eligible: number;
  excluded: number;
  excluded_by_reason: Record<string, number>;
};

export type Campaign = {
  id: string;
  nome: string;
  descricao?: string | null;
  tipo: string;
  canal: "whatsapp";
  template_id?: string | null;
  servico_id?: string | null;
  servico_tenant_id?: string | null;
  servico_catalogo_id?: string | null;
  especialidade_id?: string | null;
  servico_tenant_especialidade_id?: string | null;
  status: string;
  origem_campanha?: "tenant" | "plataforma" | "ia";
  tipo_publico?: "clientes" | "usuarios_saas";
  natureza_campanha?: "promocional" | "relacionamento" | "institucional" | "operacional";
  status_campanha?: "SUGERIDA" | "APROVADA" | "PARAMETRIZADA" | "AGENDADA" | "EM_ANDAMENTO" | "ENCERRADA" | "REJEITADA";
  status_processamento?: "PENDENTE" | "EM_PROCESSAMENTO" | "CONCLUIDO" | "ERRO";
  estrategia_envio?: "UNICO" | "RECORRENTE" | "EVENTO";
  intervalo_envio_dias?: number | null;
  prioridade_campanha?: number;
  criterios_segmentacao: Record<string, unknown>;
  parametros_template: Record<string, unknown>;
  data_inicio?: string | null;
  data_fim?: string | null;
  agendada_para?: string | null;
  iniciada_em?: string | null;
  concluida_em?: string | null;
  cancelada_em?: string | null;
  total_destinatarios: number;
  total_geradas: number;
  total_processadas: number;
  total_enviadas: number;
  total_entregues: number;
  total_lidas: number;
  total_falhas: number;
  total_canceladas?: number;
  tracking_token?: string | null;
  template?: CampaignTemplate | null;
  cupom?: CampaignCoupon | null;
  servico?: CampaignService | null;
  metadata?: Record<string, unknown>;
  metrics?: {
    taxa_entrega: number;
    taxa_leitura: number;
    taxa_falha: number;
  };
  audience_metrics?: CampaignAudienceMetrics;
  created_at: string;
  updated_at: string;
};

export type CampaignSuggestion = {
  key: string;
  tipo: string;
  title: string;
  description: string;
  reason: string;
  criteria: Record<string, unknown>;
  origin: "ai_suggestion";
  lifecycle_stage: "suggestion";
  requires_approval: boolean;
  recommended_template_id?: string | null;
  recommended_template_name?: string | null;
};

export type CampaignListFilters = {
  search?: string;
  status?: string;
  tipo?: string;
  ativo?: "all" | "true" | "false";
  created_from?: string;
  created_to?: string;
  send_from?: string;
  send_to?: string;
  page?: number;
  page_size?: number;
};

export type CampaignListResponse = {
  items: Campaign[];
  pagination: {
    page: number;
    page_size: number;
    total: number;
    total_pages: number;
    has_next: boolean;
    has_previous: boolean;
  };
  diagnostics?: {
    criteria?: Record<string, unknown>;
    limitation_reason?: string;
  };
};

export type CampaignMessage = {
  id: string;
  cliente_id?: string | null;
  telefone_destino?: string | null;
  template_nome?: string | null;
  status_envio: string;
  tentativas?: number;
  erro_envio?: string | null;
  enviado_em?: string | null;
  created_at: string;
  cliente?: {
    id: string;
    nome: string;
    telefone?: string | null;
  } | null;
};

export type CampaignEstimate = CampaignAudienceMetrics & {
  sample: Array<{
    cliente_id: string;
    nome: string;
    telefone: string;
    eligible: boolean;
    exclusions: string[];
  }>;
};

export type CampaignPreview = {
  conteudo: string;
  template?: CampaignTemplate | null;
  params: Record<string, string>;
  provider_params: string[];
  preview_source?: "templates_mensagem" | "mensagens_whatsapp";
  illustrative?: boolean;
  recipient: {
    cliente_id?: string | null;
    nome: string;
    telefone?: string | null;
  };
  creates_queue: boolean;
};

export type CampaignMeta = {
  templates: CampaignTemplate[];
  coupons: CampaignCoupon[];
  services: CampaignService[];
};

type ApiEnvelope<T> = {
  data?: T;
  error?: { message?: string };
};

async function request<T>(session: AuthSession | null, path: string, init: RequestInit = {}) {
  if (!session?.access_token) throw new Error("Sessao expirada. Entre novamente.");
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init.headers || {})
    }
  });
  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  if (!response.ok || payload.data === undefined) {
    throw new Error(payload.error?.message || "Não foi possível carregar campanhas.");
  }
  return payload.data;
}

function buildQuery(filters: CampaignListFilters = {}) {
  const params = new URLSearchParams();
  Object.entries(filters).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "" || value === "all") return;
    params.set(key, String(value));
  });
  const query = params.toString();
  return query ? `?${query}` : "";
}

async function list(session: AuthSession | null, filters: CampaignListFilters = {}) {
  const data = await request<CampaignListResponse | Campaign[]>(session, `/campaigns${buildQuery(filters)}`);
  if (Array.isArray(data)) {
    return {
      items: data,
      pagination: {
        page: 1,
        page_size: data.length,
        total: data.length,
        total_pages: 1,
        has_next: false,
        has_previous: false
      }
    } satisfies CampaignListResponse;
  }
  return data;
}

async function meta(session: AuthSession | null) {
  return request<CampaignMeta>(session, "/campaigns/meta");
}

async function suggestions(session: AuthSession | null) {
  return request<CampaignSuggestion[]>(session, "/campaigns/suggestions");
}

async function createFromSuggestion(session: AuthSession | null, key: string) {
  return request<Campaign>(session, `/campaigns/suggestions/${encodeURIComponent(key)}`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

async function create(session: AuthSession | null, payload: Record<string, unknown>) {
  return request<Campaign>(session, "/campaigns", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function estimate(session: AuthSession | null, id: string) {
  return request<CampaignEstimate>(session, `/campaigns/${id}/estimate`, {
    method: "POST",
    body: JSON.stringify({})
  });
}

async function preview(session: AuthSession | null, id: string, payload: Record<string, unknown> = {}) {
  return request<CampaignPreview>(session, `/campaigns/${id}/preview`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function start(session: AuthSession | null, id: string) {
  return request<Campaign>(session, `/campaigns/${id}/start`, { method: "POST" });
}

async function approve(session: AuthSession | null, id: string, payload: Record<string, unknown>) {
  return request<Campaign>(session, `/campaigns/${id}/approve`, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function reject(session: AuthSession | null, id: string, motivo = "") {
  return request<Campaign>(session, `/campaigns/${id}/reject`, {
    method: "POST",
    body: JSON.stringify({ motivo })
  });
}

async function schedule(session: AuthSession | null, id: string, agendada_para: string) {
  return request<Campaign>(session, `/campaigns/${id}/schedule`, {
    method: "POST",
    body: JSON.stringify({ agendada_para })
  });
}

async function cancel(session: AuthSession | null, id: string) {
  return request<Campaign>(session, `/campaigns/${id}/cancel`, { method: "POST" });
}

async function messages(session: AuthSession | null, id: string) {
  return request<CampaignMessage[]>(session, `/campaigns/${id}/messages`);
}

async function createCoupon(session: AuthSession | null, payload: Record<string, unknown>) {
  return request<CampaignCoupon>(session, "/campaigns/coupons", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export const campaignsService = {
  list,
  meta,
  suggestions,
  createFromSuggestion,
  create,
  estimate,
  preview,
  start,
  approve,
  reject,
  schedule,
  cancel,
  messages,
  createCoupon
};
