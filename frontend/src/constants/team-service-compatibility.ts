import { BELLORY_OFFICIAL_OPERATIONAL_CARGOS } from "@/constants/bellory-taxonomy";
import { normalizeServiceCategory, type ServiceCategory } from "@/constants/service-categories";
import type { TeamRole } from "@/services/team.service";

const ROLE_CATEGORY_COMPATIBILITY: Record<string, ServiceCategory[]> = {
  barbeiro: ["cabelo", "barba"],
  cabeleireira: ["cabelo", "terapia_capilar"],
  cabeleireiro: ["cabelo", "terapia_capilar"],
  manicure: ["unhas"],
  pedicure: ["unhas", "podologia"],
  podologa: ["podologia"],
  podologo: ["podologia"],
  esteticista: ["estetica_facial", "estetica_corporal"],
  maquiadora: ["maquiagem"],
  maquiador: ["maquiagem"],
  massoterapeuta: ["massoterapia", "estetica_corporal"],
  "lash designer": ["cilios"],
  "designer de sobrancelhas": ["sobrancelhas", "cilios"],
  "terapeuta capilar": ["cabelo", "terapia_capilar"],
  depiladora: ["depilacao"],
  depilador: ["depilacao"]
};

function normalizeTaxonomyKey(value?: string | null) {
  return String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

function getCargoCategory(cargoName?: string | null): ServiceCategory | "" {
  const normalizedCargo = normalizeTaxonomyKey(cargoName);
  const officialCargo = BELLORY_OFFICIAL_OPERATIONAL_CARGOS.find((cargo) => normalizeTaxonomyKey(cargo.name) === normalizedCargo);
  return normalizeServiceCategory(officialCargo?.categoryKey);
}

export function getAllowedCategoryKeysForRole(role?: TeamRole | null): ServiceCategory[] {
  const normalizedCargo = normalizeTaxonomyKey(role?.nome);
  const configured = ROLE_CATEGORY_COMPATIBILITY[normalizedCargo];

  if (configured) {
    return configured.map((category) => normalizeServiceCategory(category)).filter(Boolean) as ServiceCategory[];
  }

  const fallbackCategory = getCargoCategory(role?.nome);
  return fallbackCategory ? [fallbackCategory] : [];
}

export function isRoleCategoryCompatible(role: TeamRole | null | undefined, categoryKey?: string | null) {
  const normalizedCategory = normalizeServiceCategory(categoryKey);
  return Boolean(normalizedCategory && getAllowedCategoryKeysForRole(role).includes(normalizedCategory));
}
