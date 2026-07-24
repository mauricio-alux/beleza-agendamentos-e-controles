const {
  BELLORY_OFFICIAL_CATEGORY_KEYS,
  BELLORY_CATEGORY_ALIASES,
  normalizeOfficialCategoryKey,
  isOfficialCategoryKey
} = require('./bellory-taxonomy');

const SERVICE_CATEGORIES = BELLORY_OFFICIAL_CATEGORY_KEYS;

module.exports = {
  SERVICE_CATEGORIES,
  SERVICE_CATEGORY_ALIASES: BELLORY_CATEGORY_ALIASES,
  normalizeServiceCategory: normalizeOfficialCategoryKey,
  isValidServiceCategory: isOfficialCategoryKey
};
