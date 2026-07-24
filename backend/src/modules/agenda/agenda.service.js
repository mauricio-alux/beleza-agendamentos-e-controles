const { AppError, notFound } = require('../../utils/errors');
const { onlyDigits, normalizePhoneToE164 } = require('../../utils/normalize');
const agendaRepository = require('./agenda.repository');
const agendaEngine = require('./agenda.engine');
const agendaAnalytics = require('./domain/agenda.analytics');
const serviceComposition = require('./domain/service-composition');
const agendaEvents = require('./events/agenda.events');
const agendaSignals = require('./signals/agenda.signals');
const notificationProvider = require('./notifications/notification.provider');
const appointmentSecurity = require('./security/appointment-security.service');
const {
  resolveAppointmentStatus,
  canConfirmAppointment,
  canCompleteAppointment,
  canMarkNoShowAppointment
} = require('./domain/appointment-status');
const {
  generateOperationalToken,
  buildOperationalLinks,
  buildOperationalMessage
} = require('./domain/appointment-operational-token');
const { isAdministrativeProfessional } = require('../../constants/team-professional-roles');

const TERMINAL_APPOINTMENT_STATUSES = ['cancelado', 'concluido', 'no_show', 'no-show'];
const LOCAL_AGENDA_UTC_OFFSET = '-03:00';
const COMPLETION_TOLERANCE_MINUTES = Math.max(
  0,
  Number(process.env.APPOINTMENT_COMPLETION_TOLERANCE_MINUTES || 120)
);

function getDayOfWeek(date) {
  return new Date(`${date}T12:00:00`).getDay();
}

function addDaysToDateInput(date, days) {
  const [year, month, day] = date.split('-').map(Number);
  const nextDate = new Date(Date.UTC(year, month - 1, day + days, 12, 0, 0));
  return nextDate.toISOString().slice(0, 10);
}

function getDayRange(date) {
  const nextDate = addDaysToDateInput(date, 1);

  return {
    start: new Date(`${date}T00:00:00${LOCAL_AGENDA_UTC_OFFSET}`).toISOString(),
    end: new Date(`${nextDate}T00:00:00${LOCAL_AGENDA_UTC_OFFSET}`).toISOString()
  };
}

function normalizeAgendaListFilters(filters = {}) {
  const normalized = { ...filters };

  if (filters.data) {
    const range = getDayRange(filters.data);
    normalized.data_inicio = filters.data_inicio || range.start;
    normalized.data_fim = filters.data_fim || range.end;
  }

  return normalized;
}

function getServiceDuration(service, professionalService) {
  return firstPositiveNumber(
    professionalService?.duracao_minutos,
    professionalService?.duracao_especifica_minutos,
    service.duracao_minutos
  );
}

function getServicePrice(service, professionalService) {
  return firstPositiveNumber(
    professionalService?.preco,
    professionalService?.preco_especifico,
    service.preco
  );
}

function firstPositiveNumber(...values) {
  const value = values.find((item) => Number(item) > 0);
  return value === undefined ? 0 : Number(value);
}

function getEffectiveAppointmentStatus(appointment) {
  return resolveAppointmentStatus(appointment.status, appointment.metadata);
}

function assertAppointmentIsNotTerminal(appointment, action = 'alterar') {
  const effectiveStatus = getEffectiveAppointmentStatus(appointment);

  if (TERMINAL_APPOINTMENT_STATUSES.includes(effectiveStatus)) {
    throw new AppError(
      `Este agendamento nao pode ser ${action} no status atual.`,
      422,
      'INVALID_APPOINTMENT_STATUS'
    );
  }
}

function assertAppointmentIsFuture(appointment, action = 'alterar') {
  const startsAt = new Date(appointment.data_inicio);

  if (Number.isNaN(startsAt.getTime()) || startsAt <= new Date()) {
    throw new AppError(
      `Este agendamento nao pode ser ${action} apos o horario do atendimento.`,
      422,
      'APPOINTMENT_ACTION_EXPIRED'
    );
  }
}

function assertAppointmentIsConfirmed(appointment, action = 'alterar') {
  if (!canCompleteAppointment(appointment.status, appointment.metadata)) {
    throw new AppError(
      `Este agendamento nao pode ser ${action} no status atual.`,
      422,
      'INVALID_APPOINTMENT_STATUS'
    );
  }
}

function assertEarlyCompletionIsConfirmed(appointment, input = {}, now = new Date()) {
  if (input.origem_status === 'auto_completion' || input.confirmar_conclusao_antecipada) return;

  const startsAt = new Date(appointment.data_inicio);
  if (Number.isNaN(startsAt.getTime()) || startsAt <= now) return;

  throw new AppError(
    'Este atendimento ainda nao iniciou. Confirme para concluir antes do horario previsto.',
    409,
    'EARLY_COMPLETION_REQUIRES_CONFIRMATION',
    {
      data_hora_agendada: startsAt.toISOString(),
      data_hora_atual: now.toISOString()
    }
  );
}

function getAutoCompletionCutoff(now = new Date()) {
  return new Date(now.getTime() - COMPLETION_TOLERANCE_MINUTES * 60000).toISOString();
}

