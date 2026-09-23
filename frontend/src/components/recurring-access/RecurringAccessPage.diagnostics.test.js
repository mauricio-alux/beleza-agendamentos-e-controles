const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript');
const source=fs.readFileSync(__dirname+'/RecurringAccessPage.tsx','utf8');
const empty=source.slice(source.indexOf('{state === "empty" ? ('),source.indexOf('{state === "choose" ? ('));
const expression=empty.match(/\{(process\.env\.NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS === "true" \? \([\s\S]*?\) : null)\}/)[1];
function render(flag){
 const m={exports:{}};let effects=0;
 const forbidden=()=>{effects++;throw Error('Unexpected side effect');};
 const output=ts.transpileModule('export const result=('+expression+');',{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
 vm.runInNewContext(output,{module:m,exports:m.exports,process:{env:{NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS:flag}},Link:'next-link',window:new Proxy({},{get:forbidden}),localStorage:new Proxy({},{get:forbidden}),sessionStorage:new Proxy({},{get:forbidden}),fetch:forbidden,require(name){assert.equal(name,'react/jsx-runtime');return {jsx:(type,props)=>({type,props})};}});
 return {element:m.exports.result,effects};
}
test('DEV true renders internal Next Link in empty state only',()=>{const {element,effects}=render('true');assert.equal(element.type,'next-link');assert.equal(element.props.children,'Diagnóstico DEV');assert.equal(effects,0);assert.equal(source.split('Diagnóstico DEV').length-1,1);});
test('disabled and absent flag hide link',()=>{for(const flag of ['false',undefined,'TRUE','1'])assert.equal(render(flag).element,null);});
test('exact same-origin destination, no parameters, external target, prefetch or side effects',()=>{const {element,effects}=render('true');assert.equal(element.props.href,'/pwa-diagnostics');assert.equal(element.props.prefetch,false);assert.equal(element.props.target,undefined);assert.equal(element.props.onClick,undefined);assert.equal(effects,0);assert.deepEqual(Object.keys(element.props).sort(),['children','className','href','prefetch']);});
