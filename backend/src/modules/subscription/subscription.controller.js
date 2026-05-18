const subscriptionService = require('./subscription.service');

async function current(req, res) {
  const data = await subscriptionService.getTenantPlan(req.tenantId);
  return res.json({ data });
}

async function validate(req, res) {
  const data = await subscriptionService.validateSubscription(req.tenantId);
  return res.json({
    data: {
      valid: true,
      ...data
    }
  });
}

module.exports = {
  current,
  validate
};
