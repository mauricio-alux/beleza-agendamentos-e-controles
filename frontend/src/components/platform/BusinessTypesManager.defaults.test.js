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

test('Operational reference numeric and date fields have persistent visible labels', () => {
  for (const label of [
    'Preco min. \\(R\\$\\)',
    'Preco recomendado \\(R\\$\\)',
    'Preco max. \\(R\\$\\)',
    'Duracao \\(min\\)',
    'Retorno \\(dias\\)',
    'Validade'
  ]) {
    assert.match(source, new RegExp(`label="${label}"`));
  }
  assert.match(source, /function CompactLabeledControl/);
  assert.match(source, /<Label htmlFor=\{id\}/);
});

test('Operational reference labels keep existing values and save payload fields unchanged', () => {
  for (const field of [
    'defaultMinPrice',
    'defaultPrice',
    'defaultMaxPrice',
    'defaultDuration',
    'defaultReturn',
    'defaultStartDate'
  ]) {
    assert.match(source, new RegExp(`value=\\{profileDraft\\(profile\\.id\\)\\.${field}\\}`));
  }
  assert.match(source, /preco_min_referencia:\s*numberOrNull\(draft\.defaultMinPrice\)/);
  assert.match(source, /preco_referencia:\s*numberOrNull\(draft\.defaultPrice\)/);
  assert.match(source, /preco_max_referencia:\s*numberOrNull\(draft\.defaultMaxPrice\)/);
  assert.match(source, /duracao_minutos:\s*numberOrNull\(draft\.defaultDuration\)/);
  assert.match(source, /dias_retorno_recomendado:\s*numberOrNull\(draft\.defaultReturn\)/);
  assert.match(source, /vigencia_inicio:\s*draft\.defaultStartDate \|\| undefined/);
});

test('Operational reference cancel edit still resets the draft state', () => {
  assert.match(source, /Atualizar referencia/);
  assert.match(source, /Salvar referencia/);
  assert.match(source, /Cancelar edicao/);
  assert.match(source, /onClick=\{\(\) => updateProfileDraft\(profile\.id, EMPTY_PROFILE_DRAFT\)\}/);
});

test('MasterAdmin defaults form can update existing defaults', () => {
  assert.match(source, /updateOperationalProfileDefault/);
  assert.match(source, /editProfileDefault/);
});

test('Business types list is sorted by visible name with pt-BR collation after filters', () => {
  assert.match(source, /function\s+compareBusinessTypeByVisibleName/);
  assert.match(source, /a\.nome\.localeCompare\(b\.nome,\s*"pt-BR",\s*\{\s*sensitivity:\s*"base"\s*\}\)/);
  assert.match(source, /const filteredTypes = types\s*\n\s*\.filter\([\s\S]*?\)\s*\n\s*\.sort\(compareBusinessTypeByVisibleName\)/);
});

test('pt-BR collation keeps accented names in ascending visible-name order', () => {
  const names = [
    'Salão de Beleza',
    'Barbearia',
    'Estética Facial',
    'Esmalteria / Nail Studio',
    'Clínica de Estética',
    'Body Piercing'
  ];
  const sorted = [...names].sort((a, b) => a.localeCompare(b, 'pt-BR', { sensitivity: 'base' }));

  assert.deepEqual(sorted, [
    'Barbearia',
    'Body Piercing',
    'Clínica de Estética',
    'Esmalteria / Nail Studio',
    'Estética Facial',
    'Salão de Beleza'
  ]);
});

