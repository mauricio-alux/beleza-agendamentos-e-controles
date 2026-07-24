const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const teamController = require('../modules/team/team.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/', requirePermission('servicos.read'), asyncHandler(teamController.listSpecialties));
router.post('/', requirePermission('servicos.manage'), asyncHandler(teamController.createSpecialty));
router.patch('/:id', requirePermission('servicos.manage'), asyncHandler(teamController.updateSpecialty));
router.patch('/:id/status', requirePermission('servicos.manage'), asyncHandler(teamController.updateSpecialtyStatus));
router.delete('/:id', requirePermission('servicos.manage'), asyncHandler(teamController.removeSpecialty));

module.exports = router;
