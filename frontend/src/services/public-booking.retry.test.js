const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const ts=require('typescript');
function load(fetch){
  let ids=0;
  const module={exports:{}};
  const source=ts.transpileModule(fs.readFileSync(require.resolve('./public-booking.service.ts'),'utf8'),{
    compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}
  }).outputText;
  vm.runInNewContext(source,{module,exports:module.exports,fetch,URLSearchParams,Error,
    require(name){
      if(name.endsWith('messages'))return {normalizeUserMessage:x=>x};
      if(name.endsWith('app-brand'))return {API_URL:'http://local.invalid'};
      if(name.endsWith('session-id'))return {createSessionId:()=>`attempt-${++ids}`};
      throw Error(name);
    }});
  return module.exports;
}
const input={cliente:{nome:'User',telefone:'+5516999999999',data_nascimento:'1990-01-01'},campanha:'winter'};
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
  const pair={telefone:'+5516999999999',data_nascimento:'1990-01-01'};
  await assert.rejects(api.locatePublicAccess(pair));await api.locatePublicAccess(pair);
  assert.equal(sent[0].body.request_id,sent[1].body.request_id);
  assert.ok(sent.every(x=>!x.url.includes(pair.telefone)&&!x.url.includes(pair.data_nascimento)));
});
