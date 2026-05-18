const { Router } = require('express');
const asyncHandler = require('../utils/asyncHandler');
const planosController = require('../modules/planos/planos.controller');

const router = Router();

router.get('/health', (req, res) => res.json({ status: 'ok' }));
router.get('/plans', asyncHandler(planosController.listPublicPlans));
router.get('/landing', asyncHandler(async (req, res) => {
  const planos = await require('../modules/planos/planos.service').listPublicPlans();
  return res.json({
    data: {
      product: 'Bellory',
      positioning: 'SaaS para profissionais da beleza com agenda, CRM, WhatsApp e IA.',
      plans: planos
    }
  });
}));

module.exports = router;
