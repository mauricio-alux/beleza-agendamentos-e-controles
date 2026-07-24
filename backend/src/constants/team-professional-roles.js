const TEAM_OWNER_ROLES = ['Administrador', 'Autonomo'];
const TEAM_PROFESSIONAL_ROLES = ['Funcionario', 'Terceiro', 'Profissional Adm', ...TEAM_OWNER_ROLES];
const TEAM_SERVICE_PROVIDER_ROLES = ['Funcionario', 'Terceiro', ...TEAM_OWNER_ROLES];

const LEGACY_TEAM_ROLE_MAP = {
  Profissional: 'Funcionario',
  Recepcionista: 'Profissional Adm'
};

function normalizeTeamProfessionalRole(role) {
  return LEGACY_TEAM_ROLE_MAP[role] || role || 'Funcionario';
}

function canExecuteServices(role) {
  return TEAM_SERVICE_PROVIDER_ROLES.includes(normalizeTeamProfessionalRole(role));
}

function isAdministrativeProfessional(role) {
  return normalizeTeamProfessionalRole(role) === 'Profissional Adm';
}

module.exports = {
  TEAM_OWNER_ROLES,
  TEAM_PROFESSIONAL_ROLES,
  TEAM_SERVICE_PROVIDER_ROLES,
  LEGACY_TEAM_ROLE_MAP,
  normalizeTeamProfessionalRole,
  canExecuteServices,
  isAdministrativeProfessional
};
