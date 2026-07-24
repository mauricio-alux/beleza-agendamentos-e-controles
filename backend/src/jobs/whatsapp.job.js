const communicationService = require('../modules/communication/communication.service');

async function processWhatsAppJob(payload) {
  const limit = Number(payload?.limit || process.env.WHATSAPP_QUEUE_BATCH_SIZE || 25);
  const results = await communicationService.processPendingWhatsAppMessages({ limit });

  return {
    type: 'whatsapp',
    status: 'processed',
    processed: results.length,
    results
  };
}

module.exports = {
  name: 'whatsapp.process',
  handler: processWhatsAppJob
};
