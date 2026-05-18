const { normalizeSlug } = require('../utils/normalize');

async function generateUniqueSlug(baseName, existsFn) {
  const base = normalizeSlug(baseName) || 'bellory';
  let candidate = base;
  let suffix = 1;

  while (await existsFn(candidate)) {
    suffix += 1;
    candidate = `${base}-${suffix}`;
  }

  return candidate;
}

module.exports = {
  generateUniqueSlug
};
