const { test } = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");
const deps = process.env.BELLORY_TEST_DEPS;
const dependency = name => require(deps ? path.join(deps, name) : name);
const ts = dependency("typescript");
const React = dependency("react");
const { act, create } = dependency("react-test-renderer");
global.IS_REACT_ACT_ENVIRONMENT = true;
const preference = context => JSON.stringify({version:1,context,updatedAt:'2026-09-26T12:00:00Z'});

for (const [label,intent,last,known,session,expected] of [
 ['explicit client wins','client','professional',true,true,'/acesso'],
 ['explicit professional wins','professional','client',true,true,'/dashboard'],
 ['invalid intent ignored','admin','client',true,true,'/dashboard'],
 ['professional wins over last client',null,'client',true,true,'/dashboard'],
 ['last professional wins',null,'professional',true,true,'/dashboard'],
 ['professional without session','professional',null,true,false,'/login'],
 ['client without identity','client',null,false,false,'/acesso'],
 ['last professional without session',null,'professional',true,false,'/acesso'],
 ['last client without identity',null,'client',false,true,'/dashboard']
]) test(label,async()=>{
 const h=harness(intent);if(last)h.data.set('esthya:last-context',preference(last));
 if(known)h.data.set('esthya:booking-identity:salon-b','tc-b');if(session)h.seed(baseSession());
 const tree=await h.mount();assert.equal(h.destinations[0],expected);
 assert.equal(h.data.get('esthya:booking-identity:salon-b'),known?'tc-b':undefined);
 if(session)assert.ok(h.data.has('bellory.session'));
 await dispose(tree);
});
for(const mode of ['explicit','last','known'])test('professional transient failure respects explicit intent only: '+mode,async()=>{
 const h=harness(mode==='explicit'?'client':null);h.seed(baseSession());
 if(mode==='last')h.data.set('esthya:last-context',preference('client'));
 if(mode==='known')h.data.set('esthya:booking-identity:salon-b','tc-b');
 h.setResponse(async()=>{throw Error('offline')});const tree=await h.mount();
 assert.equal(h.destinations[0],mode==='explicit'?'/acesso':undefined);assert.ok(h.data.has('bellory.session'));await dispose(tree);
});
for(const value of ['{',JSON.stringify({version:2,context:'professional',updatedAt:'2026-09-26'}),JSON.stringify({version:1,context:'admin',updatedAt:'2026-09-26'}),JSON.stringify({version:1,context:'client',updatedAt:'invalid'})])test('invalid preference ignored: '+value,async()=>{
 const h=harness();h.data.set('esthya:last-context',value);
 assert.equal(h.load('lib/last-context.ts').readLastContext(),null);
 const tree=await h.mount();assert.equal(h.destinations.length,0);await dispose(tree);
});
test('preference storage failure never throws',()=>{
 const h=harness();h.storage.getItem=()=>{throw Error('blocked')};h.storage.setItem=()=>{throw Error('blocked')};
 const lib=h.load('lib/last-context.ts');assert.equal(lib.readLastContext(),null);assert.doesNotThrow(()=>lib.writeLastContext('client'));
});
test('definitively invalid professional session cannot block last client context',async()=>{
 const h=harness();h.seed(baseSession());h.data.set('esthya:last-context',preference('client'));
 h.data.set('esthya:booking-identity:salon-b','tc-b');
 h.setResponse(async()=>({ok:false,status:403,json:async()=>({message:'denied'})}));
 const tree=await h.mount();assert.equal(h.destinations[0],'/acesso');
 assert.equal(h.data.get('esthya:booking-identity:salon-b'),'tc-b');await dispose(tree);
});
test('prefetch/server rendering cannot record context',()=>{
 const h=harness();
 h.load('components/app/AppEntry.tsx');h.load('components/auth/LoginForm.tsx');
 assert.equal(h.data.has('esthya:last-context'),false);
});
test('routing and background validation do not persist preference; committed entry does',async()=>{
 const h=harness();h.seed(baseSession());const lib=h.load('lib/internal-entry.ts');
 assert.equal(await lib.resolveAppEntry({session:baseSession(),client:{state:'unavailable'},professional:'available'},'professional'),'/dashboard');
 await h.load('services/auth.service.ts').validateSession(baseSession());
 assert.equal(h.data.has('esthya:last-context'),false);
 const tree=await h.mount();assert.equal(JSON.parse(h.data.get('esthya:last-context')).context,'professional');await dispose(tree);
});
test('professional intent does not persist before validation or after rejection',async()=>{
 const h=harness('professional');h.seed(baseSession());h.data.set('esthya:last-context',preference('client'));let finish;
 h.setResponse(()=>new Promise(resolve=>finish=resolve));const tree=await h.mount();
 assert.equal(JSON.parse(h.data.get('esthya:last-context')).context,'client');
 await act(async()=>finish({ok:false,status:403,json:async()=>({message:'denied'})}));
 assert.equal(h.destinations[0],'/login');assert.equal(JSON.parse(h.data.get('esthya:last-context')).context,'client');await dispose(tree);
});
test('round trip preserves tenant A session and tenants B/C identities and preference',async()=>{
 const h=harness();h.seed(baseSession());h.data.set('esthya:preferred-tenant',JSON.stringify({slug:'salon-c'}));
 h.data.set('esthya:booking-identity:salon-b','tc-b');h.data.set('esthya:booking-identity:salon-c','tc-c');
 const before=JSON.stringify([...h.data]);const lib=h.load('lib/internal-entry.ts');
 for(const [intent,expected] of [['professional','/dashboard'],['client','/acesso'],['professional','/dashboard']]){
  assert.equal(await lib.resolveAppEntry({session:baseSession(),client:{state:'available'},professional:'available'},intent),expected);
 }
 assert.equal(JSON.stringify([...h.data]),before);
 const mismatch=baseSession();mismatch.active_membership.tenant_id='tenant-b';
 assert.equal(lib.isInternalContext(mismatch),false);
 assert.equal(await lib.resolveAppEntry({session:mismatch,client:{state:'available'},professional:'available'},'professional'),'/login');
});
for(const success of [false,true])test('login '+(success?'success records professional':'failure preserves preference'),async()=>{
 const h=harness();h.data.set('esthya:last-context',preference('client'));h.data.set('esthya:booking-identity:salon-b','tc-b');
 h.setResponse(async()=>({ok:success,status:success?200:401,json:async()=>success?{data:baseSession()}:{message:'invalid'}}));
 const tree=await h.mount(true);
 await act(async()=>{tree.root.findAllByType('input').find(x=>x.props.id==='email').props.onChange({target:{value:'test@example.invalid'}});tree.root.findAllByType('input').find(x=>x.props.id==='senha').props.onChange({target:{value:'synthetic'}});});
 await act(async()=>tree.root.findByType('form').props.onSubmit({preventDefault(){}}));
 assert.equal(JSON.parse(h.data.get('esthya:last-context')).context,success?'professional':'client');
 assert.equal(h.destinations[0],success?'/dashboard':undefined);assert.equal(h.data.get('esthya:booking-identity:salon-b'),'tc-b');await dispose(tree);
});
const src = path.resolve(__dirname, "..");
const baseSession = () => ({
  access_token: "test-access", refresh_token: "test-refresh",
  usuario: { id: "user-a", tipo_usuario: "Administrador" },
  tenant: { id: "tenant-a" },
  active_membership: { role: "Administrador", status: "ativo", tenant_id: "tenant-a" },
  permissionContext: { scope: "tenant" }
});
function harness(intent = null) {
  const data = new Map();
  const events = {};
  const destinations = [];
  const router = { replace: value => destinations.push(value) };
  const storage = {
    get length() { return data.size; },
    key: i => [...data.keys()][i] || null,
    getItem: k => data.get(k) || null,
    setItem: (k,v) => data.set(k,v),
    removeItem: k => data.delete(k)
  };
  const win = { localStorage: storage,
    addEventListener: (k,v) => events[k] = v, removeEventListener: k => delete events[k] };
  const doc = { visibilityState: "visible",
    addEventListener: (k,v) => events[k] = v, removeEventListener: k => delete events[k] };
  let response = async () => ({ ok: true, status: 200, json: async () => ({data: baseSession()}) });
  let clientResponse = async () => ({ok:true,status:200,json:async()=>({data:{available:true}})});
  let progress = 100;
  let associations = [];
  const cache = {};
  function load(relative) {
    const file = path.join(src, relative);
    if (cache[file]) return cache[file].exports;
    const module = { exports: {} }; cache[file] = module;
    const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
      compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020, jsx: ts.JsxEmit.ReactJSX }
    }).outputText;
    const req = name => {
      if (name === "react" || name.startsWith("react/")) return dependency(name);
      if (name === "next/navigation") return { useRouter: () => router, usePathname: () => "/dashboard", useSearchParams: () => ({get: () => intent}) };
      if (name === "next/link") return { __esModule: true, default: props => React.createElement("a", props) };
      if (name === "@/components/ui/button") return { Button: ({asChild, variant, ...props}) => asChild ? props.children : React.createElement("button", props) };
      if (name === "lucide-react") return { Loader2: () => null, ShieldAlert: () => null, Eye: () => null, EyeOff: () => null, LockKeyhole: () => null, Mail: () => null };
      if (name === "@/components/ui/input") return { Input: props => React.createElement("input",props) };
      if (name === "@/components/ui/label") return { Label: props => React.createElement("label",props) };
      if (name === "@/components/ui/feedback-message") return { FeedbackMessage: () => null };
      if (name === "@/components/auth/LoadingButton") return { LoadingButton: ({isLoading,...props}) => React.createElement("button",props) };
      if (name === "@/config/app-brand") return { API_URL: "https://test.invalid", APP_BRAND: {appName:"MyEsthya"} };
      if (name === "@/lib/messages") return { normalizeUserMessage: m => m || "Request failed", getErrorMessage: () => "Request failed" };
      if (name === "@/services/onboarding.service") return { onboardingService: { getStatus: async () => { if (progress instanceof Error) throw progress; return {progress}; } } };
      if (name === "@/services/usuario-cliente.service") return {listClientAssociations: async () => associations};
      if (name === "@/components/dashboard/navigation") return {canAccessDashboardPath:()=>true};
      for(const [file,symbol] of [['dashboard/MobileBottomNav','MobileBottomNav'],['dashboard/Sidebar','Sidebar'],['dashboard/TopHeader','TopHeader'],['pwa/InstallPwaPrompt','InstallPwaPrompt']]) if(name==='@/components/'+file)return {[symbol]:()=>null};
      if (name.startsWith("@/")) {
        const p = name.slice(2);
        return load(fs.existsSync(path.join(src,p+".ts")) ? p+".ts" : p+".tsx");
      }
      return require(name);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: req, process, console,
      window: win, document: doc, fetch: (...args) => args[0].endsWith("/client/context") ? clientResponse(...args) : response(...args), AbortController, setTimeout, clearTimeout, Error, URL });
    return module.exports;
  }
  return {data,events,destinations,storage,load,setAssociations: rows => associations=rows,setClientResponse: fn => clientResponse=fn,setResponse: fn => response=fn,setProgress: value => progress=value,
    seed: session => data.set("bellory.session",JSON.stringify(session)),
    mountDashboard: async (Child) => {
      const {AuthProvider}=load('context/AuthProvider.tsx');
      const {DashboardLayout}=load('layouts/DashboardLayout.tsx');let tree;
      await act(async()=>{tree=create(React.createElement(AuthProvider,null,React.createElement(DashboardLayout,null,React.createElement(Child))))});
      return tree;
    },
    mount: async (login = false) => {
      const {AuthProvider} = load("context/AuthProvider.tsx");
      const AppEntry = typeof login === "string" ? load("components/app/ContextAccessLink.tsx").ContextAccessLink : login ? load("components/auth/LoginForm.tsx").LoginForm : load("components/app/AppEntry.tsx").AppEntry;
      let tree;
      await act(async () => { tree=create(React.createElement(AuthProvider,null,React.createElement(AppEntry,typeof login === "string" ? {target:login} : {}))); });
      return tree;
    }};
}
async function dispose(tree) { await act(async()=>tree.unmount()); }
for (const [label,internal,client,expected] of [
  ["internal",true,false,"/dashboard"], ["client",false,true,"/acesso"],
  ["both",true,true,"/dashboard"], ["neither",false,false,null]
]) test(label+" context dispatch", async()=>{
  const h=harness(); if(internal)h.seed(baseSession());
  if(client)h.data.set("esthya:booking-identity:salon-b","tc-b");
  const tree=await h.mount();
  assert.equal(h.destinations[0]||null,expected);
  if(!expected) assert.deepEqual(tree.root.findAllByType("a").map(x=>x.props.href),["/app?context=client","/app?context=professional"]);
  await dispose(tree);
});
test("shared destination preserves admin, onboarding and fallback",async()=>{
  const h=harness(),{resolveInternalEntry}=h.load("lib/internal-entry.ts");
  const admin=baseSession();admin.usuario.tipo_usuario_global="MasterAdmin";
  assert.equal(await resolveInternalEntry(admin),"/admin");
  h.setProgress(20);assert.equal(await resolveInternalEntry(baseSession()),"/onboarding");
  h.setProgress(new Error("offline"));assert.equal(await resolveInternalEntry(baseSession()),"/onboarding");
  h.setProgress(100);assert.equal(await resolveInternalEntry(baseSession()),"/dashboard");
});
test("unvalidated token never navigates or shows choices",async()=>{
  const h=harness();h.seed(baseSession());let finish;
  h.setResponse(()=>new Promise(resolve=>finish=resolve));
  const tree=await h.mount();assert.equal(h.destinations.length,0);
  assert.equal(tree.root.findAllByType("a").length,0);
  await act(async()=>finish({ok:true,status:200,json:async()=>({data:baseSession()})}));
  assert.equal(h.destinations[0],"/dashboard");await dispose(tree);
});
test("invalid session returns neutral choice and preserves customer identity",async()=>{
  const h=harness();h.seed(baseSession());h.data.set("esthya:unrelated","keep");
  h.setResponse(async()=>({ok:false,status:401,json:async()=>({message:"invalid"})}));
  const tree=await h.mount();assert.equal(h.destinations[0],undefined);
  assert.equal(h.data.get("esthya:unrelated"),"keep");assert.equal(h.data.has("bellory.session"),false);await dispose(tree);
});
test("expired access token refreshes through existing endpoint",async()=>{
  const h=harness();h.seed(baseSession());const urls=[];
  h.setResponse(async url=>{urls.push(url);return {ok:url.endsWith("/refresh"),status:url.endsWith("/refresh")?200:401,json:async()=>({data:baseSession()})};});
  const tree=await h.mount();assert.equal(h.destinations[0],"/dashboard");
  assert.equal(urls.filter(x=>x.endsWith("/refresh")).length,1);await dispose(tree);
});
for(const broken of ["corrupt","unavailable"])test("storage "+broken+" has safe exit",async()=>{
  const h=harness();if(broken==="corrupt")h.data.set("bellory.session","{");
  else h.storage.getItem=()=>{throw new Error("blocked")};
  const tree=await h.mount();assert.equal(h.destinations.length,0);
  assert.equal(tree.root.findAllByType("a").length,2);await dispose(tree);
});
test("network failure is recoverable and preserves credentials",async()=>{
  const h=harness();h.seed(baseSession());h.setResponse(async()=>{throw new Error("network")});
  const tree=await h.mount();assert.equal(h.destinations.length,0);assert.ok(h.data.has("bellory.session"));
  h.setResponse(async()=>({ok:true,status:200,json:async()=>({data:baseSession()})}));
  await act(async()=>tree.root.findByType("button").props.onClick());
  assert.equal(h.destinations[0],"/dashboard");await dispose(tree);
});
test("resume revalidates before dispatch",async()=>{
  const h=harness();const tree=await h.mount();h.seed(baseSession());
  await act(async()=>h.events.visibilitychange());assert.equal(h.destinations[0],"/dashboard");await dispose(tree);
});
test("authenticated client role is not an internal context",async()=>{
  const h=harness(),session=baseSession();session.active_membership.role="Cliente";
  h.seed(session);h.setResponse(async()=>({ok:true,status:200,json:async()=>({data:session})}));
  const tree=await h.mount();assert.equal(h.destinations[0],undefined);await dispose(tree);
});
test("self redirect configuration stops safely",async()=>{
  const previous=process.env.NEXT_PUBLIC_DASHBOARD_PATH;process.env.NEXT_PUBLIC_DASHBOARD_PATH="/app";
  try {const h=harness();h.seed(baseSession());const tree=await h.mount();assert.equal(h.destinations.length,0);assert.equal(tree.root.findAllByType("button").length,1);await dispose(tree);}
  finally {if(previous===undefined)delete process.env.NEXT_PUBLIC_DASHBOARD_PATH;else process.env.NEXT_PUBLIC_DASHBOARD_PATH=previous;}
});
test("login shares destination; client route and PWA remain independent",()=>{
  const login=fs.readFileSync(path.join(src,"components/auth/LoginForm.tsx"),"utf8");
  assert.ok(login.includes("await resolveInternalEntry(session)"));
  assert.doesNotMatch(login,/onboardingService/);
  const access=fs.readFileSync(path.join(src,"components/recurring-access/RecurringAccessPage.tsx"),"utf8");
  assert.ok(!access.includes('router.replace("/app")'));
  assert.ok(fs.readFileSync(path.join(src,"lib/pwa-manifest.ts"),"utf8").includes('PWA_START_URL = "/app"'));
});

