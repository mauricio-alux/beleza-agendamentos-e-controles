const { supabaseAdmin } = require('../../config/supabase');

const AUTOMATION_SELECT = `
  *,
  tenant:tenants(id, nome_fantasia, slug),
  template:templates_mensagem(id, tenant_id, nome, canal, tipo, conteudo, variaveis, aprovado_provider, metadata, ativo)
`;

async function listActiveBirthdayGreetingAutomations(limit = 100) {
  const { data, error } = await supabaseAdmin
    .from('tenant_automacoes_relacionamento')
    .select(AUTOMATION_SELECT)
    .eq('tipo', 'birthday_greeting')
    .eq('canal', 'whatsapp')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('updated_at', { ascending: true })
    .limit(limit);

  if (error) throw error;
  return data || [];
}

async function updateAutomationRun(id, payload) {
  if (!id) return null;

  const { data, error } = await supabaseAdmin
    .from('tenant_automacoes_relacionamento')
    .update({
      ...payload,
      updated_at: new Date().toISOString()
    })
    .eq('id', id)
    .select(AUTOMATION_SELECT)
    .single();

  if (error) throw error;
  return data;
}

module.exports = {
  listActiveBirthdayGreetingAutomations,
  updateAutomationRun
};
