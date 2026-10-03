const { Router } = require('express');
const auth = require('../middlewares/auth.middleware');
const asyncHandler = require('../utils/asyncHandler');
const { identityLimiter } = require('../modules/public-booking/identity-rate-limit');
const service = require('../modules/usuario-cliente/usuario-cliente.service');
const { forbidden } = require('../utils/errors');
const router = Router();
router.use(auth, (req, res, next) => {
  res.set('Cache-Control', 'no-store');
  // Scope already resolved by authentication/RBAC; no new role taxonomy.
  if (!['tenant', 'platform'].includes(req.permissionContext?.scope)) {
    return next(forbidden('Este acesso exige contexto interno/profissional.'));
  }
  next();
});
router.get('/', asyncHandler(async (req, res) => res.json({ data: await service.list(req.usuario.id) })));
router.post('/:id/locate', identityLimiter, asyncHandler(async (req, res) =>
  res.json({ data: await service.locate(req.usuario.id, req.params.id, req.body || {}) })));
module.exports = router;
