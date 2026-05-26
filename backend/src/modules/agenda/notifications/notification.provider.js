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

module.exports = {
  sendPendingAttendantConfirmation,
  sendPendingClientConfirmation,
  sendAppointmentExpiredNotification
};
