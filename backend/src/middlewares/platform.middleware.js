const { forbidden } = require('../utils/errors');

function requirePlatformAdmin(req, res, next) {
  if (req.usuario?.tipo_usuario !== 'MasterAdmin') {
    return next(forbidden('Platform admin access required'));
  }

  req.platformContext = {
    usuario: req.usuario,
    userId: req.usuario.id,
    role: 'MasterAdmin',
    mode: 'platform'
  };

  return next();
}

module.exports = {
  requirePlatformAdmin
};
