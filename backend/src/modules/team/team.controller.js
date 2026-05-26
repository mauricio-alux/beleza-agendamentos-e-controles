const teamService = require('./team.service');
const { professionalSchema } = require('./team.validators');

async function list(req, res) {
  const data = await teamService.list(req.tenantId);
  return res.json({ data });
}

async function create(req, res) {
  const input = professionalSchema.parse(req.body);
  const data = await teamService.create(req.tenantId, input);
  return res.status(201).json({ data });
}

module.exports = {
  list,
  create
};
