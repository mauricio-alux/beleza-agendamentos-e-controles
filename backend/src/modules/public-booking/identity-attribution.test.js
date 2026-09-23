const {test,afterEach,mock}=require('node:test');
const assert=require('node:assert/strict');
const repo=require('./client-identity.repository');
const service=require('./client-identity.service');
const {supabaseAdmin}=require('../../config/supabase');
const tenant={id:'tenant-a',ativo:true,status:'trial'};
const link={id:'link-a',ativo:true,acesso_publico:true};
const input={request_id:'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',campanha:'winter',origem:'campanha',sessao_id:'session',
  contexto:{locale:'pt-BR'},cliente:{nome:'User',telefone:'+5516999999999',data_nascimento:'1990-01-01'}};
afterEach(()=>mock.restoreAll());
function context(){
  mock.method(repo,'findClientContext',async()=>({ativo:true,status:'ativo',cliente:{ativo:true,nome:'Saved'}}));
  mock.method(repo,'listRecentAppointments',async()=>[]);
  mock.method(repo,'recordAccess',async()=>{throw Error('duplicate nontransactional event');});
}
test('Node forwards historical attribution and stable replay credential without duplicate side effect',async()=>{
  context();const calls=[];
  mock.method(repo,'identifyWithBirth',async payload=>{calls.push(payload);return {client_id:'client',recognized:true,expires_at:'2090-01-01'};});
  const first=await service.identify(tenant,link,input),retry=await service.identify(tenant,link,input);
  assert.equal(first.token,retry.token);assert.equal(retry.expiresAt,'2090-01-01');
  assert.equal(calls[0].campaignKey,'winter');assert.equal(calls[0].sessionId,'session');
  assert.equal(calls[0].origin,'campanha');assert.deepEqual(calls[0].metadata,{locale:'pt-BR'});
  assert.equal(calls[0].requestFingerprint,calls[1].requestFingerprint);
  const next=await service.identify(tenant,link,{...input,request_id:'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb'});
  assert.notEqual(next.token,first.token);
  const otherTenant=await service.identify({...tenant,id:'tenant-b'},link,input);
  assert.notEqual(otherTenant.token,first.token);
  await service.identify(tenant,link,{...input,campanha:'changed'});
  assert.equal(calls.at(-1).tokenHash,calls[0].tokenHash);
  assert.notEqual(calls.at(-1).requestFingerprint,calls[0].requestFingerprint);
});
test('repository passes exact RPC attribution arguments; untrusted campaign_id is not accepted as identity',async()=>{
  let received;
  mock.method(supabaseAdmin,'rpc',async(name,args)=>{assert.equal(name,'identify_public_booking_client_v2');received=args;return {data:{client_id:'client'}};});
  await repo.identifyWithBirth({tenantId:'tenant',linkId:'link',campaignKey:'winter',origin:'campanha',sessionId:'session',metadata:{locale:'pt-BR'},requestFingerprint:'fp'});
  assert.equal(received.p_campaign_key,'winter');assert.equal(received.p_origin,'campanha');
  assert.equal(received.p_session_id,'session');assert.deepEqual(received.p_metadata,{locale:'pt-BR'});
  assert.equal(received.p_request_fingerprint,'fp');assert.equal(received.p_campaign_id,undefined);
  const {publicIdentityContextSchema}=require('./public-booking.validators');
  assert.equal(publicIdentityContextSchema.safeParse({...input,campaign_id:'forged'}).success,false);
});
test('PWA lookup without context does not invent campaign attribution',async()=>{
  context();let payload;
  mock.method(repo,'identifyWithBirth',async value=>{payload=value;return {client_id:'client',recognized:true};});
  await service.identify(tenant,link,{lookup_only:true,cliente:input.cliente});
  assert.equal(payload.lookupOnly,true);assert.equal(payload.campaignKey,undefined);
  assert.equal(payload.sessionId,undefined);assert.deepEqual(payload.metadata,{});
});
