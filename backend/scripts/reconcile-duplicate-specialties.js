require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
const WebSocket = require('ws');

const mode = process.argv[2] || 'audit';
const shouldApply = mode === 'apply';

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, {
  realtime: { transport: WebSocket },
  auth: { persistSession: false, autoRefreshToken: false }
});

function normalize(value) {
  return String(value || '')
    .trim()
    .toLocaleLowerCase('pt-BR')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/\s+/g, ' ');
}

function semanticKey(specialty) {
  return [
    specialty.taxonomy_specialty_key || normalize(specialty.nome),
    specialty.taxonomy_category_key || '',
    specialty.tenant_id || 'GLOBAL'
  ].join('|');
}

async function countRows(table, column, id, decorate = null) {
  let query = supabase.from(table).select('id', { count: 'exact', head: true }).eq(column, id);
  if (decorate) query = decorate(query);
  const { count, error } = await query;
  if (error) return { count: 0, error };
  return { count: count || 0, error: null };
}

async function countProfessionalServiceSpecialtyLinks(specialtyId) {
  const { data: configs, error: configsError } = await supabase
    .from('servico_tenant_especialidades')
    .select('id')
    .eq('especialidade_id', specialtyId);

  if (configsError) return { count: 0, error: configsError };
  const configIds = (configs || []).map((item) => item.id);
  if (!configIds.length) return { count: 0, error: null };

  const { count, error } = await supabase
    .from('profissional_servico_especialidades')
    .select('id', { count: 'exact', head: true })
    .in('servico_tenant_especialidade_id', configIds)
    .is('deleted_at', null);

  if (error) return { count: 0, error };
  return { count: count || 0, error: null };
}

async function loadSpecialties() {
  const { data, error } = await supabase
    .from('especialidades')
    .select(`
      id,
      nome,
      cargo_id,
      taxonomy_specialty_key,
      taxonomy_category_key,
      tenant_id,
      ativo,
      deleted_at,
      is_official,
      is_custom,
      created_by_tenant,
      metadata,
      cargo:cargos(id,nome,categoria_profissional,ativo,deleted_at),
      tenant:tenants!especialidades_tenant_id_fkey(id,nome_fantasia,slug)
    `)
    .order('nome', { ascending: true });

  if (error) throw error;
  return data || [];
}

async function getDependencies(specialtyId) {
  const [
    catalog,
    tenantService,
    professional,
    professionalService,
    appointmentService,
    history,
    campaigns,
    coupons
  ] = await Promise.all([
    countRows('servico_catalogo_especialidades', 'especialidade_id', specialtyId, (query) => query.eq('ativo', true)),
    countRows('servico_tenant_especialidades', 'especialidade_id', specialtyId, (query) => query.eq('ativo', true)),
    countRows('profissional_especialidades', 'especialidade_id', specialtyId, (query) => query.is('deleted_at', null)),
    countProfessionalServiceSpecialtyLinks(specialtyId),
    countRows('agendamento_servicos', 'especialidade_id', specialtyId),
    countRows('cliente_historico_atendimentos', 'especialidade_id', specialtyId),
    countRows('campanhas', 'especialidade_id', specialtyId),
    countRows('cupom_servicos', 'especialidade_id', specialtyId)
  ]);

  return {
    servico_catalogo_especialidades: catalog.count,
    servico_tenant_especialidades: tenantService.count,
    profissional_especialidades: professional.count,
    profissional_servico_especialidades: professionalService.count,
    agendamento_servicos: appointmentService.count,
    cliente_historico_atendimentos: history.count,
    campanhas: campaigns.count,
    cupom_servicos: coupons.count
  };
}

function dependencyTotal(dependencies) {
  return Object.values(dependencies).reduce((total, count) => total + Number(count || 0), 0);
}

