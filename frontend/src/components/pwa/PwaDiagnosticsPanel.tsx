'use client';
import Link from 'next/link';
import {useEffect,useState} from 'react';
import {APP_BRAND} from '@/config/app-brand';
import {classification,clearDiagnostics,enabled,environment,timeline,type Entry} from './pwa-diagnostics';
import {resourceChecks,swSnapshot} from './pwa-resource-checks';
import {recurringStorageSnapshot,recurringStorageReport} from './recurring-storage-snapshot';
import {usePwaInstall} from './PwaInstallProvider';
export function PwaDiagnosticsPanel(){
  const [storage,setStorage]=useState<ReturnType<typeof recurringStorageSnapshot>>(null);
  const [events,setEvents]=useState<Entry[]>([]);
  const [env,setEnv]=useState<ReturnType<typeof environment>|null>(null);
  const [sw,setSw]=useState<Awaited<ReturnType<typeof swSnapshot>>|null>(null);
  const [resources,setResources]=useState<Awaited<ReturnType<typeof resourceChecks>>|null>(null);
  const [ready,setReady]=useState(false),[busy,setBusy]=useState(false),[notice,setNotice]=useState('');
  const install=usePwaInstall();
  useEffect(()=>{
    if(!enabled())return;
    let active=true;
    const refresh=()=>{setEvents(timeline());setEnv(environment());setStorage(recurringStorageSnapshot());};refresh();
    window.addEventListener('pwa-diagnostic-change',refresh);
    if('serviceWorker' in navigator)navigator.serviceWorker.ready.then(()=>{if(active)setReady(true);});
    return ()=>{active=false;window.removeEventListener('pwa-diagnostic-change',refresh);};
  },[]);
  if(!enabled())return null;
  if(!env)return <main className="p-4">Carregando diagnóstico técnico…</main>;
  const classificationText=classification(events,!!resources?.checks.some(c=>c.credentials==='omit'&&!c.ok));
  const flow={beforeinstallprompt:events.some(e=>e.event==='beforeinstallprompt received')?'RECEBIDO':'NÃO OBSERVADO',deferredPromptAvailable:!!install.event,cta:events.some(e=>e.event==='install CTA clicked')?'CLICADO':'NÃO OBSERVADO',userChoice:events.filter(e=>e.event.startsWith('userChoice=')).at(-1)?.event||'NÃO OBSERVADO',appinstalled:events.some(e=>e.event==='appinstalled received')?'RECEBIDO':'NÃO OBSERVADO',runningStandalone:env?.runningStandalone??'unknown'};
  const report=()=>['PWA DIAGNOSTIC REPORT',new Date().toISOString(),'App: '+APP_BRAND.appName,'AMBIENTE',JSON.stringify(env,null,2),recurringStorageReport(storage),'INSTALL FLOW',JSON.stringify(flow,null,2),'SERVICE WORKER',JSON.stringify({snapshot:sw,readyResolved:ready,registrationError:events.some(e=>e.event==='service worker registration failed')},null,2),'MANIFEST / RESOURCE CHECKS',JSON.stringify(resources,null,2),'TIMELINE',...events.map(e=>new Date(e.at).toISOString()+' '+e.event+' '+JSON.stringify(e.details)),'ALERTAS',classificationText,'A comparação include/omit não prova como o instalador WebAPK faz requisições. Ausência de evento significa não observado nesta captura.'].join('\n');
  async function check(){setBusy(true);try{setSw(await swSnapshot());setResources(await resourceChecks());setEnv(environment());setStorage(recurringStorageSnapshot());setNotice('Verificação concluída.');}catch{setNotice('Não foi possível concluir os checks técnicos.');}finally{setBusy(false);}}
  const block=(title:string,value:unknown)=><section className="rounded border p-3"><h2 className="font-bold">{title}</h2><pre className="mt-2 whitespace-pre-wrap break-all text-xs">{JSON.stringify(value,null,2)}</pre></section>;
  return <main className="mx-auto max-w-3xl space-y-4 p-4"><h1 className="text-xl font-bold">Diagnóstico PWA — {APP_BRAND.appName}</h1><p>DEV temporário. Eventos técnicos das últimas 24 horas, até 250 registros. Nenhuma instalação é iniciada por este painel.</p><nav><Link className="underline" href="/acesso">Voltar para acesso</Link></nav><div className="flex flex-wrap gap-3"><button className="rounded border p-2" disabled={busy} onClick={check}>{busy?'Verificando…':'Verificar recursos públicos'}</button><button className="rounded border p-2" onClick={()=>{clearDiagnostics();setNotice('Somente a timeline técnica foi removida; o evento de instalação e o cooldown foram preservados.');}}>Limpar diagnóstico</button><button className="rounded border p-2" onClick={async()=>{try{await navigator.clipboard.writeText(report());setNotice('Relatório técnico copiado.');}catch{setNotice('Cópia indisponível; selecione o relatório abaixo.');}}}>Copiar relatório técnico</button></div><p role="status">{notice}</p>{block('AMBIENTE',env)}{block('RECURRING ACCESS STORAGE SNAPSHOT',storage)}<p className="text-sm">Captura somente de leitura. null = indisponível ou não aplicável; contagem de slugs válidos únicos. Parse válido indica lista JSON. Sem teste de escrita.</p>{block('INSTALLABILITY EVENTS',flow)}{block('SERVICE WORKER',{snapshot:sw,readyResolved:ready,registrationError:events.some(e=>e.event==='service worker registration failed')})}{block('MANIFEST / RESOURCES',resources)}<section><h2 className="font-bold">ALERTAS</h2><p>{classificationText}</p>{resources?.checks.filter(c=>!c.ok).map((c,i)=><p className="text-red-700" key={i}>ALERTA: {c.path} ({c.credentials}) — {c.isHtml?'HTML inesperado':c.error||'Tipo ou conteúdo inválido'}</p>)}<p>include/omit não prova o contexto utilizado pelo instalador WebAPK.</p></section><section><h2 className="font-bold">TIMELINE</h2><ol>{events.map((e,i)=><li className="break-all text-sm" key={i}>{new Date(e.at).toLocaleTimeString()} — {e.event} {JSON.stringify(e.details)}</li>)}</ol></section><details><summary>Relatório técnico para seleção manual</summary><pre className="whitespace-pre-wrap break-all text-xs">{report()}</pre></details></main>;
}

