const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function storage(initial={}){const values=new Map(Object.entries(initial));return {get length(){return values.size;},key:i=>[...values.keys()][i]||null,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
function compile(file,globals,imports={}){
 const source=fs.readFileSync(file,'utf8'),m={exports:{}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,
  {module:m,exports:m.exports,process:{env:{}},console,Intl,Date,Error,...globals,require:name=>{if(name in imports)return imports[name];throw Error('Unexpected import '+name);}});
 return m.exports;
}
function harness(store,api={},auth={session:null,isLoading:false}){
 const hooks=[],effects=[];let index=0,dirty=true,tree;const calls=[];
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={
  useState(initial){const i=index++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value;dirty=true;}];},
  useMemo(fn,deps){const i=index++;if(!hooks[i]||!same(hooks[i].deps,deps))hooks[i]={value:fn(),deps};return hooks[i].value;},
  useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
  useEffect(fn,deps){const i=index++;if(!hooks[i]||!same(hooks[i],deps)){hooks[i]=deps;effects.push(fn);}}
 };
 // React functions are called as module properties by TypeScript output.
 const window={localStorage:store,navigator:{userAgent:'test',language:'pt-BR'}};
 const stored=compile(__dirname+'/../../lib/recurring-access.storage.ts',{window});
 const services={
  getPublicBookingCatalog:async slug=>({tenant:{nome_fantasia:'Fixture studio',slug}}),
  identifyPublicBookingClient:async(slug,input)=>{calls.push({slug,input});return {token:input.token,client:{nome:'Fixture'}};},
  getUpcomingPublicAppointments:async(slug,token)=>{calls.push({upcoming:slug,token});return {appointments:[]};},...api
 };
 const jsx=(type,props)=>({type,props});
 const component=compile(__dirname+'/RecurringAccessPage.tsx',{window,document:{referrer:''}},{
  '@/components/app/ContextAccessLink':{ContextAccessLink:'ContextAccessLink'},
  react,'react/jsx-runtime':{jsx,jsxs:jsx},'lucide-react':new Proxy({},{get:(_,key)=>key}),
  'next/link':{default:'Link'},'./LocateAccess':{LocateAccess:'LocateAccess'},
  '@/components/ui/button':{Button:'Button'},'@/components/pwa/InstallPwaPrompt':{InstallPwaPrompt:'InstallPwaPrompt'},
  '@/hooks/useAuth':{useAuth:()=>auth},
  '@/lib/last-context':compile(__dirname+'/../../lib/last-context.ts',{window}),
  '@/lib/internal-entry':compile(__dirname+'/../../lib/internal-entry.ts',{},{
    '@/services/onboarding.service':{},'@/lib/recurring-access.storage':stored,
    '@/lib/last-context':compile(__dirname+'/../../lib/last-context.ts',{window})
  }),
  '@/services/public-booking.service':services,'@/lib/recurring-access.storage':stored,'@/config/app-brand':{APP_BRAND:{appName:'Fixture'}}
 }).RecurringAccessPage;
 return {calls,async render(){for(let n=0;n<20;n++){if(dirty){dirty=false;index=0;tree=component();effects.splice(0).forEach(fn=>fn());}await new Promise(resolve=>setImmediate(resolve));if(!dirty&&effects.length===0)return tree;}throw Error('Unsettled render');}};
}
function nodes(tree){if(!tree||typeof tree!=='object')return [];if(Array.isArray(tree))return tree.flatMap(nodes);return [tree,...nodes(tree.props?.children)];}
const saved={
 'esthya:preferred-tenant':JSON.stringify({slug:'studio-a',source:'booking',updatedAt:'2026-01-01'}),
 'esthya:known-tenants':JSON.stringify([{slug:'studio-a',displayName:'Fixture',hasLocalIdentity:true,lastAccessAt:'2026-01-01'}]),
 'esthya:booking-identity:studio-a':'valid-existing-token'
};
test('valid persisted TC on initial mount and remount bypasses locate and reidentification',async()=>{
 const store=storage(saved);
 for(let reopen=0;reopen<2;reopen++){
  const app=harness(store),tree=await app.render();
  assert.equal(nodes(tree).some(n=>n.type==='LocateAccess'),false);
  assert.equal(app.calls[0].slug,'studio-a');assert.equal(app.calls[0].input.token,'valid-existing-token');
  assert.equal(app.calls[0].input.cliente,undefined);
  assert.deepEqual(app.calls.find(c=>c.upcoming),{upcoming:'studio-a',token:'valid-existing-token'});
  assert.equal(store.getItem('esthya:booking-identity:studio-a'),'valid-existing-token');
  assert.equal(JSON.parse(store.getItem('esthya:preferred-tenant')).slug,'studio-a');
 }
});
test('known tenant without TC keeps public tenant link, no global locate',async()=>{
 const store=storage(saved);store.removeItem('esthya:booking-identity:studio-a');
 const app=harness(store),all=nodes(await app.render());
 assert.equal(all.some(n=>n.type==='LocateAccess'),false);
 assert.ok(all.some(n=>n.props?.href==='/agendar/studio-a'));assert.equal(app.calls.length,0);
});
test('orphan token key restores reference, never presents empty discovery',async()=>{
 const app=harness(storage({'esthya:booking-identity:studio-a':'valid-existing-token'}));
 assert.equal(nodes(await app.render()).some(n=>n.type==='LocateAccess'),false);assert.equal(app.calls[0].slug,'studio-a');
});
test('only truly empty readable state offers locate',async()=>{
 const app=harness(storage());assert.equal(nodes(await app.render()).some(n=>n.type==='LocateAccess'),true);
 const blocked=storage();blocked.getItem=()=>{throw Error('storage blocked');};
 assert.equal(nodes(await harness(blocked).render()).some(n=>n.type==='LocateAccess'),false);
});
test('invalid TC preserves tenant reference and routes to same public booking',async()=>{
 const store=storage(saved),app=harness(store,{identifyPublicBookingClient:async()=>{throw Error('Token expirado');}});
 const all=nodes(await app.render());assert.ok(all.some(n=>n.props?.href==='/agendar/studio-a'));
 assert.equal(store.getItem('esthya:booking-identity:studio-a'),null);
 assert.equal(JSON.parse(store.getItem('esthya:preferred-tenant')).slug,'studio-a');
});
test('frontend phone formatter never truncates excessive input and supports DDD 55',()=>{
 const phone=compile(__dirname+'/../../utils/phone.ts',{});
 assert.equal(phone.formatPhone('169999999999'),'169999999999');
 assert.equal(phone.isValidPhone('169999999999'),false);
 assert.equal(phone.normalizePhoneToE164('55999999999'),'+5555999999999');
});

