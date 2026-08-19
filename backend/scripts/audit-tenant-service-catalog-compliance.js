require('dotenv').config();

const { createClient } = require('@supabase/supabase-js');
global.WebSocket = require('ws');

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error('SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY sao obrigatorios.');
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false }
});

function argValue(name) {
  const prefix = `${name}=`;
  const item = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

function hasFlag(name) {
  return process.argv.slice(2).includes(name);
}

async function main() {
  const tenantId = argValue('--tenant-id');
  const onlyInvalid = hasFlag('--only-invalid');

  let tenantsQuery = supabase
    .from('tenants')
    .select('id, nome_fantasia, slug, status, ativo');
  if (tenantId) tenantsQuery = tenantsQuery.eq('id', tenantId);
  const { data: tenants, error: tenantsError } = await tenantsQuery;
  if (tenantsError) {
    console.error(JSON.stringify({ ok: false, error: tenantsError.message }, null, 2));
    process.exit(1);
  }

  let offersQuery = supabase
    .from('servico_tenants')
    .select(`
      id,
      tenant_id,
      servico_catalogo_id,
      ativo,
      servico_catalogo:servicos_catalogo(id,nome,codigo_canonico,ativo)
    `);
  if (tenantId) offersQuery = offersQuery.eq('tenant_id', tenantId);
  const { data: offers, error: offersError } = await offersQuery;
  if (offersError) {
    console.error(JSON.stringify({ ok: false, error: offersError.message }, null, 2));
    process.exit(1);
  }

  const tenantIds = (tenants || []).map((tenant) => tenant.id);
  const { data: tenantTypes, error: typesError } = await supabase
    .from('tenant_tipos_negocio')
    .select('tenant_id, tipo_negocio_id, principal, ativo, tipo_negocio:tipos_negocio(id,nome,slug,ativo)')
    .in('tenant_id', tenantIds.length ? tenantIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('ativo', true);
  if (typesError) {
    console.error(JSON.stringify({ ok: false, error: typesError.message }, null, 2));
    process.exit(1);
  }

  const activeTypes = (tenantTypes || []).filter((item) => item.tipo_negocio?.ativo !== false);
  const typeIds = [...new Set(activeTypes.map((item) => item.tipo_negocio_id))];
  const { data: associations, error: associationsError } = await supabase
    .from('tipo_negocio_servicos_catalogo')
    .select('tipo_negocio_id, servico_catalogo_id, ativo')
    .in('tipo_negocio_id', typeIds.length ? typeIds : ['00000000-0000-0000-0000-000000000000'])
    .eq('ativo', true);
  if (associationsError) {
    console.error(JSON.stringify({ ok: false, error: associationsError.message }, null, 2));
    process.exit(1);
  }

  const tenantById = new Map((tenants || []).map((tenant) => [tenant.id, tenant]));
  const typesByTenant = new Map();
  for (const item of activeTypes) {
    const current = typesByTenant.get(item.tenant_id) || [];
    current.push(item);
    typesByTenant.set(item.tenant_id, current);
  }

  const associationSet = new Set((associations || []).map((item) => `${item.tipo_negocio_id}:${item.servico_catalogo_id}`));
  const allRows = (offers || []).map((offer) => {
    const tenant = tenantById.get(offer.tenant_id);
    const relatedTypes = (typesByTenant.get(offer.tenant_id) || []).filter((type) => (
      associationSet.has(`${type.tipo_negocio_id}:${offer.servico_catalogo_id}`)
    ));
    const permitido = relatedTypes.length > 0 && offer.servico_catalogo?.ativo !== false;
    return {
      tenant_id: offer.tenant_id,
      nome_fantasia: tenant?.nome_fantasia || null,
      tenant_slug: tenant?.slug || null,
      servico_tenant_id: offer.id,
      oferta_ativa: offer.ativo !== false,
      servico_catalogo_id: offer.servico_catalogo_id,
      servico_nome: offer.servico_catalogo?.nome || null,
      codigo_canonico: offer.servico_catalogo?.codigo_canonico || null,
      catalogo_ativo: offer.servico_catalogo?.ativo !== false,
      tipos_relacionados: relatedTypes.map((type) => ({
        id: type.tipo_negocio_id,
        nome: type.tipo_negocio?.nome,
        slug: type.tipo_negocio?.slug,
        principal: type.principal === true
      })),
      permitido,
      motivo: permitido
        ? 'ok'
        : !(typesByTenant.get(offer.tenant_id) || []).length
          ? 'tenant_sem_tipo_ativo'
          : offer.servico_catalogo?.ativo === false
            ? 'servico_catalogo_inativo'
            : 'sem_associacao_com_tipos_ativos'
    };
  }).sort((a, b) => String(a.nome_fantasia).localeCompare(String(b.nome_fantasia)) || Number(a.permitido) - Number(b.permitido));

  const rows = onlyInvalid
    ? allRows.filter((row) => row.permitido === false)
    : allRows;

  console.log(JSON.stringify({
    ok: true,
    tenant_id: tenantId || null,
    total: allRows.length,
    incompativeis: allRows.filter((row) => row.permitido === false).length,
    incompatíveis: rows.filter((row) => row.permitido === false).length,
    rows
  }, null, 2));
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
