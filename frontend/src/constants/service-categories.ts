export const SERVICE_CATEGORIES = [
  "cabelo",
  "barba",
  "manicure",
  "pedicure",
  "estetica",
  "massagem",
  "sobrancelha",
  "cilios",
  "maquiagem",
  "depilacao",
  "tratamento",
  "tintura_coloracao",
  "outro"
] as const;

export type ServiceCategory = (typeof SERVICE_CATEGORIES)[number];

export const SERVICE_CATEGORY_LABELS: Record<ServiceCategory, string> = {
  cabelo: "Cabelo",
  barba: "Barba",
  manicure: "Manicure",
  pedicure: "Pedicure",
  estetica: "Estetica",
  massagem: "Massagem",
  sobrancelha: "Sobrancelha",
  cilios: "Cilios",
  maquiagem: "Maquiagem",
  depilacao: "Depilacao",
  tratamento: "Tratamentos",
  tintura_coloracao: "Tintura/Coloracao",
  outro: "Outro"
};

export const SERVICE_DURATION_OPTIONS = [15, 30, 45, 60, 90, 120] as const;
