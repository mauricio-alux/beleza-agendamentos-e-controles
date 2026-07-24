const ADMINISTRATIVE_PERMISSION_CODES = [
  'dashboard.read',
  'agenda.read',
  'agenda.write',
  'agenda.confirm',
  'agenda.cancel',
  'agenda.reschedule',
  'agenda.complete',
  'agenda.no_show',
  'clientes.read',
  'clientes.write',
  'financeiro.read',
  'campanhas.read',
  'equipe.read',
  'tenant.read'
];

const DEFAULT_ADMINISTRATIVE_PERMISSIONS_BY_CARGO = {
  Recepcionista: ['dashboard.read', 'agenda.read', 'agenda.confirm', 'agenda.cancel', 'agenda.reschedule', 'clientes.read', 'clientes.write'],
  Secretaria: ['dashboard.read', 'agenda.read', 'agenda.confirm', 'agenda.cancel', 'agenda.reschedule', 'clientes.read'],
  Caixa: ['dashboard.read', 'agenda.read', 'clientes.read', 'financeiro.read'],
  'Auxiliar administrativo': ['dashboard.read', 'agenda.read', 'clientes.read'],
  'Assistente operacional': ['dashboard.read', 'agenda.read', 'clientes.read'],
  'Supervisor(a)': ['dashboard.read', 'agenda.read', 'agenda.confirm', 'agenda.cancel', 'agenda.reschedule', 'agenda.complete', 'agenda.no_show', 'clientes.read', 'campanhas.read', 'equipe.read'],
  Gerente: ['dashboard.read', 'agenda.read', 'agenda.write', 'agenda.confirm', 'agenda.cancel', 'agenda.reschedule', 'agenda.complete', 'agenda.no_show', 'clientes.read', 'clientes.write', 'financeiro.read', 'campanhas.read', 'equipe.read', 'tenant.read'],
  'Coordenador(a)': ['dashboard.read', 'agenda.read', 'agenda.confirm', 'agenda.cancel', 'agenda.reschedule', 'agenda.complete', 'agenda.no_show', 'clientes.read', 'campanhas.read', 'equipe.read'],
  Financeiro: ['dashboard.read', 'clientes.read', 'financeiro.read'],
  RH: ['dashboard.read', 'equipe.read'],
  Marketing: ['dashboard.read', 'clientes.read', 'campanhas.read'],
  Atendente: ['dashboard.read', 'agenda.read', 'agenda.confirm', 'clientes.read'],
  Concierge: ['dashboard.read', 'agenda.read', 'agenda.confirm', 'agenda.cancel', 'agenda.reschedule', 'clientes.read']
};

function getAdministrativePermissionsForCargo(cargo) {
  return DEFAULT_ADMINISTRATIVE_PERMISSIONS_BY_CARGO[cargo] || ['dashboard.read', 'agenda.read', 'clientes.read'];
}

module.exports = {
  ADMINISTRATIVE_PERMISSION_CODES,
  DEFAULT_ADMINISTRATIVE_PERMISSIONS_BY_CARGO,
  getAdministrativePermissionsForCargo
};