function buildCompletionAlert(appointment, now = new Date()) {
  if (!canCompleteAppointment(appointment.status, appointment.metadata)) return null;

  const endAt = new Date(appointment.data_fim);
  if (Number.isNaN(endAt.getTime()) || endAt > now) return null;

  const elapsedMinutes = Math.max(0, Math.floor((now.getTime() - endAt.getTime()) / 60000));
  const remainingMinutes = Math.max(0, COMPLETION_TOLERANCE_MINUTES - elapsedMinutes);

  return {
    type: remainingMinutes > 0 ? 'completion_tolerance' : 'auto_completion_due',
    elapsed_minutes: elapsedMinutes,
    remaining_minutes: remainingMinutes,
    message: elapsedMinutes >= 60
      ? `Atendimento encerrado ha ${Math.floor(elapsedMinutes / 60)} hora${Math.floor(elapsedMinutes / 60) === 1 ? '' : 's'}`
      : `Atendimento encerrado ha ${elapsedMinutes} minuto${elapsedMinutes === 1 ? '' : 's'}`
  };
}

async function generateUniqueOperationalToken() {
  for (let attempt = 0; attempt < 8; attempt += 1) {
    const token = generateOperationalToken();
    const existing = await agendaRepository.findAppointmentByOperationalToken(token);
    if (!existing) return token;
  }

  throw new AppError(
    'Nao foi possivel gerar o token operacional do agendamento.',
    500,
    'APPOINTMENT_TOKEN_GENERATION_FAILED'
  );
}

function buildOperationalContext(appointment) {
  if (!appointment?.token_confirmacao) return null;

  return {
    token: appointment.token_confirmacao,
    links: buildOperationalLinks(appointment.token_confirmacao),
    message: buildOperationalMessage(appointment)
  };
}

async function ensureOperationalContext(appointment) {
  if (appointment?.token_confirmacao) {
    return appointment;
  }

  const token = await generateUniqueOperationalToken();
  const updated = await agendaRepository.updateAppointment(appointment.tenant_id, appointment.id, {
    token_confirmacao: token,
    metadata: {
      ...(appointment.metadata || {}),
      operational_token_created_at: new Date().toISOString(),
      operational_token_origin: 'public_upcoming_lookup'
    }
  });

  return {
    ...appointment,
    ...updated,
    token_confirmacao: updated.token_confirmacao || token
  };
}

function getPrimaryAppointmentService(appointment) {
  return appointment?.servicos?.[0] || null;
}

function serializeOperationalAppointment(appointment) {
  const serviceLink = getPrimaryAppointmentService(appointment);
  const service = serviceLink?.servico || null;

  return {
    id: appointment.id,
    tenant: appointment.tenant ? {
      id: appointment.tenant.id,
      slug: appointment.tenant.slug,
      nome_fantasia: appointment.tenant.nome_fantasia
    } : { id: appointment.tenant_id },
    cliente: appointment.cliente ? {
      nome: appointment.cliente.nome,
      telefone: appointment.cliente.telefone,
      email: appointment.cliente.email
    } : null,
    profissional: appointment.profissional ? {
      id: appointment.profissional.id,
      nome_publico: appointment.profissional.nome_publico,
      cargo: appointment.profissional.cargo
    } : null,
    servico: service ? {
      id: service.id,
      nome: service.nome,
      preco: service.preco,
      duracao_minutos: service.duracao_minutos || serviceLink?.duracao_minutos
    } : null,
    data_inicio: appointment.data_inicio,
    data_fim: appointment.data_fim,
    status: getEffectiveAppointmentStatus(appointment),
    valor_total: appointment.valor_total,
    operational: buildOperationalContext(appointment)
  };
}

function enrichOperationalAlert(appointment) {
  return {
    ...appointment,
    operational_alert: buildCompletionAlert(appointment)
  };
}

function normalizeAdvancedScheduleRow(row) {
  if (row.is_working === false) {
    return [];
  }

  const breakStart = row.break_start || null;
  const breakEnd = row.break_end || null;
  const hasCompleteDayWindow = row.work_start_morning
    && row.work_end_morning
    && row.work_start_afternoon
    && row.work_end_afternoon
    && breakStart
    && breakEnd;

  if (hasCompleteDayWindow) {
    return [{
      dia_semana: row.weekday,
      hora_inicio: row.work_start_morning,
      hora_fim: row.work_end_afternoon,
      hora_intervalo_inicio: breakStart,
      hora_intervalo_fim: breakEnd,
      source: row.is_exception ? 'professional_exception' : 'professional_schedule'
    }];
  }

  const rows = [];

  if (row.work_start_morning && row.work_end_morning) {
    rows.push({
      dia_semana: row.weekday,
      hora_inicio: row.work_start_morning,
      hora_fim: row.work_end_morning,
      hora_intervalo_inicio: breakStart,
      hora_intervalo_fim: breakEnd,
      source: row.is_exception ? 'professional_exception' : 'professional_schedule'
    });
  }

  if (row.work_start_afternoon && row.work_end_afternoon) {
    rows.push({
      dia_semana: row.weekday,
      hora_inicio: row.work_start_afternoon,
      hora_fim: row.work_end_afternoon,
      hora_intervalo_inicio: breakStart,
      hora_intervalo_fim: breakEnd,
      source: row.is_exception ? 'professional_exception' : 'professional_schedule'
    });
  }

  if (!rows.length && row.break_start && row.break_end) {
    return [];
  }

  return rows;
}

