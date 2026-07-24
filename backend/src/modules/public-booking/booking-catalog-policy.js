const SERVICE_UNAVAILABLE_REASONS = {
  NO_PROFESSIONAL_LINK: 'no_professional_link',
  NO_ELIGIBLE_PROFESSIONAL: 'no_eligible_professional'
};

function classifyServiceAvailability({
  services,
  professionalServices,
  eligibleProfessionalIds
}) {
  const formalProfessionalIdsByService = new Map();

  professionalServices.forEach((link) => {
    if (!formalProfessionalIdsByService.has(link.servico_id)) {
      formalProfessionalIdsByService.set(link.servico_id, new Set());
    }
    formalProfessionalIdsByService.get(link.servico_id).add(link.profissional_id);
  });

  const eligibleServiceIds = new Set();
  const unavailableServices = [];

  services.forEach((service) => {
    const formalProfessionalIds = formalProfessionalIdsByService.get(service.id) || new Set();
    if (!formalProfessionalIds.size) {
      unavailableServices.push({
        id: service.id,
        nome: service.nome,
        reason: SERVICE_UNAVAILABLE_REASONS.NO_PROFESSIONAL_LINK
      });
      return;
    }

    const eligibleLinkedProfessionals = [...formalProfessionalIds].filter((professionalId) => (
      eligibleProfessionalIds.has(professionalId)
    ));
    if (!eligibleLinkedProfessionals.length) {
      unavailableServices.push({
        id: service.id,
        nome: service.nome,
        reason: SERVICE_UNAVAILABLE_REASONS.NO_ELIGIBLE_PROFESSIONAL
      });
      return;
    }

    eligibleServiceIds.add(service.id);
  });

  return {
    eligibleServiceIds,
    unavailableServices
  };
}

module.exports = {
  SERVICE_UNAVAILABLE_REASONS,
  classifyServiceAvailability
};
