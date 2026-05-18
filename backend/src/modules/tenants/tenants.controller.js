const tenantsService = require('./tenants.service');

async function getCurrent(req, res) {
  const data = await tenantsService.getCurrentTenant(req.tenantId);
  return res.json({ data });
}

async function getSettings(req, res) {
  const data = await tenantsService.getTenantSettings(req.tenantId);
  return res.json({ data });
}

async function updateCurrent(req, res) {
  const data = await tenantsService.updateCurrentTenant(req.tenantId, req.body);
  return res.json({ data });
}

async function updateSettings(req, res) {
  const data = await tenantsService.updateSettings(req.tenantId, req.usuario.id, req.body);
  return res.json({ data });
}

module.exports = {
  getCurrent,
  getSettings,
  updateCurrent,
  updateSettings
};
