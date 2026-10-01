const agendaService = require('../agenda/agenda.service');
const repository = require('./public-booking.repository');
const clientIdentityService = require('./client-identity.service');
const { AppError, notFound } = require('../../utils/errors');
const identityPolicy = require('./identity-policy');

async function resolveLink(slug) {
  const link = await repository.findActiveLink(slug);
  if (!link) throw notFound('Link de agendamento nao encontrado');

  if (link.expira_em && new Date(link.expira_em) <= new Date()) {
    throw new AppError('Este link de agendamento expirou', 410, 'BOOKING_LINK_EXPIRED');
  }

  const tenant = await repository.findTenant(link.tenant_id);
  if (!identityPolicy.eligibleTenant(tenant) || !identityPolicy.eligibleLink(link)) {
    throw new AppError('Agendamento indisponivel para este salao', 404, 'BOOKING_UNAVAILABLE');
  }

  return { link, tenant };
}

async function getCatalog(slug) {
  const { link, tenant } = await resolveLink(slug);
  const [professionals, services] = await Promise.all([
    repository.listBookingProfessionals(tenant.id),
    repository.listOnlineServices(tenant.id)
  ]);
  const professionalIds = professionals.map((professional) => professional.id);
  const userIds = professionals.map((professional) => professional.usuario_id).filter(Boolean);
  const [professionalSpecialties, memberships] = await Promise.all([
    repository.listProfessionalSpecialties(tenant.id, professionalIds),
    repository.listActiveMemberships(tenant.id, userIds)
  ]);
  const activeMembershipUserIds = new Set(memberships.map((membership) => membership.usuario_id));
  const specialtyIdsByProfessional = new Map();

  const operationalProfessionalIds = new Set(professionals
    .filter((professional) => (
      !professional.usuario_id || activeMembershipUserIds.has(professional.usuario_id)
    ))
    .map((professional) => professional.id));

  professionalSpecialties.forEach((linkItem) => {
    if (!operationalProfessionalIds.has(linkItem.profissional_id)) return;
    if (!specialtyIdsByProfessional.has(linkItem.profissional_id)) {
      specialtyIdsByProfessional.set(linkItem.profissional_id, new Set());
    }
    specialtyIdsByProfessional.get(linkItem.profissional_id).add(linkItem.especialidade_id);
  });

  const serviceIdsByProfessional = new Map();
  services.forEach((service) => {
    const configs = (service.especialidades_config || []).filter((config) => (
      config.ativo !== false
      && config.aceita_agendamento_online !== false
      && Number(config.duracao_minutos) > 0
      && config.preco !== null
      && config.preco !== undefined
    ));
    professionals.forEach((professional) => {
      const professionalSpecialtyIds = specialtyIdsByProfessional.get(professional.id) || new Set();
      if (configs.some((config) => professionalSpecialtyIds.has(config.especialidade_id))) {
        if (!serviceIdsByProfessional.has(professional.id)) {
          serviceIdsByProfessional.set(professional.id, new Set());
        }
        serviceIdsByProfessional.get(professional.id).add(service.id);
      }
    });
  });

  const eligibleProfessionals = professionals.filter((professional) => (
    operationalProfessionalIds.has(professional.id)
    && (serviceIdsByProfessional.get(professional.id) || new Set()).size > 0
  ));
  const eligibleServiceIds = new Set(eligibleProfessionals.flatMap((professional) => [...(serviceIdsByProfessional.get(professional.id) || [])]));
  const eligibleServices = services.filter((service) => eligibleServiceIds.has(service.id));
  const unavailableServices = services.filter((service) => !eligibleServiceIds.has(service.id));

  return {
    tenant: {
      id: tenant.id,
      nome_fantasia: tenant.nome_fantasia,
      slug: tenant.slug
    },
    link: {
      slug: link.slug,
      titulo: link.titulo,
      profissional_id: link.profissional_id
    },
    catalog_status: {
      online_services: services.length,
      available_services: eligibleServices.length,
      unavailable_services: unavailableServices.length
    },
    profissionais: eligibleProfessionals.map((professional) => ({
      id: professional.id,
      nome_publico: professional.nome_publico,
      cargo: professional.cargo,
      servico_ids: [...(serviceIdsByProfessional.get(professional.id) || [])],
      especialidade_ids: [...(specialtyIdsByProfessional.get(professional.id) || [])]
    })),
    servicos: eligibleServices.map((service) => ({
      id: service.id,
      servico_tenant_id: service.id,
      servico_catalogo_id: service.servico_catalogo_id,
      codigo_canonico: service.codigo_canonico,
      nome: service.nome,
      duracao_minutos: service.duracao_minutos,
      preco: service.preco,
      categoria: service.categoria,
      natureza: service.natureza,
      especialidades_config: (service.especialidades_config || []).filter((linkItem) => (
        linkItem.ativo !== false
        && linkItem.aceita_agendamento_online !== false
        && Number(linkItem.duracao_minutos) > 0
        && linkItem.preco !== null
        && linkItem.preco !== undefined
      )).map((linkItem) => ({
        id: linkItem.id,
        especialidade_id: linkItem.especialidade_id,
        nome: linkItem.especialidade?.nome || null,
        duracao_minutos: linkItem.duracao_minutos,
        preco: linkItem.preco,
        dias_retorno_recomendado: linkItem.dias_retorno_recomendado ?? null
      }))
    }))
  };
}

