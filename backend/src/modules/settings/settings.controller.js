const settingsService = require('./settings.service');
const { operationSchema, profileSchema, tenantSchema } = require('./settings.validators');

function getContext(req) {
  return {
    tenantId: req.tenantId,
    usuario: req.usuario
  };
}

async function summary(req, res) {
  const data = await settingsService.getSummary(getContext(req));
  return res.json({ data });
}

async function profile(req, res) {
  const data = await settingsService.getProfile(getContext(req));
  return res.json({ data });
}

async function updateProfile(req, res) {
  const input = profileSchema.parse(req.body);
  const data = await settingsService.updateProfile(getContext(req), input);
  return res.json({ data });
}

async function tenant(req, res) {
  const data = await settingsService.getTenant(getContext(req));
  return res.json({ data });
}

async function updateTenant(req, res) {
  const input = tenantSchema.parse(req.body);
  const data = await settingsService.updateTenant(getContext(req), input);
  return res.json({ data });
}

async function operation(req, res) {
  const data = await settingsService.getOperation(getContext(req));
  return res.json({ data });
}

async function updateOperation(req, res) {
  const input = operationSchema.parse(req.body);
  const data = await settingsService.updateOperation(getContext(req), input);
  return res.json({ data });
}

module.exports = {
  summary,
  profile,
  updateProfile,
  tenant,
  updateTenant,
  operation,
  updateOperation
};
