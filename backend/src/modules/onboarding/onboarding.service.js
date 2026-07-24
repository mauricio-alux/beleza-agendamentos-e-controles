const { buildBookingUrl } = require('../../config/app-brand');
const { AppError } = require('../../utils/errors');
const { onlyDigits, normalizeEmail, normalizePhoneToE164 } = require('../../utils/normalize');
const { generateUniqueSlug } = require('../../services/slug.service');
const planosService = require('../planos/planos.service');
const subscriptionService = require('../subscription/subscription.service');
const tenantsRepository = require('../tenants/tenants.repository');
const usuariosRepository = require('../usuarios/usuarios.repository');
const membershipsRepository = require('../memberships/memberships.repository');
const onboardingRepository = require('./onboarding.repository');
const eventLogsService = require('../event-logs/eventLogs.service');
const {
  BELLORY_OFFICIAL_SERVICES,
  normalizeOfficialCategoryKey
} = require('../../constants/bellory-taxonomy');

const TAXONOMY_VERSION = 'bellory_taxonomy_v1';

const DEFAULT_SERVICE_DURATION_BY_NAME = {
  'Corte de Cabelo': 45,
  Escova: 45,
  Coloracao: 90,
  Hidratacao: 60,
  Barba: 45,
  Manicure: 60,
  Pedicure: 60,
  Maquiagem: 90,
  'Limpeza de Pele': 60,
  Massagem: 60,
  'Design de Sobrancelhas': 30,
  'Extensao de Cilios': 120
};

const DEFAULT_SERVICES = BELLORY_OFFICIAL_SERVICES.map((service) => ({
  nome: service.name,
  descricao: null,
  duracao_minutos: DEFAULT_SERVICE_DURATION_BY_NAME[service.name] || 60,
  preco: 0,
  categoria: service.categoryKey,
  metadata: {
    taxonomy_version: TAXONOMY_VERSION,
    taxonomy_category_key: service.categoryKey,
    acao_servico: service.action,
    especialidades_oficiais: service.specialties
  }
}));

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

function normalizeTaxonomyName(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function getOfficialSpecialtyNamesForService(service) {
  const metadata = service?.metadata || {};
  if (Array.isArray(metadata.especialidades_oficiais)) {
    return metadata.especialidades_oficiais.filter(Boolean);
  }

  const officialService = BELLORY_OFFICIAL_SERVICES.find((item) =>
    normalizeTaxonomyName(item.name) === normalizeTaxonomyName(service?.nome)
  );

  return Array.isArray(officialService?.specialties)
    ? officialService.specialties.filter(Boolean)
    : [];
}

function getOfficialMetadataForServiceName(serviceName) {
  const officialService = BELLORY_OFFICIAL_SERVICES.find((item) =>
    normalizeTaxonomyName(item.name) === normalizeTaxonomyName(serviceName)
  );

  if (!officialService) return {};

  return {
    taxonomy_version: TAXONOMY_VERSION,
    taxonomy_category_key: officialService.categoryKey,
    acao_servico: officialService.action,
    especialidades_oficiais: officialService.specialties
  };
}

function getServiceMetadata(service = {}, existing = null) {
  return {
    ...getOfficialMetadataForServiceName(service.nome || existing?.nome),
    ...(existing?.metadata || {}),
    ...(service.metadata || {})
  };
}

function getServiceTaxonomyVersion(service = {}, existing = null) {
  const metadata = getServiceMetadata(service, existing);
  return metadata.taxonomy_version || null;
}

function getOfficialSpecialtyIds(service, specialties = []) {
  const officialNames = getOfficialSpecialtyNamesForService(service);
  if (!officialNames.length) return [];

  const officialNameSet = new Set(officialNames.map(normalizeTaxonomyName));
  return specialties
    .filter((specialty) => officialNameSet.has(normalizeTaxonomyName(specialty.nome)))
    .map((specialty) => specialty.id);
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
    cargo: usuario.tipo_usuario === 'Autonomo' ? 'Autonomo' : 'Administrador',
    aceita_agendamento_online: true,
    ordem_exibicao: 0,
    metadata: {
      padrao: true,
      admin_salao: true,
      origem: 'onboarding',
      tipo_usuario: usuario.tipo_usuario,
      vinculo_tipo: 'owner'
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
      categoria: normalizeOfficialCategoryKey(servico.categoria) || null,
      ordem_exibicao: index,
      metadata: {
        ...getServiceMetadata(servico),
        padrao: true,
        origem: inputServices.length ? 'onboarding_input' : 'onboarding_default',
        taxonomy_version: getServiceTaxonomyVersion(servico)
      }
    }))
  );
}

