const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
function storage(initial={}){const values=new Map(Object.entries(initial));return {get length(){return values.size;},key:i=>[...values.keys()][i]||null,getItem:k=>values.get(k)||null,setItem:(k,v)=>values.set(k,String(v)),removeItem:k=>values.delete(k)};}
function compile(file,globals,imports={}){
 const source=fs.readFileSync(file,'utf8'),m={exports:{}};
 vm.runInNewContext(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,
  {module:m,exports:m.exports,process:{env:{}},console,Intl,Date,Error,...globals,require:name=>{if(name in imports)return imports[name];throw Error('Unexpected import '+name);}});
 return m.exports;
}
const credentialErrors=compile(__dirname+'/../../lib/client-credential-error.ts',{});
function harness(store,api={},auth={session:null,isLoading:false}){
 const hooks=[],effects=[];let index=0,dirty=true,tree;const calls=[];
 const same=(a,b)=>a&&b&&a.length===b.length&&a.every((v,i)=>Object.is(v,b[i]));
 const react={
  useState(initial){const i=index++;if(!(i in hooks))hooks[i]=typeof initial==='function'?initial():initial;return [hooks[i],value=>{hooks[i]=typeof value==='function'?value(hooks[i]):value;dirty=true;}];},
  useMemo(fn,deps){const i=index++;if(!hooks[i]||!same(hooks[i].deps,deps))hooks[i]={value:fn(),deps};return hooks[i].value;},
  useCallback(fn,deps){return react.useMemo(()=>fn,deps);},
  useEffect(fn,deps){const i=index++;if(!hooks[i]||!same(hooks[i].deps,deps)){hooks[i]?.cleanup?.();const entry={deps};hooks[i]=entry;effects.push(()=>{entry.cleanup=fn();});}}
 };
 // React functions are called as module properties by TypeScript output.
 const window={localStorage:store,navigator:{userAgent:'test',language:'pt-BR'}};
 const stored=compile(__dirname+'/../../lib/recurring-access.storage.ts',{window});
 const services={
  getPublicBookingCatalog:async slug=>({tenant:{nome_fantasia:'Fixture studio',slug}}),
  identifyPublicBookingClient:async(slug,input)=>{calls.push({slug,input});return {token:input.token,client:{nome:'Fixture'}};},
  getUpcomingPublicAppointments:async(slug,token)=>{calls.push({upcoming:slug,token});return {appointments:[]};},
  getPublicAppointmentHistory:async(slug,token)=>{calls.push({history:slug,token});return {appointments:[]};},...api
 };
 const jsx=(type,props)=>({type,props});
 const component=compile(__dirname+'/RecurringAccessPage.tsx',{window,document:{referrer:''}},{
  '@/components/app/ContextAccessLink':{ContextAccessLink:'ContextAccessLink'},
  '@/lib/client-credential-error':credentialErrors,
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
function textOf(tree){if(typeof tree==='string')return tree;if(Array.isArray(tree))return tree.map(textOf).join(' ');return tree?.props?textOf(tree.props.children):'';}
async function selectPeriod(app, label){const tree=await app.render();nodes(tree).find(n=>n.type==='Button'&&n.props.children===label).props.onClick();return app.render();}
test('history tabs preserve upcoming links, render terminal labels, and use selected tenant TC',async()=>{
 const store=storage(saved);let requests=0;
 const future={id:'next',data_inicio:'2999-01-01',servico:{nome:'Future service'},operational:{links:{reagendar:'/reagendar?tk=fixture',cancelar:'/acao_agendamento?tk=fixture'}}};
 const app=harness(store,{
  getUpcomingPublicAppointments:async()=>({appointments:[future]}),
  getPublicAppointmentHistory:async(slug,token)=>{requests++;assert.equal(slug,'studio-a');assert.equal(token,'valid-existing-token');return {appointments:['concluido','cancelado','no_show'].map((status,i)=>({id:String(i),data_inicio:'2000-01-01',status,servico:{nome:'Past service'},profissional:{nome_publico:'Fixture professional'}}))};}
 });
 let tree=await app.render();assert.equal(requests,0);
 const section=()=>nodes(tree).find(n=>n.props?.['aria-labelledby']==='appointments-title');
 assert.ok(nodes(section()).some(n=>n.props?.href===future.operational.links.reagendar));
 assert.ok(nodes(section()).some(n=>n.props?.href===future.operational.links.cancelar));
 tree=await selectPeriod(app,'Histórico');
 for(const label of ['Concluído','Cancelado','Não compareceu','Past service','Fixture professional'])assert.ok(textOf(section()).includes(label));
 assert.equal(nodes(section()).some(n=>n.props?.href),false);
 tree=await selectPeriod(app,'Próximos');assert.ok(textOf(section()).includes('Future service'));assert.equal(requests,1);
});
test('empty history is shown normally and transient failure retries without removing TC',async()=>{
 const store=storage(saved);let fail=true;
 const app=harness(store,{getPublicAppointmentHistory:async()=>{if(fail)throw Error('network');return {appointments:[]};}});
 let tree=await selectPeriod(app,'Histórico');assert.ok(textOf(tree).includes('Não foi possível carregar seu histórico'));
 assert.equal(store.getItem('esthya:booking-identity:studio-a'),'valid-existing-token');
 fail=false;nodes(tree).find(n=>n.type==='Button'&&n.props.children==='Tentar novamente').props.onClick();tree=await app.render();
 assert.ok(textOf(tree).includes('Você ainda não possui atendimentos no histórico.'));
 assert.equal(nodes(tree).some(n=>n.props?.role==='alert'),false);
 tree=await selectPeriod(app,'Próximos');assert.ok(textOf(tree).includes('Nenhum horário futuro encontrado.'));
});
test('late history response is ignored after selecting another tenant',async()=>{
 const store=storage({...saved,'esthya:known-tenants':JSON.stringify([{slug:'studio-a',displayName:'A'},{slug:'studio-b',displayName:'B'}]),'esthya:booking-identity:studio-b':'second-token'});
 let finish;
 const app=harness(store,{getPublicAppointmentHistory:async slug=>slug==='studio-a'?new Promise(resolve=>{finish=resolve;}):{appointments:[]}});
 let tree=await selectPeriod(app,'Histórico');
 nodes(tree).find(n=>n.type==='Button'&&textOf(n).includes('Trocar')).props.onClick();tree=await app.render();
 await nodes(tree).find(n=>n.type==='button'&&textOf(n).includes('studio-b')).props.onClick();tree=await app.render();
 finish({appointments:[{id:'old',data_inicio:'2000-01-01',status:'concluido',servico:{nome:'Wrong tenant history'}}]});
 tree=await selectPeriod(app,'Histórico');assert.equal(textOf(tree).includes('Wrong tenant history'),false);
 assert.ok(textOf(tree).includes('Você ainda não possui atendimentos no histórico.'));
});
for(const scope of ['load','profile']) for(const [reason,status,code,definitive] of [
 ['invalid',401,'CLIENT_TOKEN_INVALID',true],['revoked',401,'CLIENT_TOKEN_INVALID',true],
 ['expired',410,'CLIENT_TOKEN_EXPIRED',true],['ineligible',403,'CLIENT_IDENTITY_UNAVAILABLE',true],
 ['network',0,'',false],['timeout',0,'',false],['5xx',503,'CLIENT_TOKEN_INVALID',false]
])test('recurring '+scope+' credential lifecycle '+reason,async()=>{
 const store=storage(saved);let fail=true;
 const operation=async()=>{
  if(fail){if(status)throw new credentialErrors.ClientCredentialError('Falha cliente',status,code);throw Error(reason);}
  return {token:'valid-existing-token',client:{nome:'Fixture'},nome:'Fixture'};
 };
 const app=harness(store,scope==='load'?{identifyPublicBookingClient:operation}:{getPublicClientMe:operation});
 let tree=await app.render();
 if(scope==='profile'){
  await nodes(tree).find(n=>n.type==='Button'&&n.props.onClick?.name==='openProfile').props.onClick();
  tree=await app.render();
 }
 assert.equal(store.getItem('esthya:booking-identity:studio-a'),definitive?null:'valid-existing-token');
 assert.equal(JSON.parse(store.getItem('esthya:preferred-tenant')).slug,'studio-a');
 if(!definitive){
  fail=false;
  const retry=nodes(tree).find(n=>n.type==='Button'&&(scope==='profile'?n.props.onClick?.name==='openProfile':n.props.children==='Tentar novamente'));
  await retry.props.onClick();await app.render();
  assert.equal(store.getItem('esthya:booking-identity:studio-a'),'valid-existing-token');
 }
});

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
  assert.ok(nodes(tree).some(n=>n.props?.href==='/agendar/studio-a'));
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
 const store=storage(saved),app=harness(store,{identifyPublicBookingClient:async()=>{throw new credentialErrors.ClientCredentialError('Token expirado',410,'CLIENT_TOKEN_EXPIRED');}});
 const all=nodes(await app.render());assert.ok(all.some(n=>n.props?.href==='/agendar/studio-a'));
 assert.equal(store.getItem('esthya:booking-identity:studio-a'),null);
 assert.equal(JSON.parse(store.getItem('esthya:preferred-tenant')).slug,'studio-a');
});
test('frontend phone formatter never truncates excessive input and supports DDD 55',()=>{
 const phone=compile(__dirname+'/../../utils/phone.ts',{});
 // Fixtures sinteticas: preservam excesso de digitos e DDD 55, sem contato real.
 const TEST_PHONE_TOO_LONG='110000000001';
 const TEST_PHONE_DDD_55='55000000001';
 assert.equal(phone.formatPhone(TEST_PHONE_TOO_LONG),TEST_PHONE_TOO_LONG);
 assert.equal(phone.isValidPhone(TEST_PHONE_TOO_LONG),false);
 assert.equal(phone.normalizePhoneToE164(TEST_PHONE_DDD_55),'+55'+TEST_PHONE_DDD_55);
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
