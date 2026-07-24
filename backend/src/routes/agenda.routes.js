const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const authMiddleware = require('../middlewares/auth.middleware');
const tenantMiddleware = require('../middlewares/tenant.middleware');
const { requireValidSubscription } = require('../middlewares/plan.middleware');
const { requirePermission } = require('../middlewares/permission.middleware');
const agendaController = require('../modules/agenda/agenda.controller');

const router = Router();

router.use(authMiddleware, tenantMiddleware, requireValidSubscription);

router.get('/meta', requirePermission('agenda.read'), asyncHandler(agendaController.meta));
router.get('/disponibilidade', requirePermission('agenda.read'), asyncHandler(agendaController.disponibilidade));
router.get('/analytics', requirePermission('agenda.read', 'agenda.manage'), asyncHandler(agendaController.analytics));
router.get('/signals', requirePermission('agenda.read'), asyncHandler(agendaController.signals));
router.get('/profissionais/:id/agenda', requirePermission('agenda.read'), asyncHandler(agendaController.getProfessionalSchedule));
router.patch('/profissionais/:id/agenda', requirePermission('agenda.manage'), asyncHandler(agendaController.updateProfessionalSchedule));
router.get('/', requirePermission('agenda.read'), asyncHandler(agendaController.list));
router.get('/:id', requirePermission('agenda.read'), asyncHandler(agendaController.getById));
router.post('/', requirePermission('agenda.write', 'agenda.manage'), asyncHandler(agendaController.create));
router.patch('/:id', requirePermission('agenda.write', 'agenda.manage'), asyncHandler(agendaController.update));
router.patch('/:id/cancelar', requirePermission('agenda.cancel', 'agenda.write', 'agenda.manage'), asyncHandler(agendaController.cancel));
router.patch('/:id/reagendar', requirePermission('agenda.reschedule', 'agenda.write', 'agenda.manage'), asyncHandler(agendaController.reschedule));
router.patch('/:id/confirmar', requirePermission('agenda.confirm', 'agenda.write', 'agenda.manage'), asyncHandler(agendaController.confirm));
router.patch('/:id/concluir', requirePermission('agenda.complete', 'agenda.write', 'agenda.manage'), asyncHandler(agendaController.complete));
router.patch('/:id/no-show', requirePermission('agenda.no_show', 'agenda.write', 'agenda.manage'), asyncHandler(agendaController.noShow));
router.post('/processar-conclusao-automatica', requirePermission('agenda.manage'), asyncHandler(agendaController.autoComplete));

module.exports = router;
