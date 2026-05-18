const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const onboardingController = require('../modules/onboarding/onboarding.controller');

const router = Router();

router.post('/create-tenant', authMiddleware, asyncHandler(onboardingController.createTenant));
router.get('/status', authMiddleware, tenantMiddleware, asyncHandler(onboardingController.getStatus));
router.post('/complete', authMiddleware, tenantMiddleware, asyncHandler(onboardingController.complete));
router.patch('/steps/:step', authMiddleware, tenantMiddleware, asyncHandler(onboardingController.updateStep));

module.exports = router;
