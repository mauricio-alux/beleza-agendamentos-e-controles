import type { AuthSession, BelloryTenant, BelloryUser } from "@/services/auth.service";
import type { BusinessType } from "@/constants/business-types";

export type SettingsSectionId =
  | "profile"
  | "tenant"
  | "operation"
  | "services"
  | "team"
  | "subscription"
  | "security"
  | "platform";

export type SettingsSection = {
  id: SettingsSectionId;
  label: string;
  description: string;
  href: string;
};

export type SettingsProfile = Pick<
  BelloryUser,
  "id" | "tenant_id" | "nome" | "email" | "telefone" | "tipo_usuario" | "foto_url"
> & {
  preferencias?: Record<string, unknown>;
};

export type SettingsTenant = BelloryTenant & {
  razao_social?: string | null;
  cpf_cnpj?: string | null;
  email?: string | null;
  telefone?: string | null;
  tipo_negocio?: string | null;
  business_type?: BusinessType | null;
  logo_url?: string | null;
  endereco?: Record<string, unknown>;
  configuracoes?: Record<string, unknown>;
};

export type SettingsOperation = {
  antecedencia_minima_minutos: number;
  janela_agendamento_dias: number;
  tolerancia_atraso_minutos: number;
  intervalo_padrao_minutos: number;
  evita_buracos_agenda: boolean;
  permite_cancelamento_cliente: boolean;
  limite_cancelamento_horas: number;
  confirmation_policy: "strict" | "flexible" | "auto_confirm";
  attendant_confirmation_timeout_minutes: number;
  client_confirmation_timeout_minutes: number;
  weekly_booking_limit: number;
  block_when_weekly_limit_exceeded: boolean;
  configuracoes_whatsapp?: Record<string, unknown>;
  configuracoes_ia?: Record<string, unknown>;
};

export type SettingsSummary = {
  role: string;
  sections: SettingsSection[];
  entryPoints: {
    desktop: string[];
    mobile: string[];
    dashboard: string[];
  };
  profile: SettingsProfile;
  tenant: SettingsTenant | null;
  operation: SettingsOperation | null;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";

export class SettingsApiError extends Error {
  status: number;
  code?: string;

  constructor(message: string, status: number, code?: string) {
    super(message);
    this.name = "SettingsApiError";
    this.status = status;
    this.code = code;
  }

  get isAuthError() {
    return this.status === 401 || this.code === "UNAUTHORIZED";
  }
}

async function request<T>(path: string, session: AuthSession, init: RequestInit = {}) {
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
    throw new SettingsApiError(
      payload.error?.message || "Nao foi possivel carregar as configuracoes.",
      response.status,
      payload.error?.code
    );
  }

  if (!payload.data) {
    throw new Error("Resposta invalida do servidor.");
  }

  return payload.data;
}

async function getSummary(session: AuthSession, signal?: AbortSignal) {
  return request<SettingsSummary>("/settings/summary", session, { signal });
}

async function updateProfile(session: AuthSession, payload: Partial<SettingsProfile>) {
  return request<SettingsProfile>("/settings/profile", session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function updateTenant(session: AuthSession, payload: Partial<SettingsTenant>) {
  return request<SettingsTenant>("/settings/tenant", session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

async function updateOperation(session: AuthSession, payload: Partial<SettingsOperation>) {
  return request<SettingsOperation>("/settings/operation", session, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export const settingsService = {
  getSummary,
  updateProfile,
  updateTenant,
  updateOperation
};
