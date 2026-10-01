const test=require('node:test'),assert=require('node:assert/strict'),http=require('node:http');
const {allowed,gateway}=require('./gateway.cjs');
test('locate POST reaches backend with body; other methods and unlisted routes stay blocked',async()=>{
  const path='/api/public/booking/access/locate';
  assert.equal(allowed('POST',path),true);
  for(const method of ['GET','HEAD','PUT','PATCH','DELETE','OPTIONS'])assert.equal(allowed(method,path),false);
  const received=[];
  const back=http.createServer(async(q,r)=>{
    let body='';for await(const chunk of q)body+=chunk;
    received.push({method:q.method,path:q.url,body,contentType:q.headers['content-type']});
    r.writeHead(400,{'Content-Type':'application/json'}).end(JSON.stringify({error:'synthetic-backend-validation'}));
  });
  await new Promise(r=>back.listen(0,'127.0.0.1',r));
  const g=gateway({backend:back.address().port});
  await new Promise(r=>g.listen(0,'127.0.0.1',r));
  try{
    const base='http://127.0.0.1:'+g.address().port;
    const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    assert.equal(response.status,400);
    assert.deepEqual(await response.json(),{error:'synthetic-backend-validation'});
    assert.deepEqual(received,[{method:'POST',path,body:'{}',contentType:'application/json'}]);
    for(const [method,url] of [['GET',path],['POST','/api/public/booking/access/unlisted'],['POST',path+'/extra']]){
      assert.equal((await fetch(base+url,{method})).status,404);
    }
    assert.equal(received.length,1);
  }finally{for(const s of [g,back]){s.closeAllConnections();await new Promise(r=>s.close(r));}}
});
test('dynamic tenants and Next encoded chunks pass, private/admin/webhooks stay blocked',()=>{for(const p of ['/agendar/any-valid-slug','/pwa-diagnostics','/_next/static/chunks/app/agendar/%5Bslug%5D/page.js','/manifest.webmanifest','/sw.js'])assert.equal(allowed('GET',p),true);for(const p of ['/admin','/unlisted-route','/api/auth/login','/api/public/webhooks/whatsapp','/_next/static/../private'])assert.equal(allowed('GET',p),false);assert.equal(allowed('POST','/api/public/booking/any-slug/appointments'),true);});
test('proxy keeps /api prefix and returns both targets without auth/interstitial',async()=>{const front=http.createServer((q,r)=>r.end('front'));const back=http.createServer((q,r)=>r.end(q.url));await new Promise(r=>front.listen(0,'127.0.0.1',r));await new Promise(r=>back.listen(0,'127.0.0.1',r));const g=gateway({frontend:front.address().port,backend:back.address().port});await new Promise(r=>g.listen(0,'127.0.0.1',r));try{const base='http://127.0.0.1:'+g.address().port;assert.equal(await(await fetch(base+'/acesso')).text(),'front');assert.equal(await(await fetch(base+'/api/public/health')).text(),'/api/public/health');assert.equal((await fetch(base+'/admin')).status,404);}finally{for(const s of [g,front,back]){s.closeAllConnections();await new Promise(r=>s.close(r));}}});
test('readiness gate fails closed',async()=>{const g=gateway({ready:()=>false});await new Promise(r=>g.listen(0,'127.0.0.1',r));try{assert.equal((await fetch('http://127.0.0.1:'+g.address().port+'/acesso')).status,503);}finally{g.closeAllConnections();await new Promise(r=>g.close(r));}});

test('live health rejects frontend/backend failures after initial readiness',async()=>{
  let frontStatus=200,backStatus=200;
  const front=http.createServer((q,r)=>r.writeHead(frontStatus).end());
  const back=http.createServer((q,r)=>r.writeHead(backStatus).end());
  await new Promise(r=>front.listen(0,'127.0.0.1',r));await new Promise(r=>back.listen(0,'127.0.0.1',r));
  const g=gateway({frontend:front.address().port,backend:back.address().port});await new Promise(r=>g.listen(0,'127.0.0.1',r));
  const health='http://127.0.0.1:'+g.address().port+'/_staging/health';
  try {
    assert.equal((await fetch(health)).status,200);
    frontStatus=503;let r=await fetch(health);assert.equal(r.status,503);assert.equal((await r.json()).frontend,false);
    frontStatus=200;backStatus=500;r=await fetch(health);assert.equal(r.status,503);assert.equal((await r.json()).backend,false);
    backStatus=200;assert.equal((await fetch(health)).status,200);
  } finally {for(const s of [g,front,back]){s.closeAllConnections();await new Promise(r=>s.close(r));}}
});

