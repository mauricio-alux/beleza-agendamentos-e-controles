const assert = require('node:assert/strict');
const test = require('node:test');

const subscriptionService = require('../modules/subscription/subscription.service');
const { requireValidSubscription, requirePlanAccess } = require('./plan.middleware');

const originalValidateSubscription = subscriptionService.validateSubscription;
const originalValidatePlanLimits = subscriptionService.validatePlanLimits;

test.afterEach(() => {
  subscriptionService.validateSubscription = originalValidateSubscription;
  subscriptionService.validatePlanLimits = originalValidatePlanLimits;
});

test('requireValidSubscription skips subscription validation for MasterAdmin even with tenant context', async () => {
  let called = false;
  subscriptionService.validateSubscription = async () => {
    called = true;
    throw new Error('should not validate');
  };

  const req = {
    usuario: { tipo_usuario: 'MasterAdmin' },
    tipoUsuario: 'Administrador',
    tenantId: 'tenant-id'
  };

  await new Promise((resolve, reject) => {
    requireValidSubscription(req, {}, (error) => (error ? reject(error) : resolve()));
  });

  assert.equal(called, false);
});

test('requireValidSubscription still validates tenant users', async () => {
  let receivedTenantId = null;
  subscriptionService.validateSubscription = async (tenantId) => {
    receivedTenantId = tenantId;
    return { assinatura: { status: 'ativa' } };
  };

  const req = {
    usuario: { tipo_usuario: 'Administrador' },
    tipoUsuario: 'Administrador',
    tenantId: 'tenant-id'
  };

  await new Promise((resolve, reject) => {
    requireValidSubscription(req, {}, (error) => (error ? reject(error) : resolve()));
  });

  assert.equal(receivedTenantId, 'tenant-id');
  assert.equal(req.subscription.assinatura.status, 'ativa');
});

test('requirePlanAccess skips plan limits for MasterAdmin', async () => {
  let called = false;
  subscriptionService.validatePlanLimits = async () => {
    called = true;
    throw new Error('should not validate');
  };

  const middleware = requirePlanAccess({ feature: 'whatsapp' });
  const req = {
    usuario: { tipo_usuario: 'MasterAdmin' },
    tipoUsuario: 'Administrador',
    tenantId: 'tenant-id'
  };

  await new Promise((resolve, reject) => {
    middleware(req, {}, (error) => (error ? reject(error) : resolve()));
  });

  assert.equal(called, false);
  assert.equal(req.subscription, null);
});
