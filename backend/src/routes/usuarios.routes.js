const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireRole } = require('../middlewares/role.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const usuariosController = require('../modules/usuarios/usuarios.controller');

const router = Router();

router.get(
  '/',
  authMiddleware,
  tenantMiddleware,
  requireValidSubscription,
  requireRole('MasterAdmin', 'Administrador', 'Autonomo'),
  asyncHandler(usuariosController.list)
);

router.post(
  '/',
  authMiddleware,
  tenantMiddleware,
  requireValidSubscription,
  requireRole('MasterAdmin', 'Administrador'),
  asyncHandler(usuariosController.create)
);

module.exports = router;
