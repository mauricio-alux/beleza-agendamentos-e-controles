const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const teamController = require('../modules/team/team.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/', asyncHandler(teamController.listRoles));
router.post('/', requirePermission('servicos.manage'), asyncHandler(teamController.createRole));
router.patch('/:id', requirePermission('servicos.manage'), asyncHandler(teamController.updateRole));
router.delete('/:id', requirePermission('servicos.manage'), asyncHandler(teamController.removeRole));
router.get('/:id/especialidades', asyncHandler(teamController.listSpecialties));

module.exports = router;
