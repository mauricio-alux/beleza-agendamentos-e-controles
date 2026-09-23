const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function loadManifestModule() {
  const filePath = path.resolve(__dirname, "pwa-manifest.ts");
  const source = fs.readFileSync(filePath, "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: {
      esModuleInterop: true,
      module: ts.ModuleKind.CommonJS,
      target: ts.ScriptTarget.ES2020
    }
  });
  const module = { exports: {} };

  vm.runInNewContext(outputText, {
    console,
    exports: module.exports,
    module,
    require
  }, { filename: filePath });

  return module.exports;
}

const manifestModule = loadManifestModule();

test("manifest usa nome parametrizado do SaaS", () => {
  const manifest = manifestModule.buildPwaManifest({ appName: "MarcaTeste" });

  assert.equal(manifest.name, "MarcaTeste");
  assert.equal(manifest.short_name, "MarcaTeste");
  assert.equal(manifest.description.includes("MarcaTeste"), true);
  assert.equal(manifest.start_url, "/acesso");
  assert.equal(manifest.scope, "/");
  assert.equal(manifest.display, "standalone");
});

test("manifest usa nome curto parametrizado quando recebido", () => {
  const manifest = manifestModule.buildPwaManifest({
    appName: "Marca Parametrizada",
    shortName: "Marca"
  });

  assert.equal(manifest.name, "Marca Parametrizada");
  assert.equal(manifest.short_name, "Marca");
});

test("manifest declara icones PWA exigidos sem texto de marca no caminho", () => {
  const manifest = manifestModule.buildPwaManifest({ appName: "MarcaTeste" });
  const icons = manifest.icons.map((icon) => `${icon.src}:${icon.sizes}:${icon.purpose || ""}`);

  assert.equal(icons.some((icon) => icon.includes("/icons/pwa-icon-192.png:192x192:any")), true);
  assert.equal(icons.some((icon) => icon.includes("/icons/pwa-icon-512.png:512x512:any")), true);
  assert.equal(icons.some((icon) => icon.includes("/icons/maskable-icon-512.png:512x512:maskable")), true);
});

test("todos os icones declarados existem e possuem dimensoes PNG correspondentes", () => {
  for (const icon of manifestModule.buildPwaManifest({ appName: "MarcaTeste" }).icons) {
    const file = fs.readFileSync(path.resolve(__dirname, "../../public", icon.src.slice(1)));
    assert.equal(file.subarray(1, 4).toString(), "PNG");
    assert.equal(`${file.readUInt32BE(16)}x${file.readUInt32BE(20)}`, icon.sizes);
  }
});
