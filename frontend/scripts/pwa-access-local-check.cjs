// Local-only regression. APIs are synthetic; no external request is allowed through.
const { chromium } = require(process.env.PLAYWRIGHT_CORE_PATH || 'playwright-core');
const assert = require('node:assert/strict');
const origin='http://127.0.0.1:3017', token='fixture-valid-token-with-more-than-twenty-characters';
const identity={recognized:true,token,clientId:'fixture-client',client:{nome:'Fixture client',telefone:'+5516999999999'}};
const catalog=slug=>({tenant:{id:'tenant',slug,nome_fantasia:'Fixture studio'},link:{slug},catalog_status:{available_services:1},
 servicos:[{id:'service',nome:'Fixture service',preco:50,duracao_minutos:30,especialidades_config:[{especialidade_id:'specialty',nome_especialidade:'Fixture specialty',preco:50,duracao_minutos:30}]}],
 profissionais:[{id:'professional',nome_publico:'Fixture professional',servico_ids:['service'],especialidade_ids:['specialty']}]});
(async()=>{
 const browser=await chromium.launch({headless:true,executablePath:process.env.CHROME_PATH||'C:/Program Files/Google/Chrome/Application/chrome.exe'});let checks=0;
 try {
  async function setup(mode,initial={}){
   const ctx=await browser.newContext({serviceWorkers:'block'}),calls=[];
   await ctx.addInitScript(initial=>{if(!sessionStorage.getItem('fixture-ready')){
    for(const [k,v] of Object.entries(initial))localStorage.setItem(k,v);sessionStorage.setItem('fixture-ready','1');
   }},initial);
   await ctx.route('**/*',async route=>{
    const req=route.request(),url=new URL(req.url());
    if(url.pathname.includes('/public/booking/')){
     const body=req.postDataJSON();calls.push({path:url.pathname,body});
     const send=(data,status=200)=>route.fulfill({status,contentType:'application/json',body:JSON.stringify(status===200?{data}:{message:data})});
     if(url.pathname.endsWith('/access/locate')){
      assert.equal(req.method(),'POST');assert.equal(url.search,'');
      if(mode==='zero')return send('Não foi possível localizar um cadastro com os dados informados.',422);
      if(mode==='many'&&!body.slug)return send({tenants:[{slug:'studio-a',displayName:'Studio A'},{slug:'studio-b',displayName:'Studio B'}]});
      return send({slug:body.slug||'studio-a',identity});
     }
     if(url.pathname.endsWith('/identity'))return send(body?.token?identity:{recognized:false});
     if(url.pathname.endsWith('/upcoming'))return send({appointments:[]});
     if(url.pathname.endsWith('/availability'))return send({availability:{slots:[]}});
     return send(catalog(url.pathname.split('/').pop()));
    }
    if(url.origin===origin)return route.continue();return route.abort();
   });return {ctx,page:await ctx.newPage(),calls};
  }
  const saved={'esthya:preferred-tenant':JSON.stringify({slug:'studio-a',source:'booking',updatedAt:'2026-01-01'}),
   'esthya:known-tenants':JSON.stringify([{slug:'studio-a',displayName:'Fixture',hasLocalIdentity:true,lastAccessAt:'2026-01-01'}]),
   'esthya:booking-identity:studio-a':token};
  let x=await setup('valid',saved);
  await x.page.goto(origin+'/acesso');await x.page.getByText('Ola, Fixture client',{exact:true}).waitFor();
  assert.equal(await x.page.getByRole('heading',{name:'Localizar meu acesso'}).count(),0);checks++;
  await x.page.reload();await x.page.getByText('Ola, Fixture client',{exact:true}).waitFor();checks++;
  await x.page.goto(origin+'/agendar/studio-a');await x.page.getByText(/Bem-vindo de volta/).waitFor();
  assert.equal(await x.page.getByText('Data de nascimento').count(),0);checks++;await x.ctx.close();
  const known={...saved};delete known['esthya:booking-identity:studio-a'];x=await setup('known',known);
  await x.page.goto(origin+'/acesso');await x.page.getByRole('link',{name:'Continuar',exact:true}).click();
  await x.page.getByText('Data de nascimento').waitFor();checks++;
  const before=x.calls.filter(c=>c.path.endsWith('/identity')).length;
  await x.page.locator('input[type=tel]').fill('16999999999');await x.page.waitForTimeout(1000);
  assert.equal(x.calls.filter(c=>c.path.endsWith('/identity')).length,before);checks++;await x.ctx.close();
  for(const mode of ['zero','one','many']){
   x=await setup(mode);await x.page.goto(origin+'/acesso');
   await x.page.getByLabel('Celular/WhatsApp (Brasil)').fill('16999999999');
   await x.page.getByLabel('Data de nascimento').fill('1990-01-01');
   await x.page.getByRole('button',{name:'Continuar',exact:true}).click();
   if(mode==='zero'){
    await x.page.getByRole('alert').waitFor();
    assert.equal(await x.page.evaluate(()=>Object.keys(localStorage).some(k=>k.startsWith('esthya:booking-identity:'))),false);
   }else{
    if(mode==='many')await x.page.getByRole('button',{name:'Studio B',exact:true}).click();
    await x.page.waitForURL('**/agendar/'+(mode==='many'?'studio-b':'studio-a'));
    await x.page.getByText(/Bem-vindo de volta/).waitFor();
    const persisted=await x.page.evaluate(()=>JSON.stringify({...localStorage}));
    assert.ok(!persisted.includes('1990-01-01')&&!persisted.includes('16999999999'));
    assert.equal(x.calls.filter(c=>c.path.endsWith('/access/locate')).length,mode==='many'?2:1);
   }checks++;await x.ctx.close();
  }
  console.log(JSON.stringify({checks,passed:checks,physicalTest:false,externalNetwork:'blocked',api:'mocked'}));
 }finally{await browser.close();}
})().catch(error=>{console.error(error);process.exitCode=1;});
