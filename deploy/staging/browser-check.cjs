// Read-only staging gate. No installation, identity mutation or booking writes.
const {chromium}=require(process.env.PWA_PLAYWRIGHT_MODULE||'playwright');
(async()=>{
 const origin=new URL(process.argv[2]).origin;
 if(!origin.startsWith('https://')||/(ngrok|loca\.lt|trycloudflare|localhost)/i.test(origin))throw Error('Real HTTPS hosting required');
 const browser=await chromium.launch({headless:true,...(process.env.PWA_CHROME_PATH?{executablePath:process.env.PWA_CHROME_PATH}:{})});
 const report={origin,resources:[],routes:[],httpErrors:[],consoleErrors:0,pageErrors:0,requestFailures:[],blockedWrites:0};
 try {
  const context=await browser.newContext({viewport:{width:390,height:844},ignoreHTTPSErrors:false});
  await context.route('**/*',r=>{if(['GET','HEAD','OPTIONS'].includes(r.request().method()))return r.continue();report.blockedWrites++;return r.abort();});
  const page=await context.newPage();
  const safe=url=>{try{const u=new URL(url);return u.origin+u.pathname;}catch{return 'invalid';}};
  page.on('pageerror',e=>{report.pageErrors++;report.chunkLoadError=!!report.chunkLoadError||/ChunkLoadError/i.test(e.name+' '+e.message);});
  page.on('console',m=>{if(m.type()==='error')report.consoleErrors++;});
  page.on('response',r=>{if(r.status()>=400)report.httpErrors.push({url:safe(r.url()),status:r.status()});});
  page.on('requestfailed',r=>report.requestFailures.push({url:safe(r.url()),error:r.failure()?.errorText}));
  const first=await page.goto(origin+'/acesso',{waitUntil:'networkidle'});
  report.tls=await first.securityDetails();
  report.resources=await page.evaluate(async()=>{
   const rows=[];
   for(const credentials of ['include','omit'])for(const path of ['/manifest.webmanifest','/sw.js','/icons/pwa-icon-192.png','/icons/pwa-icon-512.png','/icons/maskable-icon-512.png']){
    const r=await fetch(path,{credentials,redirect:'manual',cache:'no-store'});
    const bytes=new Uint8Array(await r.arrayBuffer()),contentType=r.headers.get('content-type')||'';
    const text=new TextDecoder().decode(bytes),isHtml=/text\/html/i.test(contentType)||/^\s*(?:<!doctype html|<html)/i.test(text);
    const redirect=r.type==='opaqueredirect'||r.redirected||r.status>=300&&r.status<400;
    let valid=false;
    if(path.endsWith('.png'))valid=contentType.startsWith('image/png')&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
    else if(path==='/sw.js')valid=/^(application|text)\/javascript/.test(contentType)&&!/^\s*</.test(text);
    else {try{const m=JSON.parse(text);valid=contentType.startsWith('application/manifest+json')&&!!m.name&&!!m.short_name&&m.start_url==='/acesso'&&m.scope==='/'&&m.display==='standalone'&&!Object.hasOwn(m,'id');}catch{}}
    rows.push({url:location.origin+path,credentials,status:r.status,contentType,redirect,isHtml,ok:r.status===200&&valid&&!redirect&&!isHtml});
    if(!rows.at(-1).ok)return rows;
   }
   return rows;
  });
  if(report.resources.length!==10||report.resources.some(r=>!r.ok)){report.blocked='Public PWA resource failed';return;}
  for(const path of ['/','/acesso','/agendar/'+encodeURIComponent(process.argv[3]||'bellory-test-studio'),'/pwa-diagnostics']){
   const r=await page.goto(origin+path,{waitUntil:'networkidle'});
   report.routes.push({url:origin+path,status:r.status(),redirect:!!r.request().redirectedFrom(),contentType:r.headers()['content-type']});
  }
  report.api=await page.evaluate(async()=>{
   const out=[];
   for(const path of ['/_staging/health','/api/public/health','/api/public/booking/bellory-test-studio']){
    const r=await fetch(path,{credentials:'omit',cache:'no-store',redirect:'manual'});
    let json=false,healthy=null;try{const b=await r.json();json=true;if(path==='/_staging/health')healthy=!!(b.gateway&&b.frontend&&b.backend&&b.ready);}catch{}
    out.push({url:location.origin+path,status:r.status,contentType:r.headers.get('content-type'),redirect:r.redirected,json,healthy,cors:r.headers.get('access-control-allow-origin')});
   }
   return out;
  });
  report.sw=await page.evaluate(async()=>{
   const r=await Promise.race([navigator.serviceWorker.ready,new Promise((_,reject)=>setTimeout(()=>reject(Error('SW timeout')),15000))]);
   const manifest=await fetch('/manifest.webmanifest',{credentials:'omit'}).then(r=>r.json());
   const resources=performance.getEntriesByType('resource').map(r=>r.name);
   return {secure:isSecureContext,scope:r.scope,active:r.active?.state,scriptURL:r.active?.scriptURL,controller:navigator.serviceWorker.controller?.scriptURL||null,manifest,mixed:resources.some(u=>u.startsWith('http://')),obsoleteURLs:resources.some(u=>/localhost|127\.0\.0\.1|ngrok|trycloudflare|loca\.lt/i.test(u))};
  });
  report.cookiesRequired=false;
  report.cookiesPresent=(await context.cookies()).length;
  report.ok=report.routes.every(r=>r.status===200&&!r.redirect)&&report.api.every(r=>r.status===200&&r.json&&r.healthy!==false)&&report.sw.secure&&report.sw.active==='activated'&&!!report.sw.controller&&report.sw.scope===origin+'/'&&!report.sw.mixed&&!report.sw.obsoleteURLs&&!report.pageErrors&&!report.consoleErrors&&!report.httpErrors.length&&!report.requestFailures.length;
 }finally{console.log(JSON.stringify(report,null,2));await browser.close();if(!report.ok)process.exitCode=1;}
})().catch(e=>{console.error('BROWSER GATE FAILED: '+e.name);process.exitCode=1;});