test('dual context offers /app return without touching internal session; client signout stays scoped',async()=>{
 const internal={access_token:'internal-fixture',usuario:{tipo_usuario:'Administrador'},tenant:{id:'tenant-a'},active_membership:{role:'Administrador',status:'ativo',tenant_id:'tenant-a'}};
 const store=storage({...saved,'bellory.session':JSON.stringify(internal)});
 const app=harness(store,{}, {session:internal,isLoading:false}),all=nodes(await app.render());
 const link=all.find(n=>n.type==='ContextAccessLink'&&n.props.target==='professional');
 assert.ok(link);assert.equal(link.props.onClick,undefined);
 assert.equal(all.some(n=>n.props?.href==='/dashboard'),false);
 assert.equal(store.getItem('bellory.session'),JSON.stringify(internal));
 assert.equal(store.getItem('esthya:booking-identity:studio-a'),'valid-existing-token');
 const signout=all.find(n=>n.type==='Button'&&Array.isArray(n.props.children)&&n.props.children.some(x=>typeof x==='string'&&x.includes('Sair deste dispositivo')));
 assert.ok(signout);signout.props.onClick();await app.render();
 assert.equal(store.getItem('bellory.session'),JSON.stringify(internal));
 assert.equal(store.getItem('esthya:booking-identity:studio-a'),null);
});
test('client-only context offers explicit professional entry without requiring a session',async()=>{
 const store=storage(saved);
 assert.equal(nodes(await harness(store).render()).some(n=>n.type==='ContextAccessLink'&&n.props.target==='professional'),true);
 assert.equal(JSON.parse(store.getItem('esthya:last-context')).context,'client');
});
