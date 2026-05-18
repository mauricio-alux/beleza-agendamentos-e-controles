const { createSupabaseForToken } = require('../config/supabase');
const authService = require('../modules/auth/auth.service');
const { unauthorized } = require('../utils/errors');

async function authMiddleware(req, res, next) {
  try {
    const header = req.headers.authorization || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      throw unauthorized('Missing bearer token');
    }

    const context = await authService.validateToken(token);

    req.auth = {
      accessToken: token,
      user: context.auth_user
    };
    req.usuario = context.usuario;
    req.tenant = context.tenant;
    req.tenantId = context.tenant_id;
    req.tipoUsuario = context.tipo_usuario;
    req.supabase = createSupabaseForToken(token);

    next();
  } catch (error) {
    next(error);
  }
}

module.exports = authMiddleware;
