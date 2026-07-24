const { forbidden } = require('../utils/errors');

function requireRole(...roles) {
  return (req, res, next) => {
    const role = req.tipoUsuario || req.membership?.role || req.usuario?.tipo_usuario;

    if (!req.usuario || !roles.includes(role)) {
      return next(forbidden('Insufficient role'));
    }

    return next();
  };
}

module.exports = {
  requireRole
};
