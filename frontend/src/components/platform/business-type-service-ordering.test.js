const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const ts = require('typescript');
const vm = require('node:vm');

const sourcePath = path.resolve(__dirname, 'business-type-service-ordering.ts');
const source = fs.readFileSync(sourcePath, 'utf8');
const compiled = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.CommonJS,
    target: ts.ScriptTarget.ES2020
  }
}).outputText;

const sandbox = {
  exports: {},
  require
};

vm.runInNewContext(compiled, sandbox, { filename: sourcePath });

const { orderCatalogByApplicabilityAndName } = sandbox.exports;

function service(id, nome) {
  return { id, nome };
}

function association(id, ativo = true) {
  return { servico_catalogo_id: id, ativo };
}

function names(items) {
  return Array.from(items, (item) => item.nome);
}

test('orders applicable services first and sorts each group by pt-BR visible name', () => {
  const services = [
    service('unaccented', 'Acabamento'),
    service('face', 'Estetica Facial'),
    service('accented', 'Estetica Avancada'),
    service('nails', 'Alongamento de unhas'),
    service('barba', 'Barba')
  ];

  const ordered = orderCatalogByApplicabilityAndName(services, [
    association('barba'),
    association('nails'),
    association('face', false)
  ]);

  assert.deepEqual(names(ordered), [
    'Alongamento de unhas',
    'Barba',
    'Acabamento',
    'Estetica Avancada',
    'Estetica Facial'
  ]);
});

test('uses pt-BR base sensitivity for accented names', () => {
  const ordered = orderCatalogByApplicabilityAndName([
    service('limpeza', 'Limpeza de pele'),
    service('acne', '\u00c1cne controle'),
    service('corte', 'Corte feminino'),
    service('acabamento', 'Acabamento')
  ], [
    association('limpeza'),
    association('acne')
  ]);

  assert.deepEqual(names(ordered), [
    '\u00c1cne controle',
    'Limpeza de pele',
    'Acabamento',
    'Corte feminino'
  ]);
});

test('reorders after toggling a service to applicable or not applicable', () => {
  const services = [
    service('corte', 'Corte masculino'),
    service('barba', 'Barba'),
    service('sobrancelhas', 'Design de sobrancelhas')
  ];

  assert.deepEqual(names(orderCatalogByApplicabilityAndName(services, [
    association('corte')
  ])), [
    'Corte masculino',
    'Barba',
    'Design de sobrancelhas'
  ]);

  assert.deepEqual(names(orderCatalogByApplicabilityAndName(services, [
    association('corte'),
    association('barba')
  ])), [
    'Barba',
    'Corte masculino',
    'Design de sobrancelhas'
  ]);

  assert.deepEqual(names(orderCatalogByApplicabilityAndName(services, [
    association('barba'),
    association('corte', false)
  ])), [
    'Barba',
    'Corte masculino',
    'Design de sobrancelhas'
  ]);
});

test('reorders when the selected business type association set changes', () => {
  const services = [
    service('body-piercing', 'Body piercing'),
    service('troca-joia', 'Troca/instalacao de joia'),
    service('barba', 'Barba'),
    service('corte', 'Corte masculino')
  ];

  const barbershop = [association('barba'), association('corte')];
  const piercing = [association('body-piercing'), association('troca-joia')];

  assert.deepEqual(names(orderCatalogByApplicabilityAndName(services, barbershop)), [
    'Barba',
    'Corte masculino',
    'Body piercing',
    'Troca/instalacao de joia'
  ]);

  assert.deepEqual(names(orderCatalogByApplicabilityAndName(services, piercing)), [
    'Body piercing',
    'Troca/instalacao de joia',
    'Barba',
    'Corte masculino'
  ]);
});

test('handles empty, all applicable, and no applicable states', () => {
  assert.deepEqual(Array.from(orderCatalogByApplicabilityAndName([], [association('a')])), []);

  const services = [
    service('b', 'Barba'),
    service('a', 'Acabamento')
  ];

  assert.deepEqual(names(orderCatalogByApplicabilityAndName(services, [
    association('a'),
    association('b')
  ])), [
    'Acabamento',
    'Barba'
  ]);

  assert.deepEqual(names(orderCatalogByApplicabilityAndName(services, [])), [
    'Acabamento',
    'Barba'
  ]);
});

test('preserves search-filtered results while applying applicability ordering', () => {
  const services = [
    service('corte', 'Corte masculino'),
    service('corte-barba', 'Corte + barba'),
    service('barba', 'Barba'),
    service('limpeza', 'Limpeza de pele')
  ];
  const filtered = services.filter((item) => item.nome.toLowerCase().includes('corte'));

  assert.deepEqual(names(orderCatalogByApplicabilityAndName(filtered, [
    association('corte-barba')
  ])), [
    'Corte + barba',
    'Corte masculino'
  ]);
});

test('does not mutate the source services or associations arrays', () => {
  const services = [
    service('b', 'Barba'),
    service('a', 'Acabamento')
  ];
  const associations = [association('a')];
  const serviceSnapshot = JSON.stringify(services);
  const associationSnapshot = JSON.stringify(associations);

  const ordered = orderCatalogByApplicabilityAndName(services, associations);

  assert.notEqual(ordered, services);
  assert.equal(JSON.stringify(services), serviceSnapshot);
  assert.equal(JSON.stringify(associations), associationSnapshot);
});
