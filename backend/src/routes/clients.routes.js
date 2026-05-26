const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const clientsController = require('../modules/clients/clients.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/', asyncHandler(clientsController.list));
router.post('/', asyncHandler(clientsController.create));

module.exports = router;
