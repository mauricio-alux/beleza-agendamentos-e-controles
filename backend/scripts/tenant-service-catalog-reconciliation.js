require('dotenv').config();

global.WebSocket = require('ws');

const syncService = require('../src/modules/services/tenant-service-catalog-sync.service');

function argValue(name) {
  const prefix = `${name}=`;
  const item = process.argv.slice(2).find((arg) => arg.startsWith(prefix));
  return item ? item.slice(prefix.length) : null;
}

async function main() {
  const mode = process.argv[2] || 'audit';
  const tenantId = argValue('--tenant-id');
  const reports = await syncService.reconcile({ mode, tenantId });
  const totals = reports.reduce((acc, report) => ({
    tenants: acc.tenants + 1,
    missing: acc.missing + (report.missing_total || 0),
    created: acc.created + (report.created_total || 0),
    duplicated: acc.duplicated + (report.duplicated_total || 0),
    incompatible: acc.incompatible + (report.incompatible_total || 0)
  }), { tenants: 0, missing: 0, created: 0, duplicated: 0, incompatible: 0 });

  console.log(JSON.stringify({
    ok: mode === 'validate' ? totals.missing === 0 && totals.duplicated === 0 && totals.incompatible === 0 : true,
    mode,
    tenant_id: tenantId || null,
    totals,
    reports
  }, null, 2));

  if (mode === 'validate' && (totals.missing || totals.duplicated || totals.incompatible)) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(JSON.stringify({ ok: false, error: error.message }, null, 2));
  process.exit(1);
});
