import { APP_BRAND } from "@/config/app-brand";

export type FeedbackTone = "error" | "warning" | "success" | "info";

const DEFAULT_MESSAGES: Record<FeedbackTone, string> = {
  error: "Ocorreu um problema ao processar sua solicitação.",
  warning: "Alguns dados precisam da sua atenção.",
  success: "Tudo certo. As informações foram salvas.",
  info: "Confira as informações antes de continuar."
};

const TECHNICAL_PATTERNS = [
  /validation failed/i,
  /unexpected error/i,
  /request failed/i,
  /foreign key/i,
  /internal server error/i,
  /failed to fetch/i,
  /networkerror/i,
  /invalid request payload/i,
  /stack trace/i
];

const MESSAGE_BY_CODE: Record<string, string> = {
  VALIDATION_ERROR: "Alguns dados precisam ser corrigidos antes de continuar.",
  INTERNAL_SERVER_ERROR: DEFAULT_MESSAGES.error,
  UNAUTHORIZED: "Sua sessão expirou. Faça login novamente.",
  FORBIDDEN: "Você não tem permissão para realizar esta ação.",
  NOT_FOUND: "Não encontramos o registro solicitado.",
  TENANT_NOT_FOUND: "Não encontramos este salão.",
  TENANT_ACCESS_DENIED: "Você não tem acesso a este salão.",
  USER_EMAIL_ALREADY_EXISTS: `Este email já possui cadastro no ${APP_BRAND.appName}.`,
  PASSWORD_RECOVERY_FAILED: "Não foi possível enviar as instruções de recuperação. Tente novamente.",
  PASSWORD_RECOVERY_PROVIDER_UNREACHABLE: "Não foi possível conectar ao Supabase Auth para solicitar a recuperação.",
  PASSWORD_RECOVERY_REDIRECT_NOT_ALLOWED: "A URL de redefinição não está permitida na configuração do Supabase Auth.",
  PASSWORD_RECOVERY_EMAIL_NOT_SENT: "O provedor não conseguiu enviar o email de recuperação. Verifique SMTP e logs do Supabase Auth.",
  PASSWORD_RECOVERY_RATE_LIMIT: "Limite temporário de envio atingido. Tente novamente em alguns minutos.",
  PASSWORD_RESET_FAILED: "Não foi possível redefinir sua senha. Tente novamente.",
  PASSWORD_RESET_TOKEN_INVALID: "Link de redefinição inválido ou expirado. Solicite um novo link.",
  TENANT_ALREADY_CREATED: "Este usuário já possui um salão vinculado.",
  INVALID_SERVICE_CATEGORY: "Selecione uma categoria válida para o serviço.",
  SERVICE_COMPATIBILITY_CONTEXT_REQUIRED: "Informe nome e categoria para vincular especialidades ao serviço.",
  SERVICE_COMPATIBILITY_NOT_FOUND: "Não encontramos especialidades compatíveis para este nome e categoria.",
  SERVICE_SPECIALTY_REQUIRED: "Selecione ao menos uma especialidade compatível para este serviço.",
  SPECIALTY_CATEGORY_REQUIRED: "Selecione uma categoria oficial para a especialidade.",
  INCOMPATIBLE_SERVICE_SPECIALTY: "Este serviço não é compatível com a especialidade selecionada.",
  INVALID_SPECIALTY: "Selecione uma especialidade válida.",
  INVALID_SERVICE: "Selecione um serviço válido.",
  SERVICE_NOT_FOUND: "Não encontramos este serviço.",
  SERVICE_ALREADY_EXISTS: "Já existe um serviço ativo com este nome e categoria.",
  INCOMPATIBLE_PROFESSIONAL_CARGO: "O cargo selecionado não é compatível com o perfil do profissional.",
  INCOMPATIBLE_TENANT_CARGO: "Este cargo não é compatível com os serviços cadastrados neste salão.",
  INCOMPATIBLE_SPECIALTY: "A especialidade selecionada não é compatível com o cargo.",
  INACTIVE_TENANT_SPECIALTY: "Esta especialidade está inativa para este salão.",
  ADMIN_PROFESSIONAL_CANNOT_BOOK: "Profissionais administrativos não podem receber agendamentos online.",
  ADMIN_PROFESSIONAL_CANNOT_HAVE_SERVICES: "Profissionais administrativos não podem ser vinculados a serviços.",
  AUTONOMOUS_SERVICES_REQUIRED: "Profissionais autônomos precisam estar vinculados a pelo menos um serviço.",
  PROFESSIONAL_SPECIALTIES_REQUIRED: "Profissionais com agenda online precisam ter pelo menos uma especialidade.",
  PROFESSIONAL_SERVICES_REQUIRED: "Profissionais com agenda online precisam estar vinculados a pelo menos um serviço.",
  PROFESSIONAL_SERVICE_NOT_LINKED: "Este serviço não está vinculado ao profissional selecionado.",
  PROFESSIONAL_SERVICE_SPECIALTY_NOT_LINKED: "O profissional selecionado não está vinculado a esta especialidade ou serviço.",
  PROFESSIONAL_SERVICE_SPECIALTY_REQUIRED: "Selecione uma especialidade compatível para este profissional e serviço.",
  TEAM_ACCESS_CREDENTIALS_REQUIRED: "Informe email e senha temporária para criar o acesso.",
  TEAM_USER_ROLE_NOT_SUPPORTED: "O perfil selecionado ainda não está habilitado no banco de dados.",
  TEAM_ACCESS_CREATE_FAILED: "Não foi possível criar o acesso deste profissional.",
  AUTH_USER_CREATE_FAILED: "Não foi possível criar o acesso. Confira o email e tente novamente.",
  APPOINTMENT_CONFLICT: "Este horário já foi reservado.",
  SLOT_UNAVAILABLE: "Este horário não está mais disponível.",
  WEEKLY_BOOKING_LIMIT: "O limite semanal de agendamentos foi atingido.",
  INVALID_APPOINTMENT_DATE: "Escolha uma data e horário válidos para o agendamento.",
  INVALID_APPOINTMENT_STATUS: "Este agendamento não pode ser atualizado para o status selecionado.",
  NO_SHOW_BEFORE_APPOINTMENT_START: "Não é possível marcar no-show antes do início do atendimento.",
  CANCELLATION_REASON_REQUIRED: "Informe o motivo do cancelamento.",
  APPOINTMENT_SERVICE_REQUIRED: "Selecione um serviço para continuar."
};

export function getMessageByCode(code?: string | null, tone: FeedbackTone = "error") {
  return code ? MESSAGE_BY_CODE[code] || DEFAULT_MESSAGES[tone] : DEFAULT_MESSAGES[tone];
}

export function normalizeUserMessage(message?: string | null, tone: FeedbackTone = "error", code?: string | null) {
  if (code && MESSAGE_BY_CODE[code]) {
    return MESSAGE_BY_CODE[code];
  }

  const value = String(message || "").trim();
  if (!value || TECHNICAL_PATTERNS.some((pattern) => pattern.test(value))) {
    return DEFAULT_MESSAGES[tone];
  }

  return value;
}

export function getErrorMessage(error: unknown, fallback = DEFAULT_MESSAGES.error) {
  if (error instanceof Error) {
    return normalizeUserMessage(error.message, "error");
  }

  return fallback;
}
