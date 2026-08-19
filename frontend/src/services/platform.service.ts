import type { AuthSession } from "@/services/auth.service";
import { API_URL } from "@/config/app-brand";

export type PlatformSummary = {
  context: {
    type: "platform";
    role: "MasterAdmin";
    userId: string;
  };
  kpis: {
    mrr: number;
    churnRate: number;
    growthRate: number;
    tenantsActive: number;
    tenantsTrial: number;
    display: {
      mrr: string;
      churn: string;
      growth: string;
      tenantsActive: string;
      tenantsTrial: string;
    };
  };
  metrics: {
    tenants: Record<string, number>;
    subscriptions: Record<string, number>;
    usage: Record<string, number>;
    campaigns: Record<string, number>;
    health: Record<string, string>;
  };
  tenants: Array<{
    id: string;
    nome_fantasia: string;
    slug: string;
    status: string;
    created_at: string;
    subscription?: {
      status: string;
      valor_mensal?: number | null;
      plano?: string | null;
    } | null;
  }>;
  campaigns: Array<{
    id: string;
    nome: string;
    escopo: string;
    status: string;
    created_at: string;
  }>;
  auditLogs: Array<{
    id: string;
    event_type: string;
    origem: string;
    created_at: string;
    payload?: Record<string, unknown>;
  }>;
};

export type CommunicationTemplate = {
  id: string;
  tenant_id?: string | null;
  nome: string;
  canal: "whatsapp" | "email" | "sms" | "push";
  tipo: string;
  assunto?: string | null;
  conteudo: string;
  variaveis: string[];
  variaveis_detectadas?: string[];
  provider_template_name?: string | null;
  language?: string | null;
  categoria_provider?: string | null;
  provider_parameter_format?: string | null;
  provider_variable_mapping?: Record<string, number> | null;
  actions?: Array<{
    id: string;
    title?: string;
    action_type?: string;
    route?: string | null;
  }>;
  required_actions?: string[];
  ultima_sincronizacao_provider?: string | null;
  observacoes?: string | null;
  aprovado_provider: boolean;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type CommunicationTemplatePayload = {
  tenant_id?: string | null;
  nome?: string;
  canal?: "whatsapp" | "email" | "sms" | "push";
  tipo?: string;
  assunto?: string | null;
  conteudo?: string;
  variaveis?: string[];
  provider_template_name?: string | null;
  language?: string | null;
  categoria_provider?: string | null;
  provider_parameter_format?: string | null;
  provider_variable_mapping?: Record<string, number> | null;
  ultima_sincronizacao_provider?: string | null;
  observacoes?: string | null;
  aprovado_provider?: boolean;
  ativo?: boolean;
};

export type WhatsAppMessageLog = {
  id: string;
  tenant_id?: string | null;
  cliente_id?: string | null;
  profissional_id?: string | null;
  agendamento_id?: string | null;
  telefone_destino?: string | null;
  direcao: string;
  template_nome?: string | null;
  tipo_evento?: string | null;
  provider?: string | null;
  status_envio: string;
  erro_envio?: string | null;
  provider_message_id?: string | null;
  enviado_em?: string | null;
  agendado_para?: string | null;
  processado_em?: string | null;
  tentativas?: number;
  proxima_tentativa_em?: string | null;
  ultimo_erro_codigo?: string | null;
  ultimo_erro_mensagem?: string | null;
  idempotency_key?: string | null;
  created_at: string;
  updated_at: string;
  payload?: Record<string, unknown>;
};

export type CommunicationProviderStatus = {
  provider: string;
  channel: string;
  mode: "dry_run" | "cloud_api";
  cloud_api_enabled: boolean;
  dry_run: boolean;
  api_version: string;
  credentials: {
    access_token_configured: boolean;
    phone_number_id_configured: boolean;
    phone_number_id_masked?: string | null;
  };
  required_env: string[];
  secrets_exposed: boolean;
  maintenance: string;
  notes: string[];
};

export type PlatformPlan = {
  id: string;
  nome: string;
  preco_mensal: number;
};

export type PlatformSubscription = {
  id: string;
  tenant_id: string;
  tenant?: {
    id: string;
    nome_fantasia: string;
    slug: string;
    status: string;
    email?: string | null;
  } | null;
  plano_id: string;
  plano?: PlatformPlan | null;
  status: string;
  data_inicio: string;
  data_fim?: string | null;
  trial_ate?: string | null;
  proxima_renovacao?: string | null;
  expira_em?: string | null;
  bloqueio_motivo?: string | null;
  status_pagamento?: string;
  origem_ultima_alteracao?: string | null;
  ultima_alteracao_observacao?: string | null;
  alterado_por?: {
    id: string;
    nome: string;
    email: string;
  } | null;
  valor_mensal: number;
  ativo: boolean;
  created_at: string;
  updated_at: string;
};

export type PlatformSubscriptionHistory = {
  id: string;
  assinatura_id: string;
  tenant_id: string;
  status_anterior?: string | null;
  status_novo?: string | null;
  origem: string;
  tipo_alteracao: string;
  observacao?: string | null;
  created_at: string;
  usuario?: {
    nome: string;
    email: string;
  } | null;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    message?: string;
  };
};

