const clientsService = require('./clients.service');
const { clientSchema } = require('./clients.validators');

async function list(req, res) {
  const data = await clientsService.list(req.tenantId);
  return res.json({ data });
}

async function create(req, res) {
  const input = clientSchema.parse(req.body);
  const data = await clientsService.create(req.tenantId, input);
  return res.status(201).json({ data });
}

module.exports = {
  list,
  create
};