async function createDefaultServiceSpecialtyLinks(tenantId, services = []) {
  if (!services.length) return [];

  const specialties = await onboardingRepository.listSpecialties();
  if (!specialties.length) return [];

  const links = [];

  for (const service of services) {
    const officialSpecialtyIds = getOfficialSpecialtyIds(service, specialties);
    const compatibleSpecialtyIds = officialSpecialtyIds;

    const savedLinks = await onboardingRepository.replaceServicoEspecialidades(
      tenantId,
      service.id,
      compatibleSpecialtyIds
    );
    links.push(...savedLinks);
  }

  return links;
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

async function syncOnboardingServices(tenantId, usuarioId, services = []) {
  const selectedServices = services.filter((service) => service?.nome);
  const existingServices = await onboardingRepository.findServicesByTenant(tenantId);
  const profissional = await onboardingRepository.findProfessionalByUser(tenantId, usuarioId);
  const professionalLinks = profissional
    ? await onboardingRepository.findProfessionalServices(tenantId, profissional.id)
    : [];

  const savedServices = [];

  for (const [index, service] of selectedServices.entries()) {
    const existing = existingServices.find(
      (item) => item.nome.toLowerCase() === service.nome.toLowerCase()
    );
    const payload = {
      nome: service.nome,
      duracao_minutos: service.duracao_minutos,
      preco: service.preco || 0,
      categoria: normalizeOfficialCategoryKey(service.categoria) || null,
      ordem_exibicao: index,
      ativo: true,
      metadata: {
        ...getServiceMetadata(service, existing),
        origem: 'onboarding_services_step',
        custom: Boolean(service.custom),
        taxonomy_version: getServiceTaxonomyVersion(service, existing)
      }
    };

    const saved = existing
      ? await onboardingRepository.updateServico(tenantId, existing.id, payload)
      : (await onboardingRepository.createServicos([{ tenant_id: tenantId, ...payload }]))[0];

    savedServices.push(saved);
    await createDefaultServiceSpecialtyLinks(tenantId, [saved]);

    if (profissional) {
      const existingLink = professionalLinks.find((item) => item.servico_id === saved.id);
      const linkPayload = {
        duracao_minutos: saved.duracao_minutos,
        preco: saved.preco,
        ativo: true
      };

      if (existingLink) {
        await onboardingRepository.updateProfissionalServico(tenantId, existingLink.id, linkPayload);
      } else {
        await onboardingRepository.createProfissionalServicos([{
          tenant_id: tenantId,
          profissional_id: profissional.id,
          servico_id: saved.id,
          ...linkPayload
        }]);
      }
    }
  }

  const selectedNames = new Set(selectedServices.map((service) => service.nome.toLowerCase()));
  const removedServices = existingServices.filter((service) => !selectedNames.has(service.nome.toLowerCase()));
  const removedAt = new Date().toISOString();

  await Promise.all(removedServices.map(async (service) => {
    await onboardingRepository.updateServico(tenantId, service.id, { ativo: false });

    if (profissional) {
      await onboardingRepository.updateProfissionalServicoByService(
        tenantId,
        profissional.id,
        service.id,
        {
          ativo: false,
          deleted_at: removedAt
        }
      );
    }
  }));

  return savedServices;
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
      url_publica: buildBookingUrl(existing.slug)
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
      url_publica: buildBookingUrl(tenant.slug),
      padrao: true
    }
  });

  return {
    ...link,
    url_publica: buildBookingUrl(link.slug)
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
  const servicoEspecialidades = await createDefaultServiceSpecialtyLinks(tenant.id, servicos);
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
    servico_especialidades: servicoEspecialidades,
    profissional_servicos: profissionalServicos,
    escalas,
    link_agendamento: linkAgendamento
  };
}

async function createTenant(input, authUser, requestContext = {}) {
  const existingUsuario = await usuariosRepository.findByAuthUserId(authUser.id);
  const existingMemberships = existingUsuario
    ? await membershipsRepository.listByUsuario(existingUsuario.id)
    : [];

  if (existingMemberships.some((membership) => membership.status === 'ativo')) {
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
      telefone: input.tenant.telefone ? normalizePhoneToE164(input.tenant.telefone) : null,
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

    const operationalRole = input.admin.tipo_usuario_operacional || 'Administrador';

    const usuario = await usuariosRepository.create({
      auth_user_id: authUser.id,
      nome: input.admin.nome,
      email: normalizeEmail(authUser.email),
      telefone: input.admin.telefone ? normalizePhoneToE164(input.admin.telefone) : null,
      tipo_usuario: operationalRole
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

    const membership = await membershipsRepository.create({
      usuario_id: usuario.id,
      tenant_id: tenant.id,
      role: operationalRole,
      status: 'ativo',
      profissional_id: estrutura.profissional?.id || null,
      is_primary: true,
      vinculo_tipo: 'owner',
      is_owner: true,
      marketplace_enabled: false,
      metadata: {
        origem: 'onboarding',
        owner_context: true,
        tipo_usuario_operacional: operationalRole
      }
    });

    await eventLogsService.logEvent('tenant_created', {
      tenantId: tenant.id,
      usuarioId: usuario.id,
      ipAddress: requestContext.ipAddress,
      userAgent: requestContext.userAgent,
      payload: {
        plano_id: plano.id,
        slug,
        auth_user_id: authUser.id,
        tipo_usuario_operacional: operationalRole
      }
    });

    return {
      tenant,
      usuario: {
        ...usuario,
        tenant_id: tenant.id,
        tipo_usuario: membership.role,
        membership
      },
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
  const metadata = input.metadata || {};
  const services = metadata.payload?.services || metadata.services || [];

  if (step === 'services_created' && input.status === 'concluido') {
    const savedServices = await syncOnboardingServices(tenantId, usuarioId, services);
    metadata.services_synced = {
      total: savedServices.length,
      synced_at: new Date().toISOString()
    };
  }

  const payload = {
    status: input.status,
    metadata,
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
