const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
const credentialModule={exports:{}};
vm.runInNewContext(ts.transpileModule(fs.readFileSync(require.resolve('../lib/client-credential-error.ts'),'utf8'),{
  compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
}).outputText,{module:credentialModule,exports:credentialModule.exports,Error});
const credentialErrors=credentialModule.exports;
function load(fetch){
  let ids=0;
  const module={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(require.resolve('./public-booking.service.ts'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,fetch,URLSearchParams,Error,
    require(name){
      if(name.endsWith('messages'))return {normalizeUserMessage:x=>x};
      if(name.endsWith('client-credential-error'))return credentialErrors;
      if(name.endsWith('app-brand'))return {API_URL:'http://local.invalid'};
      if(name.endsWith('session-id'))return {createSessionId:()=>`attempt-${++ids}`};
      throw Error(name);
    }});
  return module.exports;
}
test('history request reuses current endpoint and encodes selected tenant and TC',async()=>{
 const service=load(async(url,init)=>{const parsed=new URL(url);assert.equal(parsed.pathname,'/public/booking/studio%20fixture/client/appointments/upcoming');assert.equal(parsed.searchParams.get('view'),'history');assert.equal(parsed.searchParams.get('token'),'synthetic&token');assert.equal(init.method,undefined);return {ok:true,json:async()=>({data:{appointments:[]}})};});
 assert.equal((await service.getPublicAppointmentHistory('studio fixture','synthetic&token')).appointments.length,0);
});
// Fixtures sinteticas, sem origem em pessoas ou DEV/STAGING; nunca usar para contato.
const TEST_PHONE = '+5511000000001';
const TEST_BIRTH_DATE = '2000-02-29'; // Data arbitraria de fixture.
const input={cliente:{nome:'User',telefone:TEST_PHONE,data_nascimento:TEST_BIRTH_DATE},campanha:'winter'};
for(const [status,code,definitive] of [[401,'CLIENT_TOKEN_INVALID',true],[410,'CLIENT_TOKEN_EXPIRED',true],
 [403,'CLIENT_IDENTITY_UNAVAILABLE',true],[422,'CLIENT_MATCH_UNAVAILABLE',true],
 [503,'CLIENT_TOKEN_INVALID',false],[401,'UNAUTHORIZED',false]])
test('public service preserves structured credential error '+status+' '+code,async()=>{
 const api=load(async()=>({ok:false,status,json:async()=>({error:{code,message:'Fixture error'}})}));
 await assert.rejects(api.identifyPublicBookingClient('studio',{token:'fixture-token'}),error=>{
  assert.equal(error.status,status);assert.equal(error.code,code);
  assert.equal(credentialErrors.isDefinitiveClientCredentialError(error),definitive);return true;
 });
});

test('lost response retry reuses operation ID and completed next operation is independent',async()=>{
  const bodies=[];let fail=true;
  const api=load(async(url,init)=>{
    bodies.push(JSON.parse(init.body));
    if(fail){fail=false;throw Error('response lost');}
    return {ok:true,json:async()=>({data:{token:'result'}})};
  });
  await assert.rejects(api.identifyPublicBookingClient('studio',input));
  await api.identifyPublicBookingClient('studio',input);
  assert.equal(bodies[0].request_id,bodies[1].request_id);
  await api.identifyPublicBookingClient('studio',input);
  assert.notEqual(bodies[2].request_id,bodies[0].request_id);
});
test('concurrent submissions share request; valid TC bypasses retry identity path',async()=>{
  const bodies=[];let release;
  const gate=new Promise(resolve=>{release=resolve;});
  const api=load(async(url,init)=>{bodies.push(JSON.parse(init.body));await gate;return {ok:true,json:async()=>({data:{}})};});
  const a=api.identifyPublicBookingClient('studio',input),b=api.identifyPublicBookingClient('studio',input);
  assert.equal(bodies.length,1);release();await Promise.all([a,b]);
  await api.identifyPublicBookingClient('studio',{token:'valid-token'});
  assert.equal(bodies[1].request_id,undefined);assert.equal(bodies[1].cliente,undefined);
});
test('empty PWA locate retries send same operation ID only in POST body',async()=>{
  let failed=false;const sent=[];
  const api=load(async(url,init)=>{sent.push({url,body:JSON.parse(init.body)});
    if(!failed){failed=true;throw Error('lost');}return {ok:true,json:async()=>({data:{slug:'studio'}})};});
  const pair={telefone:TEST_PHONE,data_nascimento:TEST_BIRTH_DATE};
  await assert.rejects(api.locatePublicAccess(pair));await api.locatePublicAccess(pair);
  assert.equal(sent[0].body.request_id,sent[1].body.request_id);
  assert.ok(sent.every(x=>!x.url.includes(pair.telefone)&&!x.url.includes(pair.data_nascimento)));
});
