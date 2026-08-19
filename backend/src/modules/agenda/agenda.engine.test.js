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
    schedules: overrides.schedules || [baseSchedule],
    durationMinutes: overrides.durationMinutes || 45,
    settings: {
      intervalo_padrao_minutos: 30,
      antecedencia_minima_minutos: 0,
      ...settings
    },
    appointments: overrides.appointments || [],
    blocks: overrides.blocks || [],
    now: new Date('2026-07-01T08:00:00')
  }).available.map((slot) => slot.hora);
}

function unavailable(overrides = {}) {
  return agendaEngine.generateAvailability({
    date: overrides.date || '2026-07-01',
    schedules: Object.prototype.hasOwnProperty.call(overrides, 'schedules') ? overrides.schedules : [baseSchedule],
    durationMinutes: overrides.durationMinutes || 45,
    settings: {
      intervalo_padrao_minutos: 30,
      antecedencia_minima_minutos: 0,
      ...(overrides.settings || {})
    },
    appointments: overrides.appointments || [],
    blocks: overrides.blocks || [],
    now: overrides.now || new Date('2026-07-01T08:00:00')
  }).unavailability;
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

describe('agenda engine unavailability diagnostics', () => {
  it('reports minimum notice as the predominant reason', () => {
    const diagnostics = unavailable({
      schedules: [{
        hora_inicio: '09:00',
        hora_fim: '18:00',
        hora_intervalo_inicio: '12:00',
        hora_intervalo_fim: '13:00'
      }],
      settings: {
        intervalo_padrao_minutos: 30,
        antecedencia_minima_minutos: 60
      },
      durationMinutes: 45,
      now: new Date('2026-07-01T16:40:00')
    });

    assert.equal(diagnostics.predominant_reason, agendaEngine.UNAVAILABILITY_REASONS.MINIMUM_NOTICE);
    assert.equal(diagnostics.minimum_notice_minutes, 60);
    assert.equal(diagnostics.service_duration_minutes, 45);
    assert.equal(diagnostics.latest_work_end, '18:00');
  });

  it('reports outside working hours when every candidate falls in the break', () => {
    const diagnostics = unavailable({
      schedules: [{
        hora_inicio: '12:00',
        hora_fim: '13:00',
        hora_intervalo_inicio: '12:00',
        hora_intervalo_fim: '13:00'
      }],
      durationMinutes: 30
    });

    assert.equal(diagnostics.predominant_reason, agendaEngine.UNAVAILABILITY_REASONS.OUTSIDE_WORKING_HOURS);
  });

  it('reports service duration when the service does not fit the work window', () => {
    const diagnostics = unavailable({
      schedules: [{
        hora_inicio: '09:00',
        hora_fim: '09:30'
      }],
      durationMinutes: 45
    });

    assert.equal(diagnostics.predominant_reason, agendaEngine.UNAVAILABILITY_REASONS.SERVICE_DURATION);
  });

  it('reports schedule conflict when appointments occupy every candidate', () => {
    const diagnostics = unavailable({
      schedules: [{
        hora_inicio: '09:00',
        hora_fim: '10:00'
      }],
      durationMinutes: 30,
      appointments: [{
        data_inicio: '2026-07-01T09:00:00',
        data_fim: '2026-07-01T10:00:00'
      }]
    });

    assert.equal(diagnostics.predominant_reason, agendaEngine.UNAVAILABILITY_REASONS.SCHEDULE_CONFLICT);
  });

  it('reports blocked time when blocks occupy every candidate', () => {
    const diagnostics = unavailable({
      schedules: [{
        hora_inicio: '09:00',
        hora_fim: '10:00'
      }],
      durationMinutes: 30,
      blocks: [{
        data_inicio: '2026-07-01T09:00:00',
        data_fim: '2026-07-01T10:00:00'
      }]
    });

    assert.equal(diagnostics.predominant_reason, agendaEngine.UNAVAILABILITY_REASONS.BLOCKED_TIME);
  });

  it('reports professional unavailable when schedule rows are explicitly non-working', () => {
    const diagnostics = unavailable({
      schedules: [{
        is_working: false,
        hora_inicio: '09:00',
        hora_fim: '17:00'
      }]
    });

    assert.equal(diagnostics.predominant_reason, agendaEngine.UNAVAILABILITY_REASONS.PROFESSIONAL_UNAVAILABLE);
  });

  it('reports missing scale when no schedule rows are provided', () => {
    const diagnostics = unavailable({ schedules: [] });

    assert.equal(diagnostics.predominant_reason, agendaEngine.UNAVAILABILITY_REASONS.MISSING_SCALE);
  });

  it('reports other when no candidate can be evaluated', () => {
    const diagnostics = unavailable({
      schedules: [{
        hora_inicio: '09:00',
        hora_fim: '09:00'
      }]
    });

    assert.equal(diagnostics.predominant_reason, agendaEngine.UNAVAILABILITY_REASONS.OTHER);
  });

  it('exposes specialty and professional link reason codes for upstream validation', () => {
    assert.equal(agendaEngine.UNAVAILABILITY_REASONS.NO_MATCHING_SPECIALTY, 'no_matching_specialty');
    assert.equal(agendaEngine.UNAVAILABILITY_REASONS.NO_PROFESSIONAL_LINK, 'no_professional_link');
  });
});