async function assertPublicSelection(slug, input) {
  const catalog = await getCatalog(slug);
  const professional = catalog.profissionais.find((item) => item.id === input.profissional_id);
  const service = catalog.servicos.find((item) => item.id === input.servico_id);

  if (!professional || !professional.servico_ids.includes(input.servico_id)) {
    throw new AppError('Servico indisponivel para este profissional', 422, 'PUBLIC_BOOKING_SELECTION_INVALID');
  }
  const professionalServiceSpecialties = (service?.especialidades_config || []).filter((item) => (
    professional.especialidade_ids.includes(item.especialidade_id)
  ));
  if (professionalServiceSpecialties.length > 1 && !input.especialidade_id) {
    throw new AppError('Selecione a especialidade para este servico.', 422, 'PUBLIC_BOOKING_SPECIALTY_REQUIRED');
  }
  if (input.especialidade_id) {
    const serviceSpecialty = service?.especialidades_config?.find((item) => item.especialidade_id === input.especialidade_id);
    if (!serviceSpecialty || !professional.especialidade_ids.includes(input.especialidade_id)) {
      throw new AppError('Especialidade indisponivel para este profissional e servico', 422, 'PUBLIC_BOOKING_SPECIALTY_INVALID');
    }
  }

  return catalog;
}

async function getAvailability(slug, input) {
  const catalog = await assertPublicSelection(slug, input);
  const availability = await agendaService.getAvailability(catalog.tenant.id, input);

  return {
    catalog,
    availability: {
      ...availability,
      slots: [...(availability.slots || [])].sort((left, right) => (
        new Date(left.inicio).getTime() - new Date(right.inicio).getTime()
      )),
      smart_suggestions: [...(availability.smart_suggestions || [])].sort((left, right) => (
        new Date(left.inicio).getTime() - new Date(right.inicio).getTime()
      ))
    }
  };
}

async function identifyClient(slug, input) {
  const { link, tenant } = await resolveLink(slug);
  const identity = await clientIdentityService.identify(tenant, link, input);

  return {
    recognized: identity.recognized,
    clientId: identity.clientId,
    token: identity.token,
    expires_at: identity.expiresAt,
    client: identity.client
  };
}

async function getUpcomingClientAppointments(slug, input) {
  const { tenant } = await resolveLink(slug);
  const identity = await clientIdentityService.resolveClientIdentityForAppointment(tenant.id, input.token);
  const clientId = identity?.clientId;

  if (!clientId) {
    return {
      appointments: []
    };
  }

  const clientIds = await clientIdentityService.listRelatedClientIdsForAppointment(tenant.id, clientId);
  const appointments = await agendaService.listUpcomingClientAppointments(tenant.id, clientIds);

  return {
    appointments
  };
}

