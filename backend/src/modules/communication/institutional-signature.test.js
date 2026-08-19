const assert = require('node:assert/strict');
const test = require('node:test');

const { APP_BRAND, normalizeDisplayName } = require('../../config/app-brand');
const {
  appendInstitutionalSignature,
  appendInstitutionalSignatureHtml,
  getInstitutionalSignatureText
} = require('./institutional-signature');

test('text signature uses the centralized platform name', () => {
  assert.equal(getInstitutionalSignatureText(), `Mensagem automática enviada pela plataforma ${APP_BRAND.appName}.`);
});

test('configured platform name is normalized only when it is plain lowercase or uppercase', () => {
  assert.equal(normalizeDisplayName('esthya', 'Plataforma'), 'Esthya');
  assert.equal(normalizeDisplayName('ESTHYA BEAUTY', 'Plataforma'), 'Esthya Beauty');
  assert.equal(normalizeDisplayName('iFood Pro', 'Plataforma'), 'iFood Pro');
});

test('text signature is appended only once', () => {
  const once = appendInstitutionalSignature('Conteudo funcional.');
  const twice = appendInstitutionalSignature(once);

  assert.equal(twice, once);
  assert.equal(once.split(getInstitutionalSignatureText()).length - 1, 1);
});

test('HTML signature renders platform identity only once', () => {
  const once = appendInstitutionalSignatureHtml('<p>Conteudo funcional.</p>');
  const twice = appendInstitutionalSignatureHtml(once);

  assert.equal(twice, once);
  assert.match(once, /data-platform-signature="true"/);
  assert.ok(once.includes(APP_BRAND.appName));
  if (APP_BRAND.logoUrl) {
    assert.match(once, /<img /);
    assert.ok(once.includes(APP_BRAND.logoUrl));
  }
});
