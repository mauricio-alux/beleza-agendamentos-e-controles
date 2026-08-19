const assert = require('node:assert/strict');
const test = require('node:test');

const { resolveServiceComposition } = require('./service-composition');

test('service composition prioritizes service-specialty duration and price', () => {
  const result = resolveServiceComposition(
    {
      id: 'service-haircut',
      nome: 'Corte de Cabelo',
      duracao_minutos: 45,
      preco: 60
    },
    {
      duracao_minutos: 50,
      preco: 70
    },
    [],
    {
      serviceSpecialty: {
        id: 'link-feminino',
        servico_tenant_id: 'tenant-service-haircut',
        especialidade_id: 'specialty-feminino',
        duracao_minutos: 60,
        preco: 90,
        especialidade: {
          nome: 'Corte Feminino'
        }
      }
    }
  );

  assert.equal(result.totalDurationMinutes, 60);
  assert.equal(result.totalPrice, 90);
  assert.equal(result.services[0].servico_tenant_id, 'service-haircut');
  assert.equal(result.services[0].servico_tenant_especialidade_id, 'link-feminino');
  assert.equal(result.services[0].especialidade_id, 'specialty-feminino');
  assert.equal(result.services[0].nome_especialidade, 'Corte Feminino');
  assert.equal(result.services[0].duracao_origem, 'servico_tenant_especialidade');
  assert.equal(result.services[0].preco_origem, 'servico_tenant_especialidade');
});

test('service composition does not fallback to legacy service values for new appointments', () => {
  const result = resolveServiceComposition(
    {
      id: 'service-haircut',
      nome: 'Corte de Cabelo',
      duracao_minutos: 45,
      preco: 60
    },
    null,
    []
  );

  assert.equal(result.totalDurationMinutes, 0);
  assert.equal(result.totalPrice, null);
  assert.equal(result.services[0].duracao_origem, null);
  assert.equal(result.services[0].preco_origem, null);
});
