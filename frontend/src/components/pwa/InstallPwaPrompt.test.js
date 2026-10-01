const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');

// Execute the component and its handlers with deterministic browser/hook state.
function harness({ context = {}, stored = {}, ios = false, storageFails = false } = {}) {
  const state = [], effects = [], logs = [];
  let cursor = 0, mounted = false;
  const install = { ready: true, standalone: false, event: null, consume() { this.event = null; }, ...context };
  install.consume = () => { install.event = null; };
  const react = {
    useState(initial) { const index = cursor++; if (!(index in state)) state[index] = initial; return [state[index], value => { state[index] = value; }]; },
    useEffect(callback) { if (!mounted) effects.push(callback); }
  };
  const module = { exports: {} };
  const source = fs.readFileSync(path.join(__dirname, 'InstallPwaPrompt.tsx'), 'utf8');
  const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX } }).outputText;
  vm.runInNewContext(output, {
    module, exports: module.exports, Date,
    navigator: { userAgent: ios ? 'iPhone' : 'Chrome', platform: '', maxTouchPoints: 0 },
    window: { localStorage: { getItem: key => { if (storageFails) throw Error('blocked'); return stored[key]; }, setItem: (key, value) => { if (storageFails) throw Error('blocked'); stored[key] = value; } } },
    require(name) {
      if (name === './pwa-diagnostics') return { pwaLog: (event,details) => logs.push({event,details}), actualStandalone: () => false, previousInstall: () => "not-observed" };
      if (name === 'react') return react;
      if (name === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) };
      if (name === './PwaInstallProvider') return { usePwaInstall: () => install };
      if (name === '@/config/app-brand') return { APP_BRAND: { appName: 'MarcaDeTeste' } };
      if (name === '@/components/ui/button') return { Button: 'button' };
      if (name === 'next/link') return { default: 'a' };
      throw Error(name);
    }
  });
  return { stored, install, logs, cooldown: module.exports.DISMISS_COOLDOWN_MS, render(props = { eligible: true }) {
    cursor = 0;
    let tree = module.exports.InstallPwaPrompt(props);
    if (!mounted) { mounted = true; effects.forEach(effect => effect()); cursor = 0; tree = module.exports.InstallPwaPrompt(props); }
    return tree;
  } };
}
function nodes(tree) { return !tree || typeof tree !== 'object' ? [] : [tree, ...[tree.props.children].flat(Infinity).flatMap(nodes)]; }
function text(tree) { if (tree == null || typeof tree === 'boolean') return ''; if (typeof tree !== 'object') return String(tree); return [tree.props.children].flat(Infinity).map(text).join(''); }
function button(tree, label) { return nodes(tree).find(node => node.type === 'button' && text(node) === label); }