test('0.6C entry routes pass GET/HEAD with queries while unlisted paths and writes stay blocked',async()=>{
  const paths=['/app','/login','/dashboard','/clientes','/agenda','/agenda/novo','/acesso','/manifest.webmanifest','/sw.js'];
  const front=http.createServer((q,r)=>{r.setHeader('x-upstream-path',q.url);r.end('front');});
  await new Promise(r=>front.listen(0,'127.0.0.1',r));
  const g=gateway({frontend:front.address().port});await new Promise(r=>g.listen(0,'127.0.0.1',r));
  try {
    const base='http://127.0.0.1:'+g.address().port;
    for(const path of paths){
      for(const method of ['GET','HEAD']){
        assert.equal(allowed(method,path),true);
        for(const suffix of ['','?source=smoke&_rsc=check']){
          const response=await fetch(base+path+suffix,{method});
          assert.equal(response.status,200,path);assert.equal(response.headers.get('x-upstream-path'),path+suffix);
          await response.body?.cancel();
        }
      }
      assert.equal((await fetch(base+path,{method:'POST'})).status,404);
    }
    for(const path of ['/unlisted-route','/app/extra','/login/extra','/dashboard/extra','/clientes/extra','/agenda/extra','/agenda/novo/extra','/admin','/api/auth/login']){
      assert.equal((await fetch(base+path)).status,404,path);
    }
  }finally{for(const s of [g,front]){s.closeAllConnections();await new Promise(r=>s.close(r));}}
});

test('internal auth forwards only exact method/path pairs to backend',async()=>{
  const pairs=[['POST','/api/auth/login'],['GET','/api/auth/me'],['POST','/api/auth/refresh'],['POST','/api/auth/logout']];
  const received=[];
  const back=http.createServer(async(q,r)=>{let body='';for await(const chunk of q)body+=chunk;received.push({method:q.method,path:q.url,body,authorization:q.headers.authorization});r.writeHead(401,{'Content-Type':'application/json'}).end(JSON.stringify({code:'FIXTURE_UNAUTHORIZED'}));});
  await new Promise(r=>back.listen(0,'127.0.0.1',r));
  const g=gateway({backend:back.address().port});await new Promise(r=>g.listen(0,'127.0.0.1',r));
  try{
    const base='http://127.0.0.1:'+g.address().port;
    for(const [method,path] of pairs){
      assert.equal(allowed(method,path),true);
      const body=method==='POST'?'{}':undefined;
      const response=await fetch(base+path,{method,headers:{'Content-Type':'application/json',Authorization:'Bearer synthetic-fixture'},body});
      assert.equal(response.status,401);assert.deepEqual(await response.json(),{code:'FIXTURE_UNAUTHORIZED'});
      assert.deepEqual(received.at(-1),{method,path,body:body||'',authorization:'Bearer synthetic-fixture'});
      for(const other of ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].filter(m=>m!==method)){
        assert.equal(allowed(other,path),false);
        assert.equal((await fetch(base+path,{method:other})).status,404);
      }
    }
    for(const path of ['/unlisted-route','/api/auth/unlisted','/api/unlisted','/api/auth/login/extra']){
      for(const method of ['GET','POST'])assert.equal((await fetch(base+path,{method})).status,404);
    }
    assert.equal(received.length,4);
  }finally{for(const s of [g,back]){s.closeAllConnections();await new Promise(r=>s.close(r));}}
});

test('onboarding forwards only GET status and GET/HEAD page to their respective upstreams',async()=>{
  const seen=[];
  const front=http.createServer((q,r)=>{seen.push('frontend');r.setHeader('x-fixture-upstream','frontend');r.end('page');});
  const back=http.createServer((q,r)=>{seen.push('backend');r.writeHead(401,{'Content-Type':'application/json'}).end(JSON.stringify({code:'FIXTURE_UNAUTHORIZED'}));});
  for(const s of [front,back])await new Promise(r=>s.listen(0,'127.0.0.1',r));
  const g=gateway({frontend:front.address().port,backend:back.address().port});await new Promise(r=>g.listen(0,'127.0.0.1',r));
  try{
    const base='http://127.0.0.1:'+g.address().port;
    const api=await fetch(base+'/api/onboarding/status');assert.equal(api.status,401);assert.deepEqual(await api.json(),{code:'FIXTURE_UNAUTHORIZED'});
    for(const method of ['GET','HEAD']){const r=await fetch(base+'/onboarding',{method});assert.equal(r.status,200);assert.equal(r.headers.get('x-fixture-upstream'),'frontend');await r.body?.cancel();}
    for(const path of ['/api/onboarding/status','/onboarding']){
      const permitted=path.startsWith('/api/')?['GET']:['GET','HEAD'];
      for(const method of ['GET','HEAD','POST','PUT','PATCH','DELETE','OPTIONS'].filter(m=>!permitted.includes(m)))assert.equal((await fetch(base+path,{method})).status,404);
    }
    for(const path of ['/unlisted-route','/api/onboarding/unlisted','/api/onboarding/status/extra','/onboarding/extra'])assert.equal((await fetch(base+path)).status,404);
    assert.deepEqual(seen,['backend','frontend','frontend']);
  }finally{for(const s of [g,front,back]){s.closeAllConnections();await new Promise(r=>s.close(r));}}
});

