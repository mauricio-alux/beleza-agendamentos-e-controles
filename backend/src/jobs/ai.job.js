async function processAiJob(payload) {
  return {
    type: 'ai',
    status: 'not_implemented',
    payload
  };
}

module.exports = {
  name: 'ai.process',
  handler: processAiJob
};
