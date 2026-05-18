const { supabaseAdmin } = require('../../config/supabase');

async function create(payload) {
  const { data, error } = await supabaseAdmin
    .from('event_logs')
    .insert(payload)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data;
}

module.exports = {
  create
};
