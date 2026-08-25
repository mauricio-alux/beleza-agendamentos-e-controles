const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const migrationPath = path.resolve(__dirname, '../../../../supabase/migrations/20260825110000_taxonomy_v2_catalog_expansion.sql');
const sql = fs.readFileSync(migrationPath, 'utf8');

test('taxonomy v2 etapa 2 migration does not alter tenant operational state', () => {
  assert.doesNotMatch(sql, /insert\s+into\s+public\.servico_tenants/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.servico_tenant_especialidades/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.profissionais/i);
  assert.doesNotMatch(sql, /insert\s+into\s+public\.agendamentos/i);
  assert.doesNotMatch(sql, /update\s+public\.servico_tenants/i);
  assert.doesNotMatch(sql, /update\s+public\.servico_tenant_especialidades/i);
  assert.doesNotMatch(sql, /update\s+public\.profissionais/i);
  assert.doesNotMatch(sql, /update\s+public\.agendamentos/i);
});

test('taxonomy v2 etapa 2 migration versions global catalog expansion as 2.1.0', () => {
  assert.match(sql, /insert\s+into\s+public\.taxonomy_versions/i);
  assert.match(sql, /'2\.1\.0'/);
  assert.match(sql, /taxonomy_v2_catalog_expansion/);
});

test('taxonomy v2 etapa 2 migration proves principal is not exclusive through N:N relations', () => {
  assert.match(sql, /\('Massoterapeuta', 'drenagem_linfatica', true\)/);
  assert.match(sql, /\('Esteticista', 'drenagem_linfatica', false\)/);
  assert.match(sql, /recommendation_ordering_only_never_execution_restriction/);
});

test('taxonomy v2 etapa 2 migration adds canonical aliases without creating alias concepts', () => {
  assert.match(sql, /insert\s+into\s+public\.taxonomy_aliases/i);
  assert.match(sql, /'Nail Designer', 'Designer de unhas'/);
  assert.match(sql, /'Micropigmentador\(a\)', 'Micropigmentadora'/);
  assert.match(sql, /'PODOLOGY_AESTHETIC_PREVENTIVE', 'Podologia estetica'/);
});