function buildSalonFallbackSchedule(tenant, settings, diaSemana) {
  const tenantConfig = tenant?.configuracoes || {};
  const start = tenantConfig.horario_inicio_padrao || '09:00';
  const end = tenantConfig.horario_fim_padrao || '18:00';
  const breakStart = tenantConfig.horario_intervalo_inicio || settings?.horario_intervalo_inicio || '12:00';
  const breakEnd = tenantConfig.horario_intervalo_fim || settings?.horario_intervalo_fim || '13:00';

  return [{
    dia_semana: diaSemana,
    hora_inicio: start,
    hora_fim: end,
    hora_intervalo_inicio: breakStart,
    hora_intervalo_fim: breakEnd,
    source: 'salon_fallback'
  }];
}

async function getAvailabilitySchedules(tenantId, profissional, diaSemana, settings) {
  const advancedSchedules = await agendaRepository.listProfessionalSchedulesByWeekday(tenantId, profissional, diaSemana);

  if (advancedSchedules !== null && advancedSchedules.length) {
    return {
      schedules: advancedSchedules.flatMap(normalizeAdvancedScheduleRow),
      source: advancedSchedules.some((item) => item.is_exception) ? 'professional_exception' : 'professional_schedule'
    };
  }

  const legacySchedules = await agendaRepository.getWeeklySchedule(tenantId, profissional.id, diaSemana);

  if (legacySchedules.length) {
    return {
      schedules: legacySchedules.map((item) => ({ ...item, source: 'legacy_professional_schedule' })),
      source: 'legacy_professional_schedule'
    };
  }

  const tenant = await agendaRepository.getTenant(tenantId);

  return {
    schedules: buildSalonFallbackSchedule(tenant, settings, diaSemana),
    source: 'salon_fallback'
  };
}

function normalizeScheduleForApi(item) {
  if (item.weekday !== undefined) {
    return {
      weekday: item.weekday,
      work_start_morning: item.work_start_morning,
      work_end_morning: item.work_end_morning,
      work_start_afternoon: item.work_start_afternoon,
      work_end_afternoon: item.work_end_afternoon,
      break_start: item.break_start,
      break_end: item.break_end,
      is_working: item.is_working,
      is_exception: item.is_exception
    };
  }

  const hasBreak = item.hora_intervalo_inicio && item.hora_intervalo_fim;

  return {
    weekday: item.dia_semana,
    work_start_morning: item.hora_inicio,
    work_end_morning: hasBreak ? item.hora_intervalo_inicio : item.hora_fim,
    work_start_afternoon: hasBreak ? item.hora_intervalo_fim : null,
    work_end_afternoon: hasBreak ? item.hora_fim : null,
    break_start: item.hora_intervalo_inicio,
    break_end: item.hora_intervalo_fim,
    is_working: item.ativo !== false,
    is_exception: false
  };
}

function normalizeLegacySchedulesForApi(schedules) {
  const grouped = new Map();

  schedules.forEach((item) => {
    const normalized = normalizeScheduleForApi(item);
    const current = grouped.get(normalized.weekday);

    if (!current) {
      grouped.set(normalized.weekday, normalized);
      return;
    }

    if (!current.work_start_afternoon && normalized.work_start_morning) {
      current.work_start_afternoon = normalized.work_start_morning;
      current.work_end_afternoon = normalized.work_end_morning;
    }

    if (!current.break_start && normalized.break_start) {
      current.break_start = normalized.break_start;
      current.break_end = normalized.break_end;
    }
  });

  return Array.from(grouped.values()).sort((a, b) => a.weekday - b.weekday);
}

