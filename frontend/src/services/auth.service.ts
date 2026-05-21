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
  tenant_id: string;
  nome: string;
  email: string;
  telefone?: string | null;
  tipo_usuario: string;
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

export type AuthSession = {
  access_token: string;
  refresh_token: string;
  token_type?: string;
  expires_in?: number | null;
  expires_at?: number | null;
  user: AuthUser;
  usuario: BelloryUser;
  tenant: BelloryTenant;
};

type LoginPayload = {
  email: string;
  senha: string;
  persist?: boolean;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";
const SESSION_KEY = "bellory.session";

function getFriendlyError(status: number, code?: string, message?: string) {
  if (status === 401 || code === "UNAUTHORIZED") {
    return "Email ou senha inválidos.";
  }

  if (status === 402 || code === "TRIAL_EXPIRED" || code === "SUBSCRIPTION_INACTIVE") {
    return "Sua assinatura precisa de atenção para continuar.";
  }

  if (status === 403) {
    return "Não foi possível acessar este tenant. Tente novamente.";
  }

  if (status === 404) {
    return "Usuário ou tenant não encontrado.";
  }

  if (status >= 500) {
    return "Não foi possível conectar. Tente novamente.";
  }

  return message || "Não foi possível conectar. Tente novamente.";
}

async function request<T>(path: string, init: RequestInit = {}) {
  let response: Response;

  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: {
        "Content-Type": "application/json",
        ...(init.headers || {})
      }
    });
  } catch {
    throw new Error("Não foi possível conectar. Tente novamente.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    throw new Error(getFriendlyError(response.status, payload.error?.code, payload.error?.message));
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
    tenant: BelloryTenant;
    tenant_id: string;
    tipo_usuario: string;
  }>("/auth/me", {
    method: "GET",
    headers: {
      Authorization: `Bearer ${accessToken}`
    }
  });
}

export const authService = {
  login,
  logout,
  refreshToken,
  me,
  saveSession,
  getStoredSession,
  clearSession
};
