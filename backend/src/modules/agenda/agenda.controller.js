const agendaService = require('./agenda.service');
const {
  disponibilidadeSchema,
  listAgendaSchema,
  createAgendaSchema,
  updateAgendaSchema,
  cancelAgendaSchema,
  completeAgendaSchema,
  noShowAgendaSchema,
  autoCompleteAgendaSchema,
  rescheduleAgendaSchema,
  agendaIntelligenceSchema,
  professionalScheduleSchema
} = require('./agenda.validators');
const { forbidden } = require('../../utils/errors');

const PERSONAL_AGENDA_ROLES = new Set(['Funcionario', 'Terceiro', 'Profissional']);

function hasPersonalAgendaScope(req) {
  if (PERSONAL_AGENDA_ROLES.has(req.tipoUsuario)) return true;

  if (req.tipoUsuario === 'Autonomo') {
    return req.membership?.is_owner !== true && req.membership?.vinculo_tipo !== 'owner';
  }

  return false;
}

function getScopedProfessionalId(req) {
  if (!hasPersonalAgendaScope(req)) {
    return null;
  }

  const professionalId = req.membership?.profissional_id;
  if (!professionalId) {
    console.warn('[agenda-authorization-debug] professional context missing', {
      point: 'getScopedProfessionalId',
      usuario_id: req.usuario?.id || null,
      role: req.tipoUsuario || null,
      tenant_id: req.tenantId || null,
      agenda_id: req.params?.id || null,
      membership_id: req.membership?.id || null
    });
    throw forbidden('Professional agenda context is required');
  }

  return professionalId;
}

function applyProfessionalScope(req, input = {}) {
  const professionalId = getScopedProfessionalId(req);
  if (!professionalId) return input;

  if (input.profissional_id && input.profissional_id !== professionalId) {
    throw forbidden('Professional agenda access denied');
  }

  return {
    ...input,
    profissional_id: professionalId
  };
}

function assertProfessionalRouteScope(req, professionalId) {
  const scopedProfessionalId = getScopedProfessionalId(req);
  if (scopedProfessionalId && scopedProfessionalId !== professionalId) {
    throw forbidden('Professional agenda access denied');
  }
}

function assertAppointmentScope(req, appointment) {
  const professionalId = getScopedProfessionalId(req);
  if (professionalId && appointment?.profissional_id !== professionalId) {
    console.warn('[agenda-authorization-debug] appointment scope denied', {
      point: 'assertAppointmentScope',
      usuario_id: req.usuario?.id || null,
      role: req.tipoUsuario || null,
      tenant_id: req.tenantId || null,
      appointment_tenant_id: appointment?.tenant_id || null,
      agenda_id: req.params?.id || appointment?.id || null,
      scoped_professional_id: professionalId,
      appointment_professional_id: appointment?.profissional_id || null,
      reason: 'appointment_professional_mismatch'
    });
    throw forbidden('Professional agenda access denied');
  }
}

async function meta(req, res) {
  const data = await agendaService.getMeta(req.tenantId, getScopedProfessionalId(req));
  return res.json({ data });
}

async function disponibilidade(req, res) {
  const input = applyProfessionalScope(req, disponibilidadeSchema.parse(req.query));
  const data = await agendaService.getAvailability(req.tenantId, input);
  return res.json({ data });
}

async function list(req, res) {
  const input = applyProfessionalScope(req, listAgendaSchema.parse(req.query));
  const data = await agendaService.list(req.tenantId, input);
  return res.json({ data });
}

async function analytics(req, res) {
  const input = applyProfessionalScope(req, agendaIntelligenceSchema.parse(req.query));
  const data = await agendaService.getOperationalAnalytics(req.tenantId, input);
  return res.json({ data });
}

async function signals(req, res) {
  const input = applyProfessionalScope(req, agendaIntelligenceSchema.parse(req.query));
  const data = await agendaService.getSignals(req.tenantId, input);
  return res.json({ data });
}

async function getProfessionalSchedule(req, res) {
  assertProfessionalRouteScope(req, req.params.id);
  const data = await agendaService.getProfessionalSchedule(req.tenantId, req.params.id);
  return res.json({ data });
}

async function updateProfessionalSchedule(req, res) {
  assertProfessionalRouteScope(req, req.params.id);
  const input = professionalScheduleSchema.parse(req.body);
  const data = await agendaService.updateProfessionalSchedule(req.tenantId, req.params.id, input);
  return res.json({ data });
}

async function getById(req, res) {
  const data = await agendaService.getById(req.tenantId, req.params.id);
  assertAppointmentScope(req, data);
  return res.json({ data });
}

async function create(req, res) {
  const input = applyProfessionalScope(req, createAgendaSchema.parse(req.body));
  const data = await agendaService.create(req.tenantId, req.usuario.id, input);
  return res.status(201).json({ data });
}

async function update(req, res) {
  const current = await agendaService.getById(req.tenantId, req.params.id);
  assertAppointmentScope(req, current);
  const input = updateAgendaSchema.parse(req.body);
  const data = await agendaService.update(req.tenantId, req.params.id, input);
  return res.json({ data });
}

async function cancel(req, res) {
  const current = await agendaService.getById(req.tenantId, req.params.id);
  assertAppointmentScope(req, current);
  const input = cancelAgendaSchema.parse(req.body);
  const data = await agendaService.cancel(req.tenantId, req.usuario.id, req.params.id, input);
  return res.json({ data });
}

async function confirm(req, res) {
  console.log('[whatsapp-operational-debug] appointment confirmation received', {
    tenantId: req.tenantId,
    usuarioId: req.usuario?.id || null,
    appointment_id: req.params.id
  });

  const current = await agendaService.getById(req.tenantId, req.params.id);
  assertAppointmentScope(req, current);
  const data = await agendaService.confirm(req.tenantId, req.usuario.id, req.params.id);
  return res.json({ data });
}

async function complete(req, res) {
  const current = await agendaService.getById(req.tenantId, req.params.id);
  assertAppointmentScope(req, current);
  const input = completeAgendaSchema.parse(req.body || {});
  const data = await agendaService.completeNow(req.tenantId, req.usuario.id, req.params.id, input);
  return res.json({ data });
}

async function noShow(req, res) {
  const current = await agendaService.getById(req.tenantId, req.params.id);
  assertAppointmentScope(req, current);
  const input = noShowAgendaSchema.parse(req.body || {});
  const data = await agendaService.markNoShow(req.tenantId, req.usuario.id, req.params.id, input);
  return res.json({ data });
}

async function autoComplete(req, res) {
  const input = autoCompleteAgendaSchema.parse(req.body || {});
  const data = await agendaService.processAutoCompletion(req.tenantId, {
    usuarioId: req.usuario.id,
    limit: input.limit
  });
  return res.json({ data });
}

async function reschedule(req, res) {
  const current = await agendaService.getById(req.tenantId, req.params.id);
  assertAppointmentScope(req, current);
  const input = rescheduleAgendaSchema.parse(req.body);
  const data = await agendaService.reschedule(req.tenantId, req.usuario.id, req.params.id, input);
  return res.json({ data });
}

module.exports = {
  meta,
  disponibilidade,
  analytics,
  signals,
  getProfessionalSchedule,
  updateProfessionalSchedule,
  list,
  getById,
  create,
  update,
  cancel,
  confirm,
  complete,
  noShow,
  autoComplete,
  reschedule
};
