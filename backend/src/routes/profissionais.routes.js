const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const teamController = require('../modules/team/team.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/', asyncHandler(teamController.list));
router.post('/', asyncHandler(teamController.create));
router.put('/:id', asyncHandler(teamController.update));

module.exports = router;