test('visita casual não recebe CTA; identidade elegível recebe branding configurado', () => {
  const h = harness();
  assert.equal(h.render({ eligible: false }), null);
  assert.match(text(h.render()), /MarcaDeTeste/);
  assert.doesNotMatch(text(h.render()), /Esthya|Bellory|MyEsthya/);
});
test('sucesso oferece instalação e link natural para acesso recorrente', () => {
  const tree = harness().render({ eligible: true, placement: 'booking-success' });
  assert.ok(button(tree, 'Adicionar ao celular'));
  assert.ok(nodes(tree).some(node => node.props.href === '/acesso'));
});
test('Agora não mantém redescoberta em acesso, inclusive após remontagem', () => {
  const h = harness();
  button(h.render(), 'Agora não').props.onClick();
  assert.equal(h.cooldown, 14 * 24 * 60 * 60 * 1000);
  const next = harness({ stored: h.stored });
  const compact = next.render();
  assert.equal(compact.type, 'button');
  button(compact, 'Adicionar ao celular').props.onClick();
  assert.match(text(next.render()), /Tenha acesso rápido/);
  assert.equal(harness({ stored: h.stored }).render({ eligible: true, placement: 'booking-success' }).props.href, '/acesso');
});
test('cooldown expirado permite novo convite', () => {
  const h = harness({ stored: { 'pwa-install-dismissed-at': String(Date.now() - 15 * 86400000) } });
  assert.equal(h.render().type, 'section');
});
test('standalone e hidratação pendente ocultam CTA', () => {
  assert.equal(harness({ context: { standalone: true } }).render(), null);
  assert.equal(harness({ context: { ready: false } }).render(), null);
});
test('Android só solicita prompt por clique e consome evento após resposta', async () => {
  let calls = 0;
  const h = harness({ context: { event: { prompt: async () => { calls++; }, userChoice: Promise.resolve({ outcome: 'dismissed' }) } } });
  const tree = h.render();
  assert.equal(calls, 0);
  await button(tree, 'Adicionar ao celular').props.onClick();
  assert.equal(calls, 1);
  assert.equal(h.install.event, null);
  assert.ok(h.stored['pwa-install-dismissed-at']);
});
test('iOS orienta adição manual; storage bloqueado não quebra CTA', async () => {
  const h = harness({ ios: true, storageFails: true });
  await button(h.render(), 'Adicionar ao celular').props.onClick();
  assert.match(text(h.render()), /Compartilhar.*Adicionar à Tela de Início/);
  button(h.render(), 'Agora não').props.onClick();
  assert.ok(button(h.render(), 'Adicionar ao celular'));
});
test('integração: sucesso e identidade lembrada; acesso somente no estado ready', () => {
  const booking = fs.readFileSync(path.join(__dirname, '../public-booking/PublicBookingPage.tsx'), 'utf8');
  const access = fs.readFileSync(path.join(__dirname, '../recurring-access/RecurringAccessPage.tsx'), 'utf8');
  assert.match(booking, /if \(success\)[\s\S]*?<InstallPwaPrompt eligible=\{isIdentifiedClient && rememberIdentity\} placement="booking-success"/);
  assert.equal((booking.match(/<InstallPwaPrompt/g) || []).length, 1);
  assert.match(access, /state === "ready"[\s\S]*?<InstallPwaPrompt eligible/);
});



test('diagnostic CTA logs actual accepted/dismissed and prompt duration without changing flow', async () => {
  for (const outcome of ['accepted','dismissed']) {
    const h=harness({context:{event:{prompt:async()=>{},userChoice:Promise.resolve({outcome})}}});
    await button(h.render(),'Adicionar ao celular').props.onClick();
    assert.ok(h.logs.some(e=>e.event==='install CTA clicked' && e.details.deferred===true));
    assert.ok(h.logs.some(e=>e.event==='prompt finished'));
    assert.ok(h.logs.some(e=>e.event==='userChoice='+outcome && e.details.elapsedMs>=0));
  }
});

test('operational variant reuses prompt with work copy and no client shortcut', async () => {
  let calls=0;
  const h=harness({context:{event:{prompt:async()=>{calls++;},userChoice:Promise.resolve({outcome:'accepted'})}}});
  const tree=h.render({eligible:true,placement:'operational'});
  assert.match(text(tree),/Instale MarcaDeTeste.*estabelecimento/);
  assert.equal(nodes(tree).some(n=>n.props.href==='/acesso'),false);
  await button(tree,'Adicionar ao celular').props.onClick();
  assert.equal(calls,1);
  assert.equal(h.install.event,null);
});
test('operational standalone hides installation and dismissal remains rediscoverable', () => {
  assert.equal(harness({context:{standalone:true}}).render({eligible:true,placement:'operational'}),null);
  const h=harness({stored:{'pwa-install-dismissed-at':String(Date.now())}});
  const tree=h.render({eligible:true,placement:'operational'});
  assert.ok(button(tree,'Adicionar ao celular'));
  assert.equal(nodes(tree).some(n=>n.props.href),false);
});
