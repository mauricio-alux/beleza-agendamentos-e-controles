import type { AuthSession } from "@/services/auth.service";

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

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";

function friendlyError(status: number) {
  if (status === 401) {
    return "Sessao expirada. Entre novamente.";
  }

  if (status === 403) {
    return "Nao foi possivel acessar este salao.";
  }

  if (status >= 500) {
    return "Nao foi possivel salvar. Tente novamente.";
  }

  return "Nao foi possivel salvar. Tente novamente.";
}

async function request<T>(path: string, token: string, init: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        ...(init.headers || {})
      }
    });
  } catch {
    throw new Error("Conexao perdida. Tente novamente.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(friendlyError(response.status));
  }

  if (!payload.data) {
    throw new Error("Nao foi possivel carregar os dados.");
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
  updateTenant,
  updateTenantSettings,
  updateStep,
  complete
};
