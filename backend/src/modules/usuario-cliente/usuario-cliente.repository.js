const { supabaseAdmin: db } = require('../../config/supabase');
async function all(table, columns) {
  const rows = [];
  for (let offset = 0; ; offset += 1000) {
    const { data, error } = await db.from(table).select(columns).order('id').range(offset, offset + 999);
    if (error) throw error;
    rows.push(...data);
    if (data.length < 1000) return rows;
  }
}
async function candidates() {
  const [users, clients, links] = await Promise.all([
    all('usuarios', 'id,telefone,ativo,deleted_at'),
    all('clientes', 'id,telefone,ativo,deleted_at'),
    all('cliente_tenants', 'id,cliente_id,tenant_id,ativo,status,deleted_at')
  ]);
  return { users, clients, links };
}
async function insertPending(rows) {
  if (!rows.length) return;
  const { error } = await db.from('usuario_cliente').upsert(rows, {
    onConflict: 'usuario_id,cliente_id,tenant_id', ignoreDuplicates: true
  });
  if (error) throw error;
}
async function associations(userId) {
  const { data, error } = await db.from('usuario_cliente').select('id,usuario_id,cliente_id,tenant_id,status_verificacao')
    .eq('usuario_id', userId).in('status_verificacao', ['pendente', 'verificado']);
  if (error) throw error;
  return data || [];
}
module.exports = { candidates, insertPending, associations };
