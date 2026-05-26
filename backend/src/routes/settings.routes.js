const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const settingsController = require('../modules/settings/settings.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/summary', asyncHandler(settingsController.summary));
router.get('/profile', asyncHandler(settingsController.profile));
router.patch('/profile', asyncHandler(settingsController.updateProfile));
router.get('/tenant', asyncHandler(settingsController.tenant));
router.patch('/tenant', asyncHandler(settingsController.updateTenant));
router.get('/operation', asyncHandler(settingsController.operation));
router.patch('/operation', asyncHandler(settingsController.updateOperation));

module.exports = router;