async function getMeta(tenantId, profissionalId = null) {
  const [profissionais, servicos] = await Promise.all([
    agendaRepository.listProfessionals(tenantId, profissionalId),
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
  if (!professionalService) {
    throw new AppError(
      'Este servico nao esta vinculado ao profissional selecionado.',
      422,
      'PROFESSIONAL_SERVICE_NOT_LINKED'
    );
  }

  const composition = serviceComposition.resolveServiceComposition(servico, professionalService);

  return {
    profissional,
    servico,
    professionalService,
    settings,
    durationMinutes: composition.totalDurationMinutes || getServiceDuration(servico, professionalService),
    price: firstPositiveNumber(composition.totalPrice, getServicePrice(servico, professionalService)),
    composition
  };
}

async function getAvailability(tenantId, input, options = {}) {
  const context = await getContext(tenantId, input.profissional_id, input.servico_id);
  const range = getDayRange(input.data);
  const diaSemana = getDayOfWeek(input.data);

  const [scheduleContext, appointments, blocks] = await Promise.all([
    getAvailabilitySchedules(tenantId, context.profissional, diaSemana, context.settings),
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
    schedules: scheduleContext.schedules,
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
    smart_suggestions: result.available.slice(0, 3),
    intelligence: {
      ...result.intelligence,
      availability_source: scheduleContext.source,
      professional_schedule_ready: true
    },
    unavailable_reason: result.unavailable_reason
  };
}

async function getProfessionalSchedule(tenantId, profissionalId) {
  const profissional = await agendaRepository.findProfessional(tenantId, profissionalId);
  if (!profissional) throw notFound('Profissional nao encontrado');
  if (isAdministrativeProfessional(profissional.metadata?.tipo_usuario)) {
    throw new AppError('Profissional Adm nao possui escala operacional.', 422, 'ADMIN_PROFESSIONAL_NO_OPERATIONAL_SCHEDULE');
  }

  const advancedSchedules = await agendaRepository.listProfessionalSchedules(tenantId, profissional);
  if (advancedSchedules !== null && advancedSchedules.length) {
    return {
      profissional,
      source: 'professional_schedules',
      schedules: advancedSchedules.map(normalizeScheduleForApi)
    };
  }

  const legacySchedules = await agendaRepository.listWeeklySchedule(tenantId, profissionalId);

  return {
    profissional,
    source: advancedSchedules === null ? 'legacy_escalas_semanais' : 'empty_professional_schedules',
    schedules: normalizeLegacySchedulesForApi(legacySchedules)
  };
}

async function updateProfessionalSchedule(tenantId, profissionalId, input) {
  const profissional = await agendaRepository.findProfessional(tenantId, profissionalId);
  if (!profissional) throw notFound('Profissional nao encontrado');
  if (isAdministrativeProfessional(profissional.metadata?.tipo_usuario)) {
    throw new AppError('Profissional Adm nao possui escala operacional.', 422, 'ADMIN_PROFESSIONAL_NO_OPERATIONAL_SCHEDULE');
  }

  const saved = await agendaRepository.replaceProfessionalSchedules(tenantId, profissional, input.schedules);

  return {
    profissional,
    source: saved[0]?.professional_id ? 'professional_schedules' : 'legacy_escalas_semanais',
    schedules: input.schedules.map((item) => ({
      ...item,
      is_working: item.is_working !== false,
      is_exception: Boolean(item.is_exception)
    }))
  };
}

async function getOperationalAnalytics(tenantId, filters = {}) {
  const date = filters.data || new Date().toISOString().slice(0, 10);
  const range = getDayRange(date);
  const profissionalId = filters.profissional_id || null;
  const diaSemana = getDayOfWeek(date);
  const context = filters.servico_id && profissionalId
    ? await getContext(tenantId, profissionalId, filters.servico_id)
    : { durationMinutes: 45 };
  const scheduleProfessional = context.profissional || (profissionalId ? await agendaRepository.findProfessional(tenantId, profissionalId) : null);
  const scheduleSettings = context.settings || (profissionalId ? await agendaRepository.getTenantSettings(tenantId) : null);

  const [appointments, scheduleContext] = await Promise.all([
    agendaRepository.listAppointmentsForAnalytics(tenantId, {
      data_inicio: range.start,
      data_fim: range.end,
      profissional_id: profissionalId
    }),
    profissionalId && scheduleProfessional
      ? getAvailabilitySchedules(tenantId, scheduleProfessional, diaSemana, scheduleSettings)
      : Promise.resolve({ schedules: [] })
  ]);

  const analytics = agendaAnalytics.buildAnalyticsContext({
    appointments,
    schedules: scheduleContext.schedules,
    date,
    durationMinutes: context.durationMinutes
  });

  return {
    data: date,
    profissional_id: profissionalId,
    analytics,
    hints: agendaAnalytics.buildOptimizationHints(analytics),
    realtime_ready: true,
    ai_ready: true
  };
}

async function getSignals(tenantId, filters = {}) {
  const analyticsPayload = await getOperationalAnalytics(tenantId, filters);
  const range = getDayRange(analyticsPayload.data);
  const appointments = await agendaRepository.listAppointmentsForAnalytics(tenantId, {
    data_inicio: range.start,
    data_fim: range.end,
    profissional_id: filters.profissional_id || null
  });
  const availability = filters.profissional_id && filters.servico_id
    ? await getAvailability(tenantId, {
        data: filters.data || analyticsPayload.data,
        profissional_id: filters.profissional_id,
        servico_id: filters.servico_id
      }).catch(() => ({ slots: [] }))
    : { slots: [] };

  return {
    data: analyticsPayload.data,
    signals: agendaSignals.buildSignals({
      analytics: analyticsPayload.analytics,
      appointments,
      slots: availability.slots || []
    }),
    context: {
      source: 'agenda',
      ai_ready: true,
      realtime_ready: true
    }
  };
}

async function list(tenantId, filters) {
  await processAutoCompletion(tenantId);
  const normalizedFilters = normalizeAgendaListFilters(filters);

  console.log('[agenda-list-debug] backend request', {
    tenantId,
    selected_date: filters?.data || null,
    received_filters: filters,
    interval: {
      data_inicio: normalizedFilters.data_inicio || null,
      data_fim: normalizedFilters.data_fim || null
    },
    profissional_id: normalizedFilters.profissional_id || null,
    servico_id: normalizedFilters.servico_id || null,
    status: normalizedFilters.status || null
  });

  const appointments = await agendaRepository.listAppointments(tenantId, normalizedFilters);

  console.log('[agenda-list-debug] backend response', {
    tenantId,
    selected_date: filters?.data || null,
    count: appointments.length,
    statuses: appointments.map((appointment) => appointment.status),
    appointment_ids: appointments.map((appointment) => appointment.id)
  });

  return appointments.map(enrichOperationalAlert);
}

async function getById(tenantId, id) {
  const appointment = await agendaRepository.findAppointmentById(tenantId, id);
  if (!appointment) throw notFound('Agendamento nao encontrado');
  return enrichOperationalAlert(appointment);
}

async function resolveClient(tenantId, input) {
  const context = input.client_context || {};
  const endereco = normalizeClientAddress(input.cliente?.endereco);

  if (input.cliente_id) {
    const client = await agendaRepository.findClientById(tenantId, input.cliente_id);
    if (!client) throw notFound('Cliente nao encontrado');
    return refreshClientIdentity(tenantId, client, context, false, endereco);
  }

  const telefone = normalizePhoneToE164(input.cliente.telefone);
  const existing = await agendaRepository.findClientByPhone(tenantId, telefone);
  if (existing) return refreshClientIdentity(tenantId, existing, context, false, endereco);

  const client = await agendaRepository.createClient(tenantId, {
    nome: input.cliente.nome,
    telefone,
    email: input.cliente.email,
    endereco
  });

  return refreshClientIdentity(tenantId, client, context, true, endereco);
}

function normalizeClientAddress(endereco) {
  if (!endereco?.cep) return null;

  return {
    cep: onlyDigits(endereco.cep),
    uf: endereco.uf || null,
    cidade: endereco.cidade || null,
    logradouro: endereco.logradouro || null,
    numero: endereco.numero || null
  };
}

async function refreshClientIdentity(tenantId, client, context = {}, isNewClient = false, endereco = null) {
  const evaluation = appointmentSecurity.evaluateClientIdentity(client, context);
  const clientToken = client.client_token || context.client_token || appointmentSecurity.generateClientToken();

  const updated = await agendaRepository.updateClientIdentity(tenantId, client.id, {
    client_token: clientToken,
    trusted_device_hash: client.trusted_device_hash || evaluation.deviceHash || null,
    trust_score: isNewClient ? Math.max(10, evaluation.trustScore) : evaluation.trustScore,
    last_known_device: context.user_agent || context.device_hash || null,
    last_known_ip: context.ip || null,
    identity_status: evaluation.identityStatus,
    metadata: endereco ? { ...(client.metadata || {}), endereco } : undefined
  });

  return {
    ...client,
    ...(updated || {}),
    client_token: updated?.client_token || clientToken,
    identity_evaluation: evaluation
  };
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
    slot: agendaEngine.assertAvailability(input.data_inicio, availability.duracao_minutos, {
      available: availability.slots || []
    })
  };
}

async function create(tenantId, usuarioId, input, options = {}) {
  const origin = options.origin || 'dashboard';
  const context = await getContext(tenantId, input.profissional_id, input.servico_id);
  const { slot } = await validateSlot(tenantId, input);
  const confirmationContext = appointmentSecurity.buildConfirmationContext(context.settings);
  const conflicts = await agendaRepository.listConflicts(
    tenantId,
    input.profissional_id,
    slot.start.toISOString(),
    slot.end.toISOString()
  );

  if (conflicts.length) {
    await agendaEvents.publish('appointment.conflict_detected', {
      tenantId,
      usuarioId,
      payload: {
        profissional_id: input.profissional_id,
        data_inicio: slot.start.toISOString(),
        data_fim: slot.end.toISOString(),
        conflicts: conflicts.map((item) => item.id)
      }
    });
    throw new AppError('Este horario ja foi reservado', 409, 'APPOINTMENT_CONFLICT');
  }

  const client = await resolveClient(tenantId, input);
  const identityEvaluation = client.identity_evaluation || appointmentSecurity.evaluateClientIdentity(client, input.client_context);
  const tenMinutesAgo = new Date(Date.now() - 10 * 60000).toISOString();
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60000).toISOString();
  const [recentRequests, weeklyRequests] = await Promise.all([
    agendaRepository.countClientAppointmentsSince(tenantId, client.id, tenMinutesAgo),
    agendaRepository.countClientAppointmentsSince(tenantId, client.id, weekAgo)
  ]);
  const securitySignals = {
    recent_booking_limit_exceeded: recentRequests >= 3,
    weekly_booking_limit_exceeded: weeklyRequests >= confirmationContext.weekly_booking_limit,
    recent_requests_last_10_min: recentRequests,
    weekly_requests: weeklyRequests
  };

  if (securitySignals.weekly_booking_limit_exceeded && confirmationContext.block_when_weekly_limit_exceeded) {
    throw new AppError('Limite semanal de agendamentos atingido', 429, 'WEEKLY_BOOKING_LIMIT');
  }

  const requestedStatus = identityEvaluation.suspicious ? 'suspeito' : 'pendente_atendente';
  const operationalToken = await generateUniqueOperationalToken();
  const appointment = await agendaRepository.createAppointment(
    {
      tenant_id: tenantId,
      cliente_id: client.id,
      profissional_id: input.profissional_id,
      data_inicio: slot.start.toISOString(),
      data_fim: slot.end.toISOString(),
      status: requestedStatus,
      origem: origin,
      observacoes: input.observacoes || null,
      valor_total: context.price,
      token_confirmacao: operationalToken,
      metadata: {
        ...(options.metadata || {}),
        criado_por_usuario_id: usuarioId,
        origem: origin,
        engine: 'bellory_v1',
        intelligence_layer: 'occupancy_engine_v1',
        security_layer: 'appointment_confirmation_v1',
        confirmation_policy: confirmationContext.confirmation_policy,
        pending_attendant_expires_at: confirmationContext.pending_attendant_expires_at,
        pending_client_expires_at: confirmationContext.pending_client_expires_at,
        client_identity: {
          client_token_ready: Boolean(client.client_token),
          trust_score: identityEvaluation.trustScore,
          identity_status: identityEvaluation.identityStatus,
          suspicious: identityEvaluation.suspicious,
          reason: identityEvaluation.reason
        },
        security_signals: securitySignals,
        service_composition: {
          multi_service_ready: context.composition.multi_service_ready,
          multi_professional_ready: context.composition.multi_professional_ready
        }
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
    status_novo: appointment.status,
    origem: origin,
    metadata: {
      requested_status: requestedStatus,
      compatibility_status: appointment.status
    }
  });

  await agendaEvents.publish(agendaEvents.AGENDA_EVENTS.REQUESTED, {
    tenantId,
    usuarioId,
    payload: {
      appointment_id: appointment.id,
      profissional_id: input.profissional_id,
      status: appointment.status,
      requested_status: requestedStatus
    }
  });

  await agendaEvents.publish(
    identityEvaluation.suspicious ? agendaEvents.AGENDA_EVENTS.SUSPICIOUS : agendaEvents.AGENDA_EVENTS.PENDING_ATTENDANT,
    {
      tenantId,
      usuarioId,
      payload: {
        appointment_id: appointment.id,
        profissional_id: input.profissional_id,
        expires_at: confirmationContext.pending_attendant_expires_at,
        identity_status: identityEvaluation.identityStatus
      }
    }
  );

  await notificationProvider.sendPendingAttendantConfirmation({
    tenantId,
    usuarioId,
    appointment_id: appointment.id,
    profissional_id: input.profissional_id,
    expires_at: confirmationContext.pending_attendant_expires_at
  });

  await agendaEvents.publish(agendaEvents.AGENDA_EVENTS.CREATED, {
    tenantId,
    usuarioId,
    payload: {
      appointment_id: appointment.id,
      profissional_id: input.profissional_id,
      data_inicio: slot.start.toISOString(),
      data_fim: slot.end.toISOString(),
      slot: {
        ranking_score: slot.ranking_score || null,
        occupancy_score: slot.occupancy_score || null,
        slot_quality: slot.slot_quality || null
      }
    }
  });

  await agendaEvents.publish(agendaEvents.AGENDA_EVENTS.SLOT_OCCUPIED, {
    tenantId,
    usuarioId,
    payload: {
      appointment_id: appointment.id,
      profissional_id: input.profissional_id,
      data_inicio: slot.start.toISOString()
    }
  });

  return getById(tenantId, appointment.id);
}

async function update(tenantId, id, input) {
  await getById(tenantId, id);
  return agendaRepository.updateAppointment(tenantId, id, input);
}

async function updateStatus(tenantId, usuarioId, id, status, metadata = {}) {
  const current = await getById(tenantId, id);
  const eventTypeOverride = metadata.event_type_override || null;
  const nextMetadata = {
    ...(current.metadata || {}),
    ...metadata
  };
  delete nextMetadata.origem_status;
  delete nextMetadata.event_type_override;

  if (['confirmado', 'cancelado', 'concluido', 'no_show'].includes(status)) {
    delete nextMetadata.intended_status;
    delete nextMetadata.compatibility_mode;
  }

  const payload = {
    status,
    metadata: nextMetadata
  };

  if (status === 'confirmado') payload.confirmado_em = new Date().toISOString();
  if (status === 'cancelado') payload.cancelado_em = new Date().toISOString();
  if (status === 'concluido') payload.concluido_em = new Date().toISOString();
  if (status === 'no_show') {
    payload.metadata = {
      ...nextMetadata,
      no_show_em: new Date().toISOString()
    };
  }

  const updated = await agendaRepository.updateAppointment(tenantId, id, payload);
  await agendaRepository.createStatusHistory({
    tenant_id: tenantId,
    agendamento_id: id,
    usuario_id: usuarioId,
    status_anterior: current.status,
    status_novo: status,
    motivo: metadata.motivo || null,
    origem: metadata.origem_status || 'dashboard',
    metadata
  });

  const eventByStatus = {
    pendente_atendente: agendaEvents.AGENDA_EVENTS.PENDING_ATTENDANT,
    pendente_cliente: agendaEvents.AGENDA_EVENTS.PENDING_CLIENT,
    confirmado: agendaEvents.AGENDA_EVENTS.CONFIRMED,
    cancelado: agendaEvents.AGENDA_EVENTS.CANCELLED,
    concluido: agendaEvents.AGENDA_EVENTS.COMPLETED,
    no_show: agendaEvents.AGENDA_EVENTS.NO_SHOW,
    expirado_atendente: agendaEvents.AGENDA_EVENTS.EXPIRED_ATTENDANT,
    expirado_cliente: agendaEvents.AGENDA_EVENTS.EXPIRED_CLIENT,
    suspeito: agendaEvents.AGENDA_EVENTS.SUSPICIOUS
  };
  const eventType = eventTypeOverride || eventByStatus[status] || 'appointment.updated';

  await agendaEvents.publish(eventType, {
    tenantId,
    usuarioId,
    payload: {
      appointment_id: id,
      status_anterior: current.status,
      status_novo: status,
      metadata
    }
  });

  return updated;
}

async function cancel(tenantId, usuarioId, id, input) {
  const current = await getById(tenantId, id);
  assertAppointmentIsNotTerminal(current, 'cancelado');
  const isClientCancellation = input.origem_status === 'link_operacional';
  const reason = typeof input.motivo === 'string' ? input.motivo.trim() : '';

  if (!isClientCancellation && !reason) {
    throw new AppError(
      'Informe o motivo do cancelamento.',
      422,
      'CANCELLATION_REASON_REQUIRED'
    );
  }

  return updateStatus(tenantId, usuarioId, id, 'cancelado', {
    motivo: reason || input.motivo || null,
    motivo_cancelamento: reason || input.motivo || null,
    origem_status: input.origem_status
  });
}

async function confirm(tenantId, usuarioId, id) {
  const current = await getById(tenantId, id);
  const effectiveStatus = resolveAppointmentStatus(current.status, current.metadata);

  if (!canConfirmAppointment(current.status, current.metadata)) {
    throw new AppError(
      'Este agendamento nao pode ser confirmado no status atual.',
      422,
      'INVALID_APPOINTMENT_STATUS'
    );
  }

  const settings = await agendaRepository.getTenantSettings(tenantId);
  const confirmationContext = appointmentSecurity.buildConfirmationContext(settings);

  if (effectiveStatus === 'pendente_atendente' || effectiveStatus === 'pendente') {
    return updateStatus(tenantId, usuarioId, id, 'pendente_cliente', {
      confirmado_por: 'atendente',
      confirmado_por_atendente_em: new Date().toISOString(),
      confirmation_policy: confirmationContext.confirmation_policy,
      pending_client_expires_at: confirmationContext.pending_client_expires_at,
      event_type_override: agendaEvents.AGENDA_EVENTS.CONFIRMED
    });
  }

  return updateStatus(tenantId, usuarioId, id, 'pendente_cliente', {
    confirmado_por: 'dashboard',
    event_type_override: agendaEvents.AGENDA_EVENTS.CONFIRMED
  });
}

async function completeNow(tenantId, usuarioId, id, input = {}) {
  const current = await getById(tenantId, id);
  assertAppointmentIsNotTerminal(current, 'concluido');
  assertAppointmentIsConfirmed(current, 'concluido');
  assertEarlyCompletionIsConfirmed(current, input);

  const updated = await updateStatus(tenantId, usuarioId, id, 'concluido', {
    motivo: input.motivo || null,
    concluido_por: input.origem_status === 'auto_completion' ? 'sistema' : 'dashboard',
    origem_status: input.origem_status || 'dashboard'
  });
  const completed = await getById(tenantId, id);
  await agendaRepository.updateClientHistoryForCompletedAppointment(completed);

  return {
    ...completed,
    ...updated
  };
}

async function markNoShow(tenantId, usuarioId, id, input = {}) {
  const current = await getById(tenantId, id);
  assertAppointmentIsNotTerminal(current, 'marcado como no-show');
  assertAppointmentIsConfirmed(current, 'marcado como no-show');

  if (!canMarkNoShowAppointment(current.status, current.metadata, current.data_inicio)) {
    throw new AppError(
      'Nao e possivel marcar no-show antes do inicio do atendimento.',
      409,
      'NO_SHOW_BEFORE_APPOINTMENT_START',
      {
        data_inicio: current.data_inicio,
        now: new Date().toISOString()
      }
    );
  }

  const updated = await updateStatus(tenantId, usuarioId, id, 'no_show', {
    motivo: input.motivo || 'Cliente nao compareceu',
    origem_status: input.origem_status || 'dashboard'
  });
  const noShowAppointment = await getById(tenantId, id);

  await agendaRepository.createNoShowRecord({
    tenant_id: tenantId,
    agendamento_id: id,
    cliente_id: noShowAppointment.cliente_id,
    profissional_id: noShowAppointment.profissional_id,
    observacoes: input.motivo || null,
    registrado_em: new Date().toISOString()
  });
  const historySync = await agendaRepository.updateClientHistoryForNoShowAppointment(noShowAppointment);
  if (historySync?.shouldIncrement !== false) {
    await agendaRepository.recordNoShowInteraction(noShowAppointment, input.motivo || null);
  }

  return {
    ...noShowAppointment,
    ...updated
  };
}

async function processAutoCompletion(tenantId, options = {}) {
  const cutoffIso = options.cutoffIso || getAutoCompletionCutoff();
  const limit = options.limit || 100;
  const candidates = await agendaRepository.listAutoCompletableAppointments(tenantId, cutoffIso, limit);
  const completed = [];

  for (const appointment of candidates) {
    try {
      const result = await completeNow(tenantId, options.usuarioId || null, appointment.id, {
        motivo: 'Conclusao automatica por tolerancia operacional',
        origem_status: 'auto_completion'
      });
      completed.push(result);
    } catch (error) {
      console.error('Failed to auto-complete appointment', {
        tenantId,
        appointment_id: appointment.id,
        error
      });
    }
  }

  return {
    cutoff: cutoffIso,
    tolerance_minutes: COMPLETION_TOLERANCE_MINUTES,
    processed: candidates.length,
    completed: completed.length,
    appointments: completed
  };
}

async function reschedule(tenantId, usuarioId, id, input) {
  const current = await getById(tenantId, id);
  assertAppointmentIsNotTerminal(current, 'reagendado');
  assertAppointmentIsFuture(current, 'reagendado');

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
    status: 'pendente_atendente',
    metadata: {
      ...(current.metadata || {}),
      reagendado_em: new Date().toISOString(),
      motivo_reagendamento: input.motivo || null,
      security_layer: 'appointment_confirmation_v1'
    }
  });

  await agendaRepository.createStatusHistory({
    tenant_id: tenantId,
    agendamento_id: id,
    usuario_id: usuarioId,
    status_anterior: current.status,
    status_novo: updated.status,
    motivo: input.motivo || null,
    origem: input.origem_status || 'dashboard'
  });

  const rescheduledAppointment = await getById(tenantId, id);
  await agendaEvents.publish(agendaEvents.AGENDA_EVENTS.RESCHEDULED, {
    tenantId,
    usuarioId,
    payload: {
      appointment_id: id,
      data_inicio: slot.start.toISOString(),
      data_fim: slot.end.toISOString(),
      motivo: input.motivo || null,
      origem_status: input.origem_status || 'dashboard',
      appointment: rescheduledAppointment
    }
  });

  return updated;
}

