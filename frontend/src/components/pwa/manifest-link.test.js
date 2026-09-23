const assert = require('node:assert/strict');
const test = require('node:test');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const {renderToStaticMarkup} = require('react-dom/server');

test('server layout has one initial-head manifest; credentials are DEV opt-in', () => {
  const source=fs.readFileSync(path.join(__dirname,'../../app/layout.tsx'),'utf8');
  const output=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.CommonJS,jsx:ts.JsxEmit.ReactJSX}}).outputText;
  for(const enabled of [undefined,'false','true']){
    const module={exports:{}};
    vm.runInNewContext(output,{
      module,exports:module.exports,URL,process:{env:{DEV_PWA_MANIFEST_CREDENTIALS:enabled}},
      require(name){
        if(name==='react/jsx-runtime')return require(name);
        if(name==='next/font/google')return {Inter:()=>({variable:'inter'}),Playfair_Display:()=>({variable:'display'})};
        if(name==='@/config/app-brand')return {APP_BRAND:{appUrl:'https://example.test',appName:'ConfiguredBrand'},withBrand:x=>x};
        if(name==='@/context/AuthProvider')return {AuthProvider:({children})=>children};
        if(name.endsWith('PwaInstallProvider'))return {PwaInstallProvider:({children})=>children};
        if(name.endsWith('PwaDiagnosticObserver'))return {PwaDiagnosticObserver:()=>null};
        if(name.endsWith('PwaServiceWorker'))return {PwaServiceWorker:()=>null};
        if(name==='@/lib/pwa-manifest')return {PWA_THEME_COLOR:'#fff'};
        if(name==='./globals.css')return {};
        throw Error(name);
      }
    });
    const html=renderToStaticMarkup(module.exports.default({children:'content'}));
    assert.equal((html.match(/rel="manifest"/g)||[]).length,1);
    assert.match(html,/<head>[\s\S]*rel="manifest"[\s\S]*<\/head>/);
    assert.doesNotMatch(html.split('<body')[1],/rel="manifest"/);
    assert.equal(html.includes('crossorigin="use-credentials"'),enabled==='true');
    assert.match(html,/href="\/manifest.webmanifest"/);
    assert.doesNotMatch(html,/ngrok/);
    assert.equal(module.exports.metadata.manifest,undefined);
  }
  assert.equal(fs.existsSync(path.join(__dirname,'../../app/manifest.ts')),false);
});


