const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const campaignsController = require('../modules/campaigns/campaigns.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/meta', requirePermission('campanhas.read'), asyncHandler(campaignsController.meta));
router.get('/suggestions', requirePermission('campanhas.read'), asyncHandler(campaignsController.suggestions));
router.post('/suggestions/:key', requirePermission('campanhas.manage'), asyncHandler(campaignsController.createFromSuggestion));
router.post('/coupons', requirePermission('campanhas.manage'), asyncHandler(campaignsController.createCoupon));
router.get('/', requirePermission('campanhas.read'), asyncHandler(campaignsController.list));
router.post('/', requirePermission('campanhas.manage'), asyncHandler(campaignsController.create));
router.get('/:id', requirePermission('campanhas.read'), asyncHandler(campaignsController.get));
router.patch('/:id', requirePermission('campanhas.manage'), asyncHandler(campaignsController.update));
router.post('/:id/estimate', requirePermission('campanhas.read'), asyncHandler(campaignsController.estimate));
router.post('/:id/preview', requirePermission('campanhas.read'), asyncHandler(campaignsController.preview));
router.post('/:id/approve', requirePermission('campanhas.manage'), asyncHandler(campaignsController.approve));
router.post('/:id/reject', requirePermission('campanhas.manage'), asyncHandler(campaignsController.reject));
router.post('/:id/start', requirePermission('campanhas.manage'), asyncHandler(campaignsController.start));
router.post('/:id/schedule', requirePermission('campanhas.manage'), asyncHandler(campaignsController.schedule));
router.post('/:id/cancel', requirePermission('campanhas.manage'), asyncHandler(campaignsController.cancel));
router.get('/:id/messages', requirePermission('campanhas.read'), asyncHandler(campaignsController.messages));
router.get('/:id/metrics', requirePermission('campanhas.read'), asyncHandler(campaignsController.metrics));

module.exports = router;
