export const BUSINESS_TYPES = [
  "salao_beleza",
  "barbearia",
  "manicure_pedicure",
  "estetica",
  "sobrancelhas_cilios",
  "maquiagem",
  "massoterapia",
  "clinica_estetica",
  "autonomo",
  "outro"
] as const;

export type BusinessType = (typeof BUSINESS_TYPES)[number];

export const BUSINESS_TYPE_LABELS: Record<BusinessType, string> = {
  salao_beleza: "Salão de beleza",
  barbearia: "Barbearia",
  manicure_pedicure: "Manicure/Pedicure",
  estetica: "Estetica",
  sobrancelhas_cilios: "Sobrancelhas e cilios",
  maquiagem: "Maquiagem",
  massoterapia: "Massoterapia",
  clinica_estetica: "Clinica de estetica",
  autonomo: "Profissional autonomo",
  outro: "Outro"
};
