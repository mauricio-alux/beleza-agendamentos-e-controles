import { authService, type AuthSession, type AuthUser } from "@/services/auth.service";

export type PublicPlan = {
  id: string;
  nome: string;
  slug?: string | null;
  preco_mensal?: number | null;
  ativo?: boolean;
};

export type RegisterPayload = {
  nome: string;
  email: string;
  senha: string;
  telefone: string;
  nome_salao: string;
  plano_id: string;
};

type RegisterResponse = {
  access_token: string | null;
  refresh_token: string | null;
  expires_at?: number | null;
  auth_user: AuthUser;
  session?: {
    token_type?: string;
    expires_in?: number | null;
    expires_at?: number | null;
  } | null;
  onboarding: {
    tenant: AuthSession["tenant"];
    usuario: AuthSession["usuario"];
  };
  onboarding_required?: boolean;
};

type ApiEnvelope<T> = {
  data?: T;
  error?: {
    code?: string;
    message?: string;
    details?: unknown;
  };
};

export type RegisterFieldErrors = {
  nome?: string;
  nome_salao?: string;
  email?: string;
  telefone?: string;
  senha?: string;
  confirmar_senha?: string;
  termos?: string;
};

type ValidationIssue = {
  path?: Array<string | number>;
  message?: string;
};

export class RegisterError extends Error {
  fieldErrors: RegisterFieldErrors;

  constructor(message: string, fieldErrors: RegisterFieldErrors = {}) {
    super(message);
    this.name = "RegisterError";
    this.fieldErrors = fieldErrors;
  }
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:3000";
const DEFAULT_SERVICES = [
  { nome: "Corte", duracao_minutos: 45, preco: 0, categoria: "Cabelo" },
  { nome: "Escova", duracao_minutos: 45, preco: 0, categoria: "Cabelo" },
  { nome: "Manicure", duracao_minutos: 60, preco: 0, categoria: "Unhas" },
  { nome: "Hidratacao", duracao_minutos: 60, preco: 0, categoria: "Cabelo" }
];

function friendlyError(status: number, code?: string, message = "") {
  const normalizedMessage = message.toLowerCase();

  if (status === 409 || code === "USER_EMAIL_ALREADY_EXISTS") {
    return "Email ja cadastrado.";
  }

  if (status === 429 || code === "AUTH_RATE_LIMIT") {
    return "Limite temporario do provedor de autenticacao. Tente novamente em alguns minutos.";
  }

  if (status === 400 || code === "AUTH_REGISTER_FAILED") {
    if (
      normalizedMessage.includes("already") ||
      normalizedMessage.includes("registered") ||
      normalizedMessage.includes("email")
    ) {
      return "Este email ja possui cadastro ou ficou pendente no provedor de autenticacao.";
    }

    if (normalizedMessage.includes("password") || normalizedMessage.includes("senha")) {
      return "A senha nao foi aceita. Use outra senha forte.";
    }

    return "Senha invalida ou dados incompletos.";
  }

  if (status >= 500) {
    return "Nao foi possivel criar sua conta. Tente novamente.";
  }

  return "Nao foi possivel criar sua conta. Tente novamente.";
}

function friendlyFieldMessage(field: keyof RegisterFieldErrors) {
  const messages: Record<keyof RegisterFieldErrors, string> = {
    nome: "Revise seu nome completo.",
    nome_salao: "Revise o nome do salao.",
    email: "Revise o email informado.",
    telefone: "Revise o WhatsApp informado.",
    senha: "Revise a senha informada.",
    confirmar_senha: "As senhas precisam ser iguais.",
    termos: "Aceite os termos para continuar."
  };

  return messages[field];
}

function fieldFromPath(path: Array<string | number> = []): keyof RegisterFieldErrors | null {
  const joined = path.join(".");

  if (joined === "nome") return "nome";
  if (joined === "email" || joined === "tenant.email") return "email";
  if (joined === "senha") return "senha";
  if (joined === "telefone" || joined === "tenant.telefone") return "telefone";
  if (joined === "tenant.nome_fantasia") return "nome_salao";

  return null;
}

function mapValidationDetails(details: unknown) {
  if (!Array.isArray(details)) {
    return {};
  }

  return details.reduce<RegisterFieldErrors>((acc, issue: ValidationIssue) => {
    const field = fieldFromPath(issue.path);
    if (field) {
      acc[field] = friendlyFieldMessage(field);
    }

    return acc;
  }, {});
}

function mapBackendFieldErrors(status: number, code?: string, message = "", details?: unknown) {
  const fieldErrors = mapValidationDetails(details);
  const normalizedMessage = message.toLowerCase();

  if (status === 409 || code === "USER_EMAIL_ALREADY_EXISTS") {
    fieldErrors.email = "Este email ja possui cadastro no Bellory.";
  }

  if (code === "AUTH_REGISTER_FAILED") {
    if (
      normalizedMessage.includes("already") ||
      normalizedMessage.includes("registered") ||
      normalizedMessage.includes("email")
    ) {
      fieldErrors.email = "Este email ja possui cadastro ou nao foi aceito.";
    } else if (normalizedMessage.includes("password") || normalizedMessage.includes("senha")) {
      fieldErrors.senha = "A senha nao foi aceita. Use outra senha forte.";
    } else {
      fieldErrors.email = fieldErrors.email || "Revise o email informado.";
      fieldErrors.senha = fieldErrors.senha || "Revise a senha informada.";
    }
  }

  if (code === "AUTH_RATE_LIMIT") {
    fieldErrors.email = "Tente novamente em alguns minutos.";
  }

  if (status === 422 && Object.keys(fieldErrors).length === 0) {
    fieldErrors.nome = "Revise os campos obrigatorios.";
    fieldErrors.nome_salao = "Revise os campos obrigatorios.";
    fieldErrors.email = "Revise os campos obrigatorios.";
  }

  return fieldErrors;
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
    throw new Error("Nao foi possivel conectar. Tente novamente.");
  }

