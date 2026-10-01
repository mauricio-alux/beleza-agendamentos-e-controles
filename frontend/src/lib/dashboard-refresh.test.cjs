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
const src = path.resolve(__dirname, "..");
const baseSession = () => ({
  access_token: "test-access", refresh_token: "test-refresh",
  usuario: { tipo_usuario: "Administrador" },
  tenant: { id: "tenant-a" },
  active_membership: { role: "Administrador", status: "ativo", tenant_id: "tenant-a" },
  permissionContext: { scope: "tenant" }
});
function harness() {
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
  const timers=new Map();let tid=0;
  const win = { localStorage: storage,setInterval:fn=>{timers.set(++tid,fn);return tid;},clearInterval:id=>timers.delete(id),
    addEventListener: (k,v) => events[k] = v, removeEventListener: k => delete events[k] };
  const doc = { visibilityState: "visible",
    addEventListener: (k,v) => events[k] = v, removeEventListener: k => delete events[k] };
  let response = async () => ({ ok: true, status: 200, json: async () => ({data: baseSession()}) });
  let progress = 100;
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
      if (name === "next/navigation") return { useRouter: () => router };
      if (name === "next/link") return { __esModule: true, default: props => React.createElement("a", props) };
      if (name === "@/components/ui/button") return { Button: ({asChild, variant, ...props}) => asChild ? props.children : React.createElement("button", props) };
      if (name === "@/config/app-brand") return { API_URL: "https://test.invalid", APP_BRAND: {appName:"MyEsthya"} };
      if (name === "@/lib/messages") return { normalizeUserMessage: m => m || "Request failed" };
      if (name === "@/services/onboarding.service") return { onboardingService: { getStatus: async () => { if (progress instanceof Error) throw progress; return {progress}; } } };
      if (name.startsWith("@/")) {
        const p = name.slice(2);
        return load(fs.existsSync(path.join(src,p+".ts")) ? p+".ts" : p+".tsx");
      }
      return require(name);
    };
    vm.runInNewContext(code, { module, exports: module.exports, require: req, process, console,
      window: win, document: doc, fetch: (...args) => response(...args), AbortController, setTimeout, clearTimeout, Error, URL });
    return module.exports;
  }
  return {data,events,destinations,storage,load,timers,setResponse: fn => response=fn,setProgress: value => progress=value,
    seed: session => data.set("bellory.session",JSON.stringify(session)),
    mount: async (dashboard=true) => {
      const {AuthProvider,AuthContext}=load('context/AuthProvider.tsx'),{useDashboard}=load('hooks/useDashboard.ts');let auth,panel,tree;
      function Panel(){panel=useDashboard();return null;}
      function Probe(){auth=React.useContext(AuthContext);return dashboard?React.createElement(Panel):null;}
      await act(async()=>{tree=create(React.createElement(AuthProvider,null,React.createElement(Probe)));});
      return {tree,get auth(){return auth;},get panel(){return panel;}};
    }};
}

async function dispose(tree) { await act(async()=>tree.unmount()); }

