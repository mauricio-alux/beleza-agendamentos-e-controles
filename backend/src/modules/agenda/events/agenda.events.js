const eventLogsService = require('../../event-logs/eventLogs.service');
const communicationService = require('../../communication/communication.service');

const AGENDA_EVENTS = {
  CREATED: 'appointment.created',
  REQUESTED: 'appointment.requested',
  PENDING_ATTENDANT: 'appointment.pending_attendant',
  PENDING_CLIENT: 'appointment.pending_client',
  CONFIRMED: 'appointment.confirmed',
  CANCELLED: 'appointment.cancelled',
  RESCHEDULED: 'appointment.rescheduled',
  COMPLETED: 'appointment.completed',
  NO_SHOW: 'appointment.no_show',
  REMINDER_24H: 'appointment.reminder_24h',
  REMINDER_2H: 'appointment.reminder_2h',
  PENDING_ATTENDANT_REMINDER_30M: 'appointment.pending_attendant_reminder_30m',
  PENDING_ATTENDANT_REMINDER_60M: 'appointment.pending_attendant_reminder_60m',
  PENDING_ATTENDANT_REMINDER_2H: 'appointment.pending_attendant_reminder_2h',
  EXPIRED_ATTENDANT: 'appointment.expired_attendant',
  EXPIRED_CLIENT: 'appointment.expired_client',
  SUSPICIOUS: 'appointment.suspicious',
  SLOT_OCCUPIED: 'slot.occupied',
  OCCUPANCY_CHANGED: 'occupancy.changed'
};

async function publish(eventType, context = {}) {
  console.log('[whatsapp-operational-debug] agenda event received', {
    eventType,
    tenantId: context.tenantId,
    usuarioId: context.usuarioId,
    appointment_id: context.payload?.appointment_id || context.payload?.agendamento_id || null
  });

  const eventLog = await eventLogsService.logEvent(eventType, {
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

  try {
    console.log('[whatsapp-operational-debug] dispatching communication service', {
      eventType,
      tenantId: context.tenantId,
      appointment_id: context.payload?.appointment_id || context.payload?.agendamento_id || null
    });

    const communicationResults = await communicationService.sendAppointmentEvent(eventType, context);

    console.log('[whatsapp-operational-debug] communication service finished', {
      eventType,
      tenantId: context.tenantId,
      appointment_id: context.payload?.appointment_id || context.payload?.agendamento_id || null,
      results: communicationResults.length
    });
  } catch (error) {
    console.error('Failed to dispatch communication for agenda event', {
      eventType,
      tenantId: context.tenantId,
      appointment_id: context.payload?.appointment_id,
      error
    });
  }

  return eventLog;
}

module.exports = {
  AGENDA_EVENTS,
  publish
};