test("validation refresh does not persist before provider accepts result",async()=>{
  const h=harness();const old=baseSession();h.seed(old);
  h.setResponse(async url=>({ok:url.endsWith("/refresh"),status:url.endsWith("/refresh")?200:401,json:async()=>({data:{...old,access_token:"new-token"}})}));
  const result=await h.load("services/auth.service.ts").validateSession(old);
  assert.equal(result.access_token,"new-token");
  assert.equal(JSON.parse(h.data.get("bellory.session")).access_token,"test-access");
});

for(const code of ['CLIENT_TOKEN_INVALID','CLIENT_TOKEN_EXPIRED'])test('client probe rejects '+code+' without deleting token',async()=>{
 const h=harness();h.data.set('esthya:booking-identity:salon-b','tc-b');
 h.setClientResponse(async()=>({ok:false,status:code.endsWith('EXPIRED')?410:401,json:async()=>({code})}));
 const tree=await h.mount();assert.equal(h.destinations.length,0);assert.equal(h.data.get('esthya:booking-identity:salon-b'),'tc-b');await dispose(tree);
});
for(const failure of ['network','gateway'])test('client probe transient '+failure+' stays indeterminate',async()=>{
 const h=harness();h.data.set('esthya:booking-identity:salon-b','tc-b');
 h.setClientResponse(async()=>{if(failure==='network')throw Error('offline');return {ok:false,status:404,json:async()=>{throw Error('empty')}};});
 const tree=await h.mount();assert.equal(h.destinations.length,0);assert.equal(tree.root.findByType('button').props.children,'Tentar novamente');
 assert.equal(h.data.get('esthya:booking-identity:salon-b'),'tc-b');await dispose(tree);
});
test('valid nonpreferred tenant survives invalid preferred tenant',async()=>{
 const h=harness();h.data.set('esthya:preferred-tenant',JSON.stringify({slug:'salon-a'}));
 for(const slug of ['salon-a','salon-b'])h.data.set('esthya:booking-identity:'+slug,'tc-'+slug);
 h.setClientResponse(async url=>({ok:!url.includes('salon-a'),status:url.includes('salon-a')?401:200,json:async()=>url.includes('salon-a')?{code:'CLIENT_TOKEN_INVALID'}:{data:{available:true}}}));
 const tree=await h.mount();assert.equal(h.destinations[0],'/acesso');assert.equal(JSON.parse(h.data.get('esthya:preferred-tenant')).slug,'salon-b');await dispose(tree);
});
for(const known of [true,false])test('login offers return only for known client '+known,async()=>{
 const h=harness();if(known)h.data.set('esthya:booking-identity:salon-b','tc-b');
 const tree=await h.mount(true);const links=tree.root.findAllByType('a');
 assert.equal(links.some(x=>x.props.children==='Acessar como cliente'),known);
 assert.ok(!links.some(x=>String(x.props.children).includes('Adicionar acesso')));
 assert.equal(links.some(x=>x.props.href==='/app?context=client'),known);await dispose(tree);
});

