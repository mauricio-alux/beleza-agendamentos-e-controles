const env = require('../../config/env');
const { AppError } = require('../../utils/errors');
const { onlyDigits, normalizeEmail } = require('../../utils/normalize');
const { generateUniqueSlug } = require('../../services/slug.service');
const planosService = require('../planos/planos.service');
const subscriptionService = require('../subscription/subscription.service');
const tenantsRepository = require('../tenants/tenants.repository');
const usuariosRepository = require('../usuarios/usuarios.repository');
const onboardingRepository = require('./onboarding.repository');
const eventLogsService = require('../event-logs/eventLogs.service');

const DEFAULT_SERVICES = [
  { nome: 'Corte', duracao_minutos: 45, preco: 0, categoria: 'Cabelo' },
  { nome: 'Escova', duracao_minutos: 45, preco: 0, categoria: 'Cabelo' },
  { nome: 'Hidratacao', duracao_minutos: 60, preco: 0, categoria: 'Cabelo' },
  { nome: 'Manicure', duracao_minutos: 60, preco: 0, categoria: 'Unhas' }
];

const DEFAULT_ONBOARDING_STEPS = [
  'tenant_created',
  'admin_created',
  'services_created',
  'professional_created',
  'scale_created',
  'booking_link_created',
  'onboarding_completed'
];

function completedStep(tenantId, usuarioId, step, metadata = {}) {
  return {
    tenant_id: tenantId,
    usuario_id: usuarioId,
    step,
    status: 'concluido',
    completed_at: new Date().toISOString(),
    metadata
  };
}

function pendingStep(tenantId, usuarioId, step, metadata = {}) {
  return {
    tenant_id: tenantId,
    usuario_id: usuarioId,
    step,
    status: 'pendente',
    completed_at: null,
    metadata
  };
}

async function generateTenantSlug(nomeFantasia) {
  return generateUniqueSlug(nomeFantasia, tenantsRepository.slugExists);
}

async function createInitialSettings(tenant, usuarioId) {
  const payload = {
    tenant_id: tenant.id,
    intervalo_padrao_minutos: 30,
    configuracoes_whatsapp: {
      fl_whatsapp_ativo: false,
      origem: 'onboarding'
    },
    configuracoes_ia: {
      fl_ia_ativa: false,
      origem: 'onboarding'
    }
  };

  const existing = await onboardingRepository.findConfiguracaoTenant(tenant.id);
  const configuracao = existing
    ? await onboardingRepository.updateConfiguracaoTenant(tenant.id, payload)
    : await onboardingRepository.createConfiguracaoTenant(payload);

  await tenantsRepository.update(tenant.id, {
    configuracoes: {
      ...(tenant.configuracoes || {}),
      nome_fantasia: tenant.nome_fantasia,
      slug: tenant.slug,
      timezone: tenant.timezone,
      moeda: 'BRL',
      idioma: 'pt-BR',
      formato_agenda: 'semanal',
      horario_inicio_padrao: '09:00',
      horario_fim_padrao: '18:00',
      intervalo_agendamento: 30,
      fl_agendamento_online: true,
      status_onboarding: 'em_andamento',
      onboarding_version: 'foundation_core_v1'
    }
  });

  return configuracao;
}

async function createDefaultProfessional(tenant, usuario) {
  const existing = await onboardingRepository.findProfessionalByUser(tenant.id, usuario.id);
  if (existing) {
    return existing;
  }

  return onboardingRepository.createProfissional({
    tenant_id: tenant.id,
    usuario_id: usuario.id,
    nome_publico: usuario.nome,
    cargo: 'Administrador',
    aceita_agendamento_online: true,
    ordem_exibicao: 0,
    metadata: {
      padrao: true,
      admin_salao: true,
      origem: 'onboarding'
    }
  });
}

async function createDefaultServices(tenantId, inputServices = []) {
  const existing = await onboardingRepository.findServicesByTenant(tenantId);
  if (existing.length) {
    return existing;
  }

  const services = inputServices.length ? inputServices : DEFAULT_SERVICES;

  return onboardingRepository.createServicos(
    services.map((servico, index) => ({
      tenant_id: tenantId,
      nome: servico.nome,
      descricao: servico.descricao || null,
      duracao_minutos: servico.duracao_minutos,
      preco: servico.preco || 0,
      categoria: servico.categoria || null,
      ordem_exibicao: index,
      metadata: {
        padrao: true,
        origem: inputServices.length ? 'onboarding_input' : 'onboarding_default'
      }
    }))
  );
}

