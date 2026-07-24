const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const teamController = require('../modules/team/team.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/', requirePermission('equipe.read'), asyncHandler(teamController.list));
router.get('/:id', requirePermission('equipe.read'), asyncHandler(teamController.getById));
router.post('/', requirePermission('equipe.manage'), asyncHandler(teamController.create));
router.put('/:id', requirePermission('equipe.manage'), asyncHandler(teamController.update));
router.patch('/:id', requirePermission('equipe.manage'), asyncHandler(teamController.update));
router.delete('/:id', requirePermission('equipe.manage'), asyncHandler(teamController.remove));

module.exports = router;
