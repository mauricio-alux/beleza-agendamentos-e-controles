const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const { createRequire } = require('node:module');
const path = require('node:path');
const repo = require('./clients.repository');
const service = require('./clients.service');
const identity = require('../public-booking/client-identity.service');
const { createClientSchema, updateClientSchema } = require('./clients.validators');
const { supabaseAdmin } = require('../../config/supabase');
const valid = { nome: 'Fixture', telefone: '+5516999999999', data_nascimento: '1990-05-15' };
afterEach(() => mock.restoreAll());
function fixture(birth = null, shared = false) {
  mock.method(supabaseAdmin, 'from', () => { throw Error('Unexpected database access'); });
  mock.method(global, 'fetch', async () => { throw Error('Unexpected network'); });
  for (const key of Object.keys(identity)) if (typeof identity[key] === 'function') mock.method(identity, key, () => { throw Error('Unexpected TC operation'); });
  const client = { id: 'client', nome: 'Fixture', telefone: valid.telefone, data_nascimento: birth, email: 'saved@example.test', observacoes: 'saved', ativo: true, metadata: { keep: true, endereco: { cep: '14000000', cidade: 'Saved' } } };
  const link = { id: 'link', cliente_id: client.id, tenant_id: 'tenant', status: 'ativo', ativo: true, aceita_campanhas: false, cliente: client };
  const writes = [];
  mock.method(repo, 'findTenantLink', async (tenant, id) => tenant === 'tenant' && id === 'client' ? link : null);
  mock.method(repo, 'findClientByPhone', async () => null);
  mock.method(repo, 'hasOtherTenantLinks', async () => shared);
  mock.method(repo, 'updateClient', async (id, payload) => { writes.push(['client', structuredClone(payload)]); Object.assign(client, payload); return client; });
  mock.method(repo, 'updateTenantLink', async (tenant, id, payload) => { writes.push(['link', structuredClone(payload)]); Object.assign(link, payload); return link; });
  mock.method(repo, 'createClient', async payload => { writes.push(['create', structuredClone(payload)]); Object.assign(client, payload); return client; });
  mock.method(repo, 'createTenantLink', async (tenant, id, payload) => { writes.push(['link-create', structuredClone(payload)]); Object.assign(link, payload); return link; });
  return { client, link, writes };
}
for (const birth of [undefined, null, '', '1990-02-30', '1900-02-29', '2999-01-01', '15/05/1990']) {
  test('CREATE rejects invalid/missing birth: ' + String(birth), async () => {
    const f = fixture();
    await assert.rejects(service.create('tenant', { ...valid, data_nascimento: birth }));
    assert.equal(f.writes.length, 0);
  });
}
test('CREATE persists birth, normal link and explicit consent; no TC', async () => {
  const f = fixture();
  const result = await service.create('tenant', { ...valid, aceita_campanhas: false });
  assert.equal(result.data_nascimento, valid.data_nascimento);
  assert.equal(f.writes[0][1].data_nascimento, valid.data_nascimento);
  assert.equal(f.writes[1][1].aceita_campanhas, false);
  assert.equal(f.writes[1][1].origem, 'dashboard');
});
for (const before of [null, '1991-01-01']) test('PATCH birth only preserves all other state: ' + before, async () => {
  const f = fixture(before); const original = structuredClone(f.client); const link = JSON.stringify(f.link, (k,v) => k === 'cliente' ? undefined : v);
  await service.update('tenant', 'client', { data_nascimento: valid.data_nascimento });
  assert.deepEqual(f.writes, [['client', { data_nascimento: valid.data_nascimento }]]);
  assert.deepEqual(f.client, { ...original, data_nascimento: valid.data_nascimento });
  assert.equal(JSON.stringify(f.link, (k,v) => k === 'cliente' ? undefined : v), link);
});
for (const birth of [null, '', '1900-02-29', '2999-01-01']) test('PATCH rejects invalid birth without any write: '+birth, async () => {
  const f = fixture(valid.data_nascimento);
  await assert.rejects(service.update('tenant', 'client', { nome: 'Changed', data_nascimento: birth }));
  assert.equal(f.writes.length, 0);
});
for (const birth of [null, valid.data_nascimento]) test('PATCH another field preserves birth and omitted fields: '+birth, async () => {
  const f = fixture(birth, true);
  await service.update('tenant','client',{ email: 'new@example.test' });
  assert.deepEqual(f.writes,[['client',{email:'new@example.test'}]]);
  assert.equal(f.client.data_nascimento,birth);
});
test('PATCH nested address preserves omitted metadata/address', async () => {
  const f=fixture(); await service.update('tenant','client',{endereco:{numero:'12'}});
  assert.deepEqual(f.client.metadata,{keep:true,endereco:{cep:'14000000',cidade:'Saved',numero:'12'}});
  assert.equal(f.writes.length,1);
});
test('PATCH rejects foreign tenant', async () => {
  const f=fixture(); await assert.rejects(service.update('foreign','client',{data_nascimento:valid.data_nascimento}), e=>e.statusCode===404);
  assert.equal(f.writes.length,0);
});
test('Shared birth change blocks before all writes, with no tenant details', async () => {
  const f=fixture(null,true);
  await assert.rejects(service.update('tenant','client',{nome:'Changed',data_nascimento:valid.data_nascimento}), e=>e.code==='SHARED_CLIENT_BIRTH_DATE' && !e.details && !e.message.includes('tenant'));
  assert.equal(f.writes.length,0);
});
test('CREATE existing phone cannot bypass shared birth guard', async () => {
  const f=fixture(null,true); mock.method(repo,'findClientByPhone',async()=>f.client);
  await assert.rejects(service.create('tenant',valid),e=>e.code==='SHARED_CLIENT_BIRTH_DATE');
  assert.equal(f.writes.length,0);
});
test('Shared unchanged birth is a no-op; omitted fields not defaulted', async () => {
  const f=fixture(valid.data_nascimento,true);
  await service.update('tenant','client',{data_nascimento:valid.data_nascimento});
  await service.update('tenant','client',{});
  assert.equal(f.writes.length,0);
});
test('Schemas are strict, create required, PATCH optional', () => {
  assert.equal(createClientSchema.safeParse(valid).success,true);
  assert.equal(updateClientSchema.safeParse({}).success,true);
  assert.equal(updateClientSchema.safeParse({unknown:true}).success,false);
});
function isolatedFunction(file, name, overrides = {}) {
  const filename=path.resolve(__dirname,file), module={exports:{}}, req=createRequire(filename);
  vm.runInNewContext(fs.readFileSync(filename,'utf8')+'\nmodule.exports.auditFunction = '+name+';', {
    module,exports:module.exports,require:key=>key in overrides?overrides[key]:req(key),console,process,Buffer,Date,setTimeout,clearTimeout
  },{filename});
  return module.exports.auditFunction;
}
for (const birth of [undefined,null,'','2999-01-01','1990-02-30',valid.data_nascimento]) test('Agenda new birth '+birth, async () => {
  fixture();
  const calls=[];
  const resolve=isolatedFunction('../agenda/agenda.service.js','resolveClient',{
    './agenda.repository':{findClientByPhone:async()=>null,createClient:async(t,p)=>{calls.push(p);return {id:'fixture',...p};},updateClientIdentity:async()=>({})}
  });
  const request={cliente:{...valid,data_nascimento:birth}};
  if(birth===valid.data_nascimento) {const c=await resolve('tenant',request);assert.equal(c.data_nascimento,birth);assert.equal(calls[0].data_nascimento,birth);}
  else {await assert.rejects(resolve('tenant',request),e=>e.code==='CLIENT_BIRTH_DATE_REQUIRED');assert.equal(calls.length,0);}
});
for(const birth of [null,valid.data_nascimento]) for(const byId of [true,false]) test('Agenda existing accepts legacy; by ID='+byId+' birth='+birth,async()=>{
  fixture();const client={id:'existing',data_nascimento:birth,telefone:valid.telefone};
  const resolve=isolatedFunction('../agenda/agenda.service.js','resolveClient',{
    './agenda.repository':{findClientById:async()=>client,findClientByPhone:async()=>client,createClient:async()=>{throw Error('must not create');},updateClientIdentity:async()=>({})}
  });
  const result=await resolve('tenant',byId?{cliente_id:'existing'}:{cliente:{nome:'Existing',telefone:valid.telefone}});
  assert.equal(result.data_nascimento,birth);
});
test('Administrative persisted and regularized birth feeds existing birthday consumers',async()=>{
  const f=fixture();await service.create('tenant',valid);
  const month=isolatedFunction('../campaigns/campaigns.service.js','birthMonthFromDateOnly');
  const {birthdayMatchesLocalDate}=require('../automations/birthday-greeting.service');
  assert.equal(month(f.client.data_nascimento),5);
  assert.equal(birthdayMatchesLocalDate(f.client.data_nascimento,{year:2026,month:5,day:15}),true);
  f.client.data_nascimento=null;
  await service.update('tenant','client',{data_nascimento:valid.data_nascimento});
  assert.equal(month(f.client.data_nascimento),5);
  assert.equal(birthdayMatchesLocalDate(null,{year:2026,month:5,day:15}),false);
});
