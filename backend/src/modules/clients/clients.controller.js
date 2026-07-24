const clientsService = require('./clients.service');
const { z } = require('zod');
const { clientSchema, bookingTokenSchema } = require('./clients.validators');

async function list(req, res) {
  const data = await clientsService.list(req.tenantId);
  return res.json({ data });
}

async function create(req, res) {
  const input = clientSchema.parse(req.body);
  const data = await clientsService.create(req.tenantId, input);
  return res.status(201).json({ data });
}

async function issueBookingToken(req, res) {
  const clientId = z.string().uuid().parse(req.params.id);
  const input = bookingTokenSchema.parse(req.body || {});
  const data = await clientsService.issueBookingToken(req.tenantId, clientId, input);
  return res.status(201).json({ data });
}

module.exports = {
  list,
  create,
  issueBookingToken
};
