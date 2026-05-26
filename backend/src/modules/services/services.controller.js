const servicesService = require('./services.service');
const { servicePayloadSchema, updateServiceSchema } = require('./services.validators');

async function list(req, res) {
  const data = await servicesService.list(req.tenantId);
  return res.json({ data });
}

async function create(req, res) {
  const input = servicePayloadSchema.parse(req.body);
  const data = await servicesService.create(req.tenantId, input);
  return res.status(201).json({ data });
}

async function update(req, res) {
  const input = updateServiceSchema.parse(req.body);
  const data = await servicesService.update(req.tenantId, req.params.id, input);
  return res.json({ data });
}

async function remove(req, res) {
  const data = await servicesService.remove(req.tenantId, req.params.id);
  return res.json({ data });
}

module.exports = {
  list,
  create,
  update,
  remove
};
