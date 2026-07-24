import { BELLORY_OFFICIAL_CATEGORIES } from "@/constants/bellory-taxonomy";

export const SERVICE_CATEGORIES = BELLORY_OFFICIAL_CATEGORIES.map((category) => category.key);

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  cabelo: "Cabelo",
  barba: "Barba",
  unhas: "Unhas",
  estetica_facial: "Estetica Facial",
  estetica_corporal: "Estetica Corporal",
  podologia: "Podologia",
  massoterapia: "Massoterapia",
  terapia_capilar: "Terapia Capilar",
  sobrancelhas: "Sobrancelhas",
  cilios: "Cilios",
  maquiagem: "Maquiagem"
};

export const SERVICE_CATEGORY_ALIASES: Record<string, ServiceCategory> = {
  manicure: "unhas",
  pedicure: "unhas",
  estetica: "estetica_facial",
  massagem: "massoterapia",
  sobrancelha: "sobrancelhas",
  tratamento: "terapia_capilar",
  tintura_coloracao: "cabelo"
};

export function normalizeServiceCategory(value?: string | null): ServiceCategory | "" {
  if (!value) return "";
  const normalized = value as ServiceCategory;
  if ((SERVICE_CATEGORIES as readonly string[]).includes(normalized)) return normalized;
  return SERVICE_CATEGORY_ALIASES[value] || "";
}

export const SERVICE_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