async function request<T>(path: string, session: AuthSession, init: RequestInit = {}) {
  const response = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${session.access_token}`,
      ...(init.headers || {})
    }
  });

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok || !payload.data) {
    throw new Error(payload.error?.message || "Não foi possível carregar a plataforma.");
  }

  return payload.data;
}

async function getSummary(session: AuthSession) {
  return request<PlatformSummary>("/admin/summary", session);
}

async function listCommunicationTemplates(session: AuthSession) {
  return request<CommunicationTemplate[]>("/admin/communication/templates", session);
}

async function createCommunicationTemplate(session: AuthSession, payload: CommunicationTemplatePayload) {
  return request<CommunicationTemplate>("/admin/communication/templates", session, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function updateCommunicationTemplate(session: AuthSession, id: string, payload: CommunicationTemplatePayload) {
  return request<CommunicationTemplate>(`/admin/communication/templates/${id}`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function listWhatsAppMessages(session: AuthSession) {
  return request<WhatsAppMessageLog[]>("/admin/communication/whatsapp/messages", session);
}

async function listWhatsAppQueue(session: AuthSession) {
  return request<WhatsAppMessageLog[]>("/admin/communication/whatsapp/queue", session);
}

async function getCommunicationProviders(session: AuthSession) {
  return request<CommunicationProviderStatus>("/admin/communication/providers", session);
}

async function listPlans(session: AuthSession) {
  return request<PlatformPlan[]>("/admin/plans", session);
}

async function listSubscriptions(session: AuthSession, filters: Record<string, string> = {}) {
  const search = new URLSearchParams(Object.entries(filters).filter(([, value]) => Boolean(value)));
  const query = search.toString();
  return request<PlatformSubscription[]>(`/admin/subscriptions${query ? `?${query}` : ""}`, session);
}

async function updateSubscriptionStatus(
  session: AuthSession,
  id: string,
  payload: {
    status: string;
    origem?: string;
    observacao: string;
    motivo_bloqueio?: string | null;
    data_fim?: string | null;
    expira_em?: string | null;
    proxima_renovacao?: string | null;
    confirm: true;
  }
) {
  return request<PlatformSubscription>(`/admin/subscriptions/${id}/status`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function updateSubscriptionPlan(
  session: AuthSession,
  id: string,
  payload: {
    plano_id: string;
    tipo_alteracao?: "upgrade" | "downgrade" | "manual";
    origem?: string;
    observacao: string;
    confirm: true;
  }
) {
  return request<PlatformSubscription>(`/admin/subscriptions/${id}/plan`, session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function extendSubscriptionTrial(
  session: AuthSession,
  id: string,
  payload: {
    dias?: number;
    trial_ate?: string;
    observacao: string;
    confirm: true;
  }
) {
  return request<PlatformSubscription>(`/admin/subscriptions/${id}/extend-trial`, session, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function reactivateSubscription(
  session: AuthSession,
  id: string,
  payload: {
    plano_id?: string;
    expira_em?: string | null;
    proxima_renovacao?: string | null;
    observacao: string;
    confirm: true;
  }
) {
  return request<PlatformSubscription>(`/admin/subscriptions/${id}/reactivate`, session, {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function listSubscriptionHistory(session: AuthSession, id: string) {
  return request<PlatformSubscriptionHistory[]>(`/admin/subscriptions/${id}/history`, session);
}

export const platformService = {
  getSummary,
  listCommunicationTemplates,
  createCommunicationTemplate,
  updateCommunicationTemplate,
  listWhatsAppMessages,
  listWhatsAppQueue,
  getCommunicationProviders,
  listPlans,
  listSubscriptions,
  updateSubscriptionStatus,
  updateSubscriptionPlan,
  extendSubscriptionTrial,
  reactivateSubscription,
  listSubscriptionHistory
};
