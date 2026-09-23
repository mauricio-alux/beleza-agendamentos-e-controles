const { test, before, after, beforeEach } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { PGlite } = require('@electric-sql/pglite');
const db = new PGlite();
const tenant = '11111111-1111-4111-8111-111111111111';
const link = '22222222-2222-4222-8222-222222222222';
const phone = '+5516999999999';
const birth = '1990-01-01';
const migration = name => fs.readFileSync(path.resolve(__dirname, '../../../../supabase/migrations', name), 'utf8');
before(async () => {
  await db.exec(`
    create role anon; create role authenticated; create role service_role;
    create table tenants(id uuid primary key, ativo boolean default true, status text default 'trial', deleted_at timestamptz);
    create table links_agendamento(id uuid primary key,tenant_id uuid references tenants,ativo boolean default true,acesso_publico boolean default true,deleted_at timestamptz,expira_em timestamptz);
    create table clientes(id uuid primary key default gen_random_uuid(),nome text,telefone text,email text,data_nascimento date,metadata jsonb default '{}'::jsonb,ativo boolean default true,deleted_at timestamptz);
    create table cliente_tenants(tenant_id uuid references tenants,cliente_id uuid references clientes,nome_no_tenant text,origem text,metadata jsonb default '{}'::jsonb,status text default 'ativo',ativo boolean default true,deleted_at timestamptz,data_primeiro_acesso timestamptz,data_ultimo_acesso timestamptz,updated_at timestamptz,unique(tenant_id,cliente_id));
    create table tokens_cliente(id uuid default gen_random_uuid(),tenant_id uuid references tenants,cliente_id uuid references clientes,token_hash text unique,tipo text,expira_em timestamptz,origem text,metadata jsonb default '{}'::jsonb,ativo boolean default true,deleted_at timestamptz);
    create table campanhas(id uuid primary key default gen_random_uuid(),tenant_id uuid references tenants,slug text,nome text,ativo boolean default true,deleted_at timestamptz);
    create table campanha_acessos(id uuid default gen_random_uuid(),tenant_id uuid references tenants,link_agendamento_id uuid references links_agendamento,campanha_id uuid references campanhas,cliente_id uuid references clientes,campanha_chave text,evento text,origem text,sessao_id text,metadata jsonb not null default '{}'::jsonb);
    create function identify_public_booking_client(text) returns text language sql security definer as 'select $1';
    grant execute on function identify_public_booking_client(text) to anon,authenticated;
  `);
  for (let repeat=0;repeat<2;repeat++) {
    await db.exec(migration('20260917100000_restrict_public_booking_identity_rpc.sql'));
    await db.exec(migration('20260917101000_public_booking_identity_birth.sql'));
  }
});
after(()=>db.close());
beforeEach(async()=>{
  await db.exec('truncate campanha_acessos,campanhas,tokens_cliente,cliente_tenants,clientes,links_agendamento,tenants cascade');
  await db.query('insert into tenants(id) values($1)',[tenant]);
  await db.query('insert into links_agendamento(id,tenant_id) values($1,$2)',[link,tenant]);
});
async function identify(overrides={}) {
  const input={tenant,link,phone,birth,name:'Original',email:'original@example.test',hash:crypto.randomBytes(32).toString('hex'),lookup:false,campaign:null,origin:'link_agendamento',session:null,metadata:{},fingerprint:null,...overrides};
  const result=await db.query('select identify_public_booking_client_v2($1,$2,$3,$4,$5,$6,$7,now()+interval \'180 days\',$8,$9,$10,$11,$12,$13) result',
    [input.tenant,input.link,input.phone,input.birth,input.name,input.email,input.hash,input.lookup,input.campaign,input.origin,input.session,input.metadata,input.fingerprint]);
  return result.rows[0].result;
}
const count = async table => Number((await db.query(`select count(*) n from ${table}`)).rows[0].n);
test('new registration persists birth and issues one scoped credential',async()=>{
  const result=await identify(); assert.equal(result.recognized,false);
  const client=(await db.query('select nome,data_nascimento::text from clientes')).rows[0];
  assert.deepEqual(client,{nome:'Original',data_nascimento:birth}); assert.equal(await count('tokens_cliente'),1);
});
test('repeat pair is additive and does not overwrite name/email or invalidate prior token',async()=>{
  const originalHash='a'.repeat(64); const first=await identify({hash:originalHash});
  const second=await identify({name:'Different',email:'other@example.test'});
  assert.equal(second.recognized,true);assert.equal(second.client_id,first.client_id);
  assert.equal(await count('clientes'),1);assert.equal(await count('tokens_cliente'),2);
  assert.equal((await db.query('select ativo from tokens_cliente where token_hash=$1',[originalHash])).rows[0].ativo,true);
  assert.deepEqual((await db.query('select nome,email from clientes')).rows[0],{nome:'Original',email:'original@example.test'});
});
test('wrong birth and NULL existing birth cannot assume existing client',async()=>{
  await identify();
  await assert.rejects(identify({birth:'1991-01-01'}),/PHONE_EXISTS_BIRTHDATE_MISMATCH/);
  await db.exec('update clientes set data_nascimento=null');
  await assert.rejects(identify(),/PHONE_EXISTS_BIRTHDATE_MISSING/);
  assert.equal((await db.query('select data_nascimento from clientes')).rows[0].data_nascimento,null);
  assert.equal(await count('tokens_cliente'),1);assert.equal(await count('clientes'),1);
});
test('phone alone or nonexistent lookup never issues',async()=>{
  await assert.rejects(identify({birth:null}),/CLIENT_MATCH_UNAVAILABLE/);
  await assert.rejects(identify({lookup:true}),/CLIENT_MATCH_UNAVAILABLE/);
  assert.equal(await count('tokens_cliente'),0);assert.equal(await count('clientes'),0);
});
test('ambiguity fixture fails, does not select first or create another client',async()=>{
  await identify();
  const duplicate=(await db.query('insert into clientes(nome,telefone,data_nascimento) values($1,$2,$3) returning id',['Duplicate',phone,birth])).rows[0].id;
  await db.query('insert into cliente_tenants(tenant_id,cliente_id) values($1,$2)',[tenant,duplicate]);
  await assert.rejects(identify(),/AMBIGUOUS_CLIENT_MATCH/);
  assert.equal(await count('tokens_cliente'),1);assert.equal(await count('clientes'),2);
});

