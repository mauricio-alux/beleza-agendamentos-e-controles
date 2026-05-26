const SECTION_ACCESS = {
  MasterAdmin: ['overview', 'profile', 'tenant', 'operation', 'services', 'team', 'subscription', 'security', 'platform'],
  Administrador: ['overview', 'profile', 'tenant', 'operation', 'services', 'team', 'subscription', 'security'],
  Autonomo: ['overview', 'profile', 'tenant', 'operation', 'services', 'subscription', 'security'],
  Funcionario: ['overview', 'profile', 'operation', 'security'],
  Terceiro: ['overview', 'profile', 'operation', 'security'],
  Cliente: ['overview', 'profile', 'security']
};

function getRole(usuario) {
  return usuario?.tipo_usuario || 'Cliente';
}

function getAllowedSections(role) {
  return SECTION_ACCESS[role] || SECTION_ACCESS.Cliente;
}

function canAccessSection(role, section) {
  return getAllowedSections(role).includes(section);
}

function canWriteSection(role, section) {
  if (section === 'profile') {
    return true;
  }

  if (section === 'security') {
    return true;
  }

  return ['MasterAdmin', 'Administrador', 'Autonomo'].includes(role) && canAccessSection(role, section);
}

module.exports = {
  getRole,
  getAllowedSections,
  canAccessSection,
  canWriteSection
};
