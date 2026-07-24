const tenantsRepository = require('./tenants.repository');

async function getCurrentTenant(tenantId) {
  const tenant = await tenantsRepository.findById(tenantId);
  const settings = await tenantsRepository.findSettings(tenantId);

  return {
    tenant,
    settings
  };
}

async function getTenantSettings(tenantId) {
  const { tenant, settings } = await getCurrentTenant(tenantId);
  const tenantConfig = tenant.configuracoes || {};

  return {
    tenant_id: tenant.id,
    nome_fantasia: tenant.nome_fantasia,
    slug: tenant.slug,
    timezone: tenant.timezone,
    moeda: tenantConfig.moeda || 'BRL',
    idioma: tenantConfig.idioma || 'pt-BR',
    formato_agenda: tenantConfig.formato_agenda || 'semanal',
    horario_inicio_padrao: tenantConfig.horario_inicio_padrao || '09:00',
    horario_fim_padrao: tenantConfig.horario_fim_padrao || '18:00',
    intervalo_agendamento: tenantConfig.intervalo_agendamento || settings.intervalo_padrao_minutos,
    duracao_padrao_servico: tenantConfig.duracao_padrao_servico || 45,
    fl_whatsapp_ativo: Boolean(settings.configuracoes_whatsapp?.fl_whatsapp_ativo),
    fl_agendamento_online: tenantConfig.fl_agendamento_online !== false,
    status_onboarding: tenantConfig.status_onboarding || 'em_andamento',
    raw: {
      tenant,
      configuracoes_tenant: settings
    }
  };
}

async function updateCurrentTenant(tenantId, payload) {
  const allowed = [
    'nome_fantasia',
    'razao_social',
    'cpf_cnpj',
    'email',
    'telefone',
    'tipo_negocio',
    'logo_url',
    'timezone',
    'endereco',
    'configuracoes'
  ];

  const updatePayload = {};
  for (const key of allowed) {
    if (Object.prototype.hasOwnProperty.call(payload, key)) {
      updatePayload[key] = payload[key];
    }
  }

  return tenantsRepository.update(tenantId, updatePayload);
}

async function updateSettings(tenantId, usuarioId, payload) {
  const current = await tenantsRepository.findSettings(tenantId);
  const updated = await tenantsRepository.updateSettings(tenantId, payload);

  const auditRows = Object.keys(payload).map((campo) => ({
    tenant_id: tenantId,
    usuario_id: usuarioId,
    campo,
    valor_antigo: current[campo] === undefined ? null : current[campo],
    valor_novo: payload[campo] === undefined ? null : payload[campo]
  }));

  await tenantsRepository.createSettingsAudit(auditRows);

  return updated;
}

module.exports = {
  getCurrentTenant,
  getTenantSettings,
  updateCurrentTenant,
  updateSettings
};
