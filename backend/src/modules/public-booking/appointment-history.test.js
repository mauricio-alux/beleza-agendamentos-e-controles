const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
// Synthetic configuration; all database calls are replaced by the read-only fixture below.
process.env.SUPABASE_URL = 'https://fixture.invalid';
process.env.SUPABASE_ANON_KEY = 'synthetic-anon';
process.env.SUPABASE_SERVICE_ROLE_KEY = 'synthetic-service';
const { supabaseAdmin } = require('../../config/supabase');
const booking = require('./public-booking.service');
const bookingRepo = require('./public-booking.repository');
const identity = require('./client-identity.service');
const agenda = require('../agenda/agenda.service');
const { publicClientUpcomingAppointmentsQuerySchema: schema } = require('./public-booking.validators');
afterEach(() => mock.restoreAll());
function authorize() {
  mock.method(bookingRepo, 'findActiveLink', async slug => ({ id: 'link', tenant_id: slug, ativo: true, acesso_publico: true }));
  mock.method(bookingRepo, 'findTenant', async id => ({ id, ativo: true, status: 'trial' }));
  mock.method(identity, 'resolveClientIdentityForAppointment', async (tenant, token) => {
    assert.equal(token, 'synthetic-token');
    assert.equal(tenant, 'selected-client-tenant');
    return { clientId: 'validated-client' };
  });
}
function database(rows) {
  const calls = [];
  mock.method(supabaseAdmin, 'from', table => {
    assert.equal(table, 'agendamentos');
    let selected = [...rows];
    const q = {
      select(fields) { assert.ok(!fields.includes('*')); assert.ok(!fields.includes('token')); calls.push(['select', fields]); return q; },
      eq(k, v) { calls.push(['eq', k, v]); selected = selected.filter(r => r[k] === v); return q; },
      lt(k, v) { calls.push(['lt', k, v]); selected = selected.filter(r => r[k] < v); return q; },
      is(k, v) { calls.push(['is', k, v]); selected = selected.filter(r => r[k] === v); return q; },
      order(k, options) { calls.push(['order', k, options]); selected.sort((a, b) => b[k].localeCompare(a[k])); return Promise.resolve({ data: selected }); }
    };
    return q;
  });
  return calls;
}
const row = (id, status, date, extra = {}) => ({ id, status, data_inicio: date, tenant_id: 'selected-client-tenant', cliente_id: 'validated-client', deleted_at: null, profissional: { id: 'professional', nome_publico: 'Fixture' }, servicos: [{ nome_servico: 'Serviço fixture' }], ...extra });
test('history validates identity, isolates tenant/client, excludes future/deleted/open, sorts and returns terminal statuses without capabilities', async () => {
  authorize();
  const calls = database([
    row('completed', 'concluido', '2000-01-01'), row('cancelled', 'cancelado', '2000-03-01'),
    row('absent', 'no_show', '2000-02-01'), row('legacy', 'no-show', '2000-01-02'),
    row('metadata', 'pendente', '2000-01-03', { metadata: { intended_status: 'no_show' } }),
    row('other-tenant', 'concluido', '2000-04-01', { tenant_id: 'professional-session-tenant' }),
    row('other-client', 'concluido', '2000-04-01', { cliente_id: 'another-client' }),
    row('deleted', 'concluido', '2000-04-01', { deleted_at: '2000-05-01' }),
    row('future', 'cancelado', '2999-01-01'), row('open', 'confirmado', '2000-04-01')
  ]);
  const result = await booking.getUpcomingClientAppointments('selected-client-tenant', { token: 'synthetic-token', view: 'history' });
  assert.deepEqual(result.appointments.map(a => a.id), ['cancelled', 'absent', 'metadata', 'legacy', 'completed']);
  assert.deepEqual(result.appointments.map(a => a.status), ['cancelado', 'no_show', 'no_show', 'no-show', 'concluido']);
  assert.equal(result.appointments[0].servico.nome, 'Serviço fixture');
  assert.equal(result.appointments[0].profissional.nome_publico, 'Fixture');
  assert.deepEqual(Object.keys(result.appointments[0]).sort(), ['data_inicio', 'id', 'profissional', 'servico', 'status']);
  assert.ok(calls.some(c => c[0] === 'order' && c[2].ascending === false));
});
test('empty history is a successful empty list', async () => {
  authorize(); database([]);
  assert.deepEqual(await booking.getUpcomingClientAppointments('selected-client-tenant', { token: 'synthetic-token', view: 'history' }), { appointments: [] });
});
test('invalid identity cannot reach history query', async () => {
  authorize();
  mock.method(identity, 'resolveClientIdentityForAppointment', async () => { throw Error('invalid identity'); });
  mock.method(supabaseAdmin, 'from', () => { throw Error('unexpected database query'); });
  await assert.rejects(booking.getUpcomingClientAppointments('selected-client-tenant', { token: 'synthetic-token', view: 'history' }), /invalid identity/);
});
test('default upcoming still uses existing operational service unchanged', async () => {
  authorize();
  mock.method(identity, 'listRelatedClientIdsForAppointment', async (tenant, id) => { assert.equal(tenant, 'selected-client-tenant'); return [id]; });
  const appointments = [{ id: 'future', operational: { links: { reagendar: '/reagendar?tk=fixture', cancelar: '/acao_agendamento?tk=fixture' } } }];
  mock.method(agenda, 'listUpcomingClientAppointments', async (tenant, ids) => { assert.equal(tenant, 'selected-client-tenant'); assert.deepEqual(ids, ['validated-client']); return appointments; });
  assert.deepEqual(await booking.getUpcomingClientAppointments('selected-client-tenant', { token: 'synthetic-token' }), { appointments });
});
test('query accepts optional history mode and rejects unknown modes', () => {
  const token = 'synthetic-token-for-schema';
  assert.deepEqual(schema.parse({ token }), { token });
  assert.equal(schema.parse({ token, view: 'history' }).view, 'history');
  assert.equal(schema.safeParse({ token, view: 'all-tenants' }).success, false);
});