test('Operational profile cards use recommended lists and dropdowns use compatible candidates', () => {
  assert.match(source, /const profileRecommendedServices = \(profile: OperationalProfile\)/);
  assert.match(source, /const profileServiceCandidates = \(profile: OperationalProfile\) => profile\.servicos_candidatos \|\| \[\]/);
  assert.match(source, /const profileRoleCandidates = \(profile: OperationalProfile\) => profile\.cargos_candidatos \|\| \[\]/);
  assert.match(source, /items=\{profileRecommendedServices\(profile\)\.map/);
  assert.match(source, /profileServiceCandidates\(profile\)\.map/);
  assert.match(source, /profileRoleCandidates\(profile\)\.map/);
});

test('Operational profiles are navigated by one selected business type instead of stacked cards', () => {
  assert.match(source, /selectedOperationalTypeId/);
  assert.match(source, /selectedOperationalProfile/);
  assert.match(source, /sortedOperationalProfiles/);
  assert.match(source, /compareOperationalProfileByBusinessTypeName/);
  assert.match(source, /Selecionar Tipo de Negocio do Perfil Operacional/);
  assert.match(source, /sortedOperationalProfiles\.map\(\(profile\) => \(/);
  assert.doesNotMatch(source, /operationalProfiles\.map\(\(profile\) => \(/);
});

test('Operational profile selector uses pt-BR ordering and predictable initial selection', () => {
  assert.match(source, /operationalProfileBusinessTypeName\(a\)\.localeCompare\(\s*\n\s*operationalProfileBusinessTypeName\(b\),\s*\n\s*"pt-BR",\s*\n\s*\{ sensitivity: "base" \}/);
  assert.match(source, /profileOptions\[0\]\?\.tipo_negocio_id \|\| ""/);
  assert.match(source, /profileOptions\.some\(\(profile\) => profile\.tipo_negocio_id === current\)/);
});

test('Changing the selected operational profile resets previous draft state without saving', () => {
  assert.match(source, /function selectOperationalProfile\(typeId: string\)/);
  assert.match(source, /isProfileDraftDirty\(previousDraft\)/);
  assert.match(source, /\[previousProfile\.id\]: EMPTY_PROFILE_DRAFT/);
  assert.match(source, /Edicao temporaria do perfil anterior descartada ao trocar de Tipo de Negocio\./);
});

test('Single selected operational profile drives services roles and defaults content', () => {
  assert.match(source, /const profile = selectedOperationalProfile/);
  assert.match(source, /profileRecommendedServices\(profile\)\.map/);
  assert.match(source, /profileRecommendedRoles\(profile\)\.map/);
  assert.match(source, /profileReferenceCoverage\(profile\)\.map/);
  assert.match(source, /Nenhum Perfil Operacional configurado para este Tipo de Negocio\./);
});

test('Operational reference service dropdown is sourced from recommended profile services', () => {
  assert.match(source, /const profileDefaultServiceOptions = \(profile: OperationalProfile\) => \[\.\.\.profileRecommendedServices\(profile\)\]/);
  assert.match(source, /profileDefaultServiceOptions\(profile\)\.map\(\(item\) => \(/);
  assert.doesNotMatch(source, /<option value="">Servico<\/option>\s*\{catalog\.map/);
});

test('Recommended service without an existing default can be selected for a new operational reference', () => {
  assert.match(source, /profileDefaultServiceOptions\(profile\)\.map/);
  assert.match(source, /value=\{item\.servico_catalogo_id\}/);
  assert.match(source, /item\.servico_catalogo\?\.nome \|\| serviceName\(item\.servico_catalogo_id\)/);
  assert.match(source, /profileReferenceCoverage\(profile\)/);
});

test('Operational references are rendered as coverage for every recommended service', () => {
  assert.match(source, /const profileReferenceCoverage = \(profile: OperationalProfile\) =>/);
  assert.match(source, /orderOperationalReferenceCoverage\(\{/);
  assert.match(source, /getServiceName: \(service\) => service\.servico_catalogo\?\.nome \|\| serviceName\(service\.servico_catalogo_id\)/);
  assert.match(source, /getSpecialtyName: \(item\) => specialtyName\(item\.especialidade_id\)/);
  assert.match(source, /Sem referencia operacional configurada\./);
  assert.match(source, /Criar referencia/);
});

test('Create reference action selects the recommended service and starts with an empty default draft', () => {
  assert.match(source, /function startCreateProfileDefault\(profileId: string, servicoCatalogoId: string\)/);
  assert.match(source, /\.\.\.EMPTY_PROFILE_DRAFT,\s*\n\s*defaultServiceId: servicoCatalogoId/);
  assert.match(source, /onClick=\{\(\) => startCreateProfileDefault\(profile\.id, service\.servico_catalogo_id\)\}/);
  assert.match(source, /scrollToProfileDefaultEditor\(\)/);
});

test('Existing defaults remain editable and multiple defaults render inside the recommended service group', () => {
  assert.match(source, /defaults\.map\(\(item\) => \(/);
  assert.match(source, /onClick=\{\(\) => editProfileDefault\(profile\.id, item\)\}/);
  assert.match(source, /Editar/);
  assert.doesNotMatch(source, /referencia\(s\) configurada\(s\)/);
});

test('Operational references with defaults render directly without a redundant service header', () => {
  assert.match(source, /defaults\.length \? defaults\.map\(\(item\) => \(/);
  assert.doesNotMatch(source, /defaults\.length \? `\$\{defaults\.length\} referencia\(s\) configurada\(s\)\.`/);
  assert.doesNotMatch(source, /<div key=\{service\.servico_catalogo_id\}[\s\S]*?\{defaults\.length \? defaults\.map/);
});

test('Coverage view does not create or count fictitious defaults for recommended services without references', () => {
  const addDefaultFunction = source.match(/async function addProfileDefault[\s\S]*?\n  function editProfileDefault/);

  assert.ok(addDefaultFunction, 'addProfileDefault function should be present');
  assert.match(source, /profile\.metrics\?\.defaults \|\| 0/);
  assert.doesNotMatch(addDefaultFunction[0], /profileDefaultServiceOptions/);
  assert.doesNotMatch(source, /perfil_operacional_defaults.*Acabamento/);
});

test('Operational reference specialty dropdown follows the selected service compatibility', () => {
  assert.match(source, /const profileDefaultSpecialtyOptions = \(profile: OperationalProfile\): DefaultSpecialtyOption\[\] =>/);
  assert.match(source, /selectedService\?\.servico_catalogo\?\.especialidades_compativeis/);
  assert.match(source, /selectedService\?\.servico_catalogo\?\.compatibilidades\?\.map/);
  assert.match(source, /profileDefaultSpecialtyOptions\(profile\)\.map/);
  assert.match(source, /disabled=\{!profileDraft\(profile\.id\)\.defaultServiceId\}/);
});

test('Changing operational profile keeps reference service candidates scoped to the selected profile', () => {
  assert.match(source, /const selectedOperationalProfile = sortedOperationalProfiles\.find/);
  assert.match(source, /const profile = selectedOperationalProfile/);
  assert.match(source, /profileDefaultServiceOptions\(profile\)\.map/);
  assert.match(source, /\[previousProfile\.id\]: EMPTY_PROFILE_DRAFT/);
});

test('Editing an operational reference scrolls and focuses the editor area', () => {
  assert.match(source, /profileDefaultEditorRef/);
  assert.match(source, /profileDefaultServiceRef/);
  assert.match(source, /scrollIntoView\(\{ behavior: "smooth", block: "start" \}\)/);
  assert.match(source, /focus\(\{ preventScroll: true \}\)/);
  assert.match(source, /scroll-mt-28/);
  assert.match(source, /scrollToProfileDefaultEditor\(\)/);
  assert.match(source, /aria-label="Servico da referencia operacional"/);
});

test('Operational profile add messages do not expose technical internals', () => {
  assert.match(source, /setMessage\("Servico adicionado ao perfil operacional\."\)/);
  assert.match(source, /setMessage\("Cargo adicionado ao perfil operacional\."\)/);
});

test('Business type matrix UI manages applicable services without recommendation decision', () => {
  assert.match(source, /Servicos aplicaveis/);
  assert.match(source, /Define quais Servicos fazem parte deste Tipo de Negocio\./);
  assert.doesNotMatch(source, /function\s+toggleRecommended/);
  assert.doesNotMatch(source, /onClick=\{\(\) => toggleRecommended\(item\)\}/);
  assert.doesNotMatch(source, /<Button[^>]*>\s*Recomendado\s*<\/Button>/);
  assert.doesNotMatch(source, /recomendado:\s*item\.recomendado/);
});

test('Applicable services card uses applicability ordering without changing catalog editor order', () => {
  assert.match(source, /orderCatalogByApplicabilityAndName/);
  assert.match(source, /const filteredApplicableCatalog = useMemo\(\s*\n\s*\(\) => orderCatalogByApplicabilityAndName\(filteredCatalog, associations\),\s*\n\s*\[filteredCatalog, associations\]\s*\n\s*\)/);
  assert.match(source, /filteredApplicableCatalog\.map\(\(item\) => \{/);
  assert.match(source, /Servi[çc]os do cat[áa]logo[\s\S]*?filteredCatalog\.map\(\(item\) => \(/);
});

test('Operational profile recommendations can be removed without removing applicability', () => {
  assert.match(source, /async function removeProfileService/);
  assert.match(source, /async function removeProfileRole/);
  assert.match(source, /servico_catalogo_id:\s*item\.servico_catalogo_id,\s*\n\s*recomendado:\s*false,\s*\n\s*ativo:\s*item\.ativo !== false/);
  assert.match(source, /cargo_id:\s*item\.cargo_id,\s*\n\s*recomendado:\s*false,\s*\n\s*principal:\s*item\.principal === true,\s*\n\s*ativo:\s*item\.ativo !== false/);
});
