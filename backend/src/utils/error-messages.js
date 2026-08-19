const { APP_BRAND } = require('../config/app-brand');

const DEFAULT_ERROR_MESSAGE = 'Ocorreu um problema ao processar sua solicitacao.';

const FRIENDLY_ERROR_MESSAGES = {
  VALIDATION_ERROR: 'Alguns dados precisam ser corrigidos antes de continuar.',
  INTERNAL_SERVER_ERROR: DEFAULT_ERROR_MESSAGE,
  APP_ERROR: DEFAULT_ERROR_MESSAGE,
  NOT_FOUND: 'Nao encontramos o registro solicitado.',
  UNAUTHORIZED: 'Sua sessao expirou. Faca login novamente.',
  FORBIDDEN: 'Voce nao tem permissao para realizar esta acao.',
  SUBSCRIPTION_NOT_FOUND: 'Nao encontramos uma assinatura ativa para este salao.',
  SUBSCRIPTION_INACTIVE: 'Assinatura inativa ou bloqueada.',
  TRIAL_EXPIRED: 'Trial expirado. Atualize o plano para continuar.',
  PLAN_FEATURE_NOT_ALLOWED: 'Funcionalidade nao disponivel no plano atual.',
  PLAN_LIMIT_REACHED: 'Limite do plano atingido.',
  TENANT_NOT_FOUND: 'Nao encontramos este salao.',
  TENANT_ACCESS_DENIED: 'Voce nao tem acesso a este salao.',
  USER_EMAIL_ALREADY_EXISTS: `Este email ja possui cadastro no ${APP_BRAND.appName}.`,
  PASSWORD_RECOVERY_FAILED: 'Nao foi possivel enviar as instrucoes de recuperacao. Tente novamente.',
  PASSWORD_RECOVERY_PROVIDER_UNREACHABLE: 'Nao foi possivel conectar ao Supabase Auth para solicitar a recuperacao.',
  PASSWORD_RECOVERY_REDIRECT_NOT_ALLOWED: 'A URL de redefinicao nao esta permitida na configuracao do Supabase Auth.',
  PASSWORD_RECOVERY_EMAIL_NOT_SENT: 'O provedor nao conseguiu enviar o email de recuperacao. Verifique SMTP e logs do Supabase Auth.',
  PASSWORD_RECOVERY_RATE_LIMIT: 'Limite temporario de envio atingido. Tente novamente em alguns minutos.',
  PASSWORD_RESET_FAILED: 'Nao foi possivel redefinir sua senha. Tente novamente.',
  PASSWORD_RESET_TOKEN_INVALID: 'Link de redefinicao invalido ou expirado. Solicite um novo link.',
  TENANT_ALREADY_CREATED: 'Este usuario ja possui um salao vinculado.',
  INVALID_PHONE: 'Informe um telefone valido.',
  INVALID_SERVICE_CATEGORY: 'Selecione uma categoria valida para o servico.',
  SERVICE_COMPATIBILITY_CONTEXT_REQUIRED: 'Informe nome e categoria para vincular especialidades ao servico.',
  SERVICE_COMPATIBILITY_NOT_FOUND: 'Nao encontramos especialidades compativeis para este nome e categoria.',
  SERVICE_SPECIALTY_REQUIRED: 'Selecione ao menos uma especialidade compativel para este servico.',
  SPECIALTY_CATEGORY_REQUIRED: 'Selecione uma categoria oficial para a especialidade.',
  INCOMPATIBLE_SERVICE_SPECIALTY: 'Este servico nao e compativel com a especialidade selecionada.',
  INVALID_SPECIALTY: 'Selecione uma especialidade valida.',
  INVALID_SERVICE: 'Selecione um servico valido.',
  SERVICE_NOT_FOUND: 'Nao encontramos este servico.',
  SERVICE_ALREADY_EXISTS: 'Ja existe um servico ativo com este nome e categoria.',
  INCOMPATIBLE_PROFESSIONAL_CARGO: 'O cargo selecionado nao e compativel com o perfil do profissional.',
  INCOMPATIBLE_TENANT_CARGO: 'Este cargo nao e compativel com os servicos cadastrados neste salao.',
  INCOMPATIBLE_SPECIALTY: 'A especialidade selecionada nao e compativel com o cargo.',
  INACTIVE_TENANT_SPECIALTY: 'Esta especialidade esta inativa para este salao.',
  ADMIN_PROFESSIONAL_CANNOT_BOOK: 'Profissionais administrativos nao podem receber agendamentos online.',
  ADMIN_PROFESSIONAL_CANNOT_HAVE_SERVICES: 'Profissionais administrativos nao podem ser vinculados a servicos.',
  AUTONOMOUS_SERVICES_REQUIRED: 'Profissionais autonomos precisam estar vinculados a pelo menos um servico.',
  PROFESSIONAL_SPECIALTIES_REQUIRED: 'Profissionais com agenda online precisam ter pelo menos uma especialidade.',
  PROFESSIONAL_SERVICES_REQUIRED: 'Profissionais com agenda online precisam estar vinculados a pelo menos um servico.',
  PROFESSIONAL_SERVICE_NOT_LINKED: 'Este servico nao esta vinculado ao profissional selecionado.',
  TEAM_ACCESS_CREDENTIALS_REQUIRED: 'Informe email e senha temporaria para criar o acesso.',
  TEAM_USER_ROLE_NOT_SUPPORTED: 'O perfil selecionado ainda nao esta habilitado no banco de dados.',
  TEAM_ACCESS_CREATE_FAILED: 'Nao foi possivel criar o acesso deste profissional.',
  AUTH_USER_CREATE_FAILED: 'Nao foi possivel criar o acesso. Confira o email e tente novamente.',
  APPOINTMENT_CONFLICT: 'Este horario ja foi reservado.',
  SLOT_UNAVAILABLE: 'Este horario nao esta mais disponivel.',
  WEEKLY_BOOKING_LIMIT: 'O limite semanal de agendamentos foi atingido.',
  INVALID_APPOINTMENT_DATE: 'Escolha uma data e horario validos para o agendamento.',
  INVALID_APPOINTMENT_STATUS: 'Este agendamento nao pode ser atualizado para o status selecionado.',
  NO_SHOW_BEFORE_APPOINTMENT_START: 'Nao e possivel marcar no-show antes do inicio do atendimento.',
  CANCELLATION_REASON_REQUIRED: 'Informe o motivo do cancelamento.',
  APPOINTMENT_SERVICE_REQUIRED: 'Selecione um servico para continuar.',
  ADMIN_PROFESSIONAL_NO_OPERATIONAL_SCHEDULE: 'Este profissional administrativo nao possui escala operacional.'
};

function getFriendlyErrorMessage(code, fallback) {
  return FRIENDLY_ERROR_MESSAGES[code] || fallback || DEFAULT_ERROR_MESSAGE;
}

function normalizeErrorDetails(details) {
  if (!Array.isArray(details)) return details || null;

  return details.map((issue) => ({
    path: issue.path || [],
    message: issue.message,
    code: issue.code,
    params: issue.params
  }));
}

module.exports = {
  DEFAULT_ERROR_MESSAGE,
  FRIENDLY_ERROR_MESSAGES,
  getFriendlyErrorMessage,
  normalizeErrorDetails
};
