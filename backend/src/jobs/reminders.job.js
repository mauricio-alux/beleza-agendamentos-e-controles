async function processReminderJob(payload) {
  return {
    type: 'reminders',
    status: 'not_implemented',
    payload
  };
}

module.exports = {
  name: 'reminders.process',
  handler: processReminderJob
};
