const agendaService = require('./agenda.service');
const {
  disponibilidadeSchema,
  listAgendaSchema,
  createAgendaSchema,
  updateAgendaSchema,
  cancelAgendaSchema,
  rescheduleAgendaSchema,
  agendaIntelligenceSchema,
  professionalScheduleSchema
} = require('./agenda.validators');

async function meta(req, res) {
  const data = await agendaService.getMeta(req.tenantId);
  return res.json({ data });
}

async function disponibilidade(req, res) {
  const input = disponibilidadeSchema.parse(req.query);
  const data = await agendaService.getAvailability(req.tenantId, input);
  return res.json({ data });
}

async function list(req, res) {
  const input = listAgendaSchema.parse(req.query);
  const data = await agendaService.list(req.tenantId, input);
  return res.json({ data });
}

async function analytics(req, res) {
  const input = agendaIntelligenceSchema.parse(req.query);
  const data = await agendaService.getOperationalAnalytics(req.tenantId, input);
  return res.json({ data });
}

async function signals(req, res) {
  const input = agendaIntelligenceSchema.parse(req.query);
  const data = await agendaService.getSignals(req.tenantId, input);
  return res.json({ data });
}

async function getProfessionalSchedule(req, res) {
  const data = await agendaService.getProfessionalSchedule(req.tenantId, req.params.id);
  return res.json({ data });
}

async function updateProfessionalSchedule(req, res) {
  const input = professionalScheduleSchema.parse(req.body);
  const data = await agendaService.updateProfessionalSchedule(req.tenantId, req.params.id, input);
  return res.json({ data });
}

async function getById(req, res) {
  const data = await agendaService.getById(req.tenantId, req.params.id);
  return res.json({ data });
}

async function create(req, res) {
  const input = createAgendaSchema.parse(req.body);
  const data = await agendaService.create(req.tenantId, req.usuario.id, input);
  return res.status(201).json({ data });
}

async function update(req, res) {
  const input = updateAgendaSchema.parse(req.body);
  const data = await agendaService.update(req.tenantId, req.params.id, input);
  return res.json({ data });
}

async function cancel(req, res) {
  const input = cancelAgendaSchema.parse(req.body);
  const data = await agendaService.cancel(req.tenantId, req.usuario.id, req.params.id, input);
  return res.json({ data });
}

async function confirm(req, res) {
  const data = await agendaService.confirm(req.tenantId, req.usuario.id, req.params.id);
  return res.json({ data });
}

async function reschedule(req, res) {
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
  reschedule
};
