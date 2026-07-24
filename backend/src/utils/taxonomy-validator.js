const {
  BELLORY_OFFICIAL_OPERATIONAL_CARGOS,
  BELLORY_OFFICIAL_ADMINISTRATIVE_CARGOS,
  BELLORY_OFFICIAL_SERVICES,
  isOfficialCategoryKey
} = require('../constants/bellory-taxonomy');

const ACTION_VERBS = [
  'aplicar',
  'cortar',
  'colorir',
  'corrigir',
  'cuidar',
  'depilar',
  'desenhar',
  'escovar',
  'executar',
  'fazer',
  'hidratar',
  'limpar',
  'maquiar',
  'modelar',
  'pintar',
  'tratar'
];

const GENERIC_FORBIDDEN_PREFIXES = [
  'servico de',
  'servico para',
  'profissional de',
  'especialista em'
];

function normalizeText(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim()
    .replace(/\s+/g, ' ');
}

function hasEmoji(value) {
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(String(value || ''));
}

function hasUnsupportedCharacters(value) {
  return /[^a-zA-Z\u00C0-\u00FF0-9\s/&.-]/u.test(String(value || ''));
}

function startsWithActionVerb(value) {
  const normalized = normalizeText(value);
  return ACTION_VERBS.some((verb) => normalized === verb || normalized.startsWith(`${verb} `));
}

function startsWithForbiddenPrefix(value, prefixes = GENERIC_FORBIDDEN_PREFIXES) {
  const normalized = normalizeText(value);
  return prefixes.some((prefix) => normalized.startsWith(prefix));
}

function wordCount(value) {
  return normalizeText(value).split(' ').filter(Boolean).length;
}

function getOfficialCargoSuggestions(value) {
  const normalized = normalizeText(value);
  const cargos = [
    ...BELLORY_OFFICIAL_OPERATIONAL_CARGOS.map((cargo) => cargo.name),
    ...BELLORY_OFFICIAL_ADMINISTRATIVE_CARGOS
  ];

  return cargos
    .filter((cargo) => normalizeText(cargo).includes(normalized) || normalized.includes(normalizeText(cargo)))
    .slice(0, 3);
}

function getOfficialServiceSuggestions(value) {
  const normalized = normalizeText(value);
  return BELLORY_OFFICIAL_SERVICES
    .filter((service) => {
      const serviceName = normalizeText(service.name);
      const action = normalizeText(service.action);
      return serviceName.includes(normalized) || normalized.includes(serviceName) || action.includes(normalized);
    })
    .map((service) => service.name)
    .slice(0, 3);
}

function addIssue(ctx, path, message, code, suggestions = []) {
  ctx.addIssue({
    code: 'custom',
    path,
    message,
    params: {
      taxonomy_code: code,
      suggestions
    }
  });
}

function validateCommonName(ctx, value, path, entityLabel) {
  if (!value) return;

  if (hasEmoji(value)) {
    addIssue(ctx, path, `${entityLabel} nao deve conter emoji.`, 'TAXONOMY_EMOJI');
  }

  if (hasUnsupportedCharacters(value)) {
    addIssue(ctx, path, `${entityLabel} possui caracteres nao permitidos.`, 'TAXONOMY_UNSUPPORTED_CHARACTERS');
  }

  if (wordCount(value) > 5) {
    addIssue(ctx, path, `${entityLabel} deve ter nome mais curto e direto.`, 'TAXONOMY_NAME_TOO_LONG');
  }
}

function validateCargoName(ctx, value, path = ['nome']) {
  validateCommonName(ctx, value, path, 'Cargo');

  if (startsWithActionVerb(value)) {
    addIssue(
      ctx,
      path,
      'Cargo deve ser uma funcao profissional, sem verbo no inicio.',
      'TAXONOMY_CARGO_VERB',
      getOfficialCargoSuggestions(value)
    );
  }

  if (startsWithForbiddenPrefix(value)) {
    addIssue(
      ctx,
      path,
      'Cargo deve usar o nome da funcao, sem frases como "profissional de" ou "especialista em".',
      'TAXONOMY_CARGO_GENERIC_PREFIX',
      getOfficialCargoSuggestions(value)
    );
  }
}

function validateServiceName(ctx, value, path = ['nome']) {
  validateCommonName(ctx, value, path, 'Servico');

  if (startsWithActionVerb(value)) {
    addIssue(
      ctx,
      path,
      'Servico deve usar nome comercial, como "Corte de Cabelo", sem verbo no inicio.',
      'TAXONOMY_SERVICE_VERB',
      getOfficialServiceSuggestions(value)
    );
  }
}

function validateSpecialtyName(ctx, value, path = ['nome']) {
  validateCommonName(ctx, value, path, 'Especialidade');

  if (startsWithActionVerb(value)) {
    addIssue(
      ctx,
      path,
      'Especialidade deve ser uma variacao tecnica, sem verbo no inicio.',
      'TAXONOMY_SPECIALTY_VERB'
    );
  }

  if (startsWithForbiddenPrefix(value, ['servico de', 'servico para', 'fazer'])) {
    addIssue(
      ctx,
      path,
      'Especialidade deve descrever a tecnica ou variacao, nao uma frase operacional.',
      'TAXONOMY_SPECIALTY_GENERIC_PREFIX'
    );
  }
}

function validateCategoryValue(ctx, value, path = ['categoria']) {
  if (!value) return;

  if (!isOfficialCategoryKey(value)) {
    addIssue(ctx, path, 'Categoria deve pertencer a taxonomia oficial Bellory.', 'TAXONOMY_CATEGORY_NOT_OFFICIAL');
  }
}

module.exports = {
  normalizeText,
  getOfficialCargoSuggestions,
  getOfficialServiceSuggestions,
  validateCargoName,
  validateServiceName,
  validateSpecialtyName,
  validateCategoryValue
};
