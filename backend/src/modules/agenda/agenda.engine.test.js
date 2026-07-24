const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const agendaEngine = require('./agenda.engine');

const baseSchedule = {
  hora_inicio: '09:00',
  hora_fim: '17:00',
  hora_intervalo_inicio: '12:00',
  hora_intervalo_fim: '13:00'
};

function availability(settings = {}, overrides = {}) {
  return agendaEngine.generateAvailability({
    date: '2026-07-01',
    schedules: [baseSchedule],
    durationMinutes: overrides.durationMinutes || 45,
    settings: {
      intervalo_padrao_minutos: 30,
      antecedencia_minima_minutos: 0,
      ...settings
    },
    appointments: overrides.appointments || [],
    blocks: [],
    now: new Date('2026-07-01T08:00:00')
  }).available.map((slot) => slot.hora);
}

describe('agenda engine schedule tolerances', () => {
  it('preserves current behavior when tolerances are zero', () => {
    const slots = availability({
      tolerancia_intervalo_min: 0,
      tolerancia_fim_expediente_min: 0
    });

    assert.equal(slots.includes('11:30'), false);
    assert.equal(slots.includes('16:30'), false);
  });

  it('allows appointments to overrun the break start within configured tolerance', () => {
    const slots = availability({ tolerancia_intervalo_min: 15 });

    assert.equal(slots.includes('11:30'), true);
    assert.equal(slots.includes('11:45'), false);
    assert.equal(slots.includes('12:00'), false);
  });

  it('allows appointments to overrun the workday end within configured tolerance', () => {
    const slots = availability({ tolerancia_fim_expediente_min: 15 });

    assert.equal(slots.includes('16:30'), true);
    assert.equal(slots.includes('16:45'), false);
  });

  it('keeps conflicting slots unavailable even when end-of-day tolerance applies', () => {
    const slots = availability(
      { tolerancia_fim_expediente_min: 15 },
      {
        appointments: [{
          data_inicio: '2026-07-01T17:00:00',
          data_fim: '2026-07-01T17:30:00'
        }]
      }
    );

    assert.equal(slots.includes('16:30'), false);
  });
});
