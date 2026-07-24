const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const { requirePlatformAdmin } = require('../middlewares/platform.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const platformController = require('../modules/platform/platform.controller');

const router = Router();

router.use(authMiddleware, requirePlatformAdmin);

router.get('/summary', requirePermission('platform.dashboard.read'), asyncHandler(platformController.summary));
router.get('/tenants', requirePermission('platform.tenants.read'), asyncHandler(platformController.tenants));
router.get('/plans', requirePermission('platform.subscriptions.read'), asyncHandler(platformController.plans));
router.get('/subscriptions', requirePermission('platform.subscriptions.read'), asyncHandler(platformController.subscriptions));
router.get('/subscriptions/:id', requirePermission('platform.subscriptions.read'), asyncHandler(platformController.subscriptionDetails));
router.get('/subscriptions/:id/history', requirePermission('platform.subscriptions.read'), asyncHandler(platformController.subscriptionHistory));
router.patch('/subscriptions/:id/status', requirePermission('platform.subscriptions.manage'), asyncHandler(platformController.updateSubscriptionStatus));
router.patch('/subscriptions/:id/plan', requirePermission('platform.subscriptions.manage'), asyncHandler(platformController.updateSubscriptionPlan));
router.post('/subscriptions/:id/extend-trial', requirePermission('platform.subscriptions.manage'), asyncHandler(platformController.extendSubscriptionTrial));
router.post('/subscriptions/:id/reactivate', requirePermission('platform.subscriptions.manage'), asyncHandler(platformController.reactivateSubscription));
router.get('/audit-logs', requirePermission('platform.audit.read'), asyncHandler(platformController.auditLogs));
router.get('/campaigns', requirePermission('platform.campaigns.manage'), asyncHandler(platformController.campaigns));
router.post('/campaigns', requirePermission('platform.campaigns.manage'), asyncHandler(platformController.createCampaign));
router.patch('/campaigns/:id', requirePermission('platform.campaigns.manage'), asyncHandler(platformController.updateCampaign));
router.get('/communication/templates', requirePermission('platform.communication.templates.manage'), asyncHandler(platformController.communicationTemplates));
router.get('/communication/whatsapp/messages', requirePermission('platform.communication.templates.manage'), asyncHandler(platformController.whatsAppMessages));
router.get('/communication/whatsapp/queue', requirePermission('platform.communication.templates.manage'), asyncHandler(platformController.whatsAppQueue));
router.get('/communication/providers', requirePermission('platform.communication.templates.manage'), asyncHandler(platformController.communicationProviders));
router.post('/communication/templates', requirePermission('platform.communication.templates.manage'), asyncHandler(platformController.createCommunicationTemplate));
router.patch('/communication/templates/:id', requirePermission('platform.communication.templates.manage'), asyncHandler(platformController.updateCommunicationTemplate));

module.exports = router;