  const payload = (await response.json().catch(() => ({}))) as ApiEnvelope<T>;

  if (!response.ok) {
    const fieldErrors = mapBackendFieldErrors(
      response.status,
      payload.error?.code,
      payload.error?.message,
      payload.error?.details
    );

    throw new RegisterError(
      friendlyError(response.status, payload.error?.code, payload.error?.message),
      fieldErrors
    );
  }

  if (!payload.data) {
    throw new Error("Nao foi possivel criar sua conta. Tente novamente.");
  }

  return payload.data;
}

async function listPlans() {
  return request<PublicPlan[]>("/public/plans");
}

async function getInitialPlanId() {
  const envPlanId = process.env.NEXT_PUBLIC_DEFAULT_PLAN_ID;
  if (envPlanId) {
    return envPlanId;
  }

  const plans = await listPlans();
  const selectedPlan = plans.find((plan) => plan.ativo !== false) || plans[0];

  if (!selectedPlan?.id) {
    throw new Error("Nao foi possivel encontrar um plano inicial.");
  }

  return selectedPlan.id;
}

function toAuthSession(response: RegisterResponse): AuthSession {
  if (!response.access_token || !response.refresh_token) {
    throw new Error("Conta criada, mas a sessao nao foi iniciada automaticamente.");
  }

  return {
    access_token: response.access_token,
    refresh_token: response.refresh_token,
    token_type: response.session?.token_type || "bearer",
    expires_in: response.session?.expires_in || null,
    expires_at: response.expires_at || response.session?.expires_at || null,
    user: response.auth_user,
    usuario: response.onboarding.usuario,
    tenant: response.onboarding.tenant
  };
}

async function register(payload: RegisterPayload) {
  const response = await request<RegisterResponse>("/auth/register", {
    method: "POST",
    body: JSON.stringify({
      nome: payload.nome,
      email: payload.email,
      senha: payload.senha,
      telefone: payload.telefone,
      plano_id: payload.plano_id,
      tenant: {
        nome_fantasia: payload.nome_salao,
        email: payload.email,
        telefone: payload.telefone,
        timezone: "America/Sao_Paulo"
      },
      atua_como_profissional: true,
      servicos_iniciais: DEFAULT_SERVICES
    })
  });

  const session = toAuthSession(response);
  authService.saveSession(session);

  return {
    session,
    onboarding: response.onboarding,
    onboarding_required: response.onboarding_required
  };
}

export const registerService = {
  listPlans,
  getInitialPlanId,
  register
};