for (const duplicateBirth of ['1991-01-01', null]) test(`phone ambiguity precedes birth match (${duplicateBirth})`,async()=>{
  await identify();
  const duplicate=(await db.query('insert into clientes(nome,telefone,data_nascimento) values($1,$2,$3) returning id',['Duplicate',phone,duplicateBirth])).rows[0].id;
  await db.query('insert into cliente_tenants(tenant_id,cliente_id) values($1,$2)',[tenant,duplicate]);
  await assert.rejects(identify(),/AMBIGUOUS_CLIENT_MATCH/);
  await assert.rejects(identify({lookup:true}),/AMBIGUOUS_CLIENT_MATCH/);
  assert.equal(await count('tokens_cliente'),1);assert.equal(await count('clientes'),2);
});
for (const [name,sql] of [
  ['inactive client','update clientes set ativo=false'],['deleted client','update clientes set deleted_at=now()'],
  ['blocked relationship',"update cliente_tenants set status='bloqueado'"],['inactive relationship','update cliente_tenants set ativo=false'],
  ['deleted relationship','update cliente_tenants set deleted_at=now()'],['inactive tenant','update tenants set ativo=false'],
  ['suspended tenant',"update tenants set status='suspenso'"],['deleted tenant','update tenants set deleted_at=now()'],
  ['inactive link','update links_agendamento set ativo=false'],['private link','update links_agendamento set acesso_publico=false'],
  ['expired link',"update links_agendamento set expira_em=now()-interval '1 day'"]
]) test(`${name} cannot be reidentified or recreated`,async()=>{
  await identify(); await db.exec(sql);await assert.rejects(identify(),/CLIENT_MATCH_UNAVAILABLE/);
  assert.equal(await count('tokens_cliente'),1);assert.equal(await count('clientes'),1);
});
test('selected tenant/link cannot be substituted',async()=>{
  await assert.rejects(identify({tenant:crypto.randomUUID()}),/CLIENT_MATCH_UNAVAILABLE/);
  await assert.rejects(identify({link:crypto.randomUUID()}),/CLIENT_MATCH_UNAVAILABLE/);
  assert.equal(await count('tokens_cliente'),0);
});
test('second tenant may keep an independent client ID for same pair',async()=>{
  const first=await identify(),other=crypto.randomUUID(),otherLink=crypto.randomUUID();
  await db.query('insert into tenants(id) values($1)',[other]);
  await db.query('insert into links_agendamento(id,tenant_id) values($1,$2)',[otherLink,other]);
  const second=await identify({tenant:other,link:otherLink}); assert.notEqual(first.client_id,second.client_id);
});
test('transaction rollback does not leave new client when token insertion fails',async()=>{
  const hash='b'.repeat(64);await identify({hash});
  await assert.rejects(identify({phone:'+5516888888888',hash}),/CLIENT_MATCH_UNAVAILABLE/);
  assert.equal(await count('clientes'),1);assert.equal(await count('cliente_tenants'),1);
});
test('queued concurrent calls yield one client and independent tokens (single PGlite connection)',async()=>{
  const values=await Promise.all([identify(),identify()]);assert.equal(values[0].client_id,values[1].client_id);
  assert.equal(await count('clientes'),1);assert.equal(await count('tokens_cliente'),2);
});
test('ACL migrations are idempotent and exclude anon/authenticated for old and new functions',async()=>{
  const rows=(await db.query(`select p.oid::regprocedure::text signature,
    has_function_privilege('anon',p.oid,'EXECUTE') anon,
    has_function_privilege('authenticated',p.oid,'EXECUTE') authenticated,
    has_function_privilege('service_role',p.oid,'EXECUTE') backend
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname like 'identify_public_booking_client%'`)).rows;
  assert.equal(rows.length,2);for(const row of rows){assert.equal(row.anon,false);assert.equal(row.authenticated,false);assert.equal(row.backend,true);}
});

