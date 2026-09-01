const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, 'operational-reference-ordering.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

const sandbox = { exports: {}, require };

vm.runInNewContext(compiled, sandbox, { filename: sourcePath });

const { orderOperationalReferenceCoverage } = sandbox.exports;

function service(id, nome, prioridade = 0) {
  return {
    id: `profile-service-${id}`,
    servico_catalogo_id: id,
    recomendado: true,
    obrigatorio: false,
    ativo: true,
    prioridade,
    servico_catalogo: { id, nome, ativo: true }
  };
}

function reference(id, servicoCatalogoId, especialidadeId) {
  return {
    id,
    servico_catalogo_id: servicoCatalogoId,
    especialidade_id: especialidadeId,
    region_scope: 'global',
    aceita_agendamento_online: true,
    fonte: 'manual',
    ativo: true
  };
}

const specialtyNames = {
  acabamento: 'Acabamento',
  alongamento: 'Alongamento de Unhas',
  banho: 'Banho em Gel',
  blindagem: 'Blindagem',
  fibra: 'Fibra',
  gel: 'Gel',
  manicure: 'Manicure',
  nail: 'Nail Art',
  pedicure: 'Pedicure',
  tradicional: 'Pedicure Tradicional',
  spa: 'Spa dos Pes',
  acne: '\u00c1cne controle',
  estetica: 'Estetica Facial'
};

function coverage(services, defaults) {
  return orderOperationalReferenceCoverage({
    services,
    defaults,
    getServiceName: (item) => item.servico_catalogo?.nome || item.servico_catalogo_id,
    getSpecialtyName: (item) => specialtyNames[item.especialidade_id] || 'Especialidade geral'
  });
}

function serviceNames(items) {
  return Array.from(items, (item) => item.service.servico_catalogo.nome);
}

function referenceIds(item) {
  return Array.from(item.defaults, (referenceItem) => referenceItem.id);
}

test('orders services by visible service name A-Z', () => {
  const ordered = coverage([
    service('manicure', 'Manicure', 1),
    service('pedicure', 'Pedicure', 2),
    service('alongamento', 'Alongamento de unhas', 3)
  ], []);

  assert.deepEqual(serviceNames(ordered), [
    'Alongamento de unhas',
    'Manicure',
    'Pedicure'
  ]);
});

test('orders references from the same service by visible specialty name A-Z', () => {
  const ordered = coverage([
    service('manicure', 'Manicure')
  ], [
    reference('fibra-ref', 'manicure', 'fibra'),
    reference('banho-ref', 'manicure', 'banho'),
    reference('nail-ref', 'manicure', 'nail'),
    reference('manicure-ref', 'manicure', 'manicure'),
    reference('blindagem-ref', 'manicure', 'blindagem')
  ]);

  assert.deepEqual(referenceIds(ordered[0]), [
    'banho-ref',
    'blindagem-ref',
    'fibra-ref',
    'manicure-ref',
    'nail-ref'
  ]);
});

test('keeps recommended services without references in the same alphabetical order', () => {
  const ordered = coverage([
    service('corte', 'Corte masculino'),
    service('acabamento', 'Acabamento'),
    service('barba', 'Barba')
  ], [
    reference('barba-ref', 'barba', 'acabamento'),
    reference('corte-ref', 'corte', 'acabamento')
  ]);

  assert.deepEqual(serviceNames(ordered), [
    'Acabamento',
    'Barba',
    'Corte masculino'
  ]);
  assert.deepEqual(referenceIds(ordered[0]), []);
});

test('keeps multiple references visible under the ordered service', () => {
  const ordered = coverage([
    service('pedicure', 'Pedicure')
  ], [
    reference('tradicional-ref', 'pedicure', 'tradicional'),
    reference('spa-ref', 'pedicure', 'spa'),
    reference('pedicure-ref', 'pedicure', 'pedicure')
  ]);

  assert.equal(ordered[0].defaults.length, 3);
  assert.deepEqual(referenceIds(ordered[0]), [
    'pedicure-ref',
    'tradicional-ref',
    'spa-ref'
  ]);
});

