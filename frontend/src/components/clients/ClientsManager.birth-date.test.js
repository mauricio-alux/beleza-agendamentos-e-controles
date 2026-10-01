const test=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const path=require('node:path');
const vm=require('node:vm');
const ts=require('typescript');
const {validBirthDate}=require('../../../../backend/src/modules/public-booking/identity-policy');
const saved={id:'fixture',nome:'Fixture',telefone:'+5516999999999',email:null,observacoes:null,endereco:null,aceita_campanhas:true,status:'ativo',data_nascimento:null,qtd_atendimentos:0,total_gasto:0,created_at:'2026-01-01'};
const clone=x=>JSON.parse(JSON.stringify(x));
function harness(kind='clients', client=saved, fail=false){
 const hooks=[],effects=[],calls=[];let i=0;
 const react={
  useState(initial){const n=i++;if(!(n in hooks))hooks[n]=typeof initial==='function'?initial():initial;return[hooks[n],v=>{hooks[n]=typeof v==='function'?v(hooks[n]):v;}];},
  useRef(initial){const n=i++;if(!(n in hooks))hooks[n]={current:initial};return hooks[n];},
  useMemo(fn){return fn();},
  useEffect(fn,deps){const n=i++;if(!hooks[n]||deps.some((x,j)=>x!==hooks[n][j])){hooks[n]=deps;effects.push(fn);}}
 };
 const session={access_token:'fixture-only'};
 const clientService={
  list:async()=>[clone(client)],
  create:async(s,p)=>{calls.push(['create',clone(p)]);return{...client,...p};},
  update:async(s,id,p)=>{calls.push(['patch',clone(p)]);if(fail)throw Error('Este cadastro está vinculado a mais de um estabelecimento. A data de nascimento não pode ser alterada por este fluxo.');return{...client,...p};}
 };
 const agenda={date:'2099-01-01',selectedProfessionalId:'p',selectedServiceId:'s',selectedSpecialtyId:'e',isLoading:false,meta:{},createAppointment:async p=>{calls.push(['agenda',clone(p)]);return{id:'new'};}};
 const jsx=(type,props)=>({type,props});
 const imports={
  react,'react/jsx-runtime':{jsx,jsxs:jsx},
  'next/navigation':{useSearchParams:()=>({get:()=>null}),useRouter:()=>({replace(){}})},
  '@/hooks/useAuth':{useAuth:()=>({session})},'@/hooks/useAgenda':{useAgenda:()=>agenda},
  '@/services/clients.service':{clientsService:clientService},
  '@/components/agenda/date':{isPastDateInput:()=>false},
  '@/utils/phone':{formatStoredPhone:x=>x,getNationalPhone:x=>x.replace(/^\+55/,''),isValidPhone:x=>x.replace(/\D/g,'').length>=10,normalizePhoneToE164:x=>x.startsWith('+')?x:'+55'+x.replace(/\D/g,'')}
 };
 const filename=path.resolve(__dirname,kind==='clients'?'ClientsManager.tsx':'../agenda/NewAppointmentForm.tsx'),module={exports:{}};
 vm.runInNewContext(ts.transpileModule(fs.readFileSync(filename,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX,target:ts.ScriptTarget.ES2020}}).outputText,{
  module,exports:module.exports,Error,Date,Intl,URLSearchParams,AbortController,console,
  window:{setTimeout(){},navigator:{userAgent:'fixture',language:'pt-BR'}},
  fetch(){throw Error('Unexpected network');},
  require(name){if(name in imports)return imports[name];if(name==='lucide-react'||name.startsWith('@/components/'))return new Proxy({},{get:(o,k)=>k});throw Error(name);}
 },{filename});
 const flat=n=>Array.isArray(n)?n.flatMap(flat):n&&typeof n==='object'?[n,...flat(n.props?.children)]:[];
 function nodes(){i=0;return flat(kind==='clients'?module.exports.ClientsManager():module.exports.NewAppointmentForm());}
 function field(type){return nodes().filter(n=>n.type==='Input'&&n.props.type===type);}
 function input(placeholder,value){nodes().find(n=>n.type==='Input'&&n.props.placeholder===placeholder).props.onChange({target:{value}});}
 function reportValidity(index){let ok=true;const dates=kind==='clients'?[field('date')[index]]:field('date');for(const n of dates){if(kind==='agenda'&&nodes().find(n=>n.type==='select').props.value)continue;const v=n.props.value;if((!v&&n.props.required)||(v&&!validBirthDate(v))){n.props.onInvalid?.();ok=false;}}return ok;}
 return {calls,nodes,field,input,
  async mount(){nodes();while(effects.length)effects.shift()();await new Promise(r=>setImmediate(r));nodes();},
  birth(value,index=0){field('date')[index].props.onChange({target:{value}});},
  async submit(index=0){await nodes().filter(n=>n.type==='form')[index].props.onSubmit({preventDefault(){},currentTarget:{reportValidity:()=>reportValidity(index)}});},
  open(){nodes().find(n=>n.props?.['aria-label']==='Editar cliente '+client.nome).props.onClick();},
  fill(){input('Nome do cliente','Fixture');nodes().find(n=>n.type==='PhoneInput').props.onChange('16999999999');},
  text(){return JSON.stringify(nodes());}
 };
}
test('Client create requires birth, sends ISO date and preserves consent contract',async()=>{
 const h=harness();await h.mount();h.fill();
 assert.equal(h.field('date')[0].props.required,true);
 await h.submit();assert.equal(h.calls.length,0);
 h.birth('1990-05-15');await h.submit();
 assert.equal(h.calls[0][1].data_nascimento,'1990-05-15');
});
for(const birth of ['2999-01-01','1990-02-30'])test('Client form surfaces native invalid/future date '+birth,async()=>{
 const h=harness();await h.mount();h.fill();h.birth(birth);await h.submit();
 assert.equal(h.calls.length,0);assert.match(h.text(),/válida e não futura/);
});
test('Edit loads birth and cannot clear it',async()=>{
 const h=harness('clients',{...saved,data_nascimento:'1990-05-15'});await h.mount();h.open();
 assert.equal(h.field('date')[1].props.value,'1990-05-15');h.birth('',1);await h.submit(1);assert.equal(h.calls.length,0);
});
test('Legacy birth can be filled with birth-only PATCH',async()=>{
 const h=harness();await h.mount();h.open();h.birth('1990-05-15',1);await h.submit(1);
 assert.deepEqual(h.calls,[['patch',{data_nascimento:'1990-05-15'}]]);
});
test('Legacy other field edit does not require birth or reset omitted fields',async()=>{
 const h=harness();await h.mount();h.open();
 const editInputs=h.nodes().filter(n=>n.type==='Input'&&n.props.value==='Fixture');
 editInputs[0].props.onChange({target:{value:'New name'}});
 await h.submit(1);assert.deepEqual(h.calls,[['patch',{nome:'New name'}]]);
});
test('Shared failure displays functional error and preserves saved and form values',async()=>{
 const h=harness('clients',{...saved,data_nascimento:'1990-05-15'},true);await h.mount();h.open();h.birth('1991-05-15',1);await h.submit(1);
 assert.match(h.text(),/mais de um estabelecimento/);assert.equal(h.field('date')[1].props.value,'1991-05-15');
 assert.doesNotMatch(h.text(),/other-tenant/);
});
test('Agenda new client requires birth and sends same field',async()=>{
 const h=harness('agenda');await h.mount();h.fill();
 h.nodes().find(n=>n.type==='TimeSlots').props.onSelect('2099-01-01T12:00:00Z');
 await h.submit();assert.equal(h.calls.length,0);
 h.birth('1990-05-15');await h.submit();assert.equal(h.calls[0][1].cliente.data_nascimento,'1990-05-15');
});
for(const birth of [null,'1990-05-15'])test('Agenda selects existing client without birth requirement '+birth,async()=>{
 const h=harness('agenda',{...saved,data_nascimento:birth});await h.mount();
 h.nodes().find(n=>n.type==='select').props.onChange({target:{value:'fixture'}});
 h.nodes().find(n=>n.type==='TimeSlots').props.onSelect('2099-01-01T12:00:00Z');
 assert.equal(h.field('date')[0].props.required,false);await h.submit();
 assert.equal(h.calls[0][1].cliente_id,'fixture');assert.equal(h.calls[0][1].cliente,undefined);
});

test('Birth-only edit preserves preexisting blocked status and address representation',async()=>{
 const h=harness('clients',{...saved,status:'bloqueado',endereco:{cep:'14000000',uf:null,cidade:'Saved',numero:null}});
 await h.mount();h.open();h.birth('1990-05-15',1);await h.submit(1);
 assert.deepEqual(h.calls,[['patch',{data_nascimento:'1990-05-15'}]]);
});
for(const birth of ['2999-01-01','1990-02-30'])test('Agenda new client rejects invalid/future birth '+birth,async()=>{
 const h=harness('agenda');await h.mount();h.fill();
 h.nodes().find(n=>n.type==='TimeSlots').props.onSelect('2099-01-01T12:00:00Z');
 h.birth(birth);await h.submit();assert.equal(h.calls.length,0);assert.match(h.text(),/válida e não futura/);
});
