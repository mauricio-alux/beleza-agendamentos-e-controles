const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const source = fs.readFileSync(path.resolve(__dirname, 'BusinessTypesManager.tsx'), 'utf8');

test('MasterAdmin defaults form exposes regional governance fields', () => {
  for (const text of [
    'defaultRegionScope',
    'defaultCountry',
    'defaultState',
    'defaultCity',
    'defaultMinPrice',
    'defaultMaxPrice',
    'defaultOnline',
    'Cidade, Estado, Pais, Geral'
  ]) {
    assert.match(source, new RegExp(text));
  }
});

test('MasterAdmin defaults form persists online false without coercing to true', () => {
  assert.match(source, /aceita_agendamento_online:\s*draft\.defaultOnline/);
  assert.doesNotMatch(source, /aceita_agendamento_online:\s*true/);
});

test('MasterAdmin defaults form can update existing defaults', () => {
  assert.match(source, /updateOperationalProfileDefault/);
  assert.match(source, /editProfileDefault/);
});
