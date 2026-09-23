const { AppError } = require('../../utils/errors');
const { normalizePhoneToE164 } = require('../../utils/normalize');

const MESSAGE = 'Não foi possível localizar um cadastro com os dados informados. Verifique os dados e tente novamente.';
function denied(reason = 'CLIENT_MATCH_UNAVAILABLE') {
  // Internal classification only: never include submitted data or reason in the response.
  console.info('[public-identity]', { result: reason });
  return new AppError(MESSAGE, 422, 'CLIENT_MATCH_UNAVAILABLE');
}
function validBirthDate(value, today = new Date().toISOString().slice(0, 10)) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const [year, month, day] = value.split('-').map(Number);
  if (year < 1 || month < 1 || month > 12 || day < 1 || value > today) return false;
  const leap = year % 4 === 0 && (year % 100 !== 0 || year % 400 === 0);
  return day <= [31, leap ? 29 : 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31][month - 1];
}
function normalizePair(input = {}) {
  try {
    const telefone = normalizePhoneToE164(input.telefone);
    if (!telefone || !validBirthDate(input.data_nascimento)) throw Error('invalid');
    return { telefone, data_nascimento: input.data_nascimento };
  } catch { throw denied(); }
}
function eligibleClient(context) {
  return Boolean(context && context.ativo === true && context.status === 'ativo' && !context.deleted_at
    && context.cliente?.ativo === true && !context.cliente.deleted_at);
}
function eligibleTenant(tenant) {
  return Boolean(tenant?.ativo === true && !tenant.deleted_at && ['ativo', 'trial'].includes(tenant.status));
}
function eligibleLink(link) {
  return Boolean(link?.ativo === true && link.acesso_publico === true && !link.deleted_at
    && (!link.expira_em || Date.parse(link.expira_em) > Date.now()));
}
module.exports = { MESSAGE, denied, validBirthDate, normalizePair, eligibleClient, eligibleTenant, eligibleLink };
