const assert=require('node:assert/strict');
const png=b=>[137,80,78,71,13,10,26,10].every((v,i)=>b[i]===v);
async function check(origin,slug){
 const u=new URL(origin);assert.equal(u.protocol,'https:');assert.equal(u.pathname,'/');assert.ok(!u.username&&!u.password&&!u.search&&!u.hash);
 assert.ok(!/(ngrok|loca\.lt|trycloudflare)/i.test(u.hostname),'Tunnel is not staging');
 const paths=['/','/acesso','/agendar/'+encodeURIComponent(slug),'/pwa-diagnostics','/_staging/health','/api/public/health','/api/public/booking/'+encodeURIComponent(slug),'/manifest.webmanifest','/sw.js','/icons/pwa-icon-192.png','/icons/pwa-icon-512.png','/icons/maskable-icon-512.png'];
 const chunks=new Set();let count=0;
 for(const mode of ['include','omit'])for(const p of paths){
  const r=await fetch(u.origin+p,{credentials:mode,redirect:'manual',cache:'no-store',signal:AbortSignal.timeout(30000),headers:{'User-Agent':'Mozilla/5.0 (Linux; Android 14) AppleWebKit/537.36 Chrome/140.0.0.0 Mobile Safari/537.36'}});
  const type=r.headers.get('content-type')||'';const b=new Uint8Array(await r.arrayBuffer());const text=new TextDecoder().decode(b);
  const isHtml=/text\/html/i.test(type)||/^\s*(?:<!doctype html|<html)/i.test(text);
  console.log(JSON.stringify({url:u.origin+p,credentials:mode,status:r.status,contentType:type,redirect:r.redirected||r.status>=300&&r.status<400,isHtml}));
  assert.equal(r.status,200,`${p} status`);
  assert.ok(!/ERR_NGROK|you are about to visit/i.test(text),'Interstitial');
  if(p.endsWith('.png')){assert.match(type,/^image\/png/);assert.ok(png(b));}
  else if(p.endsWith('.webmanifest')){assert.match(type,/^application\/manifest\+json/);const m=JSON.parse(text);assert.equal(m.start_url,'/acesso');assert.equal(m.scope,'/');assert.equal(m.display,'standalone');assert.ok(m.name && m.short_name);assert.ok(!Object.hasOwn(m,'id'));}
  else if(p==='/sw.js'){assert.match(type,/^(application|text)\/javascript/);assert.ok(!/^\s*</.test(text));}
  else if(p.startsWith('/api/')||p==='/_staging/health'){assert.match(type,/^application\/json/);const data=JSON.parse(text);if(p==='/_staging/health')assert.ok(data.gateway&&data.frontend&&data.backend&&data.ready);}
  else {assert.match(type,/^text\/html/);for(const m of text.matchAll(/(?:src|href)="([^" ]+)"/g)){assert.ok(!m[1].startsWith('http://'),'Mixed resource');if(m[1].startsWith('/_next/static/'))chunks.add(m[1].replace(/&amp;/g,'&'));}}
  count++;console.log(JSON.stringify({url:u.origin+p,credentials:mode,ok:true}));
 }
 for(const p of chunks){const r=await fetch(u.origin+p,{redirect:'manual',signal:AbortSignal.timeout(30000)});assert.equal(r.status,200,'Chunk status');assert.ok(!r.headers.get('content-type')?.includes('text/html'),'Chunk HTML');await r.arrayBuffer();}
 console.log(JSON.stringify({httpGate:'PASS',requests:count,chunks:chunks.size,browserGate:'PENDING: run browser-check.cjs; Node does not have browser cookies'}));
}
if(require.main===module)check(process.argv[2],process.argv[3]||'bellory-test-studio').catch(()=>{console.error('STAGING GATE FAILED; inspect last public resource, no private payload logged');process.exitCode=1;});
module.exports={check,png};
