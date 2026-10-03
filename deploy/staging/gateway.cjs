const http=require('node:http');
function allowed(method,path){
  if(['GET','HEAD'].includes(method) && path==='/acesso/vinculos')return true;
  if(method==='GET' && path==='/api/usuario-cliente')return true;
  if(method==='POST' && /^\/api\/usuario-cliente\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\/locate$/i.test(path))return true;
  if(method==='POST' && ['/api/auth/login','/api/auth/refresh','/api/auth/logout'].includes(path))return true;
  if(method==='GET' && ['/api/auth/me','/api/onboarding/status','/api/dashboard/summary','/api/clients'].includes(path))return true;
  if(method==='PATCH' && /^\/api\/clients\/[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(path))return true;
  const read=['GET','HEAD'].includes(method);
  if(read && ['/','/app','/login','/dashboard','/clientes','/agenda','/agenda/novo','/onboarding','/acesso','/pwa-diagnostics','/offline','/manifest.webmanifest','/sw.js','/favicon.ico','/acao_agendamento','/reagendar','/api/public/health','/api/public/plans','/api/public/landing'].includes(path))return true;
  const asset=path.replace(/%5b/ig,'[').replace(/%5d/ig,']');
  if(read && !asset.includes('..') && (/^\/_next\/static\/[a-zA-Z0-9_./\[\]-]+$/.test(asset)||/^\/(icons|images)\/[a-zA-Z0-9_./-]+$/.test(asset)))return true;
  if(read && /^\/agendar\/[^/]+\/?$/.test(path))return true;
  if(read && /^\/api\/public\/booking\/[^/]+(?:\/availability|\/client\/me|\/client\/appointments\/upcoming)?$/.test(path))return true;
  if(method==='POST' && path==='/api/public/booking/access/locate')return true;
  if(method==='POST' && /^\/api\/public\/booking\/[a-z0-9-]{2,120}\/client\/context$/i.test(path))return true;
  if(method==='POST' && /^\/api\/public\/booking\/[^/]+\/(identity|appointments)$/.test(path))return true;
  if(method==='PATCH' && /^\/api\/public\/booking\/[^/]+\/client\/me$/.test(path))return true;
  if(read && /^\/api\/public\/booking\/appointments\/(action|token\/[^/]+)$/.test(path))return true;
  return method==='POST' && /^\/api\/public\/booking\/appointments\/(action|reschedule)$/.test(path);
}
async function probe(frontend, backend) {
  const results = await Promise.all([['frontend',frontend,'/acesso'],['backend',backend,'/api/public/health']].map(async ([name,port,path]) => {
    try {
      const response = await fetch(`http://127.0.0.1:${port}${path}`, {redirect:'manual',signal:AbortSignal.timeout(2000)});
      const ok = response.status === 200;
      await response.body?.cancel();
      return [name,ok];
    } catch {return [name,false];}
  }));
  return Object.fromEntries(results);
}
function gateway({frontend=3000,backend=3001,ready=()=>true}={}){
  return http.createServer(async (req,res)=>{
    let path;try{path=new URL(req.url,'http://localhost').pathname;}catch{res.writeHead(400).end();return;}
    if (path === '/_staging/health' && ['GET','HEAD'].includes(req.method)) {
      const state = await probe(frontend,backend);
      const ok = ready() && state.frontend && state.backend;
      res.writeHead(ok?200:503, {'Content-Type':'application/json','Cache-Control':'no-store'});
      res.end(JSON.stringify({gateway:true,...state,ready:!!ok}));
      return;
    }
    if(!allowed(req.method,path)){res.writeHead(404).end();return;}
    if(!ready()){res.writeHead(503).end('Starting');return;}
    const upstream=http.request({hostname:'127.0.0.1',port:path.startsWith('/api/')?backend:frontend,path:req.url,method:req.method,headers:{...req.headers,'x-forwarded-proto':'https'}},r=>{res.writeHead(r.statusCode,r.headers);r.pipe(res);});
    upstream.setTimeout(30000,()=>upstream.destroy());
    upstream.on('error',()=>{if(!res.headersSent)res.writeHead(502);res.end();});
    req.on('aborted',()=>upstream.destroy());req.pipe(upstream);
  });
}
module.exports={allowed,gateway,probe};