async function createProfessionalServiceLinks(tenantId, profissional, servicos, inputServices = []) {
  if (!profissional || !servicos.length) {
    return [];
  }

  const existing = await onboardingRepository.findProfessionalServices(tenantId, profissional.id);
  if (existing.length) {
    return existing;
  }

  return onboardingRepository.createProfissionalServicos(
    servicos.map((servico) => {
      const original = inputServices.find((item) => item.nome === servico.nome) || {};
      return {
        tenant_id: tenantId,
        profissional_id: profissional.id,
        servico_id: servico.id,
        duracao_minutos: servico.duracao_minutos,
        preco: servico.preco,
        percentual_comissao: original.percentual_comissao || null,
        ativo: true
      };
    })
  );
}

async function createDefaultSchedule(tenantId, profissionalId) {
  const existing = await onboardingRepository.findScalesByProfessional(tenantId, profissionalId);
  if (existing.length) {
    return existing;
  }

  const diasUteis = [1, 2, 3, 4, 5];

  return onboardingRepository.createScales(
    diasUteis.map((diaSemana) => ({
      tenant_id: tenantId,
      profissional_id: profissionalId,
      dia_semana: diaSemana,
      hora_inicio: '09:00',
      hora_fim: '18:00',
      hora_intervalo_inicio: '12:00',
      hora_intervalo_fim: '13:00',
      atende_feriado: false,
      ativo: true
    }))
  );
}

async function createBookingLink(tenant, profissional = null) {
  const existing = await onboardingRepository.findBookingLinkByTenant(tenant.id);
  if (existing) {
    return {
      ...existing,
      url_publica: `${env.bookingBaseUrl}/${existing.slug}`
    };
  }

  const link = await onboardingRepository.createLinkAgendamento({
    tenant_id: tenant.id,
    profissional_id: profissional?.id || null,
    slug: tenant.slug,
    titulo: tenant.nome_fantasia,
    origem: 'onboarding',
    acesso_publico: true,
    metadata: {
      url_publica: `${env.bookingBaseUrl}/${tenant.slug}`,
      padrao: true
    }
  });

  return {
    ...link,
    url_publica: `${env.bookingBaseUrl}/${link.slug}`
  };
}

async function updateOnboardingStatus(tenantId, usuarioId, status, extraMetadata = {}) {
  const steps = DEFAULT_ONBOARDING_STEPS.map((step) => {
    if (step === 'onboarding_completed' && status !== 'concluido') {
      return pendingStep(tenantId, usuarioId, step, extraMetadata);
    }

    return completedStep(tenantId, usuarioId, step, extraMetadata[step] || {});
  });

  return onboardingRepository.upsertSteps(steps);
}

async function createTenantStructure({ tenant, usuario, servicosIniciais = [] }) {
  const configuracao = await createInitialSettings(tenant, usuario.id);
  const profissional = await createDefaultProfessional(tenant, usuario);
  const servicos = await createDefaultServices(tenant.id, servicosIniciais);
  const profissionalServicos = await createProfessionalServiceLinks(
    tenant.id,
    profissional,
    servicos,
    servicosIniciais
  );
  const escalas = await createDefaultSchedule(tenant.id, profissional.id);
  const linkAgendamento = await createBookingLink(tenant, profissional);

  await updateOnboardingStatus(tenant.id, usuario.id, 'em_andamento', {
    tenant_created: { tenant_id: tenant.id },
    admin_created: { usuario_id: usuario.id },
    services_created: { total: servicos.length },
    professional_created: { profissional_id: profissional.id },
    scale_created: { total: escalas.length },
    booking_link_created: { link_id: linkAgendamento.id }
  });

  return {
    configuracao,
    profissional,
    servicos,
    profissional_servicos: profissionalServicos,
    escalas,
    link_agendamento: linkAgendamento
  };
}

