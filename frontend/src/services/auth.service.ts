import { normalizeUserMessage } from "@/lib/messages";
import { API_URL } from "@/config/app-brand";

export type AuthUser = {
  id: string;
  email: string;
  phone?: string | null;
  role?: string;
  created_at?: string;
  updated_at?: string;
  last_sign_in_at?: string;
  user_metadata?: Record<string, unknown>;
};

export type BelloryUser = {
  id: string;
  tenant_id?: string | null;
  nome: string;
  email: string;
  telefone?: string | null;
  tipo_usuario: string;
  tipo_usuario_global?: string;
  foto_url?: string | null;
};

export type BelloryTenant = {
  id: string;
  nome_fantasia: string;
  slug: string;
  status: string;
  plano_id?: string | null;
  timezone?: string | null;
};

export type BelloryMembership = {
  id: string;
  usuario_id: string;
  tenant_id: string;
  role: string;
  status: string;
  profissional_id?: string | null;
  is_primary: boolean;
  vinculo_tipo?: string | null;
  is_owner?: boolean;
  marketplace_enabled?: boolean;
  marketplace_profile?: Record<string, unknown>;
  metadata?: Record<string, unknown>;
  tenant?: BelloryTenant | null;
};

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number | null;
  expires_at?: number | null;
  user: AuthUser;
  usuario: BelloryUser;
  tenant: BelloryTenant | null;
  tenant_id?: string | null;
  tipo_usuario?: string;
  active_membership?: BelloryMembership | null;
  memberships?: BelloryMembership[];
  permissions?: string[];
  permissionContext?: {
    role?: {
      nome?: string;
      escopo?: string;
      dashboard?: string;
    } | null;
    scope?: string;
    permissions?: string[];
  } | null;
};

type LoginPayload = {
  email: string;
  senha: string;
  persist?: boolean;
};

type RecoverPasswordPayload = {
  email: string;
};

type ResetPasswordPayload = {
  access_token: string;
  senha: string;
};

type AuthActionResponse = {
  success: boolean;
  message: string;
};

type ApiEnvelope<T> = {
  data?: T;
  code?: string;
  message?: string;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

const SESSION_KEY = "bellory.session";
const REQUEST_TIMEOUT_MS = 15000;

function getFriendlyError(status: number, code?: string, message?: string) {
  if (status === 401 || code === "UNAUTHORIZED") {
    return "Email ou senha inválidos.";
  }

  if (status === 402 || code === "TRIAL_EXPIRED" || code === "SUBSCRIPTION_INACTIVE") {
    return "Sua assinatura precisa de atenção para continuar.";
  }

  if (status === 403) {
    return "Não foi possível acessar este estabelecimento. Tente novamente.";
  }

  if (status === 404) {
    return "Usuário ou estabelecimento não encontrado.";
  }

  if (status >= 500) {
    return "Não foi possível conectar. Tente novamente.";
  }

  return message || "Não foi possível conectar. Tente novamente.";
}

async function request<T>(path: string, init: RequestInit = {}) {
  let response: Response;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("A conexao com o servidor demorou demais. Tente novamente.");
    }
    throw new Error("Não foi possível conectar. Tente novamente.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;
  clearTimeout(timeoutId);

  if (!response.ok) {
    const code = payload.code || payload.error?.code;
    if (path === "/auth/login") {
      throw new Error(getFriendlyError(response.status, code, payload.message || payload.error?.message));
    }

    throw new Error(normalizeUserMessage(
      payload.message || payload.error?.message || getFriendlyError(response.status, code),
      "error",
      code
    ));
  }

  if (!payload.data) {
    throw new Error("Resposta inválida do servidor.");
  }

  return payload.data;
}

function saveSession(session: AuthSession) {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

function getStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = window.localStorage.getItem(SESSION_KEY);
  if (!raw) {
    return null;
  }

  try {
    return JSON.parse(raw) as AuthSession;
  } catch {
    window.localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

function clearSession() {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.removeItem(SESSION_KEY);
}

async function login(payload: LoginPayload) {
  const session = await request<AuthSession>("/auth/login", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email,
      senha: payload.senha
    })
  });

  if (payload.persist !== false) {
    saveSession(session);
  }

  return session;
}

async function recoverPassword(payload: RecoverPasswordPayload) {
  return request<AuthActionResponse>("/auth/recover-password", {
    method: "POST",
    body: JSON.stringify({
      email: payload.email
    })
  });
}

async function resetPassword(payload: ResetPasswordPayload) {
  return request<AuthActionResponse>("/auth/reset-password", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

async function refreshToken(refreshTokenValue: string) {
  const session = await request<AuthSession>("/auth/refresh", {
    method: "POST",
    body: JSON.stringify({ refresh_token: refreshTokenValue })
  });

  saveSession(session);
  return session;
}

async function logout(accessToken?: string | null) {
  if (accessToken) {
    await request<{ success: boolean }>("/auth/logout", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    }).catch(() => null);
  }

  clearSession();
}

async function me(accessToken: string) {
  return request<{
    auth_user: AuthUser;
    usuario: BelloryUser;
    tenant: BelloryTenant | null;
    tenant_id?: string | null;
    tipo_usuario: string;
    active_membership?: BelloryMembership | null;
    memberships?: BelloryMembership[];
    permissions?: string[];
    permissionContext?: AuthSession["permissionContext"];
  }>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export const authService = {
  login,
  recoverPassword,
  resetPassword,
  logout,
  refreshToken,
  me,
  saveSession,
  getStoredSession,
  clearSession
};
