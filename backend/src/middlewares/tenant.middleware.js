const usuariosRepository = require('../modules/usuarios/usuarios.repository');
const { forbidden } = require('../utils/errors');

async function tenantMiddleware(req, res, next) {
  try {
    if (req.usuario && req.tenantId) {
      return next();
    }

    const usuario = await usuariosRepository.findByAuthUserId(req.auth.user.id);

    if (!usuario || !usuario.tenant_id) {
      throw forbidden('Tenant onboarding is required');
    }

    req.usuario = usuario;
    req.tenantId = usuario.tenant_id;

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = tenantMiddleware;