for(const path of ['/api/dashboard/summary','/api/clients']) test(path+' forwards only exact GET to backend',async()=>{
  const received=[];
  const back=http.createServer((q,r)=>{received.push({method:q.method,path:q.url});r.writeHead(401,{'Content-Type':'application/json'}).end(JSON.stringify({code:'FIXTURE_UNAUTHORIZED'}));});
  await new Promise(r=>back.listen(0,'127.0.0.1',r));
  const g=gateway({backend:back.address().port});await new Promise(r=>g.listen(0,'127.0.0.1',r));
  try{
    const base='http://127.0.0.1:'+g.address().port;
    const r=await fetch(base+path);assert.equal(r.status,401);assert.deepEqual(await r.json(),{code:'FIXTURE_UNAUTHORIZED'});
    for(const method of ['HEAD','POST','PUT','PATCH','DELETE','OPTIONS'])assert.equal((await fetch(base+path,{method})).status,404);
    for(const other of ['/unlisted-route','/api/dashboard/summary/qualquer','/api/dashboard/unlisted','/api/clients/qualquer','/api/unlisted','/agenda/extra','/clientes/extra','/servicos'])assert.equal((await fetch(base+other)).status,404);
    assert.deepEqual(received,[{method:'GET',path}]);
  }finally{for(const s of [g,back]){s.closeAllConnections();await new Promise(r=>s.close(r));}}
});

test('client PATCH requires exact UUID path and preserves backend authentication',async()=>{
  const path='/api/clients/11111111-1111-4111-8111-111111111111';
  const received=[];
  const back=http.createServer((q,r)=>{received.push({method:q.method,path:q.url});r.writeHead(401,{'Content-Type':'application/json'}).end(JSON.stringify({code:'FIXTURE_UNAUTHORIZED'}));});
  await new Promise(r=>back.listen(0,'127.0.0.1',r));
  const g=gateway({backend:back.address().port});await new Promise(r=>g.listen(0,'127.0.0.1',r));
  try{
    const base='http://127.0.0.1:'+g.address().port;
    const response=await fetch(base+path,{method:'PATCH'});
    assert.equal(response.status,401);assert.deepEqual(await response.json(),{code:'FIXTURE_UNAUTHORIZED'});
    for(const method of ['GET','HEAD','POST','PUT','DELETE','OPTIONS'])assert.equal((await fetch(base+path,{method})).status,404);
    for(const invalid of ['/api/clients','/api/clients/invalid',path+'/extra',path+'/',path+'0',path.replace('4111','0111'),path.replace('8111','7111'),path.replace('111111111111','11111111111z')]){
      assert.equal((await fetch(base+invalid,{method:'PATCH'})).status,404,invalid);
    }
    assert.deepEqual(received,[{method:'PATCH',path}]);
  }finally{for(const s of [g,back]){s.closeAllConnections();await new Promise(r=>s.close(r));}}
});

test('client context probe forwards only exact POST with valid slug',async()=>{
 const path='/api/public/booking/fixture-studio/client/context',seen=[];
 const back=http.createServer(async(q,r)=>{let body='';for await(const chunk of q)body+=chunk;seen.push({method:q.method,path:q.url,body});r.writeHead(401,{'Content-Type':'application/json'}).end(JSON.stringify({code:'CLIENT_TOKEN_INVALID'}));});
 await new Promise(r=>back.listen(0,'127.0.0.1',r));const g=gateway({backend:back.address().port});await new Promise(r=>g.listen(0,'127.0.0.1',r));
 try{
  const base='http://127.0.0.1:'+g.address().port;
  const response=await fetch(base+path,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});assert.equal(response.status,401);assert.equal((await response.json()).code,'CLIENT_TOKEN_INVALID');
  for(const method of ['GET','HEAD','PUT','PATCH','DELETE','OPTIONS'])assert.equal((await fetch(base+path,{method})).status,404);
  for(const invalid of ['/api/public/booking/fixture-studio/client','/api/public/booking/client/context',path+'/extra',path+'/',path.replace('fixture-studio','a'),path.replace('fixture-studio','bad_slug'),path.replace('fixture-studio','a'.repeat(121))])assert.equal((await fetch(base+invalid,{method:'POST'})).status,404,invalid);
  assert.deepEqual(seen,[{method:'POST',path,body:'{}'}]);
 }finally{for(const server of [g,back]){server.closeAllConnections();await new Promise(r=>server.close(r));}}
});
