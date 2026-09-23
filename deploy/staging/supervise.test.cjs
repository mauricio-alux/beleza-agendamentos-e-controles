const test = require('node:test');
const assert = require('node:assert/strict');
const {EventEmitter} = require('node:events');
const {supervise} = require('./supervise.cjs');
function fixture(graceMs=500) {
  const server = new EventEmitter();
  server.close = fn => {server.done=fn;};
  server.closeAllConnections = () => {};
  const exits=[];
  const lifecycle=supervise(server,{exit:c=>exits.push(c),graceMs});
  const child=()=>{const c=new EventEmitter();c.signals=[];c.kill=s=>c.signals.push(s);lifecycle.watch(c);return c;};
  return {server,exits,lifecycle,child};
}
for (const name of ['Next.js','Express'])test(`${name} exit stops sibling and waits for close`,()=>{
  const f=fixture();const first=f.child(),second=f.child();
  first.emit('close',0);assert.equal(f.lifecycle.stopping,true);assert.deepEqual(second.signals,['SIGTERM']);
  f.server.done();assert.deepEqual(f.exits,[]);
  second.emit('close',0);assert.deepEqual(f.exits,[1]);
});
test('gateway failure stops both children and exits nonzero',()=>{
  const f=fixture(),a=f.child(),b=f.child();f.server.emit('error',Error('test'));
  assert.deepEqual(a.signals,['SIGTERM']);assert.deepEqual(b.signals,['SIGTERM']);
  a.emit('close');b.emit('close');assert.deepEqual(f.exits,[]);f.server.done();assert.deepEqual(f.exits,[1]);
});
test('shutdown is idempotent and orderly only after all close events',()=>{
  const f=fixture(),a=f.child();f.lifecycle.shutdown(0);f.lifecycle.shutdown(0);f.server.done();assert.deepEqual(f.exits,[]);a.emit('close');assert.deepEqual(f.exits,[0]);assert.deepEqual(a.signals,['SIGTERM']);
});
test('unresponsive child receives SIGKILL and parent failure',async()=>{
  const f=fixture(15),a=f.child();f.lifecycle.shutdown(0);f.server.done();await new Promise(r=>setTimeout(r,40));assert.deepEqual(a.signals,['SIGTERM','SIGKILL']);assert.deepEqual(f.exits,[1]);
});
