const {test,afterEach,mock}=require('node:test');
const assert=require('node:assert/strict');
const repo=require('./client-identity.repository');
const identity=require('./client-identity.service');
const bookingRepo=require('./public-booking.repository');
const booking=require('./public-booking.service');
const agenda=require('../agenda/agenda.service');
const validators=require('./public-booking.validators');
const pair={telefone:'+5516999999999',data_nascimento:'1990-01-01'};
const tenant={id:'tenant-a',nome_fantasia:'Studio A',ativo:true,status:'trial'};
const row={tenant_id:tenant.id,cliente_id:'client-a',ativo:true,status:'ativo',cliente:{ativo:true,nome:'Saved',telefone:pair.telefone,data_nascimento:pair.data_nascimento},tenant};
const link={id:'link-a',tenant_id:tenant.id,slug:'studio-a',ativo:true,acesso_publico:true};
afterEach(()=>mock.restoreAll());
function data(rows=[row],links=[link]){
  mock.method(repo,'discoverRelationships',async received=>{assert.deepEqual(received,pair);return rows;});
  mock.method(repo,'listPublicLinks',async()=>links);
}
test('C0 returns generic response and never issues',async()=>{
  data([]);mock.method(repo,'identifyWithBirth',async()=>{throw Error('issuance');});
  await assert.rejects(booking.locateAccess(pair),{code:'CLIENT_MATCH_UNAVAILABLE'});
});
test('CN only exposes public tenants, with no client identifiers or credentials',async()=>{
  data([row,{...row,tenant_id:'tenant-b',cliente_id:'client-b',tenant:{...tenant,id:'tenant-b',nome_fantasia:'Studio B'}}],
    [link,{...link,id:'link-b',tenant_id:'tenant-b',slug:'studio-b'}]);
  mock.method(repo,'identifyWithBirth',async()=>{throw Error('premature issuance');});
  assert.deepEqual(await booking.locateAccess(pair),{tenants:[{slug:'studio-a',displayName:'Studio A'},{slug:'studio-b',displayName:'Studio B'}]});
});
test('ambiguity fails uniformly with no subset/PII returned',async()=>{
  data([row,{...row,cliente_id:'another'}]);
  await assert.rejects(booking.locateAccess(pair),error=>error.code==='CLIENT_MATCH_UNAVAILABLE'&&!JSON.stringify(error).includes('another'));
});

test('discovery counts same-phone clients before comparing birth dates',async()=>{
  for(const birth of ['1991-01-01',null]) {
    data([row,{...row,cliente_id:'another',cliente:{...row.cliente,data_nascimento:birth}}]);
    await assert.rejects(identity.discoverAccess(pair),{code:'CLIENT_MATCH_UNAVAILABLE'});
    mock.restoreAll();
  }
});

test('discovery excludes birth mismatch and NULL without excluding an independent eligible tenant',async()=>{
  for(const birth of ['1991-01-01',null]) {
    data([{...row,cliente:{...row.cliente,data_nascimento:birth}}]);
    await assert.rejects(identity.discoverAccess(pair),{code:'CLIENT_MATCH_UNAVAILABLE'});
    mock.restoreAll();
    data([{...row,cliente:{...row.cliente,data_nascimento:birth}},
      {...row,tenant_id:'tenant-b',cliente_id:'client-b',tenant:{...tenant,id:'tenant-b',nome_fantasia:'Studio B'}}],
      [link,{...link,tenant_id:'tenant-b',slug:'studio-b'}]);
    assert.deepEqual(await identity.discoverAccess(pair),{tenants:[{slug:'studio-b',displayName:'Studio B'}]});
    mock.restoreAll();
  }
});