function chooseCanonical(group) {
  return [...group].sort((left, right) => {
    const leftScore =
      (left.deleted_at ? 0 : 10000)
      + (left.ativo ? 5000 : 0)
      + (left.is_official ? 2000 : 0)
      + left.dependencies.servico_catalogo_especialidades * 500
      + left.dependencies.servico_tenant_especialidades * 250
      + left.dependencies.profissional_especialidades * 25;
    const rightScore =
      (right.deleted_at ? 0 : 10000)
      + (right.ativo ? 5000 : 0)
      + (right.is_official ? 2000 : 0)
      + right.dependencies.servico_catalogo_especialidades * 500
      + right.dependencies.servico_tenant_especialidades * 250
      + right.dependencies.profissional_especialidades * 25;
    return rightScore - leftScore;
  })[0];
}

function isConfirmedDuplicate(group, canonical) {
  if (!canonical || canonical.deleted_at || canonical.ativo === false) return false;
  const canonicalHasServiceBase =
    canonical.dependencies.servico_catalogo_especialidades > 0
    || canonical.dependencies.servico_tenant_especialidades > 0;

  return canonicalHasServiceBase && group.some((item) => (
    item.id !== canonical.id
    && item.dependencies.profissional_especialidades > 0
    && item.dependencies.agendamento_servicos === 0
    && item.dependencies.cliente_historico_atendimentos === 0
    && item.dependencies.campanhas === 0
    && item.dependencies.cupom_servicos === 0
  ));
}

async function loadProfessionalLinks(specialtyIds) {
  if (!specialtyIds.length) return [];
  const { data, error } = await supabase
    .from('profissional_especialidades')
    .select('id,tenant_id,profissional_id,especialidade_id,ativo,deleted_at,profissional:profissionais(id,nome_publico,tenant_id)')
    .in('especialidade_id', specialtyIds)
    .is('deleted_at', null);

  if (error) throw error;
  return data || [];
}

async function reconcileProfessionalSpecialtyLink(link, canonicalId, now) {
  const { data: existing, error: existingError } = await supabase
    .from('profissional_especialidades')
    .select('id')
    .eq('tenant_id', link.tenant_id)
    .eq('profissional_id', link.profissional_id)
    .eq('especialidade_id', canonicalId)
    .is('deleted_at', null)
    .maybeSingle();

  if (existingError) throw existingError;

  if (existing) {
    const { error } = await supabase
      .from('profissional_especialidades')
      .update({ ativo: false, deleted_at: now })
      .eq('id', link.id);
    if (error) throw error;
    return 'deactivated_duplicate_professional_link';
  }

  const { error } = await supabase
    .from('profissional_especialidades')
    .update({ especialidade_id: canonicalId, ativo: true, deleted_at: null })
    .eq('id', link.id);

  if (error) throw error;
  return 'updated_professional_link';
}

async function ensureProfessionalServiceSpecialties(link, canonicalId) {
  const { data: configs, error: configsError } = await supabase
    .from('servico_tenant_especialidades')
    .select('id,servico_tenant:servico_tenants!inner(id,tenant_id,ativo)')
    .eq('especialidade_id', canonicalId)
    .eq('ativo', true)
    .eq('servico_tenant.tenant_id', link.tenant_id)
    .eq('servico_tenant.ativo', true);

  if (configsError) throw configsError;
  if (!configs?.length) return 0;

  const payload = configs.map((config) => ({
    tenant_id: link.tenant_id,
    profissional_id: link.profissional_id,
    servico_tenant_especialidade_id: config.id,
    ativo: true,
    deleted_at: null,
    metadata: {
      origem: 'reconcile_duplicate_specialties',
      canonical_especialidade_id: canonicalId,
      previous_especialidade_id: link.especialidade_id
    }
  }));

  const { data, error } = await supabase
    .from('profissional_servico_especialidades')
    .upsert(payload, { onConflict: 'profissional_id,servico_tenant_especialidade_id' })
    .select('id');

  if (error) throw error;
  return data?.length || 0;
}

