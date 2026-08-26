const service = require('./business-types.service');
const {
  businessTypeSchema,
  updateBusinessTypeSchema,
  statusSchema,
  catalogAssociationSchema,
  catalogPayloadSchema,
  updateCatalogPayloadSchema,
  catalogSpecialtiesSchema,
  tenantBusinessTypesSchema,
  rolePayloadSchema,
  updateRolePayloadSchema,
  specialtyPayloadSchema,
  updateSpecialtyPayloadSchema,
  operationalProfileUpdateSchema,
  operationalProfileDefaultSchema,
  operationalProfileDefaultUpdateSchema,
  operationalProfileServiceSchema,
  operationalProfileRoleSchema
} = require('./business-types.validators');
const operationalProfilesService = require('../operational-profiles/operational-profiles.service');

function platformContext(req) {
  return req.platformContext || {
    usuario: req.usuario,
    userId: req.usuario?.id,
    role: req.tipoUsuario || req.usuario?.tipo_usuario
  };
}

function tenantContext(req) {
  return {
    tenantId: req.tenantId,
    usuario: req.usuario,
    role: req.tipoUsuario,
    membership: req.membership
  };
}

async function active(req, res) {
  const data = await service.listActiveTypes();
  return res.json({ data });
}

async function adminList(req, res) {
  const data = await service.listAdminTypes(platformContext(req), req.query || {});
  return res.json({ data });
}

async function adminDetail(req, res) {
  const data = await service.getAdminType(platformContext(req), req.params.id);
  return res.json({ data });
}

async function adminCreate(req, res) {
  const input = businessTypeSchema.parse(req.body);
  const data = await service.createAdminType(platformContext(req), input);
  return res.status(201).json({ data });
}

async function adminUpdate(req, res) {
  const input = updateBusinessTypeSchema.parse(req.body);
  const data = await service.updateAdminType(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminStatus(req, res) {
  const input = statusSchema.parse(req.body);
  const data = await service.updateAdminStatus(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminServices(req, res) {
  const data = await service.listAdminTypeServices(platformContext(req), req.params.id);
  return res.json({ data });
}

async function adminCatalog(req, res) {
  const data = await service.listAdminCatalog(platformContext(req));
  return res.json({ data });
}

async function adminCreateCatalog(req, res) {
  const input = catalogPayloadSchema.parse(req.body);
  const data = await service.createAdminCatalog(platformContext(req), input);
  return res.status(201).json({ data });
}

async function adminUpdateCatalog(req, res) {
  const input = updateCatalogPayloadSchema.parse(req.body);
  const data = await service.updateAdminCatalog(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminSpecialties(req, res) {
  const data = await service.listAdminSpecialties(platformContext(req));
  return res.json({ data });
}

async function adminRoles(req, res) {
  const data = await service.listAdminRoles(platformContext(req));
  return res.json({ data });
}

async function adminCreateRole(req, res) {
  const input = rolePayloadSchema.parse(req.body);
  const data = await service.createAdminRole(platformContext(req), input);
  return res.status(201).json({ data });
}

async function adminUpdateRole(req, res) {
  const input = updateRolePayloadSchema.parse(req.body);
  const data = await service.updateAdminRole(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminGlobalSpecialties(req, res) {
  const data = await service.listAdminGlobalSpecialties(platformContext(req));
  return res.json({ data });
}

async function adminCreateSpecialty(req, res) {
  const input = specialtyPayloadSchema.parse(req.body);
  const data = await service.createAdminSpecialty(platformContext(req), input);
  return res.status(201).json({ data });
}

async function adminUpdateSpecialty(req, res) {
  const input = updateSpecialtyPayloadSchema.parse(req.body);
  const data = await service.updateAdminSpecialty(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminCatalogSpecialties(req, res) {
  const data = await service.listAdminCatalogSpecialties(platformContext(req), req.params.id);
  return res.json({ data });
}

async function adminReplaceCatalogSpecialties(req, res) {
  const input = catalogSpecialtiesSchema.parse(req.body);
  const data = await service.replaceAdminCatalogSpecialties(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminReplaceServices(req, res) {
  const input = catalogAssociationSchema.parse(req.body);
  const data = await service.replaceAdminTypeServices(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function tenantTypes(req, res) {
  const data = await service.listTenantTypes(req.tenantId);
  return res.json({ data });
}

async function tenantReplace(req, res) {
  const input = tenantBusinessTypesSchema.parse(req.body);
  const data = await service.replaceTenantTypes(tenantContext(req), input);
  return res.json({ data });
}

async function tenantCatalog(req, res) {
  const data = await service.listTenantApplicableCatalog(req.tenantId);
  return res.json({ data });
}

async function adminOperationalProfiles(req, res) {
  const data = await operationalProfilesService.listAdminProfiles(platformContext(req));
  return res.json({ data });
}

async function adminUpdateOperationalProfile(req, res) {
  const input = operationalProfileUpdateSchema.parse(req.body);
  const data = await operationalProfilesService.updateAdminProfile(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminCreateOperationalDefault(req, res) {
  const input = operationalProfileDefaultSchema.parse(req.body);
  const data = await operationalProfilesService.createAdminDefault(platformContext(req), input);
  return res.status(201).json({ data });
}

async function adminUpdateOperationalDefault(req, res) {
  const input = operationalProfileDefaultUpdateSchema.parse(req.body);
  const data = await operationalProfilesService.updateAdminDefault(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminUpsertOperationalProfileService(req, res) {
  const input = operationalProfileServiceSchema.parse(req.body);
  const data = await operationalProfilesService.updateAdminProfileService(platformContext(req), req.params.id, input);
  return res.json({ data });
}

async function adminUpsertOperationalProfileRole(req, res) {
  const input = operationalProfileRoleSchema.parse(req.body);
  const data = await operationalProfilesService.updateAdminProfileRole(platformContext(req), req.params.id, input);
  return res.json({ data });
}

module.exports = {
  active,
  adminList,
  adminDetail,
  adminCreate,
  adminUpdate,
  adminStatus,
  adminCatalog,
  adminCreateCatalog,
  adminUpdateCatalog,
  adminSpecialties,
  adminRoles,
  adminCreateRole,
  adminUpdateRole,
  adminGlobalSpecialties,
  adminCreateSpecialty,
  adminUpdateSpecialty,
  adminCatalogSpecialties,
  adminReplaceCatalogSpecialties,
  adminServices,
  adminReplaceServices,
  tenantTypes,
  tenantReplace,
  tenantCatalog,
  adminOperationalProfiles,
  adminUpdateOperationalProfile,
  adminCreateOperationalDefault,
  adminUpdateOperationalDefault,
  adminUpsertOperationalProfileService,
  adminUpsertOperationalProfileRole
};
