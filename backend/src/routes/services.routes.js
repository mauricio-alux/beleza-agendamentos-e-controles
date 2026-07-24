const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const servicesController = require('../modules/services/services.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/compatible-specialties', requirePermission('servicos.read'), asyncHandler(servicesController.listCompatibleSpecialties));
router.get('/', requirePermission('servicos.read'), asyncHandler(servicesController.list));
router.post('/', requirePermission('servicos.write', 'servicos.manage'), asyncHandler(servicesController.create));
router.patch('/:id', requirePermission('servicos.write', 'servicos.manage'), asyncHandler(servicesController.update));
router.delete('/:id', requirePermission('servicos.manage'), asyncHandler(servicesController.remove));

module.exports = router;