async function getByOperationalToken(token) {
  const appointment = await agendaRepository.findAppointmentByOperationalToken(token);
  if (!appointment) throw notFound('Token de agendamento nao encontrado');
  const tenant = appointment.tenant || await agendaRepository.getTenant(appointment.tenant_id);
  return serializeOperationalAppointment({ ...appointment, tenant });
}

async function listUpcomingClientAppointments(tenantId, clientIds) {
  const [tenant, appointments] = await Promise.all([
    agendaRepository.getTenant(tenantId),
    agendaRepository.listUpcomingClientAppointments(
      tenantId,
      clientIds,
      new Date().toISOString()
    )
  ]);
  const openAppointments = appointments.filter((appointment) => (
    !TERMINAL_APPOINTMENT_STATUSES.includes(getEffectiveAppointmentStatus(appointment))
  ));
  const preparedAppointments = await Promise.all(openAppointments.map((appointment) => (
    ensureOperationalContext({ ...appointment, tenant: appointment.tenant || tenant })
  )));

  return preparedAppointments.map((appointment) => (
    serializeOperationalAppointment({ ...appointment, tenant: appointment.tenant || tenant })
  ));
}

async function confirmByOperationalToken(token) {
  const appointment = await agendaRepository.findAppointmentByOperationalToken(token);
  if (!appointment) throw notFound('Token de agendamento nao encontrado');

  assertAppointmentIsFuture(appointment, 'confirmado');

  if (!canConfirmAppointment(appointment.status, appointment.metadata)) {
    throw new AppError(
      'Este agendamento nao pode ser confirmado no status atual.',
      422,
      'INVALID_APPOINTMENT_STATUS'
    );
  }

  const updated = await updateStatus(appointment.tenant_id, null, appointment.id, 'pendente_cliente', {
    confirmado_por: 'cliente_link_legado',
    origem_status: 'link_operacional',
    event_type_override: agendaEvents.AGENDA_EVENTS.CONFIRMED
  });
  return getByOperationalToken(updated.token_confirmacao || token);
}

