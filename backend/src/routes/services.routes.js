const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const servicesController = require('../modules/services/services.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/', asyncHandler(servicesController.list));
router.post('/', asyncHandler(servicesController.create));
router.patch('/:id', asyncHandler(servicesController.update));
router.delete('/:id', asyncHandler(servicesController.remove));

module.exports = router;
