const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const controller = require('../modules/business-types/business-types.controller');

const router = Router();

router.get('/ativos', asyncHandler(controller.active));
router.get('/tenant', authMiddleware, tenantMiddleware, requireValidSubscription, requirePermission('tenant.read'), asyncHandler(controller.tenantTypes));
router.put('/tenant', authMiddleware, tenantMiddleware, requireValidSubscription, requirePermission('tenant.manage'), asyncHandler(controller.tenantReplace));
router.get('/tenant/servicos-catalogo-disponiveis', authMiddleware, tenantMiddleware, requireValidSubscription, requirePermission('servicos.read'), asyncHandler(controller.tenantCatalog));

module.exports = router;
