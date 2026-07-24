const platformService = require('./platform.service');
const {
  platformCampaignSchema,
  updatePlatformCampaignSchema,
  communicationTemplateSchema,
  updateCommunicationTemplateSchema,
  subscriptionStatusUpdateSchema,
  subscriptionPlanUpdateSchema,
  subscriptionExtendTrialSchema,
  subscriptionReactivateSchema
} = require('./platform.validators');

function getContext(req) {
  return req.platformContext || {
    usuario: req.usuario,
    userId: req.usuario.id,
    role: 'MasterAdmin',
    mode: 'platform'
  };
}

async function summary(req, res) {
  const data = await platformService.getSummary(getContext(req));
  return res.json({ data });
}

async function tenants(req, res) {
  const data = await platformService.listTenants(getContext(req));
  return res.json({ data });
}

async function plans(req, res) {
  const data = await platformService.listPlans(getContext(req));
  return res.json({ data });
}

async function subscriptions(req, res) {
  const data = await platformService.listSubscriptions(getContext(req), req.query || {});
  return res.json({ data });
}

async function subscriptionDetails(req, res) {
  const data = await platformService.getSubscription(getContext(req), req.params.id);
  return res.json({ data });
}

async function subscriptionHistory(req, res) {
  const data = await platformService.listSubscriptionHistory(getContext(req), req.params.id);
  return res.json({ data });
}

async function updateSubscriptionStatus(req, res) {
  const input = subscriptionStatusUpdateSchema.parse(req.body);
  const data = await platformService.updateSubscriptionStatus(getContext(req), req.params.id, input);
  return res.json({ data });
}

async function updateSubscriptionPlan(req, res) {
  const input = subscriptionPlanUpdateSchema.parse(req.body);
  const data = await platformService.updateSubscriptionPlan(getContext(req), req.params.id, input);
  return res.json({ data });
}

async function extendSubscriptionTrial(req, res) {
  const input = subscriptionExtendTrialSchema.parse(req.body);
  const data = await platformService.extendSubscriptionTrial(getContext(req), req.params.id, input);
  return res.json({ data });
}

async function reactivateSubscription(req, res) {
  const input = subscriptionReactivateSchema.parse(req.body);
  const data = await platformService.reactivateSubscription(getContext(req), req.params.id, input);
  return res.json({ data });
}

async function auditLogs(req, res) {
  const data = await platformService.listAuditLogs(getContext(req));
  return res.json({ data });
}

async function campaigns(req, res) {
  const data = await platformService.listCampaigns(getContext(req));
  return res.json({ data });
}

async function createCampaign(req, res) {
  const input = platformCampaignSchema.parse(req.body);
  const data = await platformService.createCampaign(getContext(req), input);
  return res.status(201).json({ data });
}

async function updateCampaign(req, res) {
  const input = updatePlatformCampaignSchema.parse(req.body);
  const data = await platformService.updateCampaign(getContext(req), req.params.id, input);
  return res.json({ data });
}

async function communicationTemplates(req, res) {
  const data = await platformService.listCommunicationTemplates(getContext(req));
  return res.json({ data });
}

async function whatsAppMessages(req, res) {
  const data = await platformService.listWhatsAppMessages(getContext(req));
  return res.json({ data });
}

async function whatsAppQueue(req, res) {
  const data = await platformService.listWhatsAppQueue(getContext(req));
  return res.json({ data });
}

async function communicationProviders(req, res) {
  const data = platformService.getCommunicationProviderStatus(getContext(req));
  return res.json({ data });
}

async function createCommunicationTemplate(req, res) {
  const input = communicationTemplateSchema.parse(req.body);
  const data = await platformService.createCommunicationTemplate(getContext(req), input);
  return res.status(201).json({ data });
}

async function updateCommunicationTemplate(req, res) {
  const input = updateCommunicationTemplateSchema.parse(req.body);
  const data = await platformService.updateCommunicationTemplate(getContext(req), req.params.id, input);
  return res.json({ data });
}

module.exports = {
  summary,
  tenants,
  plans,
  subscriptions,
  subscriptionDetails,
  subscriptionHistory,
  updateSubscriptionStatus,
  updateSubscriptionPlan,
  extendSubscriptionTrial,
  reactivateSubscription,
  auditLogs,
  campaigns,
  createCampaign,
  updateCampaign,
  communicationTemplates,
  whatsAppMessages,
  whatsAppQueue,
  communicationProviders,
  createCommunicationTemplate,
  updateCommunicationTemplate
};
