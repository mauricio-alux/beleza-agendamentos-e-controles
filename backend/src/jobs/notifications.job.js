async function processNotificationJob(payload) {
  return {
    type: 'notifications',
    status: 'not_implemented',
    payload
  };
}

module.exports = {
  name: 'notifications.process',
  handler: processNotificationJob
};
