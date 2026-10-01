
const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm'),ts=require('typescript');
const root=path.resolve(__dirname,'../..');
function load(file,imports={},globals={}){
 const module={exports:{}};
 const output=ts.transpileModule(fs.readFileSync(path.join(root,file),'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2020,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(output,{module,exports:module.exports,process:{env:{}},console,URL,Response,AbortController,setTimeout,clearTimeout,...globals,require:name=>{if(name in imports)return imports[name];throw Error(name);}});
 return module.exports;
}
const jsx=(type,props)=>({type,props});
function nodes(t){return !t||typeof t!=='object'?[]:Array.isArray(t)?t.flatMap(nodes):[t,...nodes(t.props?.children)];}
test('operational shell has one install placement and a plain client link after access gate',()=>{
 let logout=0;const auth={session:{},isAuthenticated:true,isLoading:false,logout:()=>logout++};
 const imports={react:{useEffect:()=>{}},'react/jsx-runtime':{jsx,jsxs:jsx},'next/link':{default:'Link'},'next/navigation':{useRouter:()=>({replace:()=>{}}),usePathname:()=>'/dashboard'},'lucide-react':{Loader2:'Loader',ShieldAlert:'Shield'},'@/components/pwa/InstallPwaPrompt':{InstallPwaPrompt:'Install'},'@/components/ui/button':{Button:'Button'},'@/components/dashboard/MobileBottomNav':{MobileBottomNav:'Nav'},'@/components/dashboard/Sidebar':{Sidebar:'Sidebar'},'@/components/dashboard/TopHeader':{TopHeader:'Header'},'@/components/dashboard/navigation':{canAccessDashboardPath:()=>true},'@/hooks/useAuth':{useAuth:()=>auth}};
 imports['@/components/app/ContextAccessLink']={ContextAccessLink:'ContextAccessLink'};
 imports['@/lib/last-context']={writeLastContext:()=>{}};
 const {DashboardLayout}=load('layouts/DashboardLayout.tsx',imports);
 const all=nodes(DashboardLayout({children:'body'}));
 const link=all.find(n=>n.type==='ContextAccessLink'&&n.props.target==='client');assert.ok(link);assert.equal(link.props.onClick,undefined);assert.equal(logout,0);
 const install=all.filter(n=>n.type==='Install');assert.equal(install.length,1);assert.equal(install[0].props.placement,'operational');
 auth.isAuthenticated=false;assert.equal(nodes(DashboardLayout({children:'body'})).some(n=>n.type==='Install'||n.type==='ContextAccessLink'),false);
});
test('internal logout removes only administrative storage',async()=>{
 const values=new Map([['bellory.session','internal'],['esthya:booking-identity:salon-b','client'],['esthya:preferred-tenant','salon-b'],['esthya:known-tenants','known']]);
 const {authService}=load('services/auth.service.ts',{'@/lib/messages':{normalizeUserMessage:x=>x},'@/config/app-brand':{API_URL:'https://test.invalid'}},{window:{localStorage:{removeItem:k=>values.delete(k)}},fetch:async()=>({ok:true,json:async()=>({data:{success:true}})})});
 await authService.logout('fixture');assert.equal(values.has('bellory.session'),false);assert.equal(values.size,3);
 assert.equal(values.get('esthya:booking-identity:salon-b'),'client');
});
test('generated route preserves old app identity while changing only launch URL and explicit id',async()=>{
 const manifest=load('lib/pwa-manifest.ts');
 const route=load('app/manifest.webmanifest/route.ts',{'@/config/app-brand':{APP_BRAND:{appName:'MyEsthya'}},'@/lib/pwa-manifest':manifest});
 const response=route.GET(),body=await response.json();
 assert.equal(body.id,'/acesso');assert.equal(body.start_url,'/app');assert.equal(body.scope,'/');assert.equal(body.display,'standalone');assert.equal(body.name,'MyEsthya');
 assert.equal(new URL(body.id,'https://example.test').href,new URL('/acesso','https://example.test').href);
 assert.equal(response.headers.get('content-type'),'application/manifest+json');
 const previous=require('node:child_process').execFileSync('git',['show','HEAD:frontend/src/lib/pwa-manifest.ts'],{encoding:'utf8'});
 const m={exports:{}};vm.runInNewContext(ts.transpileModule(previous,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{module:m,exports:m.exports});
 const old=m.exports.buildPwaManifest({appName:'MyEsthya'});delete body.id;body.start_url=old.start_url;
 assert.equal(JSON.stringify(body),JSON.stringify(old));
});
test('existing service worker handles /app navigation with offline fallback and no page caching',async()=>{
 const handlers={};let fail=false,put=0;
 vm.runInNewContext(fs.readFileSync(path.join(root,'../public/sw.js'),'utf8'),{URL,self:{location:{origin:'https://example.test'},addEventListener:(name,fn)=>handlers[name]=fn},fetch:async()=>{if(fail)throw Error('offline');return 'network';},caches:{match:async p=>p,put:()=>put++}});
 const navigate=async()=>{let response;handlers.fetch({request:{method:'GET',url:'https://example.test/app',mode:'navigate'},respondWith:p=>response=p});return response;};
 assert.equal(await navigate(),'network');fail=true;assert.equal(await navigate(),'/offline');assert.equal(put,0);
});
