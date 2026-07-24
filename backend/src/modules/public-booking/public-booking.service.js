const agendaService = require('../agenda/agenda.service');
const repository = require('./public-booking.repository');
const clientIdentityService = require('./client-identity.service');
const { AppError, notFound } = require('../../utils/errors');
const {
  classifyServiceAvailability
} = require('./booking-catalog-policy');

async function resolveLink(slug) {
  const link = await repository.findActiveLink(slug);
  if (!link) throw notFound('Link de agendamento nao encontrado');

  if (link.expira_em && new Date(link.expira_em) <= new Date()) {
    throw new AppError('Este link de agendamento expirou', 410, 'BOOKING_LINK_EXPIRED');
  }

  const tenant = await repository.findTenant(link.tenant_id);
  if (!tenant || tenant.status === 'inativo' || tenant.status === 'cancelado') {
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
  const [professionalServices, memberships] = await Promise.all([
    repository.listProfessionalServices(tenant.id, professionalIds),
    repository.listActiveMemberships(tenant.id, userIds)
  ]);
  const activeMembershipUserIds = new Set(memberships.map((membership) => membership.usuario_id));
  const serviceById = new Map(services.map((service) => [service.id, service]));
  const serviceIdsByProfessional = new Map();

  professionalServices.forEach((linkItem) => {
    const service = serviceById.get(linkItem.servico_id);
    if (!service) return;
    if (!serviceIdsByProfessional.has(linkItem.profissional_id)) {
      serviceIdsByProfessional.set(linkItem.profissional_id, new Set());
    }
    serviceIdsByProfessional.get(linkItem.profissional_id).add(linkItem.servico_id);
  });

  const operationalProfessionalIds = new Set(professionals
    .filter((professional) => (
      !professional.usuario_id || activeMembershipUserIds.has(professional.usuario_id)
    ))
    .map((professional) => professional.id));
  const {
    eligibleServiceIds,
    unavailableServices
  } = classifyServiceAvailability({
    services,
    professionalServices,
    eligibleProfessionalIds: operationalProfessionalIds
  });
  const eligibleProfessionals = professionals.filter((professional) => (
    operationalProfessionalIds.has(professional.id)
    && [...(serviceIdsByProfessional.get(professional.id) || [])].some((serviceId) => (
      eligibleServiceIds.has(serviceId)
    ))
  ));
  const eligibleServices = services.filter((service) => eligibleServiceIds.has(service.id));

  if (unavailableServices.length) {
    console.warn('[public-booking] online services unavailable', {
      tenant_id: tenant.id,
      slug,
      services: unavailableServices
    });
  }

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
      servico_ids: [...serviceIdsByProfessional.get(professional.id)]
    })),
    servicos: eligibleServices.map((service) => ({
      id: service.id,
      nome: service.nome,
      duracao_minutos: service.duracao_minutos,
      preco: service.preco,
      categoria: service.categoria
    }))
  };
}

async function assertPublicSelection(slug, input) {
  const catalog = await getCatalog(slug);
  const professional = catalog.profissionais.find((item) => item.id === input.profissional_id);

  if (!professional || !professional.servico_ids.includes(input.servico_id)) {
    throw new AppError('Servico indisponivel para este profissional', 422, 'PUBLIC_BOOKING_SELECTION_INVALID');
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

async function createAppointment(slug, input) {
  const { link, tenant } = await resolveLink(slug);
  await assertPublicSelection(slug, input);
  const clientToken = input.client_context?.client_token;
  const clientId = clientToken
    ? await clientIdentityService.resolveClientForAppointment(tenant.id, clientToken)
    : null;
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
  getCatalog,
  getAvailability,
  identifyClient,
  getUpcomingClientAppointments,
  createAppointment,
  getAppointmentByOperationalToken,
  runAppointmentAction,
  rescheduleAppointmentByToken
};
