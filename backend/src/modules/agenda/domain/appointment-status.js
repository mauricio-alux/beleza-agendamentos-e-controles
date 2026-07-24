const CONFIRMABLE_STATUSES = new Set([
  'pendente',
  'pendente_atendente'
]);

const SERVICE_EXECUTION_STATUSES = new Set([
  'confirmado',
  'pendente_cliente'
]);

function resolveAppointmentStatus(status, metadata = {}) {
  const intendedStatus = metadata?.intended_status;

  if (status === 'pendente' && typeof intendedStatus === 'string') {
    return intendedStatus;
  }

  return status;
}

function canConfirmAppointment(status, metadata = {}) {
  return CONFIRMABLE_STATUSES.has(resolveAppointmentStatus(status, metadata));
}

function canCompleteAppointment(status, metadata = {}) {
  return SERVICE_EXECUTION_STATUSES.has(resolveAppointmentStatus(status, metadata));
}

function canMarkNoShowAppointment(status, metadata = {}, startsAt, now = new Date()) {
  if (!SERVICE_EXECUTION_STATUSES.has(resolveAppointmentStatus(status, metadata))) {
    return false;
  }

  const appointmentStart = new Date(startsAt);
  if (Number.isNaN(appointmentStart.getTime())) {
    return false;
  }

  return now >= appointmentStart;
}

module.exports = {
  resolveAppointmentStatus,
  canConfirmAppointment,
  canCompleteAppointment,
  canMarkNoShowAppointment
};
