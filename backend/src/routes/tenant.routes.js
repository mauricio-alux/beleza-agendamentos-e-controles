const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const tenantsController = require('../modules/tenants/tenants.controller');
const dashboardRoutes = require('./dashboard.routes');
const agendaRoutes = require('./agenda.routes');
const servicesRoutes = require('./services.routes');
const clientsRoutes = require('./clients.routes');
const teamRoutes = require('./team.routes');

const router = Router();

router.get('/settings', authMiddleware, tenantMiddleware, requireValidSubscription, requirePermission('tenant.read'), asyncHandler(tenantsController.getSettings));
router.use('/dashboard', dashboardRoutes);
router.use('/agenda', agendaRoutes);
router.use('/services', servicesRoutes);
router.use('/clients', clientsRoutes);
router.use('/team', teamRoutes);

module.exports = router;
