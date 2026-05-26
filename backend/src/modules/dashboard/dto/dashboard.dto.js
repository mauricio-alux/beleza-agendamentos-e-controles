function dashboardContextDto(req) {
  return {
    tenantId: req.tenantId,
    tenant: req.tenant,
    user: req.usuario,
    userId: req.usuario?.id,
    role: req.tipoUsuario || req.usuario?.tipo_usuario
  };
}

module.exports = {
  dashboardContextDto
};