test('RPC business reasons have identical public errors and sanitized internal codes',async()=>{
  const {supabaseAdmin}=require('../../config/supabase');
  const reasons=['PHONE_EXISTS_BIRTHDATE_MISMATCH','PHONE_EXISTS_BIRTHDATE_MISSING','AMBIGUOUS_CLIENT_MATCH','CLIENT_MATCH_UNAVAILABLE'];
  const logs=[];
  mock.method(console,'info',(...args)=>logs.push(args));
  let reason;
  mock.method(supabaseAdmin,'rpc',async()=>({error:{message:reason}}));
  const errors=[];
  for(reason of reasons) {
    await assert.rejects(repo.identifyWithBirth(pair),error=>{
      errors.push({message:error.message,status:error.statusCode,code:error.code,details:error.details});return true;
    });
  }
  for(const error of errors) assert.deepEqual(error,errors[0]);
  assert.deepEqual(logs,reasons.map(result=>['[public-identity]',{result}]));
});
test('C1 revalidates scoped link and pair before additive issuance',async()=>{
  data();mock.method(bookingRepo,'findActiveLink',async slug=>{assert.equal(slug,link.slug);return link;});
  mock.method(bookingRepo,'findTenant',async()=>tenant);
  let writes=0;
  mock.method(repo,'identifyWithBirth',async input=>{
    assert.equal(input.tenantId,tenant.id);assert.equal(input.linkId,link.id);
    assert.equal(input.data_nascimento,pair.data_nascimento);assert.equal(input.lookupOnly,true);
    writes++;return {client_id:row.cliente_id,recognized:true};
  });
  mock.method(repo,'findClientContext',async()=>row);mock.method(repo,'listRecentAppointments',async()=>[]);
  const result=await booking.locateAccess(pair);assert.equal(result.slug,link.slug);assert.ok(result.identity.token);assert.equal(writes,1);
});
test('CN selection cannot substitute an unrelated tenant or bypass pair revalidation',async()=>{
  mock.method(bookingRepo,'findActiveLink',async()=>link);
  mock.method(bookingRepo,'findTenant',async()=>tenant);
  mock.method(repo,'identifyWithBirth',async input=>{
    assert.equal(input.lookupOnly,true);
    throw require('./identity-policy').denied();
  });
  await assert.rejects(booking.locateAccess({...pair,slug:'unrelated'}),{code:'CLIENT_MATCH_UNAVAILABLE'});
});
test('ineligible clients/relationships/tenants/links are never discovery candidates',async()=>{
  for(const change of [{ativo:false},{status:'bloqueado'},{cliente:{ativo:false}},{tenant:{...tenant,status:'suspenso'}}]){
    data([{...row,...change}]);await assert.rejects(identity.discoverAccess(pair),{code:'CLIENT_MATCH_UNAVAILABLE'});mock.restoreAll();
  }
  data([row],[{...link,expira_em:'2000-01-01'}]);await assert.rejects(identity.discoverAccess(pair),{code:'CLIENT_MATCH_UNAVAILABLE'});
});
test('upcoming passes only authorized client id even if another client has same phone',async()=>{
  mock.method(bookingRepo,'findActiveLink',async()=>link);mock.method(bookingRepo,'findTenant',async()=>tenant);
  mock.method(identity,'resolveClientIdentityForAppointment',async()=>({clientId:'authorized'}));
  mock.method(repo,'listClientIdsByPhone',async()=>{throw Error('expansion');});
  mock.method(agenda,'listUpcomingClientAppointments',async(t,ids)=>{assert.equal(t,tenant.id);assert.deepEqual(ids,['authorized']);return [{id:'own'}];});
  assert.deepEqual(await booking.getUpcomingClientAppointments(link.slug,{token:'valid'}),{appointments:[{id:'own'}]});
});
test('phone-only, missing/invalid/future birth cannot pass public request schemas',()=>{
  for(const data_nascimento of [undefined,null,'1900-02-29','2999-01-01']){
    assert.equal(validators.publicIdentityContextSchema.safeParse({lookup_only:true,cliente:{nome:'User',telefone:pair.telefone,data_nascimento}}).success,false);
    assert.equal(validators.locateAccessSchema.safeParse({telefone:pair.telefone,data_nascimento}).success,false);
  }
  assert.equal(validators.publicIdentityContextSchema.safeParse({token:'v'.repeat(32)}).success,true);
});
test('shared profile refuses base writes, consent remains tenant scoped',async()=>{
  mock.method(repo,'findToken',async()=>({id:'token',tenant_id:tenant.id,cliente_id:row.cliente_id,expira_em:'2999-01-01'}));
  mock.method(repo,'findClientContext',async()=>row);mock.method(repo,'touchIdentity',async()=>{});
  mock.method(repo,'listRecentAppointments',async()=>[]);mock.method(repo,'hasOtherTenantLinks',async()=>true);
  mock.method(repo,'findClientByPhone',async()=>({id:row.cliente_id}));
  mock.method(repo,'updateSelfProfile',async(t,c,payload)=>{assert.deepEqual(payload,{aceita_campanhas:false});return {...row,aceita_campanhas:false};});
  await assert.rejects(identity.updateSelfProfile(tenant.id,'token',{nome:'Changed'}),{code:'SHARED_CLIENT_PROFILE'});
  assert.equal((await identity.updateSelfProfile(tenant.id,'token',{aceita_campanhas:false})).aceita_campanhas,false);
  assert.equal((await identity.updateSelfProfile(tenant.id,'token',{
    nome:'Saved',email:null,telefone:pair.telefone,endereco:null,aceita_campanhas:false
  })).aceita_campanhas,false);
});

