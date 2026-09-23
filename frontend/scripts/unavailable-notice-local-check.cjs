// Only catalog notice visibility and available/empty choices. No booking mutation.
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const assert = require('node:assert/strict');
const origin = process.env.NOTICE_TEST_ORIGIN || 'http://127.0.0.1:3017';
const notice = 'Alguns serviços estão temporariamente indisponíveis para agendamento online porque ainda não possuem um profissional habilitado.';
const service = { id: 'synthetic-service', nome: 'Synthetic available service', especialidades_config: [
  { especialidade_id: 'synthetic-specialty', nome: 'Synthetic specialty', preco: 50, duracao_minutos: 30 }
] };
(async () => {
  const browser = await chromium.launch({ headless: true,
    executablePath: process.env.CHROME_PATH || 'C:/Program Files/Google/Chrome/Application/chrome.exe' });
  let passed = 0;
  try {
    for (const scenario of [
      { name: 'desktop applicable', width: 1280, unavailable: 2, available: true, visible: true },
      { name: 'desktop not applicable', width: 1280, unavailable: 0, available: true, visible: false },
      { name: 'mobile available choices', width: 390, unavailable: 2, available: true, visible: false },
      { name: 'mobile empty catalog explanation', width: 390, unavailable: 2, available: false, visible: false }
    ]) {
      const context = await browser.newContext({ viewport: { width: scenario.width, height: 844 }, serviceWorkers: 'block' });
      await context.route('**/*', async route => {
        const url = new URL(route.request().url());
        if (url.pathname.includes('/public/booking/')) {
          // Initial identity bootstrap is simulated, never sent to a backend.
          if (url.pathname.endsWith('/identity')) return route.fulfill({ contentType: 'application/json',
            body: JSON.stringify({ data: { recognized: false } }) });
          if (route.request().method() !== 'GET') return route.abort();
          const data = url.pathname.endsWith('/availability') ? { availability: { slots: [] } } : {
            tenant: { id: 'synthetic-tenant', nome_fantasia: 'Synthetic studio' }, link: { slug: 'notice-test' },
            catalog_status: { unavailable_services: scenario.unavailable },
            servicos: scenario.available ? [service] : [],
            profissionais: scenario.available ? [{ id: 'synthetic-professional', nome_publico: 'Synthetic professional',
              servico_ids: [service.id], especialidade_ids: ['synthetic-specialty'] }] : []
          };
          return route.fulfill({ contentType: 'application/json', body: JSON.stringify({ data }) });
        }
        if (url.origin === origin && !url.pathname.startsWith('/api/')) return route.continue();
        return route.abort();
      });
      const page = await context.newPage(); page.setDefaultTimeout(15000);
      await page.goto(origin + '/agendar/notice-test', { waitUntil: 'domcontentloaded', timeout: 120000 });
      if (scenario.available) {
        const choices = page.getByRole('combobox', { name: 'Serviço', exact: true });
        await choices.waitFor();
        assert.equal(await choices.isEnabled(), true);
        await choices.selectOption(service.id);
        assert.equal(await choices.inputValue(), service.id);
        await page.getByRole('heading', { name: 'Escolha data e horário' }).waitFor();
        await page.getByLabel('Data', { exact: true }).waitFor();
      } else {
        await page.getByRole('heading', { name: 'Nenhum serviço disponível no momento' }).waitFor();
        assert.equal(await page.getByText('O salão ainda não possui serviços com profissionais habilitados para receber agendamentos online.', { exact: true }).isVisible(), true);
      }
      assert.equal(await page.getByText(notice, { exact: true }).count(), scenario.unavailable ? 1 : 0);
      assert.equal(await page.getByText(notice, { exact: true }).isVisible(), scenario.visible);
      if (scenario.name === 'mobile available choices') {
        await page.setViewportSize({ width: 639, height: 844 });
        assert.equal(await page.getByText(notice, { exact: true }).isVisible(), false);
        await page.setViewportSize({ width: 640, height: 844 });
        assert.equal(await page.getByText(notice, { exact: true }).isVisible(), true);
      }
      passed++; console.log('PASS: ' + scenario.name); await context.close();
    }
    console.log(JSON.stringify({ passed, failed: 0, remoteData: false }));
  } catch (error) { console.error(JSON.stringify({ passed, failed: 1, error: error.message })); process.exitCode = 1; }
  finally { await browser.close(); }
})();