const reply=(status,data)=>({status,ok:status<400,json:async()=>status<400?{data}:{error:{code:'ERROR',message:'failure'}}});
const rotated=()=>({...baseSession(),access_token:'new-access',refresh_token:'new-refresh'});
const snap={agenda:{today:[],next:[]},activity:{},roleConfig:{permissions:{}}};
function setup(summary,renew=async()=>reply(200,rotated())){
 const h=harness();h.seed(baseSession());h.data.set('esthya:booking-identity:client','client-token');const calls=[];
 h.setResponse(async(url,init)=>{const path=new URL(url).pathname;calls.push({path,authorization:init.headers.Authorization});if(path==='/auth/me')return reply(200,baseSession());if(path==='/auth/refresh')return renew();if(path==='/dashboard/summary')return summary(calls.filter(c=>c.path===path).length);throw Error('unexpected');});
 return {h,calls,count:path=>calls.filter(c=>c.path===path).length};
}
test('200 direct no refresh',async()=>{const x=setup(async()=>reply(200,snap)),m=await x.h.mount();assert.ok(m.panel.snapshot);assert.equal(x.count('/auth/refresh'),0);await dispose(m.tree);});
test('401 refresh retry 200 updates session and rotation exactly once',async()=>{const x=setup(async n=>reply(n===1?401:200,snap)),m=await x.h.mount();assert.equal(x.count('/auth/refresh'),1);assert.equal(x.count('/dashboard/summary'),2);assert.ok(m.panel.snapshot);assert.equal(m.auth.session.access_token,'new-access');assert.equal(JSON.parse(x.h.data.get('bellory.session')).refresh_token,'new-refresh');assert.deepEqual(m.auth.session.tenant,baseSession().tenant);assert.deepEqual(m.auth.session.active_membership,baseSession().active_membership);assert.equal(x.h.data.get('esthya:booking-identity:client'),'client-token');assert.equal(x.calls.filter(c=>c.path==='/dashboard/summary')[1].authorization,'Bearer new-access');await dispose(m.tree);});
for(const status of [400,401,403])test('definitive refresh '+status+' stops polling',async()=>{const x=setup(async()=>reply(401),async()=>reply(status)),m=await x.h.mount();assert.equal(x.count('/auth/refresh'),1);assert.equal(x.count('/dashboard/summary'),1);assert.equal(m.auth.session,null);assert.equal(x.h.timers.size,0);assert.equal(x.h.data.has('bellory.session'),false);assert.equal(x.h.data.get('esthya:booking-identity:client'),'client-token');await act(async()=>m.panel.refresh());assert.equal(x.count('/auth/refresh'),1);await dispose(m.tree);});
test('retry 401 no second refresh',async()=>{const x=setup(async()=>reply(401)),m=await x.h.mount();assert.equal(x.count('/auth/refresh'),1);assert.equal(x.count('/dashboard/summary'),2);assert.equal(m.auth.session,null);assert.equal(x.h.timers.size,0);await dispose(m.tree);});
test('concurrent refresh is single flight and late 401 reuses session',async()=>{let release;const gate=new Promise(r=>release=r);const x=setup(async()=>reply(200,snap),async()=>{await gate;return reply(200,rotated());});const m=await x.h.mount(false),old=m.auth.session;await act(async()=>{const a=m.auth.refreshSession(old),b=m.auth.refreshSession(old);assert.equal(a,b);release();await Promise.all([a,b]);});await act(async()=>m.auth.refreshSession(old));assert.equal(x.count('/auth/refresh'),1);await dispose(m.tree);});
for(const kind of ['500','network'])test('dashboard '+kind+' preserves session without refresh',async()=>{const x=setup(async()=>{if(kind==='network')throw Error('offline');return reply(500);}),m=await x.h.mount();assert.equal(x.count('/auth/refresh'),0);assert.ok(m.auth.session);assert.ok(x.h.data.has('bellory.session'));assert.ok(m.panel.error);await dispose(m.tree);});
for(const kind of ['500','network'])test('refresh '+kind+' preserves session',async()=>{const x=setup(async()=>reply(401),async()=>{if(kind==='network')throw Error('offline');return reply(500);}),m=await x.h.mount();assert.equal(x.count('/auth/refresh'),1);assert.equal(x.count('/dashboard/summary'),1);assert.ok(m.auth.session);assert.ok(x.h.data.has('bellory.session'));assert.equal(x.h.timers.size,1);await dispose(m.tree);});
test('nonpersistent session stays nonpersistent',async()=>{const x=setup(async()=>reply(200,snap));x.h.data.delete('bellory.session');const m=await x.h.mount(false);await act(async()=>m.auth.setAuthenticatedSession(baseSession(),false));await act(async()=>m.auth.refreshSession());assert.equal(m.auth.session.access_token,'new-access');assert.equal(x.h.data.has('bellory.session'),false);await dispose(m.tree);});
test('refresh cannot change tenant',async()=>{const x=setup(async()=>reply(401),async()=>reply(200,{...rotated(),tenant:{id:'other'}})),m=await x.h.mount();assert.equal(m.auth.session,null);assert.equal(x.count('/dashboard/summary'),1);await dispose(m.tree);});
test('invalidation while refresh pending cannot resurrect session',async()=>{let release;const gate=new Promise(r=>release=r);const x=setup(async()=>reply(200,snap),async()=>{await gate;return reply(200,rotated());});const m=await x.h.mount(false);await act(async()=>{const old=m.auth.session,p=m.auth.refreshSession(old);m.auth.invalidateSession(old);release();await p;});assert.equal(m.auth.session,null);assert.equal(x.h.data.has('bellory.session'),false);await dispose(m.tree);});

test('manual refresh and polling overlap do not create duplicate operations',async()=>{
 let release;const gate=new Promise(r=>release=r);const x=setup(async n=>{if(n===2){await gate;return reply(401);}return reply(200,snap);});const m=await x.h.mount();
 await act(async()=>{const first=m.panel.refresh();const second=m.panel.refresh();for(const tick of x.h.timers.values())tick();release();await Promise.all([first,second]);});
 assert.equal(x.count('/dashboard/summary'),3);assert.equal(x.count('/auth/refresh'),1);assert.ok(m.panel.snapshot);await dispose(m.tree);
});
test('revalidation joins an existing refresh without rotating twice',async()=>{
 let release;const gate=new Promise(r=>release=r);const x=setup(async()=>reply(200,snap),async()=>{await gate;return reply(200,rotated());});const m=await x.h.mount(false);
 await act(async()=>{const a=m.auth.refreshSession(),b=m.auth.revalidateSession();release();const [session,validation]=await Promise.all([a,b]);assert.equal(session,validation.session);});assert.equal(x.count('/auth/refresh'),1);assert.equal(x.count('/auth/me'),1);await dispose(m.tree);
});
test('401 without refresh token invalidates and stops polling',async()=>{const x=setup(async()=>reply(401));const candidate=baseSession();delete candidate.refresh_token;x.h.seed(candidate);x.h.setResponse(async(url)=>new URL(url).pathname==='/auth/me'?reply(200,candidate):reply(401));const m=await x.h.mount();assert.equal(m.auth.session,null);assert.equal(x.h.timers.size,0);await dispose(m.tree);});
