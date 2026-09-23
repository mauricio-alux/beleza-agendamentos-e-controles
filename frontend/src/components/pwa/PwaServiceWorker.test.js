const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function setup(readyState, secure = true) {
  let effect, calls = 0;
  const listeners = new Map(), logs = [];
  const module = { exports: {} };
  const source = fs.readFileSync(__dirname + '/PwaServiceWorker.tsx', 'utf8');
  vm.runInNewContext(ts.transpileModule(source, {compilerOptions: {module: ts.ModuleKind.CommonJS}}).outputText, {
    module, exports: module.exports,
    require: name => name === 'react' ? {useEffect: fn => {effect = fn;}} : {pwaLog: e => logs.push(e)},
    window: {isSecureContext: secure, addEventListener: (e, fn) => listeners.set(e,fn), removeEventListener: e => listeners.delete(e)},
    document: {readyState, head: {querySelector: () => ({})}},
    navigator: {serviceWorker: {controller: null, addEventListener() {}, removeEventListener() {}, register: () => {calls++;return Promise.resolve({update: () => Promise.resolve()});}}}
  });
  return {mount() {module.exports.PwaServiceWorker();return effect();}, load() {listeners.get('load')?.();}, calls: () => calls, listeners, logs};
}
test('registers immediately after load and deduplicates StrictMode remounts', async () => {
  const h=setup('complete');const cleanup=h.mount();cleanup();h.mount();
  await Promise.resolve();assert.equal(h.calls(),1);assert.ok(h.logs.includes('service worker registered'));
});
test('waits for load when needed, cleans listener on unmount, registers once', () => {
  const h=setup('interactive');const cleanup=h.mount();assert.equal(h.calls(),0);cleanup();h.load();assert.equal(h.calls(),0);
  h.mount();h.load();h.load();assert.equal(h.calls(),1);
});
test('does not register in insecure context', () => {
  const h=setup('complete',false);h.mount();h.load();assert.equal(h.calls(),0);
});
test('diagnostics require explicit DEV opt-in and have no payload', () => {
  const source=fs.readFileSync(__dirname+'/pwa-diagnostics.ts','utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText;
  for(const enabled of [undefined,'false','true']){
    const module={exports:{}},logs=[];
    vm.runInNewContext(output,{module,exports:module.exports,process:{env:{NEXT_PUBLIC_DEV_PWA_DIAGNOSTICS:enabled}},console:{info:line=>logs.push(line)}});
    module.exports.pwaLog('prompt invoked');assert.equal(logs.length,enabled==='true'?1:0);
  }
});
