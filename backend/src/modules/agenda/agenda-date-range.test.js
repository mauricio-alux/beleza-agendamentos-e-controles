const assert = require('node:assert/strict');
const { describe, it } = require('node:test');

const agendaService = require('./agenda.service');

describe('agenda local day range', () => {
  it('keeps America/Sao_Paulo local day mapped to the correct UTC interval', () => {
    const range = agendaService._internal.getDayRange('2026-07-17');

    assert.deepEqual(range, {
      start: '2026-07-17T03:00:00.000Z',
      end: '2026-07-18T03:00:00.000Z'
    });
  });

  it('normalizes agenda list date without shifting appointments to another local day', () => {
    const filters = agendaService._internal.normalizeAgendaListFilters({
      data: '2026-08-06',
      profissional_id: '42e5b52a-1208-4e3c-b3c1-8e9f159ac7b1'
    });

    assert.equal(filters.data_inicio, '2026-08-06T03:00:00.000Z');
    assert.equal(filters.data_fim, '2026-08-07T03:00:00.000Z');
    assert.equal(filters.profissional_id, '42e5b52a-1208-4e3c-b3c1-8e9f159ac7b1');
  });
});
