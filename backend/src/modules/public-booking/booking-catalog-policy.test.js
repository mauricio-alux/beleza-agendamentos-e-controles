const test = require('node:test');
const assert = require('node:assert/strict');
const {
  SERVICE_UNAVAILABLE_REASONS,
  classifyServiceAvailability
} = require('./booking-catalog-policy');

const services = [
  { id: 'official', nome: 'Escova', is_official: true },
  { id: 'custom', nome: 'Trancas', is_custom: true },
  { id: 'unlinked', nome: 'Maquiagem', is_official: true },
  { id: 'incompatible', nome: 'Hidratacao', is_official: true }
];

test('publishes official and custom services with an eligible formally linked professional', () => {
  const result = classifyServiceAvailability({
    services,
    professionalServices: [
      { profissional_id: 'employee', servico_id: 'official' },
      { profissional_id: 'third-party', servico_id: 'custom' }
    ],
    eligibleProfessionalIds: new Set(['employee', 'third-party'])
  });

  assert.deepEqual([...result.eligibleServiceIds], ['official', 'custom']);
});

test('reports a service without formal professional links', () => {
  const result = classifyServiceAvailability({
    services: [services[2]],
    professionalServices: [],
    eligibleProfessionalIds: new Set()
  });

  assert.equal(result.unavailableServices[0].reason, SERVICE_UNAVAILABLE_REASONS.NO_PROFESSIONAL_LINK);
});

test('rejects inactive or offline professionals even with a formal link', () => {
  const result = classifyServiceAvailability({
    services: [services[0]],
    professionalServices: [{ profissional_id: 'inactive', servico_id: 'official' }],
    eligibleProfessionalIds: new Set()
  });

  assert.equal(result.unavailableServices[0].reason, SERVICE_UNAVAILABLE_REASONS.NO_ELIGIBLE_PROFESSIONAL);
});

test('accepts a formal link without consulting cargo or specialties', () => {
  const result = classifyServiceAvailability({
    services: [services[3]],
    professionalServices: [{ profissional_id: 'admin-owner', servico_id: 'incompatible' }],
    eligibleProfessionalIds: new Set(['admin-owner'])
  });

  assert.deepEqual([...result.eligibleServiceIds], ['incompatible']);
  assert.deepEqual(result.unavailableServices, []);
});
