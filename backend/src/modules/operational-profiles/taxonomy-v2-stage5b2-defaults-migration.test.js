const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  __dirname,
  '../../../../supabase/migrations/20260827100000_taxonomy_v2_stage5b2_operational_defaults.sql'
);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

function defaultSeedBlock() {
  const match = migrationSql.match(/with\s+default_seed\([^)]*\)\s+as\s+\(\s+values([\s\S]*?)\n\s*\),\n\s*resolved_defaults/i);
  assert.ok(match, 'default_seed block not found');
  return match[1];
}

test('Etapa 5B.2 migration contains exactly the 11 approved operational defaults', () => {
  const block = defaultSeedBlock();
  assert.equal((block.match(/\n\s*\('/g) || []).length, 11);

  for (const code of [
    'BODY_PIERCING',
    'ARTIFICIAL_TANNING',
    'SPRAY_TANNING',
    'SKIN_CLEANSING',
    'FACIAL_HYDRATION',
    'PHYSIOTHERAPY_ASSESSMENT',
    'PHYSIOTHERAPY_SESSION',
    'PILATES_CLASS',
    'TATTOO',
    'REIKI',
    'REFLEXOLOGY',
  ]) {
    assert.match(block, new RegExp(`'${code}'`));
  }
});

test('Etapa 5B.2 migration persists approved BR/SP state scope and online false cases', () => {
  assert.match(migrationSql, /'state',\s*'BR',\s*'SP'/);
  assert.match(defaultSeedBlock(), /'BODY_PIERCING'[\s\S]*?false/);
  assert.match(defaultSeedBlock(), /'PHYSIOTHERAPY_SESSION'[\s\S]*?false/);
  assert.match(defaultSeedBlock(), /'TATTOO'[\s\S]*?false/);
  assert.match(defaultSeedBlock(), /'PHYSIOTHERAPY_ASSESSMENT'[\s\S]*?null::integer/);
  assert.match(defaultSeedBlock(), /'TATTOO'[\s\S]*?null::integer/);
});

test('Etapa 5B.2 migration does not alter tenants or appointments', () => {
  for (const forbidden of [
    /insert\s+into\s+public\.servico_tenants/i,
    /insert\s+into\s+public\.servico_tenant_especialidades/i,
    /update\s+public\.servico_tenants/i,
    /update\s+public\.servico_tenant_especialidades/i,
    /update\s+public\.agendamentos/i,
    /delete\s+from\s+public\./i,
  ]) {
    assert.equal(forbidden.test(migrationSql), false, `forbidden operation found: ${forbidden}`);
  }
});
