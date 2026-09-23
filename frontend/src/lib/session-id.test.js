const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const test = require('node:test');
const vm = require('node:vm');
const ts = require('typescript');
const { webcrypto } = require('node:crypto');

const source = fs.readFileSync(path.join(__dirname, 'session-id.ts'), 'utf8');
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 }
});
function load(crypto) {
  const exports = {};
  vm.runInNewContext(outputText, { exports, crypto });
  return exports;
}
function storage(initial = {}) {
  const values = new Map(Object.entries(initial));
  return {
    writes: 0,
    getItem(key) { return values.get(key) ?? null; },
    setItem(key, value) { this.writes++; values.set(key, value); }
  };
}
const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

test('A: prefers native randomUUID and preserves its receiver', () => {
  const expected = 'e4f65d04-5a7e-4e66-b710-e1cb29369bd0';
  const crypto = {
    randomUUID() { assert.equal(this, crypto); return expected; },
    getRandomValues() { assert.fail('fallback must not run'); }
  };
  assert.equal(load(crypto).createSessionId(), expected);
});

test('B: fallback produces UUID v4 with secure random bytes', () => {
  const crypto = {
    getRandomValues(bytes) {
      assert.equal(this, crypto);
      assert.equal(bytes.length, 16);
      return bytes.fill(255);
    }
  };
  assert.equal(load(crypto).createSessionId(), 'ffffffff-ffff-4fff-bfff-ffffffffffff');
  const real = load({ getRandomValues: webcrypto.getRandomValues.bind(webcrypto) });
  const ids = Array.from({ length: 100 }, () => real.createSessionId());
  ids.forEach(id => assert.match(id, uuidPattern));
  assert.equal(new Set(ids).size, ids.length);
});

test('C: existing session is reused without crypto or storage writes', () => {
  const store = storage({ session: 'existing-session' });
  assert.equal(load(undefined).getOrCreateSessionId(store, 'session'), 'existing-session');
  assert.equal(store.writes, 0);
});

test('D: missing or empty session is created and persisted once', () => {
  for (const initial of [{}, { session: '' }]) {
    const store = storage(initial);
    let calls = 0;
    const helper = load({ randomUUID() { calls++; return 'e4f65d04-5a7e-4e66-b710-e1cb29369bd0'; } });
    const id = helper.getOrCreateSessionId(store, 'session');
    assert.equal(store.getItem('session'), id);
    assert.equal(helper.getOrCreateSessionId(store, 'session'), id);
    assert.equal(store.writes, 1);
    assert.equal(calls, 1);
  }
});

test('E: fallback depends only on random bytes, not session keys or PII', () => {
  const helper = load({ getRandomValues(bytes) { return bytes.fill(0); } });
  const store = storage();
  const id = helper.getOrCreateSessionId(store, 'person@example.com:+5511999999999');
  assert.equal(id, '00000000-0000-4000-8000-000000000000');
  assert.match(id, uuidPattern);
});

test('never creates or persists an insecure ID if crypto is unavailable', () => {
  for (const crypto of [undefined, {}]) {
    const store = storage();
    assert.throws(() => load(crypto).getOrCreateSessionId(store, 'session'), /identificador de sessao seguro/);
    assert.equal(store.writes, 0);
  }
});
