import type { AuthSession } from "@/services/auth.service";
import { normalizeUserMessage } from "@/lib/messages";
import { API_URL } from "@/config/app-brand";

export type OnboardingStepName =
  | "tenant_created"
  | "admin_created"
  | "services_created"
  | "professional_created"
  | "scale_created"
  | "booking_link_created"
  | "onboarding_completed";

export type BackendOnboardingStep = {
  id?: string;
  step: OnboardingStepName;
  status: "pendente" | "em_andamento" | "concluido" | "ignorado";
  completed_at?: string | null;
  metadata?: Record<string, unknown>;
};

export type OnboardingStatus = {
  steps: BackendOnboardingStep[];
  total: number;
  completed: number;
  progress: number;
};

export type TenantSettings = {
  tenant_id: string;
  nome_fantasia: string;
  slug: string;
  timezone: string;
  moeda: string;
  idioma: string;
  formato_agenda: string;
  horario_inicio_padrao: string;
  horario_fim_padrao: string;
  intervalo_agendamento: number;
  duracao_padrao_servico: number;
  fl_whatsapp_ativo: boolean;
  fl_agendamento_online: boolean;
  status_onboarding: string;
  raw?: {
    tenant?: {
      id: string;
      nome_fantasia: string;
      telefone?: string | null;
      endereco?: Record<string, unknown>;
      configuracoes?: Record<string, unknown>;
    };
    configuracoes_tenant?: Record<string, unknown>;
  };
};

export type OnboardingService = {
  id: string;
  nome: string;
  duracao_minutos: number;
  preco: number;
  categoria?: string | null;
  ativo?: boolean;
  metadata?: Record<string, unknown>;
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

const REQUEST_TIMEOUT_MS = 10000;

function friendlyError(status: number) {
  if (status === 401) {
    return "Sessao expirada. Entre novamente.";
  }

  if (status === 403) {
    return "Não foi possível acessar este salão.";
  }

  if (status >= 500) {
    return "Não foi possível salvar. Tente novamente.";
  }

  return "Não foi possível salvar. Tente novamente.";
}

async function request<T>(path: string, token: string, init: RequestInit = {}) {
  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {})
      }
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A conexao com o servidor demorou demais. Tente novamente.");
    }

    throw new Error(`Não foi possível conectar ao servidor local em ${API_URL}. Verifique se o backend está ativo.`);
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  clearTimeout(timeoutId);

  if (!response.ok) {
    throw new Error(normalizeUserMessage(
      payload.message || payload.error?.message || friendlyError(response.status),
      "error",
      payload.code || payload.error?.code
    ));
  }

  if (!payload.data) {
    throw new Error("Não foi possível carregar os dados.");
  }

  return payload.data;
}

function getToken(session: AuthSession | null) {
  if (!session?.access_token) {
    throw new Error("Sessao expirada. Entre novamente.");
  }

  return session.access_token;
}

async function getStatus(session: AuthSession | null) {
  return request<OnboardingStatus>("/onboarding/status", getToken(session));
}

async function getTenantSettings(session: AuthSession | null) {
  return request<TenantSettings>("/tenant/settings", getToken(session));
}

async function listServices(session: AuthSession | null) {
  return request<OnboardingService[]>("/services", getToken(session));
}

async function updateTenant(session: AuthSession | null, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/tenants/current", getToken(session), {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function updateTenantSettings(session: AuthSession | null, payload: Record<string, unknown>) {
  return request<Record<string, unknown>>("/tenants/current/settings", getToken(session), {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function updateStep(
  session: AuthSession | null,
  step: OnboardingStepName,
  payload: { status: BackendOnboardingStep["status"]; metadata?: Record<string, unknown> }
) {
  return request<BackendOnboardingStep>(`/onboarding/steps/${step}`, getToken(session), {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function complete(session: AuthSession | null) {
  return request<{ tenant: Record<string, unknown>; onboarding: OnboardingStatus }>(
    "/onboarding/complete",
    getToken(session),
    { method: "POST" }
  );
}

export const onboardingService = {
  getStatus,
  getTenantSettings,
  listServices,
  updateTenant,
  updateTenantSettings,
  updateStep,
  complete
};