async function locateAccess(input) {
  if (input.slug) {
    try {
      return { slug: input.slug, identity: await identifyClient(input.slug, {
        lookup_only: true, request_id: input.request_id, cliente: { telefone: input.telefone, data_nascimento: input.data_nascimento }
      }) };
    } catch (error) {
      if (error.statusCode >= 500) throw error;
      throw identityPolicy.denied();
    }
  }
  const result = await clientIdentityService.discoverAccess(input);
  if (result.tenants.length === 1) return locateAccess({ ...input, slug: result.tenants[0].slug });
  return result;
}

async function probeClientContext(slug, input) {
  const { tenant } = await resolveLink(slug);
  return clientIdentityService.probeClientContext(tenant.id, input.token);
}

async function getClientMe(slug, input) {
  const { tenant } = await resolveLink(slug);
  return clientIdentityService.getSelfProfile(tenant.id, input.token);
}

async function updateClientMe(slug, input) {
  const { tenant } = await resolveLink(slug);
  const { token, ...payload } = input;
  return clientIdentityService.updateSelfProfile(tenant.id, token, payload);
}

async function createAppointment(slug, input) {
  const { link, tenant } = await resolveLink(slug);
  await assertPublicSelection(slug, input);
  const clientToken = input.client_context?.client_token;
  const clientId = clientToken
    ? await clientIdentityService.resolveClientForAppointment(tenant.id, clientToken)
    : (await clientIdentityService.identify(tenant, link, { cliente: input.cliente,
      request_id: input.request_id, campanha: input.campanha, origem: input.origem, sessao_id: input.sessao_id })).clientId;
  if (!clientId && !input.cliente?.telefone) {
    throw new AppError('Informe seu celular/WhatsApp para continuar.', 422, 'PUBLIC_CLIENT_PHONE_REQUIRED');
  }

  const clientContext = { ...(input.client_context || {}) };
  delete clientContext.client_token;
  const appointment = await agendaService.create(tenant.id, null, {
    ...input,
    client_context: clientContext,
    ...(clientId ? { cliente_id: clientId, cliente: undefined } : {})
  }, {
    origin: input.campanha ? 'campanha' : 'link_agendamento',
    metadata: {
      campaign_attribution: {
        campanha: input.campanha || null,
        origem: input.origem || null,
        sessao_id: input.sessao_id || null,
        link_agendamento_id: link.id
      }
    }
  });

  await repository.recordBookingAttribution({
    tenantId: tenant.id,
    linkId: link.id,
    clientId: appointment.cliente_id,
    appointmentId: appointment.id,
    campaignKey: input.campanha,
    origin: input.origem || (input.campanha ? 'campanha' : 'link_agendamento'),
    sessionId: input.sessao_id,
    metadata: {
      slug,
      servico_id: input.servico_id,
      profissional_id: input.profissional_id
    }
  });

  return {
    id: appointment.id,
    status: appointment.status,
    data_inicio: appointment.data_inicio,
    data_fim: appointment.data_fim,
    profissional: appointment.profissional,
    servicos: appointment.servicos,
    operational: agendaService.buildOperationalContext(appointment)
  };
}

async function getAppointmentByOperationalToken(token) {
  return agendaService.getByOperationalToken(token);
}

async function runAppointmentAction(input) {
  if (input.cmd === 'confirmar') {
    return agendaService.confirmByOperationalToken(input.token);
  }

  return agendaService.cancelByOperationalToken(input.token, {
    motivo: input.motivo
  });
}

async function rescheduleAppointmentByToken(input) {
  return agendaService.rescheduleByOperationalToken(input.token, {
    data_inicio: input.data_inicio,
    motivo: input.motivo
  });
}

module.exports = {
  probeClientContext,
  locateAccess,
  getCatalog,
  getAvailability,
  identifyClient,
  getUpcomingClientAppointments,
  getClientMe,
  updateClientMe,
  createAppointment,
  getAppointmentByOperationalToken,
  runAppointmentAction,
  rescheduleAppointmentByToken
};
