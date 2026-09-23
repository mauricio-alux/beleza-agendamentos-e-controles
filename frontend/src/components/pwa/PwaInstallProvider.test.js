const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

test('captura evento antes do sucesso, consome uma vez e acompanha standalone/instalação', () => {
  const state = [], callbacks = new Map(), media = new Map();
  let cursor = 0, mounted = false, effect, cleanup;
  const react = {
    createContext: () => ({ Provider: 'provider' }),
    useState(initial) { const i = cursor++; if (!(i in state)) state[i] = initial; return [state[i], value => { state[i] = value; }]; },
    useEffect(fn) { if (!mounted) effect = fn; }
  };
  const module = { exports: {} };
  const output = ts.transpileModule(fs.readFileSync(path.join(__dirname, 'PwaInstallProvider.tsx'), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText;
  vm.runInNewContext(output, {
    module, exports: module.exports, navigator: {},
    window: {
      addEventListener: (key, fn) => callbacks.set(key, fn), removeEventListener: key => callbacks.delete(key),
      matchMedia(query) {
        const item = { matches: false, addEventListener: (_, fn) => { item.change = fn; }, removeEventListener: () => { item.change = null; } };
        media.set(query, item); return item;
      }
    },
    require: name => name === 'react' ? react : name === './pwa-diagnostics' ? { pwaLog: () => {} } : { jsx: (type, props) => ({ type, props }) }
  });
  function render() {
    cursor = 0;
    const tree = module.exports.PwaInstallProvider({ children: 'booking' });
    if (!mounted) { mounted = true; cleanup = effect(); return render(); }
    return tree.props.value;
  }
  assert.equal(render().ready, true);
  let prevented = false, prompts = 0;
  const event = { preventDefault: () => { prevented = true; }, prompt: () => { prompts++; } };
  callbacks.get('beforeinstallprompt')(event);
  assert.equal(render().event, event);
  assert.equal(prevented, true);
  assert.equal(prompts, 0);
  render().consume();
  assert.equal(render().event, null);
  const standalone = media.get('(display-mode: standalone)');
  standalone.matches = true; standalone.change();
  assert.equal(render().standalone, true);
  standalone.matches = false; standalone.change();
  assert.equal(render().standalone, false);
  callbacks.get('appinstalled')();
  assert.equal(render().standalone, true);
  cleanup();
  assert.equal(callbacks.size, 0);
});