async function maybeDeactivateSpecialty(specialty, now) {
  const dependencies = await getDependencies(specialty.id);
  if (dependencyTotal(dependencies) > 0 || specialty.deleted_at) {
    return false;
  }

  const { error } = await supabase
    .from('especialidades')
    .update({
      ativo: false,
      deleted_at: now,
      metadata: {
        ...(specialty.metadata || {}),
        origem_inativacao: 'reconcile_duplicate_specialties'
      }
    })
    .eq('id', specialty.id)
    .is('deleted_at', null);

  if (error) throw error;
  return true;
}

async function main() {
  if (!['audit', 'apply'].includes(mode)) {
    throw new Error('Use: node scripts/reconcile-duplicate-specialties.js audit|apply');
  }

  const specialties = await loadSpecialties();
  const enriched = await Promise.all(specialties.map(async (specialty) => ({
    ...specialty,
    normalized_name: normalize(specialty.nome),
    dependencies: await getDependencies(specialty.id)
  })));

  const groups = new Map();
  enriched.forEach((specialty) => {
    const key = semanticKey(specialty);
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(specialty);
  });

  const suspectGroups = [...groups.values()].filter((group) => group.length > 1);
  const confirmedGroups = [];

  console.log(`Modo: ${mode}`);
  console.log(`Grupos suspeitos: ${suspectGroups.length}`);

  for (const group of suspectGroups) {
    const canonical = chooseCanonical(group);
    const confirmed = isConfirmedDuplicate(group, canonical);
    if (confirmed) confirmedGroups.push({ group, canonical });

    console.log('');
    console.log(`Grupo: ${group[0].taxonomy_specialty_key || group[0].normalized_name} | categoria=${group[0].taxonomy_category_key || 'null'} | tenant=${group[0].tenant?.slug || group[0].tenant_id || 'GLOBAL'} | confirmado=${confirmed ? 'sim' : 'nao'}`);
    console.log(`Canonica proposta: ${canonical.id} (${canonical.nome})`);
    group.forEach((specialty) => {
      console.log([
        `- ${specialty.id}`,
        `nome=${specialty.nome}`,
        `cargo=${specialty.cargo?.nome || specialty.cargo_id || 'null'}`,
        `ativa=${specialty.ativo}`,
        `deleted=${specialty.deleted_at ? 'sim' : 'nao'}`,
        `oficial=${specialty.is_official}`,
        `deps=${JSON.stringify(specialty.dependencies)}`
      ].join(' | '));
    });
  }

  console.log('');
  console.log(`Grupos confirmados para reconciliacao: ${confirmedGroups.length}`);

  if (!shouldApply) return;

  const now = new Date().toISOString();
  const summary = {
    professionalLinksUpdated: 0,
    professionalLinksDeactivated: 0,
    professionalServiceLinksUpserted: 0,
    specialtiesDeactivated: []
  };

  for (const { group, canonical } of confirmedGroups) {
    const legacyIds = group
      .filter((specialty) => specialty.id !== canonical.id && specialty.dependencies.profissional_especialidades > 0)
      .map((specialty) => specialty.id);
    const links = await loadProfessionalLinks(legacyIds);

    for (const link of links) {
      const result = await reconcileProfessionalSpecialtyLink(link, canonical.id, now);
      if (result === 'updated_professional_link') summary.professionalLinksUpdated += 1;
      if (result === 'deactivated_duplicate_professional_link') summary.professionalLinksDeactivated += 1;
      summary.professionalServiceLinksUpserted += await ensureProfessionalServiceSpecialties(link, canonical.id);
    }
  }

  for (const { group } of confirmedGroups) {
    const canonical = chooseCanonical(group);
    for (const specialty of group) {
      if (specialty.id === canonical.id) continue;
      const deactivated = await maybeDeactivateSpecialty(specialty, now);
      if (deactivated) summary.specialtiesDeactivated.push(specialty.id);
    }
  }

  console.log('');
  console.log('Resumo apply:');
  console.log(JSON.stringify(summary, null, 2));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
