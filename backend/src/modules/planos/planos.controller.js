const planosService = require('./planos.service');

async function listPublicPlans(req, res) {
  const planos = await planosService.listPublicPlans();
  return res.json({ data: planos });
}

module.exports = {
  listPublicPlans
};
