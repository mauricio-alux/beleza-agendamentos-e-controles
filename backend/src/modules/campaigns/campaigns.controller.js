const { z } = require('zod');
const service = require('./campaigns.service');
const {
  campaignSchema,
  updateCampaignSchema,
  campaignApproveSchema,
  campaignRejectSchema,
  campaignActionSchema,
  previewSchema,
  estimateSchema,
  listCampaignsSchema,
  couponSchema
} = require('./campaigns.validators');

function context(req) {
  return {
    tenantId: req.tenantId,
    tenantSlug: req.tenant?.slug || null,
    userId: req.usuario?.id || null
  };
}

async function list(req, res) {
  const filters = listCampaignsSchema.parse(req.query || {});
  const data = await service.list(req.tenantId, filters);
  return res.json({ data });
}

async function get(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const data = await service.get(req.tenantId, id);
  return res.json({ data });
}

async function create(req, res) {
  const input = campaignSchema.parse(req.body);
  const data = await service.create(context(req), input);
  return res.status(201).json({ data });
}

async function suggestions(req, res) {
  const data = await service.suggestions(req.tenantId);
  return res.json({ data });
}

async function createFromSuggestion(req, res) {
  const key = z.string().trim().min(2).max(80).parse(req.params.key);
  const data = await service.createFromSuggestion(context(req), key);
  return res.status(201).json({ data });
}

async function update(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const input = updateCampaignSchema.parse(req.body);
  const data = await service.update(context(req), id, input);
  return res.json({ data });
}

async function meta(req, res) {
  const data = await service.meta(req.tenantId);
  return res.json({ data });
}

async function estimate(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const campaign = await service.get(req.tenantId, id);
  const input = estimateSchema.parse(req.body || {});
  const data = await service.estimate(req.tenantId, {
    ...campaign,
    criterios_segmentacao: input.criterios_segmentacao || campaign.criterios_segmentacao,
    parametros_template: input.parametros_template || campaign.parametros_template
  });
  const { rows, ...summary } = data;
  return res.json({ data: summary });
}

async function preview(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const input = previewSchema.parse(req.body || {});
  const data = await service.preview(req.tenantId, id, input);
  return res.json({ data });
}

async function start(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const data = await service.start(req.tenantId, id);
  return res.json({ data });
}

async function approve(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const input = campaignApproveSchema.parse(req.body || {});
  const data = await service.approve(context(req), id, input);
  return res.json({ data });
}

async function reject(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const input = campaignRejectSchema.parse(req.body || {});
  const data = await service.reject(context(req), id, input);
  return res.json({ data });
}

async function schedule(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const input = campaignActionSchema.parse(req.body || {});
  const data = await service.schedule(req.tenantId, id, input);
  return res.json({ data });
}

async function cancel(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const data = await service.cancel(req.tenantId, id);
  return res.json({ data });
}

async function metrics(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const data = await service.metrics(req.tenantId, id);
  return res.json({ data });
}

async function messages(req, res) {
  const id = z.string().uuid().parse(req.params.id);
  const data = await service.messages(req.tenantId, id);
  return res.json({ data });
}

async function createCoupon(req, res) {
  const input = couponSchema.parse(req.body);
  const data = await service.createCoupon(context(req), input);
  return res.status(201).json({ data });
}

module.exports = {
  list,
  get,
  create,
  suggestions,
  createFromSuggestion,
  update,
  meta,
  estimate,
  preview,
  start,
  approve,
  reject,
  schedule,
  cancel,
  metrics,
  messages,
  createCoupon
};
