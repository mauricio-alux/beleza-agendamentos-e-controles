const assert = require('node:assert/strict');
const test = require('node:test');

const { supabaseAdmin } = require('../../config/supabase');
const communicationRepository = require('./communication.repository');

const originalFrom = supabaseAdmin.from.bind(supabaseAdmin);

function makeQuery(result, calls) {
  return {
    select(value) {
      calls.push(['select', value]);
      return this;
    },
    eq(column, value) {
      calls.push(['eq', column, value]);
      return this;
    },
    is(column, value) {
      calls.push(['is', column, value]);
      return this;
    },
    in(column, value) {
      calls.push(['in', column, value]);
      return this;
    },
    order(column, options) {
      calls.push(['order', column, options]);
      return this;
    },
    limit(value) {
      calls.push(['limit', value]);
      return this;
    },
    then(resolve, reject) {
      return Promise.resolve(result).then(resolve, reject);
    }
  };
}

test.afterEach(() => {
  supabaseAdmin.from = originalFrom;
});

test('findActiveMessageTemplate falls back to global templates after tenant lookup', async () => {
  const callsByQuery = [];
  supabaseAdmin.from = (table) => {
    assert.equal(table, 'templates_mensagem');
    const calls = [];
    callsByQuery.push(calls);
    return makeQuery(
      callsByQuery.length === 1
        ? { data: [], error: null }
        : {
            data: [{
              id: 'global-template',
              tenant_id: null,
              nome: 'appointment_created',
              aprovado_provider: false,
              metadata: { provider_template_name: 'appointment_created' }
            }],
            error: null
          },
      calls
    );
  };

  const template = await communicationRepository.findActiveMessageTemplate({
    tenantId: 'tenant-1',
    names: ['appointment_created'],
    requireProviderApproval: false
  });

  assert.equal(template.id, 'global-template');
  assert.deepEqual(callsByQuery[0].find((call) => call[0] === 'eq' && call[1] === 'tenant_id'), ['eq', 'tenant_id', 'tenant-1']);
  assert.deepEqual(callsByQuery[1].find((call) => call[0] === 'is' && call[1] === 'tenant_id'), ['is', 'tenant_id', null]);
});

test('findActiveMessageTemplate keeps provider approval filter for tenant and global lookups', async () => {
  const callsByQuery = [];
  supabaseAdmin.from = () => {
    const calls = [];
    callsByQuery.push(calls);
    return makeQuery({ data: [], error: null }, calls);
  };

  const template = await communicationRepository.findActiveMessageTemplate({
    tenantId: 'tenant-1',
    names: ['appointment_created'],
    requireProviderApproval: true
  });

  assert.equal(template, null);
  assert.equal(
    callsByQuery.every((calls) => calls.some((call) => (
      call[0] === 'eq' && call[1] === 'aprovado_provider' && call[2] === true
    ))),
    true
  );
});
