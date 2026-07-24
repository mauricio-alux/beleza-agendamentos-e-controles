const settingsRepository = require('./settings.repository');
const { canAccessSection, canWriteSection, getAllowedSections, getRole } = require('./settings.permissions');
const { BUSINESS_TYPES } = require('../../constants/business-types');
const { AppError, forbidden, notFound } = require('../../utils/errors');
const { normalizePhoneToE164 } = require('../../utils/normalize');

const SECTION_LABELS = {
  profile: 'Perfil',
  tenant: 'Salao',
  operation: 'Operacao',
  services: 'Servicos',
  specialties: 'Especialidades',
  role_specialties: 'Cargos x Especialidades',
  service_specialties: 'Servicos x Especialidades',
  team: 'Equipe',
  subscription: 'Assinatura',
  security: 'Seguranca',
  platform: 'Plataforma'
};

const SECTION_DESCRIPTIONS = {
  profile: 'Dados pessoais, contato e preferencias da conta.',
  tenant: 'Dados comerciais, identidade e endereco do negocio.',
  operation: 'Parametros que orientam agenda, cancelamentos e atendimento.',
  services: 'Catalogo de servicos e preparacao para precos/duracoes.',
  specialties: 'Uso operacional das especialidades no salao.',
  role_specialties: 'Especialidades disponiveis por cargo.',
  service_specialties: 'Vinculos entre servicos e especialidades.',
  team: 'Usuarios, papeis e profissionais vinculados ao tenant.',
  subscription: 'Plano, limites e dados comerciais do SaaS.',
  security: 'Acesso, sessoes e preferencias de seguranca.',
  platform: 'Operacao SaaS, tenants e saude da plataforma.'
};

const SECTION_HREFS = {
  profile: '/configuracoes/perfil',
  tenant: '/configuracoes/salao',
  operation: '/configuracoes/operacao',
  services: '/configuracoes/servicos',
  specialties: '/configuracoes/especialidades',
  role_specialties: '/configuracoes/cargos-especialidades',
  service_specialties: '/configuracoes/servico-especialidades',
  team: '/configuracoes/equipe',
  subscription: '/configuracoes/assinatura',
  security: '/configuracoes/seguranca',
  platform: '/admin'
};

function ensureAccess(role, section, write = false) {
  const allowed = write ? canWriteSection(role, section) : canAccessSection(role, section);

  if (!allowed) {
    throw forbidden('Section not available for this role');
  }
}

function normalizePhone(value) {
  if (value === null || value === undefined || value === '') {
    return null;
  }

  return normalizePhoneToE164(value);
}

function sanitizeProfile(usuario) {
  return {
    id: usuario.id,
    nome: usuario.nome,
    email: usuario.email,
    telefone: usuario.telefone,
    tipo_usuario: usuario.tipo_usuario,
    foto_url: usuario.foto_url,
    preferencias: usuario.preferencias || {}
  };
}

function sanitizeTenant(tenant) {
  const legacyBusinessType = BUSINESS_TYPES.includes(tenant.tipo_negocio) ? tenant.tipo_negocio : null;

  return {
    id: tenant.id,
    nome_fantasia: tenant.nome_fantasia,
    razao_social: tenant.razao_social,
    cpf_cnpj: tenant.cpf_cnpj,
    email: tenant.email,
    telefone: tenant.telefone,
    tipo_negocio: tenant.tipo_negocio,
    business_type: tenant.business_type || legacyBusinessType,
    slug: tenant.slug,
    status: tenant.status,
    logo_url: tenant.logo_url,
    timezone: tenant.timezone,
    endereco: tenant.endereco || {},
    configuracoes: tenant.configuracoes || {}
  };
}

function sanitizeOperation(settings) {
  const security = settings?.configuracoes_ia?.agenda_security || {};

  return {
    antecedencia_minima_minutos: settings?.antecedencia_minima_minutos ?? 60,
    janela_agendamento_dias: settings?.janela_agendamento_dias ?? 30,
    tolerancia_atraso_minutos: settings?.tolerancia_atraso_minutos ?? 10,
    tolerancia_intervalo_min: settings?.tolerancia_intervalo_min ?? 0,
    tolerancia_fim_expediente_min: settings?.tolerancia_fim_expediente_min ?? 0,
    intervalo_padrao_minutos: settings?.intervalo_padrao_minutos ?? 15,
    evita_buracos_agenda: settings?.evita_buracos_agenda ?? true,
    permite_cancelamento_cliente: settings?.permite_cancelamento_cliente ?? true,
    limite_cancelamento_horas: settings?.limite_cancelamento_horas ?? 24,
    confirmation_policy: settings?.confirmation_policy || security.confirmation_policy || 'flexible',
    attendant_confirmation_timeout_minutes:
      settings?.attendant_confirmation_timeout_minutes || security.attendant_confirmation_timeout_minutes || 30,
    client_confirmation_timeout_minutes:
      settings?.client_confirmation_timeout_minutes || security.client_confirmation_timeout_minutes || 60,
    weekly_booking_limit: settings?.weekly_booking_limit || security.weekly_booking_limit || 3,
    block_when_weekly_limit_exceeded:
      settings?.block_when_weekly_limit_exceeded ?? security.block_when_weekly_limit_exceeded ?? false,
    configuracoes_whatsapp: settings?.configuracoes_whatsapp || {},
    configuracoes_ia: settings?.configuracoes_ia || {}
  };
}

