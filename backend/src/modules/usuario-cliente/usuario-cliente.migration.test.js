const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const { PGlite } = require('@electric-sql/pglite');
test('migration enforces relationship, uniqueness, states and denies untrusted writes without backfill', async () => {
  const db = new PGlite();
  try {
    await db.exec(`create role anon; create role authenticated; create role service_role;
      create table usuarios(id uuid primary key); create table clientes(id uuid primary key);
      create table tenants(id uuid primary key);
      create table cliente_tenants(tenant_id uuid references tenants,cliente_id uuid references clientes,unique(tenant_id,cliente_id));
      insert into usuarios values('00000000-0000-4000-8000-000000000001');
      insert into clientes values('00000000-0000-4000-8000-000000000002');
      insert into tenants values('00000000-0000-4000-8000-000000000003'),('00000000-0000-4000-8000-000000000004');`);
    await db.exec(fs.readFileSync(path.resolve(__dirname, '../../../../supabase/migrations/20261002100000_usuario_cliente.sql'), 'utf8'));
    assert.equal((await db.query('select count(*)::int n from usuario_cliente')).rows[0].n, 0);
    const insert = `insert into usuario_cliente(usuario_id,cliente_id,tenant_id) values('00000000-0000-4000-8000-000000000001','00000000-0000-4000-8000-000000000002','00000000-0000-4000-8000-000000000003')`;
    await assert.rejects(db.exec(insert), /foreign key/);
    await db.exec(`insert into cliente_tenants select id,'00000000-0000-4000-8000-000000000002'::uuid from tenants`);
    await db.exec(insert);
    await assert.rejects(db.exec(insert), /unique/);
    await db.exec(insert.replace(/000000000003/g, '000000000004'));
    assert.deepEqual((await db.query('select distinct status_verificacao,origem_vinculo from usuario_cliente')).rows,
      [{ status_verificacao: 'pendente', origem_vinculo: 'telefone_coincidente' }]);
    await assert.rejects(db.exec("update usuario_cliente set status_verificacao='invalido'"), /check/);
    await db.exec("update usuario_cliente set status_verificacao='revogado'");
    await db.exec(insert + ' on conflict(usuario_id,cliente_id,tenant_id) do nothing');
    assert.equal((await db.query("select count(*)::int n from usuario_cliente where status_verificacao='revogado'")).rows[0].n, 2);
    await db.exec('set role authenticated');
    await assert.rejects(db.exec(insert), /permission denied/);
    await db.exec('reset role');
  } finally { await db.close(); }
});
