import {enabled} from './pwa-diagnostics';
export type Check = {path:string; credentials:string; status?:number; contentType?:string; responseUrl?:string; redirected?:boolean; bytes?:number; isHtml?:boolean; possibleInterstitial?:boolean; png?:boolean; ok:boolean; error?:string; manifest?:Record<string,unknown>};
export function publicResource(value:string, origin:string) {
  try { const u=new URL(value,origin); return u.origin===origin && !u.search && !u.hash && !u.username && !u.password && (/^\/icons\/[a-zA-Z0-9_-]+\.png$/.test(u.pathname) || ['/manifest.webmanifest','/sw.js'].includes(u.pathname)) ? u.href : null; } catch {return null;}
}
export function inspectBytes(path:string,type:string,bytes:Uint8Array) {
  const head=new TextDecoder().decode(bytes.slice(0,2048)).trim();
  const isHtml=type.includes('text/html') || /^<!doctype html|^<html/i.test(head);
  const png=[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v);
  const possibleInterstitial=isHtml && /ngrok|you are about to visit/i.test(head);
  let manifest:Record<string,unknown>|undefined;
  if(path==='/manifest.webmanifest' && !isHtml) {
    try {const m=JSON.parse(new TextDecoder().decode(bytes)); if(m && typeof m==='object') {
      // Only declared public metadata; never keep arbitrary response fields or HTML.
      manifest={name:typeof m.name==='string'?m.name.slice(0,120):null,short_name:typeof m.short_name==='string'?m.short_name.slice(0,120):null,start_url:m.start_url==='/acesso'?'/acesso':'unexpected',scope:m.scope==='/'?'/':'unexpected',display:['standalone','browser','minimal-ui','fullscreen'].includes(m.display)?m.display:'unknown',idPresent:typeof m.id==='string',icons:Array.isArray(m.icons)?m.icons.slice(0,8).map((i:Record<string,unknown>)=>({src:typeof i.src==='string' && /^\/icons\/[a-zA-Z0-9_-]+\.png$/.test(i.src)?i.src:'blocked',sizes:typeof i.sizes==='string' && /^\d+x\d+$/.test(i.sizes)?i.sizes:'unknown',purpose:['any','maskable','any maskable'].includes(String(i.purpose))?i.purpose:'unknown'})):[]};
    }}catch{/* invalid JSON */}
  }
  const ok=!isHtml && (path.endsWith('.png')?png && type.split(';')[0]==='image/png':path==='/sw.js'?/^(application|text)\/(javascript|ecmascript)/.test(type):!!manifest && /^(application\/manifest\+json|application\/json)/.test(type));
  return {isHtml,png,possibleInterstitial,ok,manifest};
}
export async function checkResource(url:string, credentials:'include'|'omit'):Promise<Check> {
  const allowed=publicResource(url,location.origin);
  if(!enabled() || !allowed) return {path:'blocked',credentials,ok:false,error:'Resource not permitted'};
  const path=new URL(allowed).pathname;
  const abort=new AbortController(); const timer=setTimeout(()=>abort.abort(),12000);
  try {
    // Reject redirects rather than risk forwarding credentials outside the public same-origin allowlist.
    const r=await fetch(allowed,{credentials,cache:'no-store',redirect:'manual',signal:abort.signal});
    if(r.type==='opaqueredirect') return {path,credentials,status:r.status,redirected:true,ok:false,error:'Redirect blocked; destination not followed'};
    const reader=r.body?.getReader();let size=0;const parts:Uint8Array[]=[];
    if(reader) {while(true){const next=await reader.read();if(next.done)break;size+=next.value.length;if(size>262144){await reader.cancel();throw new Error('limit');}parts.push(next.value);}}
    const bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}
    const contentType=r.headers.get('content-type') || '';
    const result=inspectBytes(path,contentType,bytes);
    return {path,credentials,status:r.status,contentType,responseUrl:publicResource(r.url,location.origin)||'blocked',redirected:r.redirected,bytes:size,...result,ok:r.ok && result.ok};
  }catch{return {path,credentials,ok:false,error:'Network, timeout or size limit; no raw error captured'};}finally{clearTimeout(timer);}
}
export async function resourceChecks() {
  const link=document.head.querySelector<HTMLLinkElement>('link[rel="manifest"]');
  const href=link?.href && publicResource(link.href,location.origin);
  const checks:Check[]=[];
  if(href) for(const c of ['include','omit'] as const) checks.push(await checkResource(href,c));
  const m=checks.find(c=>c.manifest)?.manifest;
  const icons=(m?.icons || []) as {src:string}[];
  for(const path of ['/sw.js',...new Set(icons.map(i=>i.src).filter(p=>p!=='blocked'))]) for(const c of ['include','omit'] as const) checks.push(await checkResource(path,c));
  return {manifestLink:{href:href||'missing/blocked',crossorigin:link?.crossOrigin||'none'},checks};
}
export async function swSnapshot() {
  if(!('serviceWorker' in navigator)) return {supported:false};
  const rs=await navigator.serviceWorker.getRegistrations();
  return {supported:true,controller:!!navigator.serviceWorker.controller,registrations:rs.map(r=>({scope:r.scope===location.origin+'/'?r.scope:'redacted',active:r.active?.state||null,waiting:r.waiting?.state||null,installing:r.installing?.state||null,scriptURL:r.active?.scriptURL?publicResource(r.active.scriptURL,location.origin)||'redacted':null,updateViaCache:r.updateViaCache}))};
}
