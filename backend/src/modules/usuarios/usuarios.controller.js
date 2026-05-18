const usuariosService = require('./usuarios.service');
const { createUsuarioSchema } = require('./usuarios.validators');

async function list(req, res) {
  const usuarios = await usuariosService.listByTenant(req.tenantId);
  return res.json({ data: usuarios });
}

async function create(req, res) {
  const input = createUsuarioSchema.parse(req.body);
  const usuario = await usuariosService.createTenantUser(req.tenantId, req.usuario.id, input);
  return res.status(201).json({ data: usuario });
}

module.exports = {
  list,
  create
};
