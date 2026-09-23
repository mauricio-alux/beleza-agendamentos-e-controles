import {notFound} from 'next/navigation';
import {PwaDiagnosticsPanel} from '@/components/pwa/PwaDiagnosticsPanel';
export const dynamic='force-dynamic';
export default function Page(){
  if(process.env.NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS!=='true')notFound();
  return <PwaDiagnosticsPanel/>;
}
