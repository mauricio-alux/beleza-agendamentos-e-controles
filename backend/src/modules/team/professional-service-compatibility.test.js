const test = require('node:test');
const assert = require('node:assert/strict');
const {
  hasExactServiceCompatibility
} = require('./professional-service-compatibility');

const service = {
  id: 'service-escova',
  categoria: 'cabelo',
  taxonomy_category_key: 'cabelo'
};

const specialties = new Map([
  ['escova-simples', { taxonomy_category_key: 'cabelo' }],
  ['corte-feminino', { taxonomy_category_key: 'cabelo' }],
  ['maquiagem-social', { taxonomy_category_key: 'maquiagem' }]
]);

test('accepts an exact persisted specialty shared by professional and service', () => {
  assert.equal(hasExactServiceCompatibility({
    service,
    professionalSpecialtyIds: new Set(['escova-simples']),
    serviceSpecialtyIds: new Set(['escova-simples']),
    specialtyById: specialties
  }), true);
});

test('rejects category-only compatibility without an exact specialty relationship', () => {
  assert.equal(hasExactServiceCompatibility({
    service,
    professionalSpecialtyIds: new Set(['corte-feminino']),
    serviceSpecialtyIds: new Set(['escova-simples']),
    specialtyById: specialties
  }), false);
});

test('rejects an exact specialty whose official category differs from the service', () => {
  assert.equal(hasExactServiceCompatibility({
    service,
    professionalSpecialtyIds: new Set(['maquiagem-social']),
    serviceSpecialtyIds: new Set(['maquiagem-social']),
    specialtyById: specialties
  }), false);
});
