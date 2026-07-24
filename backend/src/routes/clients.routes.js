const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const clientsController = require('../modules/clients/clients.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/', requirePermission('clientes.read'), asyncHandler(clientsController.list));
router.post('/', requirePermission('clientes.write'), asyncHandler(clientsController.create));
router.post(
  '/:id/booking-token',
  requirePermission('clientes.write'),
  asyncHandler(clientsController.issueBookingToken)
);

module.exports = router;
