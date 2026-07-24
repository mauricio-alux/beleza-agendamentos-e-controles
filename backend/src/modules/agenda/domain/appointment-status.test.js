const assert = require('node:assert/strict');
const { describe, it } = require('node:test');
const {
  resolveAppointmentStatus,
  canConfirmAppointment,
  canCompleteAppointment,
  canMarkNoShowAppointment
} = require('./appointment-status');

describe('appointment status compatibility', () => {
  it('uses intended status only for legacy pending records', () => {
    assert.equal(
      resolveAppointmentStatus('pendente', { intended_status: 'pendente_atendente' }),
      'pendente_atendente'
    );
  });

  it('keeps cancelled status even when legacy metadata remains', () => {
    assert.equal(
      resolveAppointmentStatus('cancelado', { intended_status: 'pendente_atendente' }),
      'cancelado'
    );
    assert.equal(
      canConfirmAppointment('cancelado', { intended_status: 'pendente_atendente' }),
      false
    );
  });

  it('allows confirmation only from pending states', () => {
    assert.equal(canConfirmAppointment('pendente_atendente'), true);
    assert.equal(canConfirmAppointment('pendente_cliente'), false);
    assert.equal(canConfirmAppointment('confirmado'), false);
    assert.equal(canConfirmAppointment('concluido'), false);
  });

  it('allows service execution closure after professional acceptance', () => {
    assert.equal(canCompleteAppointment('pendente_cliente'), true);
    assert.equal(canCompleteAppointment('confirmado'), true);
    assert.equal(canCompleteAppointment('pendente_atendente'), false);
    assert.equal(canCompleteAppointment('cancelado'), false);
  });

  it('allows no-show only after the appointment start time', () => {
    const now = new Date('2026-07-02T14:00:00.000Z');

    assert.equal(canMarkNoShowAppointment('pendente_cliente', {}, '2026-07-02T13:59:00.000Z', now), true);
    assert.equal(canMarkNoShowAppointment('confirmado', {}, '2026-07-02T14:00:00.000Z', now), true);
    assert.equal(canMarkNoShowAppointment('pendente_cliente', {}, '2026-07-02T14:01:00.000Z', now), false);
    assert.equal(canMarkNoShowAppointment('pendente_atendente', {}, '2026-07-02T13:00:00.000Z', now), false);
  });
});
