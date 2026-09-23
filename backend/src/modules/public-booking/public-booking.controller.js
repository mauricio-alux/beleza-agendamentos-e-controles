const service = require('./public-booking.service');
const {
  locateAccessSchema,
  slugSchema,
  publicAvailabilitySchema,
  publicIdentityContextSchema,
  publicAppointmentSchema,
  appointmentOperationalTokenSchema,
  publicAppointmentActionSchema,
  publicAppointmentActionQuerySchema,
  publicClientUpcomingAppointmentsQuerySchema,
  publicClientMeQuerySchema,
  publicClientMeUpdateSchema,
  publicAppointmentRescheduleSchema
} = require('./public-booking.validators');

async function locateAccess(req, res) {
  const data = await service.locateAccess(locateAccessSchema.parse(req.body));
  return res.json({ data });
}

async function catalog(req, res) {
  const slug = slugSchema.parse(req.params.slug);
  const data = await service.getCatalog(slug);
  return res.json({ data });
}

async function availability(req, res) {
  const slug = slugSchema.parse(req.params.slug);
  const input = publicAvailabilitySchema.parse(req.query);
  const data = await service.getAvailability(slug, input);
  return res.json({ data });
}

async function identify(req, res) {
  const slug = slugSchema.parse(req.params.slug);
  const input = publicIdentityContextSchema.parse(req.body);
  const data = await service.identifyClient(slug, input);
  return res.json({ data });
}

async function upcomingClientAppointments(req, res) {
  const slug = slugSchema.parse(req.params.slug);
  const input = publicClientUpcomingAppointmentsQuerySchema.parse(req.query);
  const data = await service.getUpcomingClientAppointments(slug, input);
  return res.json({ data });
}

async function clientMe(req, res) {
  const slug = slugSchema.parse(req.params.slug);
  const input = publicClientMeQuerySchema.parse(req.query);
  const data = await service.getClientMe(slug, input);
  return res.json({ data });
}

async function updateClientMe(req, res) {
  const slug = slugSchema.parse(req.params.slug);
  const input = publicClientMeUpdateSchema.parse(req.body || {});
  const data = await service.updateClientMe(slug, input);
  return res.json({ data });
}

async function create(req, res) {
  const slug = slugSchema.parse(req.params.slug);
  const input = publicAppointmentSchema.parse(req.body);
  const data = await service.createAppointment(slug, input);
  return res.status(201).json({ data });
}

async function appointmentByToken(req, res) {
  const token = appointmentOperationalTokenSchema.parse(req.params.token);
  const data = await service.getAppointmentByOperationalToken(token);
  return res.json({ data });
}

async function appointmentActionContext(req, res) {
  const input = publicAppointmentActionQuerySchema.parse(req.query);
  const data = await service.getAppointmentByOperationalToken(input.tk);
  return res.json({ data: { ...data, requested_action: input.cmd || null } });
}

async function appointmentAction(req, res) {
  const input = publicAppointmentActionSchema.parse(req.body);
  const data = await service.runAppointmentAction(input);
  return res.json({ data });
}

async function appointmentReschedule(req, res) {
  const input = publicAppointmentRescheduleSchema.parse(req.body);
  const data = await service.rescheduleAppointmentByToken(input);
  return res.json({ data });
}

module.exports = {
  locateAccess,
  catalog,
  availability,
  identify,
  upcomingClientAppointments,
  clientMe,
  updateClientMe,
  create,
  appointmentByToken,
  appointmentActionContext,
  appointmentAction,
  appointmentReschedule
};