for(const target of ['client','professional'])for(const known of [true,false])test('switch requires association or professional availability '+target+' '+known+' preserves both stores',async()=>{
 const h=harness();
 if(target==='client' && known)h.setAssociations([{id:'pending-association'}]);
 if(target==='client'||known)h.seed(baseSession());
 if(target==='professional'||known)h.data.set('esthya:booking-identity:salon-b','tc-b');
 const previousSession=h.data.get('bellory.session'),previousToken=h.data.get('esthya:booking-identity:salon-b');
 const tree=await h.mount(target);const links=tree.root.findAllByType('a');
 assert.equal(links.length,known?1:0);
 if(known){
  assert.equal(links[0].props.href,target==='client'?'/acesso/vinculos':'/app?context='+target);
  assert.equal(links[0].props.children,target==='client'?'Acessar como cliente':'Acessar área profissional');
  assert.equal(links[0].props.onClick,undefined);
 }
 assert.equal(h.data.get('esthya:booking-identity:salon-b'),previousToken);
 assert.equal(h.data.get('bellory.session'),previousSession);await dispose(tree);
});
test('pending client probe exposes no switch or add and sends token only in body',async()=>{
 const h=harness();h.seed(baseSession());h.data.set('esthya:booking-identity:salon-b','synthetic-client-token');let finish;
 h.setClientResponse((url,init)=>{assert.ok(!url.includes('synthetic-client-token'));assert.equal(init.method,'POST');assert.equal(JSON.parse(init.body).token,'synthetic-client-token');return new Promise(r=>finish=r);});
 const tree=await h.mount('client');assert.equal(tree.root.findAllByType('a').length,0);
 await act(async()=>finish({ok:true,status:200,json:async()=>({data:{available:true}})}));
 assert.equal(tree.root.findByType('a').props.children,'Acessar como cliente');await dispose(tree);
});
test('transient professional failure never offers add or authenticated switch',async()=>{
 const h=harness();h.seed(baseSession());h.setResponse(async()=>{throw Error('offline')});
 const tree=await h.mount('professional');assert.equal(tree.root.findAllByType('a').length,0);assert.equal(tree.root.findAllByType('button').length,0);await dispose(tree);
});

