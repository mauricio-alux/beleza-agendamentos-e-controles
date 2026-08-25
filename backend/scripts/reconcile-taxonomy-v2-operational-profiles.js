#!/usr/bin/env node
const operationalProfilesService = require('../src/modules/operational-profiles/operational-profiles.service');
const { supabaseAdmin } = require('../src/config/supabase');

function parseArgs(argv) {
  return argv.reduce((acc, arg) => {
    if (arg === '--apply') acc.dryRun = false;
    if (arg === '--dry-run') acc.dryRun = true;
    if (arg.startsWith('--tenant=')) acc.tenantId = arg.slice('--tenant='.length);
    return acc;
  }, { dryRun: true, tenantId: null });
}

async function listTenants(tenantId = null) {
  let query = supabaseAdmin
    .from('tenants')
    .select('id,nome_fantasia,slug,endereco,ativo,deleted_at')
    .eq('ativo', true)
    .is('deleted_at', null)
    .order('nome_fantasia', { ascending: true });

  if (tenantId) query = query.eq('id', tenantId);

  const { data, error } = await query;
  if (error) throw error;
  return data || [];
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  if (!options.dryRun && !options.tenantId) {
    throw new Error('Use --tenant=<id> para executar --apply tenant a tenant.');
  }
  const tenants = await listTenants(options.tenantId);
  const reports = [];

  for (const tenant of tenants) {
    reports.push({
      tenant: {
        id: tenant.id,
        nome_fantasia: tenant.nome_fantasia,
        slug: tenant.slug
      },
      result: await operationalProfilesService.reconcileTenant(tenant, {
        dryRun: options.dryRun
      })
    });
  }

  const appointmentChanges = reports.reduce((total, report) => total + (report.result.appointments?.changed || 0), 0);
  console.log(JSON.stringify({
    mode: options.dryRun ? 'dry-run' : 'apply',
    tenants: reports.length,
    appointment_updates_planned: 0,
    appointment_changes: appointmentChanges,
    reports
  }, null, 2));

  if (appointmentChanges !== 0) {
    process.exitCode = 1;
  }
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
