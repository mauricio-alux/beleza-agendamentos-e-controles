const { Router } = require('express');
const authRoutes = require('./auth.routes');
const publicRoutes = require('./public.routes');
const onboardingRoutes = require('./onboarding.routes');
const tenantsRoutes = require('./tenants.routes');
const tenantRoutes = require('./tenant.routes');
const usuariosRoutes = require('./usuarios.routes');
const subscriptionRoutes = require('./subscription.routes');

const router = Router();

router.use('/public', publicRoutes);
router.use('/auth', authRoutes);
router.use('/onboarding', onboardingRoutes);
router.use('/tenants', tenantsRoutes);
router.use('/tenant', tenantRoutes);
router.use('/usuarios', usuariosRoutes);
router.use('/subscription', subscriptionRoutes);

module.exports = router;
