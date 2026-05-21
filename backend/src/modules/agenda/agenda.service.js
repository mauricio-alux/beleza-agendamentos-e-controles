const { AppError, notFound } = require('../../utils/errors');
const { onlyDigits } = require('../../utils/normalize');
const agendaRepository = require('./agenda.repository');
const agendaEngine = require('./agenda.engine');

function getDayOfWeek(date) {
  return new Date(`${date}T12:00:00`).getDay();
}

function getDayRange(date) {
  return {
    start: new Date(`${date}T00:00:00`).toISOString(),
    end: new Date(`${date}T23:59:59`).toISOString()
  };
}

function getServiceDuration(service, professionalService) {
  return professionalService?.duracao_minutos
    || professionalService?.duracao_especifica_minutos
    || service.duracao_minutos;
}

function getServicePrice(service, professionalService) {
  return professionalService?.preco
    ?? professionalService?.preco_especifico
    ?? service.preco
    ?? 0;
}

async function getMeta(tenantId) {
  const [profissionais, servicos] = await Promise.all([
    agendaRepository.listProfessionals(tenantId),
    agendaRepository.listServices(tenantId)
  ]);

  return { profissionais, servicos };
}

async function getContext(tenantId, profissionalId, servicoId) {
  const [profissional, servico, professionalService, settings] = await Promise.all([
    agendaRepository.findProfessional(tenantId, profissionalId),
    agendaRepository.findService(tenantId, servicoId),
    agendaRepository.findProfessionalService(tenantId, profissionalId, servicoId),
    agendaRepository.getTenantSettings(tenantId)
  ]);

  if (!profissional) throw notFound('Profissional nao encontrado');
  if (!servico) throw notFound('Servico nao encontrado');

  return {
    profissional,
    servico,
    professionalService,
    settings,
    durationMinutes: getServiceDuration(servico, professionalService),
    price: getServicePrice(servico, professionalService)
  };
}

async function getAvailability(tenantId, input, options = {}) {
  const context = await getContext(tenantId, input.profissional_id, input.servico_id);
  const range = getDayRange(input.data);
  const diaSemana = getDayOfWeek(input.data);

  const [schedules, appointments, blocks] = await Promise.all([
    agendaRepository.getWeeklySchedule(tenantId, input.profissional_id, diaSemana),
    agendaRepository.listAppointments(tenantId, {
      data_inicio: range.start,
      data_fim: range.end,
      profissional_id: input.profissional_id
    }),
    agendaRepository.listBlocks(tenantId, input.profissional_id, range.start, range.end)
  ]);

  const filteredAppointments = options.ignoreAppointmentId
    ? appointments.filter((item) => item.id !== options.ignoreAppointmentId)
    : appointments;

  const result = agendaEngine.generateAvailability({
    date: input.data,
    schedules,
    durationMinutes: context.durationMinutes,
    settings: context.settings,
    appointments: filteredAppointments.filter((item) => agendaRepository.ACTIVE_APPOINTMENT_STATUSES.includes(item.status)),
    blocks
  });

  return {
    data: input.data,
    profissional: context.profissional,
    servico: context.servico,
    duracao_minutos: context.durationMinutes,
    slots: result.available,
    unavailable_reason: result.unavailable_reason
  };
}

async function list(tenantId, filters) {
  return agendaRepository.listAppointments(tenantId, filters);
}

async function getById(tenantId, id) {
  const appointment = await agendaRepository.findAppointmentById(tenantId, id);
  if (!appointment) throw notFound('Agendamento nao encontrado');
  return appointment;
}

async function resolveClient(tenantId, input) {
  if (input.cliente_id) {
    const client = await agendaRepository.findClientById(tenantId, input.cliente_id);
    if (!client) throw notFound('Cliente nao encontrado');
    return client;
  }

  const telefone = onlyDigits(input.cliente.telefone);
  const existing = await agendaRepository.findClientByPhone(tenantId, telefone);
  if (existing) return existing;

  return agendaRepository.createClient(tenantId, {
    nome: input.cliente.nome,
    telefone,
    email: input.cliente.email
  });
}

async function validateSlot(tenantId, input, ignoreAppointmentId = null) {
  const start = new Date(input.data_inicio);
  if (Number.isNaN(start.getTime()) || start <= new Date()) {
    throw new AppError('Agendamento invalido', 422, 'INVALID_APPOINTMENT_DATE');
  }

  const date = start.toISOString().slice(0, 10);
  const availability = await getAvailability(tenantId, {
    data: date,
    profissional_id: input.profissional_id,
    servico_id: input.servico_id
  }, { ignoreAppointmentId });

  return {
    availability,
    slot: agendaEngine.assertAvailability(input.data_inicio, availability.duracao_minutos, availability)
  };
}

