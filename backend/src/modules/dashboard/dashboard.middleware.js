const { forbidden } = require('../../utils/errors');

function dashboardMiddleware(req, res, next) {
  const role = req.tipoUsuario || req.usuario?.tipo_usuario;

  if (!req.usuario) {
    return next(forbidden('Dashboard user context is required'));
  }

  if (role === 'MasterAdmin' && !req.supportContext) {
    return next(forbidden('Platform admins must use the platform dashboard'));
  }

  if (!req.tenantId && role !== 'MasterAdmin') {
    return next(forbidden('Dashboard tenant context is required'));
  }

  req.dashboardContext = {
    tenantId: req.tenantId,
    tenant: req.tenant,
    user: req.usuario,
    userId: req.usuario.id,
    role,
    membership: req.membership,
    memberships: req.memberships || []
  };

  return next();
}

module.exports = dashboardMiddleware;