async function cancelByOperationalToken(token, input = {}) {
  const appointment = await agendaRepository.findAppointmentByOperationalToken(token);
  if (!appointment) throw notFound('Token de agendamento nao encontrado');

  assertAppointmentIsNotTerminal(appointment, 'cancelado');
  assertAppointmentIsFuture(appointment, 'cancelado');

  const updated = await cancel(appointment.tenant_id, null, appointment.id, {
    motivo: input.motivo || 'Cancelado pelo cliente via link',
    origem_status: 'link_operacional'
  });

  return getByOperationalToken(updated.token_confirmacao || token);
}

async function rescheduleByOperationalToken(token, input) {
  const appointment = await agendaRepository.findAppointmentByOperationalToken(token);
  if (!appointment) throw notFound('Token de agendamento nao encontrado');

  assertAppointmentIsNotTerminal(appointment, 'reagendado');
  assertAppointmentIsFuture(appointment, 'reagendado');

  const updated = await reschedule(appointment.tenant_id, null, appointment.id, {
    data_inicio: input.data_inicio,
    motivo: input.motivo || 'Reagendado pelo cliente via link',
    origem_status: 'link_operacional'
  });

  return getByOperationalToken(updated.token_confirmacao || token);
}

module.exports = {
  getMeta,
  getAvailability,
  getProfessionalSchedule,
  updateProfessionalSchedule,
  getOperationalAnalytics,
  getSignals,
  list,
  getById,
  create,
  update,
  cancel,
  confirm,
  completeNow,
  markNoShow,
  processAutoCompletion,
  reschedule,
  buildOperationalContext,
  getByOperationalToken,
  listUpcomingClientAppointments,
  confirmByOperationalToken,
  cancelByOperationalToken,
  rescheduleByOperationalToken
};
