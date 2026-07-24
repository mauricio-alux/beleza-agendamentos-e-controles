const { buildWhatsAppMessage } = require('./whatsapp-templates');

async function sendPendingAttendantConfirmation(context) {
  return {
    provider: 'placeholder',
    queued: false,
    notification: 'pending_attendant_confirmation',
    appointment_id: context.appointment_id
  };
}

async function sendPendingClientConfirmation(context) {
  return {
    provider: 'placeholder',
    queued: false,
    notification: 'pending_client_confirmation',
    appointment_id: context.appointment_id
  };
}

async function sendAppointmentExpiredNotification(context) {
  return {
    provider: 'placeholder',
    queued: false,
    notification: 'appointment_expired',
    appointment_id: context.appointment_id
  };
}

async function prepareOperationalWhatsAppMessage(eventType, appointment) {
  return {
    provider: 'placeholder',
    queued: false,
    notification: eventType,
    appointment_id: appointment?.id,
    message: buildWhatsAppMessage(eventType, appointment)
  };
}

module.exports = {
  sendPendingAttendantConfirmation,
  sendPendingClientConfirmation,
  sendAppointmentExpiredNotification,
  prepareOperationalWhatsAppMessage
};
