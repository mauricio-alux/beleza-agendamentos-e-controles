const assert = require('node:assert/strict');
const test = require('node:test');

const repository = require('./platform.repository');
const service = require('./platform.service');

const originalRepository = { ...repository };

function restore() {
  Object.assign(repository, originalRepository);
}

function subscription(overrides = {}) {
  return {
    id: '11111111-1111-4111-8111-111111111111',
    tenant_id: '22222222-2222-4222-8222-222222222222',
    plano_id: '33333333-3333-4333-8333-333333333333',
    status: 'trial',
    data_inicio: '2026-07-01',
    data_fim: '2026-07-20',
    trial_ate: '2026-07-20',
    expira_em: '2026-07-20',
    proxima_renovacao: null,
    valor_mensal: 0,
    status_pagamento: 'pendente',
    metadata: {},
    ativo: true,
    created_at: '2026-07-01T00:00:00.000Z',
    updated_at: '2026-07-01T00:00:00.000Z',
    tenant: {
      id: '22222222-2222-4222-8222-222222222222',
      slug: 'bellory-test-studio',
      nome_fantasia: 'Bellory Test studio'
    },
    plano: {
      id: '33333333-3333-4333-8333-333333333333',
      nome: 'Trial gratis'
    },
    ...overrides
  };
}

test.afterEach(restore);

test('extendSubscriptionTrial delegates date calculation and audit to transactional repository function', async () => {
  const calls = [];
  repository.getSubscription = async () => {
    if (calls.length) {
      return subscription({
        status: 'trial',
        trial_ate: '2026-07-30',
        data_fim: '2026-07-30',
        expira_em: '2026-07-30'
      });
    }
    return subscription();
  };
  repository.extendSubscriptionTrial = async (payload) => {
    calls.push(payload);
    return subscription({
      status: 'trial',
      trial_ate: '2026-07-30',
      data_fim: '2026-07-30',
      expira_em: '2026-07-30'
    });
  };

  const result = await service.extendSubscriptionTrial(
    { userId: '99999999-9999-4999-8999-999999999999' },
    '11111111-1111-4111-8111-111111111111',
    { dias: 10, observacao: 'Teste de extensao', confirm: true }
  );

  assert.equal(calls.length, 1);
  assert.deepEqual(calls[0], {
    subscriptionId: '11111111-1111-4111-8111-111111111111',
    days: 10,
    trialUntil: null,
    userId: '99999999-9999-4999-8999-999999999999',
    observation: 'Teste de extensao'
  });
  assert.equal(result.status, 'trial');
  assert.equal(result.trial_ate, '2026-07-30');
  assert.equal(result.expira_em, '2026-07-30');
  assert.equal(result.data_fim, '2026-07-30');
});

test('extendSubscriptionTrial fails when subscription does not exist', async () => {
  repository.getSubscription = async () => null;

  await assert.rejects(
    () => service.extendSubscriptionTrial(
      { userId: '99999999-9999-4999-8999-999999999999' },
      '11111111-1111-4111-8111-111111111111',
      { dias: 10, observacao: 'Teste de extensao', confirm: true }
    ),
    /Assinatura nao encontrada/
  );
});
