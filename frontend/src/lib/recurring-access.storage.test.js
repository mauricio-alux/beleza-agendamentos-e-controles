const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const test = require("node:test");
const vm = require("node:vm");
const ts = require("typescript");

function createStorage() {
  const values = new Map();
  return {
    get length() {
      return values.size;
    },
    clear() {
      values.clear();
    },
    getItem(key) {
      return values.has(key) ? values.get(key) : null;
    },
    key(index) {
      return [...values.keys()][index] || null;
    },
    removeItem(key) {
      values.delete(key);
    },
    setItem(key, value) {
      values.set(key, String(value));
    }
  };
}

function loadStorageModule() {
  const filePath = path.resolve(__dirname, "recurring-access.storage.ts");
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

const storageModule = loadStorageModule();

function sameJson(left, right) {
  assert.equal(JSON.stringify(left), JSON.stringify(right));
}

test("preferred tenant inexistente retorna null", () => {
  const storage = createStorage();

  assert.equal(storageModule.getPreferredTenant(storage), null);
});

test("set preferred tenant grava somente slug, source e updatedAt", () => {
  const storage = createStorage();

  const preferred = storageModule.setPreferredTenant({ slug: "vivian", source: "booking" }, storage);

  assert.equal(preferred.slug, "vivian");
  assert.equal(preferred.source, "booking");
  assert.equal(typeof preferred.updatedAt, "string");
});

test("replace preferred tenant substitui o slug anterior", () => {
  const storage = createStorage();

  storageModule.setPreferredTenant({ slug: "vivian", source: "booking" }, storage);
  storageModule.setPreferredTenant({ slug: "silvia-helena", source: "switcher" }, storage);

  assert.equal(storageModule.getPreferredTenant(storage).slug, "silvia-helena");
});

test("clear preferred tenant remove somente a preferencia", () => {
  const storage = createStorage();

  storageModule.setPreferredTenant({ slug: "vivian", source: "booking" }, storage);
  storageModule.clearPreferredTenant(storage);

  assert.equal(storageModule.getPreferredTenant(storage), null);
});

test("known tenant add persiste dados minimos", () => {
  const storage = createStorage();

  storageModule.upsertKnownTenant({
    slug: "vivian",
    displayName: "Vivian Beauty",
    hasLocalIdentity: true
  }, {}, storage);

  sameJson(storageModule.listKnownTenants(storage).map((tenant) => tenant.slug), ["vivian"]);
});

test("known tenant update atualiza displayName e identidade", () => {
  const storage = createStorage();

  storageModule.upsertKnownTenant({ slug: "vivian", displayName: "Vivian", hasLocalIdentity: true }, {}, storage);
  storageModule.upsertKnownTenant({ slug: "vivian", displayName: "Vivian Beauty", hasLocalIdentity: false }, {}, storage);
  const [tenant] = storageModule.listKnownTenants(storage);

  assert.equal(tenant.displayName, "Vivian Beauty");
  assert.equal(tenant.hasLocalIdentity, false);
});

test("known tenant duplicate mantem apenas um registro por slug", () => {
  const storage = createStorage();

  storageModule.upsertKnownTenant({ slug: "vivian", displayName: "Vivian 1" }, {}, storage);
  storageModule.upsertKnownTenant({ slug: "vivian", displayName: "Vivian 2" }, {}, storage);

  assert.equal(storageModule.listKnownTenants(storage).length, 1);
  assert.equal(storageModule.listKnownTenants(storage)[0].displayName, "Vivian 2");
});

test("known tenant remove limpa token do slug e escolhe proximo preferencial", () => {
  const storage = createStorage();

  storageModule.upsertKnownTenant({ slug: "vivian", displayName: "Vivian", lastAccessAt: "2026-09-01T00:00:00.000Z" }, {}, storage);
  storageModule.upsertKnownTenant({ slug: "silvia", displayName: "Silvia", lastAccessAt: "2026-09-02T00:00:00.000Z" }, {}, storage);
  storageModule.setPreferredTenant({ slug: "vivian", source: "booking" }, storage);
  storage.setItem(storageModule.bookingIdentityKey("vivian"), "secret-token");

  const next = storageModule.removeKnownTenant("vivian", storage);

  assert.equal(storage.getItem(storageModule.bookingIdentityKey("vivian")), null);
  sameJson(next.map((tenant) => tenant.slug), ["silvia"]);
  assert.equal(storageModule.getPreferredTenant(storage).slug, "silvia");
});

test("storage corrompido e limpo com lista vazia", () => {
  const storage = createStorage();
  storage.setItem(storageModule.KNOWN_TENANTS_KEY, "{invalid");

  sameJson(storageModule.listKnownTenants(storage), []);
  assert.equal(storage.getItem(storageModule.KNOWN_TENANTS_KEY), null);
});

test("storage invalido descarta slugs inseguros", () => {
  const storage = createStorage();
  storage.setItem(storageModule.KNOWN_TENANTS_KEY, JSON.stringify([
    { slug: "../x", displayName: "Invalido" },
    { slug: "vivian", displayName: "Vivian" }
  ]));

  sameJson(storageModule.listKnownTenants(storage).map((tenant) => tenant.slug), ["vivian"]);
});

test("versao futura ou campos desconhecidos nao vazam para known-tenants", () => {
  const storage = createStorage();
  storage.setItem(storageModule.KNOWN_TENANTS_KEY, JSON.stringify([
    {
      version: 99,
      slug: "vivian",
      displayName: "Vivian",
      token: "secret-token",
      telefone: "+5516999999999",
      email: "cliente@example.com"
    }
  ]));

  const [tenant] = storageModule.listKnownTenants(storage);

  sameJson(Object.keys(tenant).sort(), ["displayName", "hasLocalIdentity", "lastAccessAt", "slug"]);
});

test("upsert known tenant nao armazena PII nem token", () => {
  const storage = createStorage();

  storageModule.upsertKnownTenant({
    slug: "vivian",
    displayName: "Vivian",
    hasLocalIdentity: true,
    token: "secret-token",
    telefone: "+5516999999999",
    email: "cliente@example.com"
  }, { preferWhenEmpty: true }, storage);

  const raw = storage.getItem(storageModule.KNOWN_TENANTS_KEY);
  assert.equal(raw.includes("secret-token"), false);
  assert.equal(raw.includes("+5516999999999"), false);
  assert.equal(raw.includes("cliente@example.com"), false);
});
