const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const ts = require('typescript');

function harness(respond) {
  const hooks = [], calls = [];
  let index = 0;
  const react = {
    useState(initial) {
      const i = index++;
      if (!(i in hooks)) hooks[i] = initial;
      return [hooks[i], value => { hooks[i] = value; }];
    }
  };
  const jsx = (type, props) => ({ type, props });
  const imports = {
    react, 'react/jsx-runtime': { jsx, jsxs: jsx },
    'next/navigation': { useRouter: () => ({ push() {} }) },
    '@/components/ui/button': { Button: 'Button' },
    '@/components/ui/feedback-message': { FeedbackMessage: 'FeedbackMessage' },
    '@/services/public-booking.service': { locatePublicAccess: async input => {
      calls.push(input);
      return respond(input);
    } },
    '@/lib/recurring-access.storage': { bookingIdentityKey: slug => slug, upsertKnownTenant() {} }
  };
  const module = { exports: {} };
  vm.runInNewContext(ts.transpileModule(fs.readFileSync(__dirname + '/LocateAccess.tsx', 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, jsx: ts.JsxEmit.ReactJSX }
  }).outputText, { module, exports: module.exports, Error, Date, require: name => {
    if (!(name in imports)) throw Error('Unexpected import ' + name);
    return imports[name];
  } });
  const flatten = node => Array.isArray(node) ? node.flatMap(flatten)
    : node && typeof node === 'object' ? [node, ...flatten(node.props?.children)] : [];
  function nodes() { index = 0; return flatten(module.exports.LocateAccess()); }
  function field(type) { return nodes().find(n => n.type === 'input' && n.props.type === type); }
  return {
    calls, nodes, field,
    change(type, value) { field(type).props.onChange({ target: { value } }); },
    submit() { nodes().find(n => n.type === 'form').props.onSubmit({ preventDefault() {} }); },
    button() { return nodes().find(n => n.type === 'Button' && n.props.type === 'submit'); }
  };
}
const settle = () => new Promise(resolve => setImmediate(resolve));
const denied = () => { throw Error('Não foi possível confirmar seus dados. Confira o telefone e a data de nascimento e tente novamente.'); };

test('layout structure stays unchanged from empty to phone, DOB and rejection states except for feedback', async () => {
  const app = harness(denied);
  // Compare the rendered hierarchy and sizing props, not browser geometry.
  function structure(node) {
    if (Array.isArray(node)) return node.map(structure).filter(Boolean);
    if (!node || typeof node !== 'object' || node.type === 'FeedbackMessage') return null;
    const { className, style, type, size, width, height, children } = node.props;
    return { element: node.type, className, style, type, size, width, height, children: structure(children) };
  }
  const current = () => structure(app.nodes().find(node => node.type === 'form'));
  const empty = current();
  assert.equal(app.field('tel').props.value, '');
  assert.equal(app.field('date').props.value, '');
  app.change('tel', '11900000001');
  assert.equal(app.field('tel').props.value, '11900000001');
  assert.deepEqual(current(), empty);
  assert.equal(app.nodes().some(node => node.type === 'FeedbackMessage'), false);
  app.change('date', '1990-01-01');
  assert.equal(app.field('date').props.value, '1990-01-01');
  assert.deepEqual(current(), empty);
  app.submit(); await settle();
  assert.ok(app.nodes().some(node => node.type === 'FeedbackMessage'));
  assert.deepEqual(current(), empty);
});

test('phone and DOB remain editable before confirmation; request receives final values', async () => {
  const app = harness(denied);
  app.change('tel', '11900000001'); app.change('date', '1990-01-01');
  app.change('tel', '11900000002'); app.change('date', '1991-02-02');
  for (const type of ['tel', 'date']) {
    assert.equal(app.field(type).props.disabled, false);
    assert.equal(app.field(type).props.readOnly, undefined);
  }
  assert.equal(app.calls.length, 0);
  app.submit(); await settle();
  assert.equal(app.calls[0].telefone, '11900000002');
  assert.equal(app.calls[0].data_nascimento, '1991-02-02');
});

test('rejection preserves both values, releases loading and enables retry', async () => {
  let reject;
  const app = harness(() => new Promise((_, fail) => { reject = fail; }));
  app.change('tel', '11900000001'); app.change('date', '1990-01-01'); app.submit();
  assert.equal(app.button().props.disabled, true);
  reject(Error('Falha genérica')); await settle();
  assert.equal(app.button().props.disabled, false);
  assert.equal(app.button().props.children, 'Continuar');
  for (const type of ['tel', 'date']) assert.equal(app.field(type).props.disabled, false);
  assert.equal(app.field('tel').props.value, '11900000001');
  assert.equal(app.field('date').props.value, '1990-01-01');
});

for (const changed of ['tel', 'date', 'both']) {
  test(`editing ${changed} immediately clears rejection; retry uses current values and can reject again`, async () => {
    let count = 0, reject;
    const app = harness(() => {
      if (++count === 1) return denied();
      return new Promise((_, fail) => { reject = fail; });
    });
    app.change('tel', '11900000001'); app.change('date', '1990-01-01');
    app.submit(); await settle();
    assert.ok(app.nodes().some(n => n.type === 'FeedbackMessage'));
    if (changed !== 'date') app.change('tel', '11900000002');
    if (changed !== 'tel') app.change('date', '1991-02-02');
    assert.equal(app.nodes().some(n => n.type === 'FeedbackMessage'), false);
    for (const type of ['tel', 'date']) {
      assert.equal(app.field(type).props.disabled, false);
      assert.equal(app.field(type).props.readOnly, undefined);
      assert.equal(app.field(type).props.required, true);
    }
    app.submit();
    assert.equal(app.calls[1].telefone, changed === 'date' ? '11900000001' : '11900000002');
    assert.equal(app.calls[1].data_nascimento, changed === 'tel' ? '1990-01-01' : '1991-02-02');
    assert.equal(app.nodes().some(n => n.type === 'FeedbackMessage'), false);
    reject(Error('Nova resposta genérica')); await settle();
    assert.equal(app.nodes().find(n => n.type === 'FeedbackMessage').props.message, 'Nova resposta genérica');
    assert.equal(app.button().props.disabled, false);
  });
}

test('CN candidate choice is discarded when identification fields change', async () => {
  const app = harness(() => ({ tenants: [{ slug: 'a', displayName: 'A' }, { slug: 'b', displayName: 'B' }] }));
  app.change('tel', '11900000001'); app.change('date', '1990-01-01');
  app.submit(); await settle();
  assert.ok(app.nodes().some(n => n.props?.['aria-label'] === 'Escolha o estabelecimento'));
  app.change('date', '1991-02-02');
  assert.equal(app.nodes().some(n => n.props?.['aria-label'] === 'Escolha o estabelecimento'), false);
});

test('inconsistency uses existing error feedback with textual guidance and no focus theft', async () => {
  const app = harness(denied);
  app.submit(); await settle();
  const feedback = app.nodes().find(n => n.type === 'FeedbackMessage');
  assert.ok(feedback);
  assert.equal(feedback.props.tone, 'error');
  assert.equal(feedback.props.autoFocus, false);
  assert.match(feedback.props.title, /Confira/);
  assert.match(feedback.props.message, /telefone e a data de nascimento/);
});
