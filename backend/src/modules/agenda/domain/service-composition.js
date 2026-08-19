function firstPositiveNumber(...values) {
  const value = values.find((item) => Number(item) > 0);
  return value === undefined ? 0 : Number(value);
}

function resolveServiceComposition(primaryService, professionalService = null, additionalServices = [], options = {}) {
  const serviceSpecialty = options.serviceSpecialty || null;
  const durationMinutes = firstPositiveNumber(serviceSpecialty?.duracao_minutos);
  const servicePrice = serviceSpecialty?.preco ?? null;
  const services = [
    {
      servico_id: null,
      servico_tenant_id: primaryService.servico_tenant_id || primaryService.id,
      servico_catalogo_id: primaryService.servico_catalogo_id || null,
      especialidade_id: serviceSpecialty?.especialidade_id || null,
      servico_especialidade_id: null,
      servico_tenant_especialidade_id: serviceSpecialty?.id || null,
      nome_especialidade: serviceSpecialty?.especialidade?.nome || null,
      nome_servico: primaryService.nome,
      duracao_minutos: durationMinutes,
      valor_servico: servicePrice,
      duracao_origem: serviceSpecialty?.duracao_minutos ? 'servico_tenant_especialidade' : null,
      preco_origem: serviceSpecialty?.preco !== null && serviceSpecialty?.preco !== undefined
        ? 'servico_tenant_especialidade'
        : null
    },
    ...additionalServices
  ];

  return {
    services,
    totalDurationMinutes: services.reduce((total, service) => total + Number(service.duracao_minutos || 0), 0),
    totalPrice: services.some((service) => service.valor_servico === null || service.valor_servico === undefined)
      ? null
      : services.reduce((total, service) => total + Number(service.valor_servico || 0), 0),
    multi_service_ready: true,
    multi_professional_ready: false
  };
}

module.exports = {
  resolveServiceComposition
};
