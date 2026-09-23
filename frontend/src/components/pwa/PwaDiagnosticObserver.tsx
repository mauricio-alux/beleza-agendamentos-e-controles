'use client';
import {useEffect} from 'react';
import {actualStandalone,enabled,pwaLog,type PwaEvent} from './pwa-diagnostics';
export function PwaDiagnosticObserver(){
  useEffect(()=>{
    if(!enabled())return;
    pwaLog('initialization',{runningStandalone:actualStandalone()});
    const media=matchMedia('(display-mode: standalone)');
    const change=()=>pwaLog('display-mode',{runningStandalone:actualStandalone()});
    const listeners=new Map<string,()=>void>();
    for(const event of ['pagehide','pageshow','focus','blur'] as PwaEvent[]){const fn=()=>pwaLog(event,{runningStandalone:actualStandalone()});listeners.set(event,fn);window.addEventListener(event,fn);}
    const visibility=()=>pwaLog('visibilitychange',{runningStandalone:actualStandalone()});
    document.addEventListener('visibilitychange',visibility);media.addEventListener('change',change);
    return ()=>{for(const [e,fn] of listeners)window.removeEventListener(e,fn);document.removeEventListener('visibilitychange',visibility);media.removeEventListener('change',change);};
  },[]);
  return null;
}
