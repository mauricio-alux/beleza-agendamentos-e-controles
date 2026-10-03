const { test, afterEach, mock } = require('node:test');
const assert = require('node:assert/strict');
process.env.SUPABASE_URL='https://example.supabase.co';
process.env.SUPABASE_ANON_KEY='synthetic';
process.env.SUPABASE_SERVICE_ROLE_KEY='synthetic';
const express=require('express');
const auth=require('../auth/auth.service');
const service=require('./usuario-cliente.service');
const router=require('../../routes/usuario-cliente.routes');
afterEach(()=>mock.restoreAll());
for(const method of ['GET','POST']) for(const scope of ['tenant','platform','client',null]) {
  test(method+' authorization scope '+scope,async()=>{
    let calls=0;
    mock.method(auth,'validateToken',async()=>({usuario:{id:'authenticated-user'},permission_context:{scope}}));
    mock.method(service,'list',async id=>{assert.equal(id,'authenticated-user');calls++;return [];});
    mock.method(service,'locate',async(id,association)=>{assert.equal(id,'authenticated-user');assert.equal(association,'association');calls++;return {};});
    const app=express();app.use(express.json());app.use('/api/usuario-cliente',router);
    app.use((err,req,res,next)=>res.status(err.statusCode||500).json({code:err.code}));
    const server=app.listen(0,'127.0.0.1');await new Promise(resolve=>server.once('listening',resolve));
    try {
      const response=await fetch(`http://127.0.0.1:${server.address().port}/api/usuario-cliente${method==='POST'?'/association/locate':''}?usuario_id=other`,{
        method,headers:scope?{Authorization:'Bearer synthetic','Content-Type':'application/json'}:{},
        ...(method==='POST'?{body:JSON.stringify({usuario_id:'other'})}:{})
      });
      await response.text();const allowed=['tenant','platform'].includes(scope);
      assert.equal(response.status,allowed?200:scope?403:401);assert.equal(calls,allowed?1:0);
    } finally {server.closeAllConnections();await new Promise(resolve=>server.close(resolve));}
  });
}
