const { forbidden } = require('../utils/errors');

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.usuario || !roles.includes(req.usuario.tipo_usuario)) {
      return next(forbidden('Insufficient role'));
    }

    return next();
  };
}

module.exports = {
  requireRole
};
