const {test}=require('node:test');
const assert=require('node:assert/strict');
const {allowed}=require('./gateway.cjs');
const route='/api/usuario-cliente/00000000-0000-4000-8000-000000000001/locate';
for(const [method,path,expected] of [
 ['GET','/acesso/vinculos',true],['HEAD','/acesso/vinculos',true],
 ['GET','/api/usuario-cliente',true],['POST',route,true],
 ['POST','/api/usuario-cliente',false],['DELETE',route,false],['GET',route,false],
 ['GET','/api/usuario-cliente/outra-rota',false],['POST','/api/usuario-cliente/invalid/locate',false],
 ['POST',route+'/extra',false],['GET','/acesso/outra',false],['HEAD','/api/usuario-cliente',false]
])test(method+' '+path,()=>assert.equal(allowed(method,path),expected));
