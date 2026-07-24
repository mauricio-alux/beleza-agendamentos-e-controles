import { BELLORY_OFFICIAL_SERVICES } from "@/constants/bellory-taxonomy";

const ACTION_VERBS = [
  "aplicar",
  "cortar",
  "colorir",
  "corrigir",
  "cuidar",
  "depilar",
  "desenhar",
  "escovar",
  "executar",
  "fazer",
  "hidratar",
  "limpar",
  "maquiar",
  "modelar",
  "pintar",
  "tratar"
];

export type TaxonomyValidationResult = {
  valid: boolean;
  message?: string;
  suggestions?: string[];
};

export function normalizeTaxonomyText(value: string) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/\s+/g, " ");
}

function startsWithActionVerb(value: string) {
  const normalized = normalizeTaxonomyText(value);
  return ACTION_VERBS.some((verb) => normalized === verb || normalized.startsWith(`${verb} `));
}

function hasEmoji(value: string) {
  return /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/u.test(String(value || ""));
}

function hasUnsupportedCharacters(value: string) {
  return /[^a-zA-Z\u00C0-\u00FF0-9\s/&.-]/u.test(String(value || ""));
}

function getOfficialServiceSuggestions(value: string) {
  const normalized = normalizeTaxonomyText(value);
  return BELLORY_OFFICIAL_SERVICES
    .filter((service) => {
      const name = normalizeTaxonomyText(service.name);
      const action = normalizeTaxonomyText(service.action);
      return name.includes(normalized) || normalized.includes(name) || action.includes(normalized);
    })
    .map((service) => service.name)
    .slice(0, 3);
}

export function validateServiceTaxonomyName(value: string): TaxonomyValidationResult {
  if (hasEmoji(value)) {
    return {
      valid: false,
      message: "Servico nao deve conter emoji."
    };
  }

  if (hasUnsupportedCharacters(value)) {
    return {
      valid: false,
      message: "Servico possui caracteres nao permitidos."
    };
  }

  if (startsWithActionVerb(value)) {
    return {
      valid: false,
      message: "Use um nome comercial, sem verbo no inicio.",
      suggestions: getOfficialServiceSuggestions(value)
    };
  }

  if (normalizeTaxonomyText(value).split(" ").filter(Boolean).length > 5) {
    return {
      valid: false,
      message: "Use um nome de servico mais curto e direto."
    };
  }

  return { valid: true };
}
