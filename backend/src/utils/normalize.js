function onlyDigits(value = '') {
  return String(value).replace(/\D/g, '');
}

function normalizeEmail(value = '') {
  return String(value).trim().toLowerCase();
}

function normalizeSlug(value = '') {
  return String(value)
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 100);
}

module.exports = {
  onlyDigits,
  normalizeEmail,
  normalizeSlug
};
