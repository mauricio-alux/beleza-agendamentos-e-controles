const servicesService = require('./services.service');
const { servicePayloadSchema, updateServiceSchema } = require('./services.validators');

async function list(req, res) {
  const especialidadeIds = String(req.query.especialidade_ids || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
  const data = await servicesService.list(req.tenantId, { especialidadeIds });
  return res.json({ data });
}

async function catalog(req, res) {
  const data = await servicesService.listCatalog(req.tenantId);
  return res.json({ data });
}

async function detail(req, res) {
  const data = await servicesService.getById(req.tenantId, req.params.id);
  return res.json({ data });
}

async function listCompatibleSpecialties(req, res) {
  const data = await servicesService.resolveCompatibleSpecialties(req.tenantId, {
    servico_catalogo_id: req.query.servico_catalogo_id,
    codigo_canonico: req.query.codigo_canonico,
    nome: req.query.nome,
    categoria: req.query.categoria
  });

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
  catalog,
  detail,
  listCompatibleSpecialties,
  create,
  update,
  remove
};
