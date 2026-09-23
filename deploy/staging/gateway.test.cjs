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
test('dynamic tenants and Next encoded chunks pass, private/admin/webhooks stay blocked',()=>{for(const p of ['/agendar/any-valid-slug','/pwa-diagnostics','/_next/static/chunks/app/agendar/%5Bslug%5D/page.js','/manifest.webmanifest','/sw.js'])assert.equal(allowed('GET',p),true);for(const p of ['/admin','/login','/api/auth/login','/api/public/webhooks/whatsapp','/_next/static/../private'])assert.equal(allowed('GET',p),false);assert.equal(allowed('POST','/api/public/booking/any-slug/appointments'),true);});
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
