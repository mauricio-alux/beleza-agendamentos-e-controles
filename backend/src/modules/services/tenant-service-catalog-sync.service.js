const { supabaseAdmin } = require('../../config/supabase');

function unique(values) {
  return [...new Set((values || []).filter(Boolean))];
}

async function listTargetTenants(filters = {}) {
  let query = supabaseAdmin
    .from('tenants')
    .select('id, nome_fantasia, slug, ativo, deleted_at')
    .eq('ativo', true)
    .is('deleted_at', null);

  if (filters.tenantId) {
    query = query.eq('id', filters.tenantId);
  }

  if (filters.tipoNegocioIds?.length) {
    const { data: links, error: linksError } = await supabaseAdmin
      .from('tenant_tipos_negocio')
      .select('tenant_id')
      .in('tipo_negocio_id', unique(filters.tipoNegocioIds))
      .eq('ativo', true);
    if (linksError) throw linksError;
    const tenantIds = unique((links || []).map((item) => item.tenant_id));
    if (!tenantIds.length) return [];
    query = query.in('id', tenantIds);
  }

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function listAllowedCatalogIds(tenantId) {
  const { data: tenantTypes, error: typesError } = await supabaseAdmin
    .from('tenant_tipos_negocio')
    .select('tipo_negocio_id, tipo_negocio:tipos_negocio(id, ativo)')
    .eq('tenant_id', tenantId)
    .eq('ativo', true);
  if (typesError) throw typesError;

  const typeIds = unique((tenantTypes || [])
    .filter((item) => item.tipo_negocio?.ativo !== false)
    .map((item) => item.tipo_negocio_id));

  if (!typeIds.length) return [];

  const { data, error } = await supabaseAdmin
    .from('tipo_negocio_servicos_catalogo')
    .select('servico_catalogo_id, servico_catalogo:servicos_catalogo(id, ativo)')
    .in('tipo_negocio_id', typeIds)
    .eq('ativo', true);
  if (error) throw error;

  return unique((data || [])
    .filter((item) => item.servico_catalogo?.ativo !== false)
    .map((item) => item.servico_catalogo_id));
}

async function listTenantOffers(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('servico_tenants')
    .select('id, tenant_id, servico_catalogo_id, ativo, metadata, servico_catalogo:servicos_catalogo(id, nome, codigo_canonico, ativo)')
    .eq('tenant_id', tenantId);
  if (error) throw error;
  return data || [];
}

async function syncTenant(tenantId, options = {}) {
  const allowedCatalogIds = await listAllowedCatalogIds(tenantId);
  const existingOffers = await listTenantOffers(tenantId);
  const existingCatalogIds = new Set(existingOffers.map((item) => item.servico_catalogo_id));
  const missingCatalogIds = allowedCatalogIds.filter((id) => !existingCatalogIds.has(id));

  if (options.apply !== false && missingCatalogIds.length) {
    const { error } = await supabaseAdmin
      .from('servico_tenants')
      .insert(missingCatalogIds.map((servicoCatalogoId) => ({
        tenant_id: tenantId,
        servico_catalogo_id: servicoCatalogoId,
        ativo: false,
        metadata: {
          source: 'tenant_service_catalog_sync',
          sync_reason: options.reason || 'catalog_availability'
        }
      })));
    if (error) throw error;
  }

  return {
    tenant_id: tenantId,
    allowed_catalog_total: allowedCatalogIds.length,
    existing_total: existingOffers.length,
    missing_total: missingCatalogIds.length,
    created_total: options.apply === false ? 0 : missingCatalogIds.length,
    missing_catalog_ids: missingCatalogIds
  };
}

async function auditTenant(tenantId) {
  const allowedCatalogIds = await listAllowedCatalogIds(tenantId);
  const allowed = new Set(allowedCatalogIds);
  const offers = await listTenantOffers(tenantId);
  const byCatalog = new Map();
  for (const offer of offers) {
    byCatalog.set(offer.servico_catalogo_id, (byCatalog.get(offer.servico_catalogo_id) || 0) + 1);
  }

  const missing = allowedCatalogIds.filter((id) => !byCatalog.has(id));
  const duplicated = offers.filter((offer) => byCatalog.get(offer.servico_catalogo_id) > 1);
  const incompatible = offers.filter((offer) => !allowed.has(offer.servico_catalogo_id) || offer.servico_catalogo?.ativo === false);

  return {
    tenant_id: tenantId,
    allowed_catalog_total: allowedCatalogIds.length,
    offers_total: offers.length,
    missing_total: missing.length,
    duplicated_total: duplicated.length,
    incompatible_total: incompatible.length,
    missing_catalog_ids: missing,
    duplicated: duplicated.map((offer) => ({
      servico_tenant_id: offer.id,
      servico_catalogo_id: offer.servico_catalogo_id,
      servico_nome: offer.servico_catalogo?.nome || null
    })),
    incompatible: incompatible.map((offer) => ({
      servico_tenant_id: offer.id,
      servico_catalogo_id: offer.servico_catalogo_id,
      servico_nome: offer.servico_catalogo?.nome || null,
      oferta_ativa: offer.ativo !== false
    }))
  };
}

async function runForTenants(tenants, options = {}) {
  const reports = [];
  for (const tenant of tenants) {
    reports.push(options.auditOnly ? await auditTenant(tenant.id) : await syncTenant(tenant.id, options));
  }
  return reports;
}

async function syncAllTenants(options = {}) {
  return runForTenants(await listTargetTenants(), options);
}

async function syncTenantById(tenantId, options = {}) {
  return syncTenant(tenantId, options);
}

async function syncTenantsByTypeIds(tipoNegocioIds, options = {}) {
  return runForTenants(await listTargetTenants({ tipoNegocioIds }), options);
}

async function auditAllTenants(filters = {}) {
  return runForTenants(await listTargetTenants(filters), { auditOnly: true });
}

async function reconcile({ mode = 'audit', tenantId = null } = {}) {
  const tenants = await listTargetTenants({ tenantId });
  if (mode === 'audit') return runForTenants(tenants, { auditOnly: true });
  if (mode === 'apply') return runForTenants(tenants, { reason: 'official_reconciliation' });
  if (mode === 'validate') return runForTenants(tenants, { auditOnly: true });
  throw new Error('Modo invalido. Use audit, apply ou validate.');
}

module.exports = {
  auditAllTenants,
  auditTenant,
  reconcile,
  syncAllTenants,
  syncTenant: syncTenantById,
  syncTenantsByTypeIds
};