async function createTenant(input, authUser, requestContext = {}) {
  const existingUsuario = await usuariosRepository.findByAuthUserId(authUser.id);
  if (existingUsuario?.tenant_id) {
    throw new AppError('Usuario ja possui tenant vinculado', 409, 'TENANT_ALREADY_CREATED');
  }

  const plano = await planosService.validatePlan(input.plano_id);
  const email = normalizeEmail(input.tenant.email || authUser.email);
  const slug = await generateTenantSlug(input.tenant.nome_fantasia);
  let tenant = null;

  try {
    tenant = await tenantsRepository.create({
      plano_id: plano.id,
      nome_fantasia: input.tenant.nome_fantasia,
      razao_social: input.tenant.razao_social || null,
      cpf_cnpj: input.tenant.cpf_cnpj ? onlyDigits(input.tenant.cpf_cnpj) : null,
      email,
      telefone: input.tenant.telefone ? onlyDigits(input.tenant.telefone) : null,
      tipo_negocio: input.tenant.tipo_negocio || null,
      slug,
      status: 'trial',
      timezone: input.tenant.timezone || 'America/Sao_Paulo',
      endereco: input.tenant.endereco || {},
      configuracoes: {
        moeda: 'BRL',
        idioma: 'pt-BR',
        formato_agenda: 'semanal',
        horario_inicio_padrao: '09:00',
        horario_fim_padrao: '18:00',
        intervalo_agendamento: 30,
        fl_agendamento_online: true,
        status_onboarding: 'em_andamento',
        onboarding_version: 'foundation_core_v1'
      }
    });

    const usuario = await usuariosRepository.create({
      tenant_id: tenant.id,
      auth_user_id: authUser.id,
      nome: input.admin.nome,
      email: normalizeEmail(authUser.email),
      telefone: input.admin.telefone ? onlyDigits(input.admin.telefone) : null,
      tipo_usuario: 'Administrador'
    });

    const assinatura = await subscriptionService.createTrial({
      tenantId: tenant.id,
      planoId: plano.id,
      email: usuario.email
    });

    const estrutura = await createTenantStructure({
      tenant,
      usuario,
      servicosIniciais: input.servicos_iniciais || []
    });

    await eventLogsService.logEvent('tenant_created', {
      tenantId: tenant.id,
      usuarioId: usuario.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      payload: {
        plano_id: plano.id,
        slug,
        auth_user_id: authUser.id
      }
    });

    return {
      tenant,
      usuario,
      assinatura,
      ...estrutura
    };
  } catch (error) {
    if (tenant?.id) {
      await tenantsRepository.hardDelete(tenant.id).catch((rollbackError) => {
        console.error('Failed to rollback tenant provisioning', {
          tenantId: tenant.id,
          authUserId: authUser.id,
          error: rollbackError.message
        });
      });
    }

    throw error;
  }
}

async function getStatus(tenantId) {
  const steps = await onboardingRepository.listSteps(tenantId);
  const completed = steps.filter((step) => step.status === 'concluido').length;

  return {
    steps,
    total: steps.length,
    completed,
    progress: steps.length ? Math.round((completed / steps.length) * 100) : 0
  };
}

async function completeOnboarding(tenant, usuario) {
  await updateOnboardingStatus(tenant.id, usuario.id, 'concluido');
  const updatedTenant = await tenantsRepository.update(tenant.id, {
    configuracoes: {
      ...(tenant.configuracoes || {}),
      status_onboarding: 'concluido',
      onboarding_completed_at: new Date().toISOString()
    }
  });

  await eventLogsService.logEvent('onboarding_completed', {
    tenantId: tenant.id,
    usuarioId: usuario.id
  });

  return {
    tenant: updatedTenant,
    onboarding: await getStatus(tenant.id)
  };
}

async function updateStep(tenantId, usuarioId, step, input) {
  const payload = {
    status: input.status,
    metadata: input.metadata || {},
    completed_at: input.status === 'concluido' ? new Date().toISOString() : null
  };

  const updated = await onboardingRepository.updateStep(tenantId, step, payload);

  if (step === 'onboarding_completed' || input.status === 'concluido') {
    await eventLogsService.logEvent('onboarding_step_updated', {
      tenantId,
      usuarioId,
      payload: { step, status: input.status }
    });
  }

  return updated;
}

module.exports = {
  createTenant,
  createTenantStructure,
  createDefaultServices,
  createDefaultProfessional,
  createDefaultSchedule,
  generateTenantSlug,
  createBookingLink,
  updateOnboardingStatus,
  completeOnboarding,
  getStatus,
  updateStep
};
