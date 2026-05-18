const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const tenantsController = require('../modules/tenants/tenants.controller');

const router = Router();

router.get('/settings', authMiddleware, tenantMiddleware, requireValidSubscription, asyncHandler(tenantsController.getSettings));

module.exports = router;
