const { notFound } = require('../../utils/errors');
const planosRepository = require('./planos.repository');

async function listPublicPlans() {
  return planosRepository.findActive();
}

async function validatePlan(planoId) {
  const plano = await planosRepository.findActiveById(planoId);

  if (!plano) {
    throw notFound('Plano informado nao existe ou esta inativo');
  }

  return plano;
}

module.exports = {
  listPublicPlans,
  validatePlan
};
