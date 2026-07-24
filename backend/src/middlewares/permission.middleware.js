const rbacService = require('../modules/rbac/rbac.service');
const { forbidden } = require('../utils/errors');

function buildContext(req) {
  return {
    usuario: req.usuario,
    tenantId: req.tenantId,
    tipoUsuario: req.tipoUsuario,
    membership: req.membership,
    platformContext: req.platformContext,
    scope: req.platformContext ? 'platform' : undefined,
    permissionContext: req.permissionContext
  };
}

function requirePermission(...permissions) {
  return async (req, res, next) => {
    try {
      const { allowed, permissionContext } = await rbacService.hasPermission(buildContext(req), permissions);
      req.permissionContext = permissionContext;

      if (!allowed) {
        console.warn('[authorization-debug] permission denied', {
          point: 'requirePermission',
          method: req.method,
          path: req.originalUrl,
          requested_permissions: permissions,
          usuario_id: req.usuario?.id || null,
          role: req.tipoUsuario || permissionContext?.role?.nome || null,
          tenant_id: req.tenantId || null,
          available_permissions: permissionContext?.permissions || []
        });
        return next(forbidden('Insufficient permission'));
      }

      return next();
    } catch (error) {
      return next(error);
    }
  };
}

module.exports = {
  requirePermission
};
