const campaignsService = require('../modules/campaigns/campaigns.service');

async function processCampaignJob(payload) {
  const results = await campaignsService.processScheduled({
    limit: Number(payload?.limit || process.env.CAMPAIGN_SCHEDULER_BATCH_SIZE || 25)
  });

  return {
    type: 'campaigns',
    status: 'processed',
    processed: results.length,
    results
  };
}

module.exports = {
  name: 'campaigns.process',
  handler: processCampaignJob
};
