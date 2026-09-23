// Directed Meus dados gate. In-memory responses only; external traffic blocked.
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const assert = require('node:assert/strict');
const origin = process.env.PROFILE_TEST_ORIGIN || 'http://127.0.0.1:3017';
const token = 'synthetic-profile-token-not-a-real-credential';
const initial = { nome: 'Synthetic profile', telefone: '+5516999999999', email: 'profile@example.com',
  endereco: { cep: '14000000', uf: 'SP', cidade: 'Synthetic city', logradouro: 'Synthetic street', numero: '1' },
  aceita_campanhas: true, status: 'ativo' };
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let passed = 0;
  try {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, serviceWorkers: 'block' });
    let profile = structuredClone(initial), failSave = false, failRead = false;
    const writes = [];
    await context.addInitScript(token => localStorage.setItem('esthya:booking-identity:profile-test', token), token);
    await context.route('**/*', async route => {
      const req = route.request(), url = new URL(req.url());
      const send = (data, status = 200) => route.fulfill({ status, contentType: 'application/json',
        body: JSON.stringify(status === 200 ? { data } : { error: { message: data } }) });
      if (url.pathname.includes('/public/booking/')) {
        if (url.pathname.endsWith('/client/me')) {
          if (req.method() === 'GET') {
            assert.equal(url.searchParams.get('token'), token);
            return failRead ? send('Não foi possível carregar seus dados.', 503) : send(profile);
          }
          assert.equal(req.method(), 'PATCH');
          const body = req.postDataJSON(); writes.push(body); assert.equal(body.token, token);
          if (failSave) return send('Não foi possível salvar seus dados.', 503);
          const { token: ignored, ...fields } = body; profile = { ...profile, ...fields }; return send(profile);
        }
        if (url.pathname.endsWith('/identity')) return send({ recognized: true, token,
          clientId: 'synthetic-client', client: profile });
        if (url.pathname.endsWith('/upcoming')) return send({ appointments: [] });
        if (url.pathname.endsWith('/availability')) return send({ availability: { slots: [] } });
        return send({ tenant: { id: 'synthetic-tenant', slug: 'profile-test', nome_fantasia: 'Synthetic studio' },
          link: { slug: 'profile-test' }, servicos: [], profissionais: [] });
      }
      if (url.origin === origin && !url.pathname.startsWith('/api/')) return route.continue();
      return route.abort();
    });
    const page = await context.newPage(); page.setDefaultTimeout(15000);
    await page.goto(origin + '/agendar/profile-test', { waitUntil: 'domcontentloaded', timeout: 120000 });
    await page.getByRole('button', { name: 'Meus dados', exact: true }).click();
    const modal = page.getByRole('dialog', { name: 'Meus dados' });
    await modal.getByText(initial.email, { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Editar dados', exact: true }).click();
    await modal.getByLabel('Nome', { exact: false }).fill('Synthetic updated');
    await modal.getByLabel('Email', { exact: true }).fill('updated@example.com');
    await modal.locator('input[type="tel"]').fill('16988887777');
    for (const [label, value] of Object.entries({ CEP: '15000000', Estado: 'RJ', Cidade: 'Updated city', Logradouro: 'Updated street', Numero: '2' })) {
      await modal.getByLabel(label, { exact: true }).fill(value);
    }
    await modal.getByRole('checkbox').uncheck();
    await modal.getByRole('button', { name: 'Salvar alteracoes', exact: true }).click();
    await modal.getByText('Seus dados foram atualizados com sucesso.', { exact: true }).waitFor();
    assert.deepEqual(writes[0], { token, nome: 'Synthetic updated', telefone: '+5516988887777', email: 'updated@example.com',
      endereco: { cep: '15000000', uf: 'RJ', cidade: 'Updated city', logradouro: 'Updated street', numero: '2' }, aceita_campanhas: false });
    passed++; console.log('PASS: open, read, edit and save current fields with success feedback');
    await modal.getByRole('button', { name: 'Editar dados', exact: true }).click();
    await modal.getByLabel('Nome', { exact: false }).fill('Unsaved change');
    await modal.getByRole('button', { name: 'Cancelar', exact: true }).click();
    assert.equal(writes.length, 1);
    await modal.getByText('Synthetic updated', { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Editar dados', exact: true }).click();
    await modal.getByLabel('Nome', { exact: false }).fill('Unsaved close');
    page.once('dialog', d => d.accept());
    await modal.getByRole('button', { name: 'Fechar meus dados' }).click();
    await modal.waitFor({ state: 'hidden' }); assert.equal(writes.length, 1);
    passed++; console.log('PASS: cancel and close do not save');
    await page.getByRole('button', { name: 'Meus dados', exact: true }).click();
    await modal.getByRole('button', { name: 'Editar dados', exact: true }).click();
    await modal.getByLabel('Nome', { exact: false }).fill('Retry name'); failSave = true;
    await modal.getByRole('button', { name: 'Salvar alteracoes', exact: true }).click();
    await modal.getByText('Não foi possível salvar seus dados.', { exact: true }).waitFor();
    assert.equal(await modal.getByLabel('Nome', { exact: false }).inputValue(), 'Retry name');
    assert.equal(await modal.getByRole('button', { name: 'Salvar alteracoes', exact: true }).isEnabled(), true);
    const geometry = await modal.evaluate(el => { const r = el.getBoundingClientRect();
      return { left: r.left, right: r.right, viewport: innerWidth, overflow: el.scrollWidth > el.clientWidth }; });
    assert.ok(geometry.left >= 0 && geometry.right <= geometry.viewport && !geometry.overflow);
    failSave = false; await modal.getByRole('button', { name: 'Salvar alteracoes', exact: true }).click();
    await modal.getByText('Seus dados foram atualizados com sucesso.', { exact: true }).waitFor();
    passed++; console.log('PASS: save error preserves editing, retry recovers and mobile width fits');
    await modal.getByRole('button', { name: 'Fechar meus dados' }).click(); failRead = true;
    await page.getByRole('button', { name: 'Meus dados', exact: true }).click();
    await modal.getByText('Não foi possível carregar seus dados.', { exact: true }).waitFor();
    await modal.getByRole('button', { name: 'Fechar meus dados' }).click(); failRead = false;
    await page.getByRole('button', { name: 'Meus dados', exact: true }).click();
    await modal.getByText('Retry name', { exact: true }).waitFor();
    passed++; console.log('PASS: read error can close and reopen without permanent loading');
    console.log(JSON.stringify({ passed, failed: 0, viewport: '390x844', remoteData: false }));
  } catch (error) {
    console.error(JSON.stringify({ passed, failed: 1, error: error.message })); process.exitCode = 1;
  } finally { await browser.close(); }
})();
