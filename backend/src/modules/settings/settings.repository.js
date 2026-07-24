const { supabaseAdmin } = require('../../config/supabase');

function isMissingBusinessTypeColumn(error) {
  return ['42703', 'PGRST204'].includes(error?.code);
}

function isMissingOperationSecurityColumn(error) {
  return ['42703', 'PGRST204'].includes(error?.code);
}

async function findUsuarioById(tenantId, usuarioId) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .select('*')
    .eq('id', usuarioId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateUsuario(tenantId, usuarioId, payload) {
  const { data, error } = await supabaseAdmin
    .from('usuarios')
    .update(payload)
    .eq('id', usuarioId)
    .select()
    .single();

  if (error) throw error;
  return data;
}

async function findTenantById(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('tenants')
    .select('*')
    .eq('id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateTenant(tenantId, payload) {
  let { data, error } = await supabaseAdmin
    .from('tenants')
    .update(payload)
    .eq('id', tenantId)
    .is('deleted_at', null)
    .select()
    .single();

  if (isMissingBusinessTypeColumn(error) && Object.prototype.hasOwnProperty.call(payload, 'business_type')) {
    const fallbackPayload = { ...payload };
    fallbackPayload.tipo_negocio = fallbackPayload.business_type;
    delete fallbackPayload.business_type;

    const fallbackResponse = await supabaseAdmin
      .from('tenants')
      .update(fallbackPayload)
      .eq('id', tenantId)
      .is('deleted_at', null)
      .select()
      .single();

    data = fallbackResponse.data;
    error = fallbackResponse.error;
  }

  if (error) throw error;
  return data;
}

async function findOperationSettings(tenantId) {
  const { data, error } = await supabaseAdmin
    .from('configuracoes_tenant')
    .select('*')
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .maybeSingle();

  if (error) throw error;
  return data;
}

async function updateOperationSettings(tenantId, payload) {
  let { data, error } = await supabaseAdmin
    .from('configuracoes_tenant')
    .update(payload)
    .eq('tenant_id', tenantId)
    .is('deleted_at', null)
    .select()
    .single();

  if (isMissingOperationSecurityColumn(error)) {
    const securityKeys = [
      'confirmation_policy',
      'attendant_confirmation_timeout_minutes',
      'client_confirmation_timeout_minutes',
      'weekly_booking_limit',
      'block_when_weekly_limit_exceeded'
    ];
    const basePayload = { ...payload };
    const agendaSecurity = {};

    securityKeys.forEach((key) => {
      if (Object.prototype.hasOwnProperty.call(basePayload, key)) {
        agendaSecurity[key] = basePayload[key];
        delete basePayload[key];
      }
    });

    const current = await findOperationSettings(tenantId);
    const fallbackPayload = {
      ...basePayload,
      configuracoes_ia: {
        ...(current?.configuracoes_ia || {}),
        agenda_security: {
          ...(current?.configuracoes_ia?.agenda_security || {}),
          ...agendaSecurity
        }
      }
    };

    const fallbackResponse = await supabaseAdmin
      .from('configuracoes_tenant')
      .update(fallbackPayload)
      .eq('tenant_id', tenantId)
      .is('deleted_at', null)
      .select()
      .single();

    data = fallbackResponse.data;
    error = fallbackResponse.error;
  }

  if (error) throw error;
  return data;
}

async function createSettingsAudit(rows) {
  if (!rows.length) return [];

  const { data, error } = await supabaseAdmin
    .from('tenant_settings_audit')
    .insert(rows)
    .select();

  if (error) throw error;
  return data;
}

module.exports = {
  findUsuarioById,
  updateUsuario,
  findTenantById,
  updateTenant,
  findOperationSettings,
  updateOperationSettings,
  createSettingsAudit
};
