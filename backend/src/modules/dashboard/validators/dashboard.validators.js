const VALID_DASHBOARD_ROLES = ['administrador', 'autonomo', 'profissional_adm', 'cliente', 'master_admin'];

function isDashboardRole(role) {
  return VALID_DASHBOARD_ROLES.includes(role);
}

module.exports = {
  VALID_DASHBOARD_ROLES,
  isDashboardRole
};
