const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  __dirname,
  '../../../../supabase/migrations/20260901100000_taxonomy_v2_business_type_service_applicability_preconfiguration.sql'
);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

function officialSeedBlock() {
  const match = migrationSql.match(/with official_applicability_seed\([^)]*\)\s+as\s+\(\s+values([\s\S]*?)\n\s*\),\n\s*resolved_official_seed/i);
  assert.ok(match, 'official_applicability_seed block not found');
  return match[1];
}

test('Etapa 5C preconfigures applicability without changing runtime tenant data', () => {
  for (const forbidden of [
    /insert\s+into\s+public\.servico_tenants/i,
    /insert\s+into\s+public\.servico_tenant_especialidades/i,
    /insert\s+into\s+public\.perfil_operacional_servicos/i,
    /insert\s+into\s+public\.perfil_operacional_defaults/i,
    /update\s+public\.servico_tenants/i,
    /update\s+public\.servico_tenant_especialidades/i,
    /update\s+public\.perfil_operacional_servicos/i,
    /update\s+public\.agendamentos/i,
    /delete\s+from\s+public\./i,
  ]) {
    assert.equal(forbidden.test(migrationSql), false, `forbidden operation found: ${forbidden}`);
  }
});

test('Etapa 5C seeds a broad official matrix and leaves Outro manual/minimal', () => {
  const block = officialSeedBlock();
  assert.ok((block.match(/\n\s*\('/g) || []).length >= 150);

  for (const [typeSlug, serviceCode] of [
    ['salao-de-beleza', 'BALAYAGE'],
    ['salao-de-beleza', 'HAIR_STRAIGHTENING'],
    ['barbearia', 'FINISHING'],
    ['nail-studio', 'GEL_BATH'],
    ['studio-de-cilios', 'LASH_REMOVAL'],
    ['clinica-de-estetica', 'LASER_HAIR_REMOVAL'],
    ['fisioterapia', 'PHYSIOTHERAPY_SESSION'],
    ['pilates', 'PILATES_CLASS'],
    ['terapias-integrativas', 'REIKI'],
    ['centro-de-bem-estar', 'SPA_RITUAL'],
  ]) {
    assert.match(block, new RegExp(`'${typeSlug}'[\\s\\S]*?'${serviceCode}'`));
  }

  assert.doesNotMatch(block, /'outro'/i, 'Outro must remain manual/minimal');
});

test('Etapa 5C preserves MasterAdmin decisions and separates applicability from recommendations', () => {
  assert.match(migrationSql, /on conflict \(tipo_negocio_id, servico_catalogo_id\) do nothing/i);
  assert.match(migrationSql, /legacy_tipo_negocio_recomendado_used_as_rule'\s*,\s*false/i);
  assert.match(migrationSql, /perfil_operacional_servicos_semantics'\s*,\s*'recommendation'/i);
  assert.match(migrationSql, /tipo_negocio_servicos_catalogo_semantics'\s*,\s*'applicability'/i);
  assert.match(migrationSql, /recommended profile service\(s\) are outside active business type applicability matrix/i);
});
