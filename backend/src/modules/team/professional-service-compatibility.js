const { normalizeOfficialCategoryKey } = require('../../constants/bellory-taxonomy');

function hasExactServiceCompatibility({
  service,
  professionalSpecialtyIds,
  serviceSpecialtyIds,
  specialtyById
}) {
  if (!service) return false;

  const serviceCategory = normalizeOfficialCategoryKey(
    service.taxonomy_category_key || service.categoria
  );

  if (!serviceCategory) return false;

  return [...serviceSpecialtyIds].some((specialtyId) => {
    if (!professionalSpecialtyIds.has(specialtyId)) return false;

    const specialtyCategory = normalizeOfficialCategoryKey(
      specialtyById.get(specialtyId)?.taxonomy_category_key
    );

    return specialtyCategory === serviceCategory;
  });
}

module.exports = {
  hasExactServiceCompatibility
};
