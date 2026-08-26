const assert = require('node:assert/strict');
const test = require('node:test');
const servicesService = require('./services.service');

test('new tenant service configuration is marked as tenant-added', () => {
  assert.equal(servicesService.resolveTenantCommercialOrigin({}), 'tenant_added');
});

test('profile materialized configuration becomes tenant-customized when edited', () => {
  assert.equal(servicesService.resolveTenantCommercialOrigin({
    id: 'config-1',
    metadata: {
      config_origin: 'profile_default',
      default_id: 'default-1',
      perfil_operacional_id: 'profile-1'
    }
  }), 'tenant_customized');
});

test('legacy onboarding metadata is treated as profile materialization', () => {
  assert.equal(servicesService.resolveTenantCommercialOrigin({
    id: 'config-2',
    metadata: {
      origem: 'operational_profile_onboarding'
    }
  }), 'tenant_customized');
});

test('tenant-added origin is preserved for tenant-owned rows', () => {
  assert.equal(servicesService.resolveTenantCommercialOrigin({
    id: 'config-3',
    metadata: {
      config_origin: 'tenant_added'
    }
  }), 'tenant_added');
});
