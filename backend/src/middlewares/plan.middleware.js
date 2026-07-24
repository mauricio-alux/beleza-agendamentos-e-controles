const subscriptionService = require('../modules/subscription/subscription.service');

function requireValidSubscription(req, res, next) {
  if (req.usuario?.tipo_usuario === 'MasterAdmin' || req.tipoUsuario === 'MasterAdmin') {
    return next();
  }

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
    if (req.usuario?.tipo_usuario === 'MasterAdmin' || req.tipoUsuario === 'MasterAdmin') {
      req.subscription = null;
      return next();
    }

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