test('uses pt-BR base sensitivity for accents and case', () => {
  const ordered = coverage([
    service('estetica', 'estetica facial'),
    service('acne', '\u00c1cne controle'),
    service('acabamento', 'Acabamento')
  ], []);

  assert.deepEqual(serviceNames(ordered), [
    'Acabamento',
    '\u00c1cne controle',
    'estetica facial'
  ]);
});

test('preserves reference identity used by the edit action', () => {
  const editTarget = reference('edit-this-default', 'manicure', 'banho');
  const ordered = coverage([
    service('manicure', 'Manicure')
  ], [
    reference('other-default', 'manicure', 'fibra'),
    editTarget
  ]);

  assert.equal(ordered[0].defaults[0], editTarget);
  assert.equal(ordered[0].defaults[0].id, 'edit-this-default');
});

test('preserves service identity used by the create reference action', () => {
  const createTarget = service('acabamento', 'Acabamento');
  const ordered = coverage([
    service('barba', 'Barba'),
    createTarget
  ], [
    reference('barba-ref', 'barba', 'acabamento')
  ]);

  assert.equal(ordered[0].service, createTarget);
  assert.deepEqual(referenceIds(ordered[0]), []);
});

test('keeps alphabetical position after save adds a reference', () => {
  const services = [
    service('barba', 'Barba'),
    service('acabamento', 'Acabamento'),
    service('corte', 'Corte masculino')
  ];

  const before = coverage(services, [
    reference('barba-ref', 'barba', 'acabamento')
  ]);
  const after = coverage(services, [
    reference('barba-ref', 'barba', 'acabamento'),
    reference('acabamento-ref', 'acabamento', 'acabamento')
  ]);

  assert.deepEqual(serviceNames(before), ['Acabamento', 'Barba', 'Corte masculino']);
  assert.deepEqual(serviceNames(after), ['Acabamento', 'Barba', 'Corte masculino']);
  assert.deepEqual(referenceIds(after[0]), ['acabamento-ref']);
});

test('applies ordering independently when selected operational profile changes', () => {
  const barbershop = coverage([
    service('corte', 'Corte masculino'),
    service('barba', 'Barba')
  ], []);
  const nails = coverage([
    service('manicure', 'Manicure'),
    service('alongamento', 'Alongamento de unhas'),
    service('pedicure', 'Pedicure')
  ], []);

  assert.deepEqual(serviceNames(barbershop), ['Barba', 'Corte masculino']);
  assert.deepEqual(serviceNames(nails), ['Alongamento de unhas', 'Manicure', 'Pedicure']);
});

test('does not modify service recommendation priority values', () => {
  const services = [
    service('manicure', 'Manicure', 10),
    service('alongamento', 'Alongamento de unhas', 2)
  ];

  coverage(services, []);

  assert.deepEqual(Array.from(services, (item) => item.prioridade), [10, 2]);
});

test('does not mutate original service or defaults arrays', () => {
  const services = [
    service('manicure', 'Manicure'),
    service('alongamento', 'Alongamento de unhas')
  ];
  const defaults = [
    reference('fibra-ref', 'manicure', 'fibra'),
    reference('banho-ref', 'manicure', 'banho')
  ];
  const serviceSnapshot = JSON.stringify(services);
  const defaultsSnapshot = JSON.stringify(defaults);

  const ordered = coverage(services, defaults);

  assert.notEqual(ordered, services);
  assert.equal(JSON.stringify(services), serviceSnapshot);
  assert.equal(JSON.stringify(defaults), defaultsSnapshot);
});

test('handles an empty list without errors', () => {
  assert.deepEqual(Array.from(coverage([], [])), []);
});
