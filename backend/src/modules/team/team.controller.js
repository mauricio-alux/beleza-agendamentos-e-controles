const teamService = require('./team.service');
const {
  professionalSchema,
  updateProfessionalSchema,
  specialtySchema,
  updateSpecialtySchema,
  specialtyStatusSchema,
  roleSchema,
  updateRoleSchema
} = require('./team.validators');

async function list(req, res) {
  const data = await teamService.list(req.tenantId);
  return res.json({ data });
}

async function getById(req, res) {
  const data = await teamService.getById(req.tenantId, req.params.id);
  return res.json({ data });
}

async function listRoles(req, res) {
  const data = await teamService.listRoles(req.tenantId, req.query.tipo_usuario, {
    contextual: req.query.contextual === 'true'
  });
  return res.json({ data });
}

async function createRole(req, res) {
  const input = roleSchema.parse(req.body);
  const data = await teamService.createRole(input);
  return res.status(201).json({ data });
}

async function updateRole(req, res) {
  const input = updateRoleSchema.parse(req.body);
  const data = await teamService.updateRole(req.params.id, input);
  return res.json({ data });
}

async function removeRole(req, res) {
  const data = await teamService.removeRole(req.params.id);
  return res.json({ data });
}

async function listSpecialties(req, res) {
  const data = await teamService.listSpecialties(req.params.id || req.query.cargo_id, req.tenantId);
  const filteredData = req.query.include_inactive === 'true' ? data : data.filter((item) => item.ativo !== false);
  return res.json({ data: filteredData });
}

async function updateSpecialtyStatus(req, res) {
  const input = specialtyStatusSchema.parse(req.body);
  const data = await teamService.updateSpecialtyStatus(req.tenantId, req.params.id, input);
  return res.json({ data });
}

async function createSpecialty(req, res) {
  const input = specialtySchema.parse(req.body);
  const data = await teamService.createSpecialty(req.tenantId, input);
  return res.status(201).json({ data });
}

async function updateSpecialty(req, res) {
  const input = updateSpecialtySchema.parse(req.body);
  const data = await teamService.updateSpecialty(req.tenantId, req.params.id, input);
  return res.json({ data });
}

async function removeSpecialty(req, res) {
  const data = await teamService.removeSpecialty(req.tenantId, req.params.id);
  return res.json({ data });
}

async function create(req, res) {
  const input = professionalSchema.parse(req.body);
  const data = await teamService.create(req.tenantId, req.usuario.id, input);
  return res.status(201).json({ data });
}

async function update(req, res) {
  const input = updateProfessionalSchema.parse(req.body);
  const data = await teamService.update(req.tenantId, req.params.id, input);
  return res.json({ data });
}

async function remove(req, res) {
  const data = await teamService.remove(req.tenantId, req.params.id);
  return res.json({ data });
}

module.exports = {
  list,
  getById,
  listRoles,
  createRole,
  updateRole,
  removeRole,
  listSpecialties,
  updateSpecialtyStatus,
  createSpecialty,
  updateSpecialty,
  removeSpecialty,
  create,
  update,
  remove
};
