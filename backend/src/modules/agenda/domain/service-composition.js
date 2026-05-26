function firstPositiveNumber(...values) {
  const value = values.find((item) => Number(item) > 0);
  return value === undefined ? 0 : Number(value);
}

function resolveServiceComposition(primaryService, professionalService = null, additionalServices = []) {
  const services = [
    {
      servico_id: primaryService.id,
      nome_servico: primaryService.nome,
      duracao_minutos: firstPositiveNumber(
        professionalService?.duracao_minutos,
        professionalService?.duracao_especifica_minutos,
        primaryService.duracao_minutos
      ),
      valor_servico: firstPositiveNumber(
        professionalService?.preco,
        professionalService?.preco_especifico,
        primaryService.preco
      )
    },
    ...additionalServices
  ];

  return {
    services,
    totalDurationMinutes: services.reduce((total, service) => total + Number(service.duracao_minutos || 0), 0),
    totalPrice: services.reduce((total, service) => total + Number(service.valor_servico || 0), 0),
    multi_service_ready: true,
    multi_professional_ready: false
  };
}

module.exports = {
  resolveServiceComposition
};
