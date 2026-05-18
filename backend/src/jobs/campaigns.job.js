async function processCampaignJob(payload) {
  return {
    type: 'campaigns',
    status: 'not_implemented',
    payload
  };
}

module.exports = {
  name: 'campaigns.process',
  handler: processCampaignJob
};
