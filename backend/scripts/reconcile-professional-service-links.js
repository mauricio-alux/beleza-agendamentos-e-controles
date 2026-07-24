require('dotenv').config();

const { supabaseAdmin } = require('../src/config/supabase');
const { normalizeOfficialCategoryKey } = require('../src/constants/bellory-taxonomy');

async function listActive(table, columns) {
  const { data, error } = await supabaseAdmin
    .from(table)
    .select(columns)
    .eq('ativo', true)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function run() {
  const [
    professionals,
    initialProfessionalSpecialties,
    allSpecialties,
    services,
    taxonomyLinks,
    currentLinks
  ] = await Promise.all([
    listActive('profissionais', 'id,tenant_id,percentual_comissao'),
    listActive('profissional_especialidades', 'tenant_id,profissional_id,especialidade_id'),
    supabaseAdmin
      .from('especialidades')
      .select('id,nome,tenant_id,taxonomy_specialty_key,taxonomy_category_key,is_official,ativo,deleted_at,created_at')
      .then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
    listActive('servicos', 'id,tenant_id,nome,duracao_minutos,preco,categoria,taxonomy_category_key,taxonomy_service_key'),
    supabaseAdmin
      .from('taxonomia_servico_especialidades')
      .select('servico_key,especialidade_key')
      .then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      }),
    supabaseAdmin
      .from('profissional_servicos')
      .select('profissional_id,servico_id,ativo,deleted_at')
      .then(({ data, error }) => {
        if (error) throw error;
        return data || [];
      })
  ]);

  const activeSpecialties = allSpecialties.filter((item) => item.ativo !== false && !item.deleted_at);
  const canonicalSpecialtyByKey = new Map();
  activeSpecialties
    .filter((item) => (
      !item.tenant_id
      && item.is_official === true
      && item.taxonomy_specialty_key
    ))
    .sort((left, right) => String(left.created_at).localeCompare(String(right.created_at)))
    .forEach((item) => {
      if (!canonicalSpecialtyByKey.has(item.taxonomy_specialty_key)) {
        canonicalSpecialtyByKey.set(item.taxonomy_specialty_key, item);
      }
    });

  const legacyAliases = new Map([
    ['escova', 'escova_simples'],
    ['progressiva', 'escova_progressiva'],
    ['colorimetria', 'coloracao_global']
  ]);
  const allSpecialtyById = new Map(allSpecialties.map((item) => [item.id, item]));
  const currentProfessionalSpecialtyKeys = new Set(
    initialProfessionalSpecialties.map((item) => `${item.profissional_id}:${item.especialidade_id}`)
  );
  const canonicalProfessionalSpecialtyRows = [];

  initialProfessionalSpecialties.forEach((item) => {
    const legacySpecialty = allSpecialtyById.get(item.especialidade_id);
    const canonicalKey = legacyAliases.get(String(legacySpecialty?.nome || '').trim().toLowerCase());
    const canonicalSpecialty = canonicalSpecialtyByKey.get(canonicalKey);
    if (!canonicalSpecialty) return;

    const pairKey = `${item.profissional_id}:${canonicalSpecialty.id}`;
    if (currentProfessionalSpecialtyKeys.has(pairKey)) return;
    currentProfessionalSpecialtyKeys.add(pairKey);
    canonicalProfessionalSpecialtyRows.push({
      tenant_id: item.tenant_id,
      profissional_id: item.profissional_id,
      especialidade_id: canonicalSpecialty.id,
      ativo: true,
      deleted_at: null
    });
  });

  if (canonicalProfessionalSpecialtyRows.length) {
    const { error } = await supabaseAdmin
      .from('profissional_especialidades')
      .insert(canonicalProfessionalSpecialtyRows);
    if (error) throw error;
  }

  const expectedSpecialtyKeysByService = new Map();
  taxonomyLinks.forEach((item) => {
    if (!expectedSpecialtyKeysByService.has(item.servico_key)) {
      expectedSpecialtyKeysByService.set(item.servico_key, []);
    }
    expectedSpecialtyKeysByService.get(item.servico_key).push(item.especialidade_key);
  });

  const canonicalServiceSpecialtyRows = [];
  services.forEach((service) => {
    const specialtyKeys = expectedSpecialtyKeysByService.get(service.taxonomy_service_key) || [];
    specialtyKeys.forEach((specialtyKey) => {
      const specialty = canonicalSpecialtyByKey.get(specialtyKey);
      if (!specialty) return;
      canonicalServiceSpecialtyRows.push({
        tenant_id: service.tenant_id,
        servico_id: service.id,
        especialidade_id: specialty.id,
        ativo: true,
        deleted_at: null
      });
    });
  });

  if (canonicalServiceSpecialtyRows.length) {
    const { error } = await supabaseAdmin
      .from('servico_especialidades')
      .upsert(canonicalServiceSpecialtyRows, {
        onConflict: 'tenant_id,servico_id,especialidade_id'
      });
    if (error) throw error;
  }

  const serviceSpecialties = await listActive(
    'servico_especialidades',
    'tenant_id,servico_id,especialidade_id'
  );
  const professionalSpecialties = await listActive(
    'profissional_especialidades',
    'tenant_id,profissional_id,especialidade_id'
  );
  const professionalById = new Map(professionals.map((item) => [item.id, item]));
  const specialtyById = new Map(activeSpecialties.map((item) => [item.id, item]));
  const serviceById = new Map(services.map((item) => [item.id, item]));
  const serviceLinksBySpecialty = new Map();

  serviceSpecialties.forEach((item) => {
    const key = `${item.tenant_id}:${item.especialidade_id}`;
    if (!serviceLinksBySpecialty.has(key)) serviceLinksBySpecialty.set(key, []);
    serviceLinksBySpecialty.get(key).push(item);
  });

  const candidates = new Map();

  professionalSpecialties.forEach((professionalSpecialty) => {
    const professional = professionalById.get(professionalSpecialty.profissional_id);
    const specialty = specialtyById.get(professionalSpecialty.especialidade_id);
    if (!professional || !specialty) return;
    if (specialty.tenant_id && specialty.tenant_id !== professional.tenant_id) return;

    const matchingServiceLinks = serviceLinksBySpecialty.get(
      `${professional.tenant_id}:${professionalSpecialty.especialidade_id}`
    ) || [];

    matchingServiceLinks.forEach((serviceLink) => {
      const service = serviceById.get(serviceLink.servico_id);
      if (!service || service.tenant_id !== professional.tenant_id) return;

      const serviceCategory = normalizeOfficialCategoryKey(
        service.taxonomy_category_key || service.categoria
      );
      const specialtyCategory = normalizeOfficialCategoryKey(specialty.taxonomy_category_key);
      if (!serviceCategory || specialtyCategory !== serviceCategory) return;

      candidates.set(`${professional.id}:${service.id}`, {
        tenant_id: professional.tenant_id,
        profissional_id: professional.id,
        servico_id: service.id,
        duracao_minutos: service.duracao_minutos,
        preco: service.preco,
        percentual_comissao: professional.percentual_comissao,
        ativo: true,
        deleted_at: null
      });
    });
  });

  const currentByKey = new Map(
    currentLinks.map((item) => [`${item.profissional_id}:${item.servico_id}`, item])
  );
  const rows = [...candidates.values()].filter((item) => {
    const current = currentByKey.get(`${item.profissional_id}:${item.servico_id}`);
    return !current || current.ativo === false || current.deleted_at;
  });

  if (!rows.length) {
    console.log('Nenhum vinculo profissional-servico precisava ser reconciliado.');
    return;
  }

  const { error } = await supabaseAdmin
    .from('profissional_servicos')
    .upsert(rows, { onConflict: 'profissional_id,servico_id' });

  if (error) throw error;
  console.log(`${rows.length} vinculo(s) profissional-servico reconciliado(s).`);
}

run().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
