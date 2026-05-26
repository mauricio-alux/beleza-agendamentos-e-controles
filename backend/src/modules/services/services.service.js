const servicesRepository = require('./services.repository');

function sanitizePayload(input) {
  return {
    nome: input.nome,
    descricao: input.descricao || null,
    duracao_minutos: input.duracao_minutos,
    preco: input.preco ?? 0,
    categoria: input.categoria || null,
    permite_online: input.permite_online !== false,
    ordem_exibicao: input.ordem_exibicao ?? 0
  };
}

async function list(tenantId) {
  return servicesRepository.listByTenant(tenantId);
}

async function create(tenantId, input) {
  return servicesRepository.create(tenantId, sanitizePayload(input));
}

async function update(tenantId, id, input) {
  const payload = {};

  Object.entries(input).forEach(([key, value]) => {
    if (value !== undefined) {
      payload[key] = value;
    }
  });

  if (Object.prototype.hasOwnProperty.call(payload, 'categoria')) {
    payload.categoria = payload.categoria || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'descricao')) {
    payload.descricao = payload.descricao || null;
  }

  return servicesRepository.update(tenantId, id, payload);
}

async function remove(tenantId, id) {
  return servicesRepository.softDelete(tenantId, id);
}

module.exports = {
  list,
  create,
  update,
  remove
};
