const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const agendaController = require('../modules/agenda/agenda.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/meta', asyncHandler(agendaController.meta));
router.get('/disponibilidade', asyncHandler(agendaController.disponibilidade));
router.get('/', asyncHandler(agendaController.list));
router.get('/:id', asyncHandler(agendaController.getById));
router.post('/', asyncHandler(agendaController.create));
router.patch('/:id', asyncHandler(agendaController.update));
router.patch('/:id/cancelar', asyncHandler(agendaController.cancel));
router.patch('/:id/reagendar', asyncHandler(agendaController.reschedule));
router.patch('/:id/confirmar', asyncHandler(agendaController.confirm));

module.exports = router;
