const { forbidden } = require('../../utils/errors');

function dashboardMiddleware(req, res, next) {
  if (!req.tenantId || !req.usuario) {
    return next(forbidden('Dashboard tenant context is required'));
  }

  req.dashboardContext = {
    tenantId: req.tenantId,
    tenant: req.tenant,
    user: req.usuario,
    userId: req.usuario.id,
    role: req.tipoUsuario || req.usuario.tipo_usuario
  };

  return next();
}

module.exports = dashboardMiddleware;
