const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const dep = name => require(process.env.BELLORY_TEST_DEPS ? path.join(process.env.BELLORY_TEST_DEPS, name) : name);
const ts = dep('typescript'), React = dep('react');
const { act, create } = dep('react-test-renderer');
// Fixtures sinteticas, sem origem em DEV/STAGING: assinante iniciado em zero,
// aceito pelo normalizador BR do projeto; nunca usar para contato ou envio.
const TEST_PHONE_A = '+5511000000001';
const TEST_PHONE_B = '+5511000000002';
const TEST_BIRTH_DATE = '2000-02-29'; // Data arbitraria de fixture, nao de pessoa.

global.IS_REACT_ACT_ENVIRONMENT = true;
const session = { access_token: 'synthetic', usuario: { id: 'u', tipo_usuario: 'Administrador' }, tenant: { id: 'professional' }, active_membership: { tenant_id: 'professional', role: 'Administrador', status: 'ativo' } };
function harness(rows = [], respond, professional = 'available') {
  const cache = {}, stored = new Map(), destinations = [], calls = [];
  const router = {push:x=>destinations.push(x)};
  const associations = { listClientAssociations: async () => rows, locateClientAssociation: async (s,id,input) => {
    calls.push({id,input}); return respond ? respond(id,input) : {slug:'salon',identity:{token:'synthetic-client'}};
  }, isDefinitiveClientCredentialError: error => load('services/usuario-cliente.service.ts').isDefinitiveClientCredentialError(error) };
  function load(relative) {
    if (cache[relative]) return cache[relative];
    const module = {exports:{}};
    const req = name => {
      if (name === 'react' || name.startsWith('react/')) return dep(name);
      if (name === '@/hooks/useAuth') return {useAuth:()=>({session})};
      if (name === '@/hooks/useContextAvailability') return {useContextAvailability:()=>({client:{state: stored.has('esthya:booking-identity:salon') ? 'available' : 'unavailable'},professional,checking:false,session:professional==='available'?session:null})};
      if (name === '@/components/app/ContextAccessLink') return load('components/app/ContextAccessLink.tsx');
      if (name === 'lucide-react') return new Proxy({}, {get:()=>()=>null});
      if (name === '@/components/pwa/InstallPwaPrompt') return {InstallPwaPrompt:()=>null};
      if (name === '@/components/dev/client-debug-panel') return {ClientDebugPanel:()=>null};
      if (name === '@/components/ui/input') return {Input:p=>React.createElement('input',p)};
      if (name === '@/components/ui/phone-input') return {PhoneInput:()=>React.createElement('input',{type:'tel'})};
      if (name === '@/utils/phone') return {formatStoredPhone:v=>v,isValidPhone:()=>true,normalizePhoneToE164:v=>v};
      if (name === '@/lib/session-id') return {getOrCreateSessionId:()=> 'fixture-session'};
      if (name === '@/services/usuario-cliente.service') return associations;
      if (name === '@/services/onboarding.service') return {onboardingService:{getStatus:async()=>({progress:100})}};
      if (name === '@/lib/last-context') return {parseAppContext:x=>['client','professional'].includes(x)?x:null,readLastContext:()=> 'client'};
      if (name === 'next/navigation') return {useRouter:()=>router};
      if (name === '@/config/app-brand') return { API_URL: 'https://test.invalid/api',APP_BRAND:{appName:'MyEsthya'} };
      if (name === 'next/link') return {__esModule:true,default:p=>React.createElement('a',p)};
      if (name === '@/components/ui/button') return {Button:({asChild,variant,...p})=>asChild?p.children:React.createElement('button',p)};
      if (name === '@/components/ui/feedback-message') return {FeedbackMessage:()=>null};
      if (name === '@/services/public-booking.service') return {
        locatePublicAccess:()=>{throw Error('unscoped access');},
        getPublicBookingCatalog:async()=>({tenant:{id:'client-tenant',nome_fantasia:'Tenant Fixture A'},link:{},servicos:[],profissionais:[]}),
        identifyPublicBookingClient:async()=>({token:'client-tc',clientId:'client',client:{nome:'Cliente teste',telefone:TEST_PHONE_A}}),
        getUpcomingPublicAppointments:async()=>({appointments:[]})
      };
      if (name === '@/lib/recurring-access.storage') return {bookingIdentityKey:s=>'esthya:booking-identity:'+s,upsertKnownTenant:()=>{}};
      if (name === './LocateAccess') return load('components/recurring-access/LocateAccess.tsx');
      throw Error(name);
    };
    const code = ts.transpileModule(fs.readFileSync(path.join(__dirname,'..',relative),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText;
    vm.runInNewContext(code,{module,exports:module.exports,require:req,console,process,Date,setTimeout,clearTimeout,AbortController,fetch:()=>{throw Error('unexpected network');},document:{referrer:''},window:{navigator:{userAgent:'fixture',language:'pt-BR'},matchMedia:()=>({matches:false}),sessionStorage:{},localStorage:{getItem:k=>stored.get(k)||null,removeItem:k=>stored.delete(k),setItem:(k,v)=>stored.set(k,v)}}});
    cache[relative]=module.exports;return module.exports;
  }
  return {load,stored,destinations,calls};
}
for (const available of [false,true]) test('button requires association, not local TC: '+available,async()=>{
  const h=harness(available?[{id:'a'}]:[]);const C=h.load('components/app/ContextAccessLink.tsx').ContextAccessLink;let tree;
  await act(async()=>{tree=create(React.createElement(C,{target:'client'}));});
  const links=tree.root.findAllByType('a');assert.equal(links.length,available?1:0);
  if(available)assert.equal(links[0].props.href,'/acesso/vinculos');
  assert.equal(h.stored.size,0);assert.equal(h.destinations.length,0);await act(async()=>tree.unmount());
});
const pending = {id:'association',cliente_id:'client',tenant_id:'tenant-fixture-a',slug:'salon',displayName:'Tenant Fixture A',telefone:TEST_PHONE_A,status_verificacao:'pendente'};
for(const professional of ['available','unavailable','indeterminate'])test('PublicBookingPage professional switch '+professional,async()=>{
  const h=harness([],undefined,professional);h.stored.set('esthya:booking-identity:salon','client-tc');
  h.stored.set('bellory.session','professional-session');
  const C=h.load('components/public-booking/PublicBookingPage.tsx').PublicBookingPage;let tree;
  await act(async()=>{tree=create(React.createElement(C,{slug:'salon'}));});
  const links=tree.root.findAllByType('a').filter(a=>a.props.href==='/app?context=professional');
  assert.equal(links.length,professional==='available'?1:0);
  if(links.length)assert.equal(links[0].props.children,'Acessar área profissional');
  assert.ok(JSON.stringify(tree.toJSON()).includes('Tenant Fixture A'));
  assert.ok(JSON.stringify(tree.toJSON()).includes('Cliente teste'));
  assert.equal(h.stored.get('bellory.session'),'professional-session');
  assert.equal(h.stored.get('esthya:booking-identity:salon'),'client-tc');
  assert.equal(h.destinations.length,0);await act(async()=>tree.unmount());
});
async function mountAssociation(h) {
  const C=h.load('components/recurring-access/AssociationAccess.tsx').AssociationAccess;let tree;
  await act(async()=>{tree=create(React.createElement(C));});return tree;
}
test('saved TC waits for backend, sends only token, resumes without birth and preserves pending',async()=>{
  let finish;const h=harness([pending],()=>new Promise(resolve=>{finish=resolve;}));
  h.stored.set('esthya:booking-identity:salon','saved');const tree=await mountAssociation(h);
  assert.equal(h.calls.length,1);assert.equal(h.calls[0].id,'association');assert.equal(h.calls[0].input.token,'saved');
  assert.equal(Object.keys(h.calls[0].input).length,1);assert.equal(h.destinations.length,0);
  assert.equal(tree.root.findAllByType('form').length,0);
  await act(async()=>finish({slug:'salon',identity:{token:'saved'}}));
  assert.equal(h.destinations[0],'/agendar/salon');assert.equal(tree.root.findAllByType('form').length,0);
  assert.equal(pending.status_verificacao,'pendente');await act(async()=>tree.unmount());
});
test('no saved TC retains prefilled phone and required birth without calling locate',async()=>{
  const h=harness([pending]);const tree=await mountAssociation(h);
  assert.equal(h.calls.length,0);assert.equal(tree.root.findAllByType('input')[0].props.value,pending.telefone);
  assert.equal(tree.root.findAllByType('input')[1].props.required,true);await act(async()=>tree.unmount());
});
for(const [reason,status,code] of [
 ['invalid',401,'CLIENT_TOKEN_INVALID'],['expired',410,'CLIENT_TOKEN_EXPIRED'],
 ['revoked',422,'CLIENT_MATCH_UNAVAILABLE'],['other client',422,'CLIENT_MATCH_UNAVAILABLE'],
 ['other tenant',422,'CLIENT_MATCH_UNAVAILABLE'],['unavailable identity',403,'CLIENT_IDENTITY_UNAVAILABLE']
])test('definitive rejection falls back without access: '+reason,async()=>{
  const h=harness([pending],()=>{const {ClientAssociationError}=h.load('services/usuario-cliente.service.ts');throw new ClientAssociationError('denied',status,code);});
  h.stored.set('esthya:booking-identity:salon','saved');const tree=await mountAssociation(h);
  assert.equal(h.destinations.length,0);assert.equal(tree.root.findAllByType('form').length,1);
  assert.equal(h.stored.has('esthya:booking-identity:salon'),false);assert.equal(pending.status_verificacao,'pendente');
  await act(async()=>tree.unmount());
});
for(const [reason,status,code] of [['network',0,''],['timeout',0,''],['5xx',503,'CLIENT_TOKEN_INVALID'],['professional session expired',401,'UNAUTHORIZED']])
test('temporary or professional auth failure preserves TC: '+reason,async()=>{
  const h=harness([pending],()=>{if(!status)throw Error(reason);const {ClientAssociationError}=h.load('services/usuario-cliente.service.ts');throw new ClientAssociationError(reason,status,code);});
  h.stored.set('esthya:booking-identity:salon','saved');const tree=await mountAssociation(h);
  assert.equal(h.destinations.length,0);assert.equal(h.stored.get('esthya:booking-identity:salon'),'saved');
  assert.equal(tree.root.findAllByType('form').length,0);assert.equal(tree.root.findByProps({role:'alert'}).type,'div');
  await act(async()=>tree.unmount());
});
test('late successful response after unmount cannot navigate',async()=>{
  let finish;const h=harness([pending],()=>new Promise(resolve=>{finish=resolve;}));h.stored.set('esthya:booking-identity:salon','saved');
  const tree=await mountAssociation(h);await act(async()=>tree.unmount());
  await act(async()=>finish({slug:'salon',identity:{token:'saved'}}));assert.equal(h.destinations.length,0);
});
test('multiple associations select tenant before existing form; no identity until successful submit',async()=>{
  const h=harness([{id:'a',displayName:'Tenant Fixture A',telefone:TEST_PHONE_A},{id:'b',displayName:'Tenant Fixture B',telefone:TEST_PHONE_B}]);
  const C=h.load('components/recurring-access/AssociationAccess.tsx').AssociationAccess;let tree;
  await act(async()=>{tree=create(React.createElement(C));});
  assert.equal(tree.root.findAllByType('form').length,0);
  await act(async()=>tree.root.findAllByType('button').find(b=>b.props.children==='Tenant Fixture B').props.onClick());
  assert.equal(tree.root.findAllByType('input')[0].props.value,TEST_PHONE_B);
  assert.equal(h.stored.size,0);assert.equal(h.calls.length,0);
  await act(async()=>tree.root.findAllByType('input')[1].props.onChange({target:{value:TEST_BIRTH_DATE}}));
  await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
  assert.equal(h.calls[0].id,'b');assert.equal(h.calls[0].input.data_nascimento,TEST_BIRTH_DATE);
  assert.equal(h.stored.get('esthya:booking-identity:salon'),'synthetic-client');
  assert.equal(h.destinations[0],'/agendar/salon');await act(async()=>tree.unmount());
});
test('professional wins implicit opening despite last-client; client-only and explicit switch preserved',async()=>{
  const {resolveAppEntry}=harness().load('lib/internal-entry.ts');
  assert.equal(await resolveAppEntry({professional:'available',session,client:{state:'available'}}),'/dashboard');
  assert.equal(await resolveAppEntry({professional:'available',session,client:{state:'indeterminate'}}),'/dashboard');
  assert.equal(await resolveAppEntry({professional:'unavailable',session:null,client:{state:'available'}}),'/acesso');
  assert.equal(await resolveAppEntry({professional:'available',session,client:{state:'available'}},'client'),'/acesso');
});
