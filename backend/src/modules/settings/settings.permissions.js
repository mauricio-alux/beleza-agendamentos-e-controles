const SECTION_ACCESS = {
  MasterAdmin: ['overview', 'profile', 'security', 'platform'],
  Administrador: ['overview', 'profile', 'tenant', 'operation', 'services', 'specialties', 'role_specialties', 'team', 'subscription', 'security'],
  Gerente: ['overview', 'profile', 'tenant', 'operation', 'services', 'specialties', 'role_specialties', 'team', 'security'],
  Autonomo: ['overview', 'profile', 'tenant', 'operation', 'services', 'specialties', 'role_specialties', 'subscription', 'security'],
  Profissional: ['overview', 'profile', 'operation', 'security'],
  Recepcionista: ['overview', 'profile', 'operation', 'security'],
  Financeiro: ['overview', 'profile', 'subscription', 'security'],
  Funcionario: ['overview', 'profile', 'security'],
  Terceiro: ['overview', 'profile', 'security'],
  'Profissional Adm': ['overview', 'profile', 'security'],
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

  return ['Administrador', 'Gerente', 'Autonomo'].includes(role) && canAccessSection(role, section);
}

module.exports = {
  getRole,
  getAllowedSections,
  canAccessSection,
  canWriteSection
};
