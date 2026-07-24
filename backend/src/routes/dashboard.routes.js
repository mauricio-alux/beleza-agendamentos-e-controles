const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const { optionalTenantMiddleware } = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const dashboardMiddleware = require('../modules/dashboard/dashboard.middleware');
const dashboardController = require('../modules/dashboard/dashboard.controller');

const router = Router();

router.use(authMiddleware, optionalTenantMiddleware, requireValidSubscription, requirePermission('dashboard.read', 'platform.dashboard.read'), dashboardMiddleware);

router.get('/summary', asyncHandler(dashboardController.summary));
router.get('/resumo', asyncHandler(dashboardController.summary));
router.get('/detalhes', asyncHandler(dashboardController.details));
router.get('/kpis', asyncHandler(dashboardController.kpis));
router.get('/activity', asyncHandler(dashboardController.activity));
router.get('/agenda-preview', asyncHandler(dashboardController.agendaPreview));

module.exports = router;
