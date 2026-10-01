const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
function load(file,imports){const m={exports:{}};vm.runInNewContext(fs.readFileSync(path.join(__dirname,file),'utf8'),{module:m,exports:m.exports,process:{env:{}},console,Date,require:name=>name in imports?imports[name]:require(name.startsWith('.')?path.join(__dirname,name):name)});return m.exports;}
for(const mode of ['valid','foreign token','inactive tenant','expired link','invalid token body'])test('context endpoint '+mode+' never writes or exposes token',async()=>{
 const calls=[];
 const repo=new Proxy({findToken:async()=>({id:'tc',tenant_id:mode==='foreign token'?'other':'tenant',cliente_id:'client',expira_em:'2099-01-01'}),findClientContext:async()=>({ativo:true,status:'ativo',cliente:{ativo:true}})},{get:(o,k)=>k in o?async(...args)=>{calls.push(k);return o[k](...args)}:()=>{throw Error('Unexpected operation '+String(k));}});
 const identity=load('client-identity.service.js',{'./client-identity.repository':repo,'../../config/env':{}});
 const bookingRepo=new Proxy({findActiveLink:async()=>({tenant_id:'tenant',ativo:true,acesso_publico:true,expira_em:mode==='expired link'?'2000-01-01':'2099-01-01'}),findTenant:async()=>({id:'tenant',ativo:mode!=='inactive tenant',status:'ativo'})},{get:(o,k)=>k in o?async(...args)=>{calls.push(k);return o[k](...args)}:()=>{throw Error('Unexpected operation '+String(k));}});
 const service=load('public-booking.service.js',{'./public-booking.repository':bookingRepo,'./client-identity.service':identity,'../agenda/agenda.service':{}});
 const controller=load('public-booking.controller.js',{'./public-booking.service':service});
 let response,cache;const res={set:(k,v)=>{cache=v},json:v=>{response=v;return v}};
 const req={params:{slug:'fixture-studio'},body:{token:mode==='invalid token body'?'bad':'synthetic-valid-token-fixture'}};
 if(mode==='valid'){
  await controller.probeClientContext(req,res);
  assert.equal(JSON.stringify(response),JSON.stringify({data:{available:true}}));assert.equal(cache,'no-store');
 }else await assert.rejects(controller.probeClientContext(req,res),e=>[401,404,410].includes(e.statusCode));
 assert.ok(calls.every(k=>['findToken','findClientContext','findActiveLink','findTenant'].includes(k)));
});