function buildSections(role) {
  return getAllowedSections(role)
    .filter((section) => section !== 'overview')
    .map((section) => ({
      id: section,
      label: SECTION_LABELS[section] || section,
      description: SECTION_DESCRIPTIONS[section] || '',
      href: SECTION_HREFS[section] || '/configuracoes'
    }));
}

async function getContext({ tenantId, usuario, role: contextRole }) {
  const role = contextRole || getRole(usuario);
  const [profile, tenant, operation] = await Promise.all([
    settingsRepository.findUsuarioById(tenantId, usuario.id),
    settingsRepository.findTenantById(tenantId),
    settingsRepository.findOperationSettings(tenantId)
  ]);

  if (!profile) throw notFound('Usuario nao encontrado');
  if (!tenant) throw notFound('Tenant nao encontrado');

  return {
    role,
    profile: sanitizeProfile(profile),
    tenant: sanitizeTenant(tenant),
    operation: sanitizeOperation(operation)
  };
}

async function getSummary(context) {
  const data = await getContext(context);
  const sections = buildSections(data.role);

  return {
    role: data.role,
    sections,
    entryPoints: {
      desktop: ['sidebar', 'top_header_profile'],
      mobile: ['bottom_nav', 'profile_shortcut'],
      dashboard: ['contextual_only']
    },
    profile: data.profile,
    tenant: canAccessSection(data.role, 'tenant') ? data.tenant : null,
    operation: canAccessSection(data.role, 'operation') ? data.operation : null
  };
}

async function getProfile(context) {
  const data = await getContext(context);
  ensureAccess(data.role, 'profile');
  return data.profile;
}

async function updateProfile(context, input) {
  const data = await getContext(context);
  ensureAccess(data.role, 'profile', true);

  const payload = {};
  for (const key of ['nome', 'foto_url', 'preferencias']) {
    if (Object.prototype.hasOwnProperty.call(input, key)) payload[key] = input[key];
  }

  if (Object.prototype.hasOwnProperty.call(input, 'telefone')) {
    payload.telefone = normalizePhone(input.telefone);
  }

  if (!Object.keys(payload).length) {
    throw new AppError('Nenhum dado enviado para atualizar', 400, 'EMPTY_UPDATE');
  }

  const updated = await settingsRepository.updateUsuario(context.tenantId, context.usuario.id, payload);
  return sanitizeProfile(updated);
}

async function getTenant(context) {
  const data = await getContext(context);
  ensureAccess(data.role, 'tenant');
  return data.tenant;
}

async function updateTenant(context, input) {
  const data = await getContext(context);
  ensureAccess(data.role, 'tenant', true);

  const payload = {};
  const allowed = [
    'nome_fantasia',
    'razao_social',
    'cpf_cnpj',
    'email',
    'tipo_negocio',
    'business_type',
    'logo_url',
    'timezone',
    'endereco',
    'configuracoes'
  ];
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(input, key)) payload[key] = input[key];
  }

  if (Object.prototype.hasOwnProperty.call(input, 'business_type')) {
    payload.tipo_negocio = input.business_type;
  }

  if (Object.prototype.hasOwnProperty.call(input, 'telefone')) {
    payload.telefone = normalizePhone(input.telefone);
  }

  if (!Object.keys(payload).length) {
    throw new AppError('Nenhum dado enviado para atualizar', 400, 'EMPTY_UPDATE');
  }

  const updated = await settingsRepository.updateTenant(context.tenantId, payload);
  return sanitizeTenant(updated);
}

async function getOperation(context) {
  const data = await getContext(context);
  ensureAccess(data.role, 'operation');
  return data.operation;
}

async function updateOperation(context, input) {
  const data = await getContext(context);
  ensureAccess(data.role, 'operation', true);

  if (!Object.keys(input).length) {
    throw new AppError('Nenhum dado enviado para atualizar', 400, 'EMPTY_UPDATE');
  }

  const updated = await settingsRepository.updateOperationSettings(context.tenantId, input);

  const auditRows = Object.keys(input).map((campo) => ({
    tenant_id: context.tenantId,
    usuario_id: context.usuario.id,
    campo,
    valor_antigo: data.operation[campo] === undefined ? null : data.operation[campo],
    valor_novo: input[campo] === undefined ? null : input[campo]
  }));

  await settingsRepository.createSettingsAudit(auditRows);
  return sanitizeOperation(updated);
}

module.exports = {
  getSummary,
  getProfile,
  updateProfile,
  getTenant,
  updateTenant,
  getOperation,
  updateOperation
};
