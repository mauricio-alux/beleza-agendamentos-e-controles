const onboardingService = require('./onboarding.service');
const { createTenantSchema, updateStepSchema } = require('./onboarding.validators');

async function createTenant(req, res) {
  const input = createTenantSchema.parse(req.body);
  const data = await onboardingService.createTenant(input, req.auth.user, {
    ipAddress: req.ip,
    userAgent: req.headers['user-agent']
  });

  return res.status(201).json({ data });
}

async function getStatus(req, res) {
  const data = await onboardingService.getStatus(req.tenantId);
  return res.json({ data });
}

async function updateStep(req, res) {
  const input = updateStepSchema.parse(req.body);
  const data = await onboardingService.updateStep(req.tenantId, req.usuario.id, req.params.step, input);
  return res.json({ data });
}

async function complete(req, res) {
  const data = await onboardingService.completeOnboarding(req.tenant, req.usuario);
  return res.json({ data });
}

module.exports = {
  createTenant,
  getStatus,
  updateStep,
  complete
};