for(const target of ['client','professional'])test('target alone is not a dual-context switch '+target,async()=>{
 const h=harness();if(target==='client')h.data.set('esthya:booking-identity:salon-b','tc-b');else h.seed(baseSession());
 const tree=await h.mount(target);assert.equal(tree.root.findAllByType('a').length,0);await dispose(tree);
});
for(const target of ['client','professional'])test('external intent starts flow without creating identity '+target,async()=>{
 const h=harness(target);h.data.set('esthya:last-context',preference(target));
 const tree=await h.mount();assert.equal(h.destinations[0],target==='client'?'/acesso':'/login');
 assert.equal(h.data.has('bellory.session'),false);assert.equal(h.data.has('esthya:booking-identity:salon-b'),false);
 assert.equal((await h.load('lib/context-availability.ts').readClientAvailability()).state,'unavailable');await dispose(tree);
});

for(const outcome of ['valid','transient','invalid'])test('real DashboardLayout/AuthProvider/ContextAccessLink background revalidation: '+outcome,async()=>{
 const h=harness();h.seed(baseSession());h.data.set('esthya:booking-identity:salon-b','fixture-client');
 h.setAssociations([{id:'pending-association'}]);
 let me=0,finish,mounts=0,unmounts=0;
 h.setResponse(async url=>{
  assert.ok(url.endsWith('/auth/me'));
  if(++me===1)return {ok:true,status:200,json:async()=>({data:baseSession()})};
  return new Promise(resolve=>{finish=resolve;});
 });
 function Content(){React.useEffect(()=>{mounts++;return()=>{unmounts++;}},[]);return React.createElement('section',{'data-panel':true},'Panel');}
 const tree=await h.mountDashboard(Content);
 try{
  assert.equal(me,2);assert.equal(mounts,1);assert.equal(unmounts,0);
  assert.equal(tree.root.findAllByProps({'data-panel':true}).length,1);
  assert.equal(tree.root.findAllByType('a').length,0,'availability stays indeterminate');
  await act(async()=>finish(outcome==='valid'?{ok:true,status:200,json:async()=>({data:baseSession()})}:{ok:false,status:outcome==='invalid'?403:503,json:async()=>({message:'fixture'})}));
  await act(async()=>{await new Promise(r=>setImmediate(r));});
  assert.equal(me,2,'completion must not trigger a mount/revalidate cycle');
  if(outcome==='invalid'){
   assert.equal(unmounts,1);assert.equal(h.data.has('bellory.session'),false);assert.ok(h.destinations.includes('/login'));
  }else{
   assert.equal(mounts,1);assert.equal(unmounts,0);assert.ok(h.data.has('bellory.session'));
   assert.equal(h.destinations.length,0);assert.equal(tree.root.findAllByType('a').length,outcome==='valid'?1:0);
   if(outcome==='valid')assert.equal(tree.root.findByType('a').props.children,'Acessar como cliente');
  }
  assert.equal(h.data.get('esthya:booking-identity:salon-b'),'fixture-client');
 }finally{await dispose(tree);}
});
