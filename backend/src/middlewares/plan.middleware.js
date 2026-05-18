const subscriptionService = require('../modules/subscription/subscription.service');

function requireValidSubscription(req, res, next) {
  return subscriptionService
    .validateSubscription(req.tenantId)
    .then((subscription) => {
      req.subscription = subscription;
      next();
    })
    .catch(next);
}

function requirePlanAccess(requirements = {}) {
  return (req, res, next) => {
    return subscriptionService
      .validatePlanLimits(req.tenantId, requirements)
      .then((subscription) => {
        req.subscription = subscription;
        next();
      })
      .catch(next);
  };
}

module.exports = {
  requireValidSubscription,
  requirePlanAccess
};
