const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const planosController = require('../modules/planos/planos.controller');
const publicBookingController = require('../modules/public-booking/public-booking.controller');
const { APP_BRAND } = require('../config/app-brand');
const env = require('../config/env');
const communicationService = require('../modules/communication/communication.service');

const router = Router();
const { identityLimiter } = require('../modules/public-booking/identity-rate-limit');
// Responses include personal data or capabilities; errors must not be cached either.
router.use('/booking', (req, res, next) => { res.set('Cache-Control', 'no-store'); next(); });
router.post('/booking/access/locate', identityLimiter, asyncHandler(publicBookingController.locateAccess));

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.get('/webhooks/whatsapp', (req, res) => {
  const mode = req.query['hub.mode'];
  const token = req.query['hub.verify_token'];
  const challenge = req.query['hub.challenge'];

  if (mode === 'subscribe' && env.whatsappWebhookVerifyToken && token === env.whatsappWebhookVerifyToken) {
    return res.status(200).send(challenge);
  }

  return res.status(403).json({
    error: {
      code: 'WHATSAPP_WEBHOOK_VERIFY_FAILED',
      message: 'Falha na validacao do webhook WhatsApp.'
    }
  });
});
router.post('/webhooks/whatsapp', asyncHandler(async (req, res) => {
  const results = await communicationService.handleWhatsAppProviderWebhook(req.body || {});
  return res.json({ data: { processed: results.length, results } });
}));
router.get('/plans', asyncHandler(planosController.listPublicPlans));
router.get('/booking/:slug', asyncHandler(publicBookingController.catalog));
router.get('/booking/:slug/availability', asyncHandler(publicBookingController.availability));
router.post('/booking/:slug/identity', identityLimiter, asyncHandler(publicBookingController.identify));
router.post('/booking/:slug/client/context', asyncHandler(publicBookingController.probeClientContext));
router.get('/booking/:slug/client/me', asyncHandler(publicBookingController.clientMe));
router.patch('/booking/:slug/client/me', asyncHandler(publicBookingController.updateClientMe));
router.get('/booking/:slug/client/appointments/upcoming', asyncHandler(publicBookingController.upcomingClientAppointments));
router.post('/booking/:slug/appointments', identityLimiter, asyncHandler(publicBookingController.create));
router.get('/booking/appointments/action', asyncHandler(publicBookingController.appointmentActionContext));
router.get('/booking/appointments/token/:token', asyncHandler(publicBookingController.appointmentByToken));
router.post('/booking/appointments/action', asyncHandler(publicBookingController.appointmentAction));
router.post('/booking/appointments/reschedule', asyncHandler(publicBookingController.appointmentReschedule));
router.get('/landing', asyncHandler(async (req, res) => {
  const planos = await require('../modules/planos/planos.service').listPublicPlans();
  return res.json({
    data: {
      product: APP_BRAND.appName,
      domain: APP_BRAND.appDomain,
      url: APP_BRAND.appUrl,
      support_email: APP_BRAND.supportEmail,
      positioning: 'SaaS para profissionais da beleza com agenda, CRM, WhatsApp e IA.',
      plans: planos
    }
  });
}));

module.exports = router;
