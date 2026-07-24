const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const usuariosController = require('../modules/usuarios/usuarios.controller');

const router = Router();

router.get(
  '/',
  authMiddleware,
  tenantMiddleware,
  requireValidSubscription,
  requirePermission('equipe.read'),
  asyncHandler(usuariosController.list)
);

router.post(
  '/',
  authMiddleware,
  tenantMiddleware,
  requireValidSubscription,
  requirePermission('equipe.manage'),
  asyncHandler(usuariosController.create)
);

module.exports = router;
