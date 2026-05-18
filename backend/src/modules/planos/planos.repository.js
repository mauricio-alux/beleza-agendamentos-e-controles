const { supabaseAdmin } = require('../../config/supabase');

async function findActive() {
  const { data, error } = await supabaseAdmin
    .from('planos')
    .select('*')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('preco_mensal', { ascending: true });

  if (error) {
    throw error;
  }

  return data;
}

async function findActiveById(id) {
  const { data, error } = await supabaseAdmin
    .from('planos')
    .select('*')
    .eq('id', id)
    .eq('ativo', true)
    .is('deleted_at', null)
    .single();

  if (error) {
    return null;
  }

  return data;
}

module.exports = {
  findActive,
  findActiveById
};
