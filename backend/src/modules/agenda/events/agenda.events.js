const eventLogsService = require('../../event-logs/eventLogs.service');

const AGENDA_EVENTS = {
  CREATED: 'appointment.created',
  REQUESTED: 'appointment.requested',
  PENDING_ATTENDANT: 'appointment.pending_attendant',
  PENDING_CLIENT: 'appointment.pending_client',
  CONFIRMED: 'appointment.confirmed',
  CANCELLED: 'appointment.cancelled',
  RESCHEDULED: 'appointment.rescheduled',
  COMPLETED: 'appointment.completed',
  EXPIRED_ATTENDANT: 'appointment.expired_attendant',
  EXPIRED_CLIENT: 'appointment.expired_client',
  SUSPICIOUS: 'appointment.suspicious',
  SLOT_OCCUPIED: 'slot.occupied',
  OCCUPANCY_CHANGED: 'occupancy.changed'
};

async function publish(eventType, context = {}) {
  return eventLogsService.logEvent(eventType, {
    tenantId: context.tenantId,
    usuarioId: context.usuarioId,
    origem: 'agenda',
    payload: {
      aggregate: 'agenda',
      realtime_ready: true,
      ai_ready: true,
      ...context.payload
    }
  });
}

module.exports = {
  AGENDA_EVENTS,
  publish
};
