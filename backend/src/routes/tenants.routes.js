const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const tenantsController = require('../modules/tenants/tenants.controller');

const router = Router();

router.get('/current', authMiddleware, tenantMiddleware, requireValidSubscription, asyncHandler(tenantsController.getCurrent));
router.get('/current/settings', authMiddleware, tenantMiddleware, requireValidSubscription, asyncHandler(tenantsController.getSettings));
router.patch('/current', authMiddleware, tenantMiddleware, requireValidSubscription, asyncHandler(tenantsController.updateCurrent));
router.patch('/current/settings', authMiddleware, tenantMiddleware, requireValidSubscription, asyncHandler(tenantsController.updateSettings));

module.exports = router;
