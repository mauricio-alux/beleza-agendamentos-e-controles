const assert = require('node:assert/strict');
const test = require('node:test');

const {
  buildFutureBlocksRecoveryPlan,
  futureBlocksRecoveryDiagnostic,
  inactiveRecoveryValidationSummary,
  plannedFutureDate
} = require('./campaign-test-data-v3');

const NOW = new Date('2026-08-16T12:00:00.000Z');

function audienceRow(overrides = {}) {
  return {
    nome: 'Cliente Futuro',
    eligible: true,
    exclusions: [],
    raw: {
      metadata: { scenario: 'future_blocks_recovery' },
      cliente: { metadata: { scenario: 'future_blocks_recovery' } },
      agendamentos: []
    },
    stats: {},
    ...overrides
  };
}

function appointment(overrides = {}) {
  return {
    id: 'appt-future',
    status: 'confirmado',
    data_inicio: '2026-08-10T13:00:00.000Z',
    data_fim: '2026-08-10T13:45:00.000Z',
    deleted_at: null,
    metadata: {
      seed: 'campaign_test_v3',
      scenario: 'future_blocks_recovery',
      seed_key: 'tenant:user:3:appt:future-confirmed'
    },
    ...overrides
  };
}

test('validator reports stale when future_blocks_recovery appointments expired', () => {
  const result = inactiveRecoveryValidationSummary({
    found: 1,
    eligible: 1,
    excluded_by_reason: {
      dentro_prazo_retorno: 1,
      servico_ocasional_sem_recuperacao: 1
    },
    rows: [audienceRow({ raw: { metadata: { scenario: 'future_blocks_recovery' }, agendamentos: [appointment()] } })]
  }, NOW);

  assert.equal(result.ok, false);
  assert.equal(result.future_blocks_recovery.stale, true);
  assert.match(result.future_blocks_recovery.message, /future_blocks_recovery nao possui agendamento futuro ativo/);
});

test('validator stays ok when future_blocks_recovery is covered by a valid future appointment', () => {
  const result = inactiveRecoveryValidationSummary({
    found: 1,
    eligible: 1,
    excluded_by_reason: {
      dentro_prazo_retorno: 1,
      possui_agendamento_futuro: 1,
      servico_ocasional_sem_recuperacao: 1
    },
    rows: [audienceRow({
      eligible: false,
      exclusions: ['possui_agendamento_futuro'],
      raw: {
        metadata: { scenario: 'future_blocks_recovery' },
        agendamentos: [appointment({ data_inicio: '2026-09-20T13:00:00.000Z', data_fim: '2026-09-20T13:45:00.000Z' })]
      }
    })]
  }, NOW);

  assert.equal(result.ok, true);
  assert.equal(result.future_blocks_recovery.stale, false);
  assert.equal(result.future_blocks_recovery.active_future, 1);
});

test('reconcile plan updates only expired future_blocks_recovery appointments', () => {
  const plan = buildFutureBlocksRecoveryPlan([
    {
      tenant: 'bellory-test-studio',
      cliente: 'Cliente Expirado',
      seed_key: 'tenant:user:3',
      has_active_future: false,
      candidate: appointment()
    }
  ], NOW);

  assert.equal(plan[0].action, 'update');
  assert.equal(plan[0].appointment_id, 'appt-future');
  assert.equal(plan[0].planned_data_inicio, '2026-09-15T13:00:00.000Z');
  assert.equal(plan[0].planned_data_fim, '2026-09-15T13:45:00.000Z');
});

test('reconcile plan is idempotent when a valid future appointment already exists', () => {
  const plan = buildFutureBlocksRecoveryPlan([
    {
      tenant: 'bellory-test-studio',
      cliente: 'Cliente Futuro',
      seed_key: 'tenant:user:3',
      has_active_future: true,
      candidate: appointment({ data_inicio: '2026-09-20T13:00:00.000Z' })
    }
  ], NOW);

  assert.equal(plan[0].action, 'noop');
  assert.equal(plan[0].reason, 'ja_possui_agendamento_futuro_valido');
});

test('planned future date is relative to now and preserves previous UTC hour', () => {
  const planned = plannedFutureDate(NOW, 2, '2026-08-10T16:30:00.000Z');
  assert.equal(planned.toISOString(), '2026-09-17T16:30:00.000Z');
});
