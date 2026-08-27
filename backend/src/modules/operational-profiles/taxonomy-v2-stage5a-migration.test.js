const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');

const migrationPath = path.resolve(
  __dirname,
  '../../../../supabase/migrations/20260826130000_taxonomy_v2_stage5a_catalog_matrix_profiles.sql'
);
const migrationSql = fs.readFileSync(migrationPath, 'utf8');

function valuesBlock(name) {
  const match = migrationSql.match(new RegExp(`with\\s+${name}\\([^)]*\\)\\s+as\\s+\\(\\s+values([\\s\\S]*?)\\n\\)`, 'i'));
  assert.ok(match, `values block not found: ${name}`);
  return match[1];
}

function countTupleRows(block) {
  return (block.match(/\n\s*\('/g) || []).length;
}

test('Etapa 5A migration does not create commercial defaults or alter tenant runtime data', () => {
  const forbiddenWrites = [
    /insert\s+into\s+public\.perfil_operacional_defaults/i,
    /insert\s+into\s+public\.servico_tenants/i,
    /insert\s+into\s+public\.servico_tenant_especialidades/i,
    /insert\s+into\s+public\.profissionais/i,
    /insert\s+into\s+public\.agendamentos/i,
    /update\s+public\.servico_tenants/i,
    /update\s+public\.servico_tenant_especialidades/i,
    /update\s+public\.profissionais/i,
    /update\s+public\.agendamentos/i,
    /delete\s+from\s+public\./i,
  ];

  for (const forbidden of forbiddenWrites) {
    assert.equal(forbidden.test(migrationSql), false, `forbidden write found: ${forbidden}`);
  }
});

test('Etapa 5A seeds exactly the approved global catalog expansion', () => {
  const services = valuesBlock('catalog_services');
  const specialties = valuesBlock('specialty_seed');
  const aliases = valuesBlock('aliases');
  const typeServices = valuesBlock('type_service_seed');
  const serviceSpecialties = valuesBlock('service_specialty_seed');
  const cargoSpecialties = valuesBlock('cargo_specialty_seed');

  assert.equal(countTupleRows(services), 13);
  assert.equal(countTupleRows(specialties), 11);
  assert.equal(countTupleRows(aliases), 8);
  assert.equal(countTupleRows(typeServices), 18);
  assert.equal(countTupleRows(serviceSpecialties), 19);
  assert.equal(countTupleRows(cargoSpecialties), 17);

  for (const code of [
    'BODY_PIERCING',
    'PIERCING_JEWELRY_CHANGE',
    'ARTIFICIAL_TANNING',
    'SPRAY_TANNING',
    'PHYSIOTHERAPY_ASSESSMENT',
    'PHYSIOTHERAPY_SESSION',
    'PILATES_CLASS',
    'TATTOO',
    'TATTOO_RETOUCH',
    'REIKI',
    'REFLEXOLOGY',
    'AROMATHERAPY',
    'HAIR_CAUTERIZATION',
  ]) {
    assert.match(services, new RegExp(`'${code}'`));
  }

  assert.doesNotMatch(services, /POLISH|Polimento/i, 'Polimento must not be a catalog service');
  assert.match(services, /HAIR_CAUTERIZATION/, 'Cauterizacao must be a catalog service');
  assert.doesNotMatch(specialties, /\('reflexologia'/i, 'Reflexologia must reuse the existing official specialty');
  assert.doesNotMatch(specialties, /\('aromaterapia'/i, 'Aromaterapia must reuse the existing official specialty');
  assert.match(specialties, /\('polimento_unhas'/i, 'Polimento must be kept as specialty only');
});

test('Etapa 5A preserves taxonomy execution rules and onboarding safety', () => {
  assert.match(
    migrationSql,
    /recommendation_ordering_only_never_execution_restriction/,
    'cargo_especialidades.principal must remain recommendation/ordering only'
  );
  assert.match(
    migrationSql,
    /pending_stage_5b/,
    'commercial defaults must remain pending for the next stage'
  );
  assert.doesNotMatch(
    migrationSql,
    /tenant_offer_policy'\s*,\s*'tenant_active/i,
    'catalog expansion cannot activate tenant offers automatically'
  );
});