async function create(tenantId, usuarioId, input) {
  const context = await getContext(tenantId, input.profissional_id, input.servico_id);
  const { slot } = await validateSlot(tenantId, input);
  const conflicts = await agendaRepository.listConflicts(
    tenantId,
    input.profissional_id,
    slot.start.toISOString(),
    slot.end.toISOString()
  );

  if (conflicts.length) {
    throw new AppError('Este horario ja foi reservado', 409, 'APPOINTMENT_CONFLICT');
  }

  const client = await resolveClient(tenantId, input);
  const appointment = await agendaRepository.createAppointment(
    {
      tenant_id: tenantId,
      cliente_id: client.id,
      profissional_id: input.profissional_id,
      data_inicio: slot.start.toISOString(),
      data_fim: slot.end.toISOString(),
      status: 'pendente',
      origem: 'dashboard',
      observacoes: input.observacoes || null,
      valor_total: context.price,
      metadata: {
        criado_por_usuario_id: usuarioId,
        engine: 'bellory_v1'
      }
    },
    {
      tenant_id: tenantId,
      servico_id: input.servico_id,
      nome_servico: context.servico.nome,
      duracao_minutos: context.durationMinutes,
      valor_servico: context.price
    }
  );

  await agendaRepository.createStatusHistory({
    tenant_id: tenantId,
    agendamento_id: appointment.id,
    usuario_id: usuarioId,
    status_anterior: null,
    status_novo: 'pendente',
    origem: 'dashboard'
  });

  return getById(tenantId, appointment.id);
}

async function update(tenantId, id, input) {
  await getById(tenantId, id);
  return agendaRepository.updateAppointment(tenantId, id, input);
}

async function updateStatus(tenantId, usuarioId, id, status, metadata = {}) {
  const current = await getById(tenantId, id);
  const payload = {
    status,
    metadata: {
      ...(current.metadata || {}),
      ...metadata
    }
  };

  if (status === 'confirmado') payload.confirmado_em = new Date().toISOString();
  if (status === 'cancelado') payload.cancelado_em = new Date().toISOString();
  if (status === 'concluido') payload.concluido_em = new Date().toISOString();

  const updated = await agendaRepository.updateAppointment(tenantId, id, payload);
  await agendaRepository.createStatusHistory({
    tenant_id: tenantId,
    agendamento_id: id,
    usuario_id: usuarioId,
    status_anterior: current.status,
    status_novo: status,
    motivo: metadata.motivo || null,
    origem: 'dashboard',
    metadata
  });

  return updated;
}

async function cancel(tenantId, usuarioId, id, input) {
  return updateStatus(tenantId, usuarioId, id, 'cancelado', {
    motivo: input.motivo || null
  });
}

async function confirm(tenantId, usuarioId, id) {
  return updateStatus(tenantId, usuarioId, id, 'confirmado');
}

async function reschedule(tenantId, usuarioId, id, input) {
  const current = await getById(tenantId, id);
  if (current.status === 'cancelado') {
    throw new AppError('Agendamento invalido', 422, 'INVALID_APPOINTMENT_STATUS');
  }

  const service = current.servicos?.[0];
  if (!service) throw new AppError('Servico obrigatorio', 422, 'APPOINTMENT_SERVICE_REQUIRED');

  const { slot } = await validateSlot(tenantId, {
    profissional_id: current.profissional_id,
    servico_id: service.servico_id,
    data_inicio: input.data_inicio
  }, id);

  const updated = await agendaRepository.updateAppointment(tenantId, id, {
    data_inicio: slot.start.toISOString(),
    data_fim: slot.end.toISOString(),
    status: 'pendente',
    metadata: {
      ...(current.metadata || {}),
      reagendado_em: new Date().toISOString(),
      motivo_reagendamento: input.motivo || null
    }
  });

  await agendaRepository.createStatusHistory({
    tenant_id: tenantId,
    agendamento_id: id,
    usuario_id: usuarioId,
    status_anterior: current.status,
    status_novo: 'pendente',
    motivo: input.motivo || null,
    origem: 'dashboard'
  });

  return updated;
}

module.exports = {
  getMeta,
  getAvailability,
  list,
  getById,
  create,
  update,
  cancel,
  confirm,
  reschedule
};