function bookingCatalog(){
  mock.method(bookingRepo,'findActiveLink',async()=>link);mock.method(bookingRepo,'findTenant',async()=>tenant);
  mock.method(bookingRepo,'listBookingProfessionals',async()=>[{id:'professional'}]);
  mock.method(bookingRepo,'listOnlineServices',async()=>[{id:'service',especialidades_config:[{especialidade_id:'specialty',duracao_minutos:30,preco:50}]}]);
  mock.method(bookingRepo,'listProfessionalSpecialties',async()=>[{profissional_id:'professional',especialidade_id:'specialty'}]);
  mock.method(bookingRepo,'listActiveMemberships',async()=>[]);
  mock.method(bookingRepo,'recordBookingAttribution',async()=>{});
}
test('direct public appointment without TC uses birth policy, never agenda phone lookup',async()=>{
  bookingCatalog();
  let issued=0;
  mock.method(repo,'identifyWithBirth',async input=>{
    assert.equal(input.data_nascimento,pair.data_nascimento);issued++;return {client_id:row.cliente_id,recognized:true};
  });
  mock.method(repo,'findClientContext',async()=>row);mock.method(repo,'listRecentAppointments',async()=>[]);
  mock.method(agenda,'create',async(t,user,input)=>{
    assert.equal(t,tenant.id);assert.equal(input.cliente_id,row.cliente_id);
    assert.equal(input.cliente,undefined);return {id:'appointment',cliente_id:row.cliente_id};
  });
  const input={profissional_id:'professional',servico_id:'service',especialidade_id:'specialty',cliente:{nome:'New input',...pair}};
  await booking.createAppointment(link.slug,input);assert.equal(issued,1);
  await assert.rejects(booking.createAppointment(link.slug,{...input,cliente:{nome:'New input',telefone:pair.telefone}}),{code:'CLIENT_MATCH_UNAVAILABLE'});
  assert.equal(issued,1);
});
test('direct public appointment with TC keeps exact authorized ID and never requests pair',async()=>{
  bookingCatalog();
  mock.method(identity,'resolveClientForAppointment',async(t,token)=>{assert.equal(token,'valid');return row.cliente_id;});
  mock.method(identity,'identify',async()=>{throw Error('unexpected pair flow');});
  mock.method(agenda,'create',async(t,user,input)=>{assert.equal(input.cliente_id,row.cliente_id);return {id:'appointment',cliente_id:row.cliente_id};});
  await booking.createAppointment(link.slug,{profissional_id:'professional',servico_id:'service',especialidade_id:'specialty',client_context:{client_token:'valid'}});
});