async function campaign(slug='winter', tenantId=tenant) {
  return (await db.query('insert into campanhas(tenant_id,slug,nome) values($1,$2,$3) returning id',[tenantId,slug,'Winter campaign'])).rows[0].id;
}
test('campaign attribution for new and existing client is atomic and preserves historical metadata',async()=>{
  const campaignId=await campaign();
  const first=await identify({campaign:'winter',origin:'campanha',session:'session-a',metadata:{locale:'pt-BR'}});
  let event=(await db.query('select * from campanha_acessos')).rows[0];
  assert.equal(event.evento,'identificacao');assert.equal(event.campanha_id,campaignId);
  assert.equal(event.cliente_id,first.client_id);assert.equal(event.link_agendamento_id,link);
  assert.equal(event.origem,'campanha');assert.equal(event.sessao_id,'session-a');
  assert.deepEqual(event.metadata,{locale:'pt-BR'});
  assert.equal((await db.query('select metadata from clientes')).rows[0].metadata.origem_identificacao,'campanha');
  assert.equal((await db.query('select metadata from cliente_tenants')).rows[0].metadata.campanha_primeiro_acesso,'winter');
  await identify({campaign:'winter',origin:'campanha',name:'Other name'});
  const events=(await db.query('select evento from campanha_acessos')).rows.map(x=>x.evento).sort();
  assert.deepEqual(events,['identificacao','retorno']);assert.equal(await count('tokens_cliente'),2);
  assert.equal((await db.query('select metadata from cliente_tenants')).rows[0].metadata.campanha_ultimo_acesso,'winter');
  assert.equal((await db.query('select nome from clientes')).rows[0].nome,'Original');
});
test('no campaign and unknown campaign preserve events without inventing a campaign relation',async()=>{
  await identify();
  await identify({lookup:true,campaign:'unknown'});
  assert.equal(await count('tokens_cliente'),2);
  const events=(await db.query('select campanha_id,campanha_chave from campanha_acessos')).rows;
  assert.ok(events.every(x=>x.campanha_id===null));assert.equal(events[1].campanha_chave,'unknown');
});
test('campaign matching stays tenant scoped and accepts historical name fallback',async()=>{
  const other=crypto.randomUUID();await db.query('insert into tenants(id) values($1)',[other]);
  await campaign('foreign',other);
  await identify({campaign:'foreign'});
  assert.equal((await db.query('select campanha_id from campanha_acessos')).rows[0].campanha_id,null);
  const own=await campaign();
  await identify({campaign:'winter-campaign'});
  assert.equal((await db.query('select campanha_id from campanha_acessos where campanha_id is not null')).rows[0].campanha_id,own);
});
test('birth failure and ambiguity cannot use campaign as identity or produce attribution',async()=>{
  await campaign();await identify();
  await assert.rejects(identify({campaign:'winter',birth:'1991-01-01'}),/PHONE_EXISTS_BIRTHDATE_MISMATCH/);
  await assert.rejects(identify({campaign:crypto.randomUUID(),birth:null}),/CLIENT_MATCH_UNAVAILABLE/);
  const id=(await db.query('insert into clientes(nome,telefone,data_nascimento) values($1,$2,$3) returning id',['Duplicate',phone,birth])).rows[0].id;
  await db.query('insert into cliente_tenants(tenant_id,cliente_id) values($1,$2)',[tenant,id]);
  await assert.rejects(identify({campaign:'winter'}),/AMBIGUOUS_CLIENT_MATCH/);
  assert.equal(await count('tokens_cliente'),1);assert.equal(await count('campanha_acessos'),1);
});
test('same operation retry returns original result and expiry with one token/event',async()=>{
  await campaign();const hash='c'.repeat(64);
  const first=await identify({hash,campaign:'winter',fingerprint:'same'});
  const second=await identify({hash,campaign:'winter',fingerprint:'same'});
  assert.deepEqual(second,first);
  assert.equal(await count('clientes'),1);assert.equal(await count('tokens_cliente'),1);
  assert.equal(await count('campanha_acessos'),1);
  await assert.rejects(identify({hash,campaign:'changed',fingerprint:'changed'}),/CLIENT_MATCH_UNAVAILABLE/);
  assert.equal(await count('campanha_acessos'),1);
});
test('concurrent identical retries keep one attribution and reject revoked credential replay',async()=>{
  const input={hash:'d'.repeat(64),fingerprint:'same'};
  const results=await Promise.all([identify(input),identify(input)]);
  assert.deepEqual(results[0],results[1]);assert.equal(await count('campanha_acessos'),1);
  await db.exec('update tokens_cliente set ativo=false');
  await assert.rejects(identify(input),/CLIENT_MATCH_UNAVAILABLE/);
  assert.equal(await count('tokens_cliente'),1);assert.equal(await count('campanha_acessos'),1);
});
test('attribution failure rolls back identity, new token and metadata (not best effort)',async()=>{
  await db.exec("alter table campanha_acessos add constraint fixture_failure check (sessao_id is distinct from 'fail')");
  try {
    await assert.rejects(identify({session:'fail'}),/fixture_failure/);
    assert.equal(await count('clientes'),0);assert.equal(await count('tokens_cliente'),0);
    await identify();
    await assert.rejects(identify({session:'fail',campaign:'changed'}),/fixture_failure/);
    assert.equal(await count('tokens_cliente'),1);assert.equal(await count('campanha_acessos'),1);
    assert.equal((await db.query('select metadata from cliente_tenants')).rows[0].metadata.campanha_ultimo_acesso,undefined);
  } finally {await db.exec('alter table campanha_acessos drop constraint fixture_failure');}
});
