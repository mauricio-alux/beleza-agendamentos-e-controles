async function processWhatsAppJob(payload) {
  return {
    type: 'whatsapp',
    status: 'not_implemented',
    payload
  };
}

module.exports = {
  name: 'whatsapp.process',
  handler: processWhatsAppJob
};
