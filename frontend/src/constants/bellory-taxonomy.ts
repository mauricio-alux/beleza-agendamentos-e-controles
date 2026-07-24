export const TAXONOMY_ENTITY_TYPES = {
  CATEGORY: "category",
  CARGO: "cargo",
  SERVICE: "service",
  SPECIALTY: "specialty"
} as const;

export const BELLORY_OFFICIAL_CATEGORIES = [
  { key: "cabelo", label: "Cabelo" },
  { key: "barba", label: "Barba" },
  { key: "unhas", label: "Unhas" },
  { key: "maquiagem", label: "Maquiagem" },
  { key: "estetica_facial", label: "Estetica Facial" },
  { key: "estetica_corporal", label: "Estetica Corporal" },
  { key: "podologia", label: "Podologia" },
  { key: "massoterapia", label: "Massoterapia" },
  { key: "terapia_capilar", label: "Terapia Capilar" },
  { key: "sobrancelhas", label: "Sobrancelhas" },
  { key: "cilios", label: "Cilios" }
] as const;

export const BELLORY_OFFICIAL_OPERATIONAL_CARGOS = [
  {
    name: "Cabeleireira",
    categoryKey: "cabelo",
    description: "Profissional de cabelos, finalizacao e tratamentos capilares."
  },
  {
    name: "Barbeiro",
    categoryKey: "barba",
    description: "Profissional de barba, cabelo masculino e acabamento."
  },
  {
    name: "Manicure",
    categoryKey: "unhas",
    description: "Profissional de cuidados, embelezamento e design de unhas."
  },
  {
    name: "Esteticista",
    categoryKey: "estetica_facial",
    description: "Profissional de estetica facial e corporal."
  },
  {
    name: "Maquiadora",
    categoryKey: "maquiagem",
    description: "Profissional de maquiagem social, eventos e producoes."
  },
  {
    name: "Podologa",
    categoryKey: "podologia",
    description: "Profissional de cuidados especializados com os pes."
  },
  {
    name: "Massoterapeuta",
    categoryKey: "massoterapia",
    description: "Profissional de massagens e bem-estar."
  },
  {
    name: "Lash Designer",
    categoryKey: "cilios",
    description: "Profissional de extensao e manutencao de cilios."
  },
  {
    name: "Designer de Sobrancelhas",
    categoryKey: "sobrancelhas",
    description: "Profissional de design e manutencao de sobrancelhas."
  },
  {
    name: "Terapeuta Capilar",
    categoryKey: "terapia_capilar",
    description: "Profissional de tratamentos do couro cabeludo e fios."
  }
] as const;

export const BELLORY_OFFICIAL_ADMINISTRATIVE_CARGOS = [
  "Recepcionista",
  "Secretaria",
  "Caixa",
  "Auxiliar Administrativo",
  "Assistente Operacional",
  "Gerente",
  "Coordenadora",
  "Financeiro",
  "Marketing",
  "Atendente"
] as const;

export const BELLORY_OFFICIAL_SERVICES = [
  {
    name: "Corte de Cabelo",
    action: "Cortar cabelo",
    categoryKey: "cabelo",
    specialties: ["Corte Feminino", "Corte Masculino", "Corte Infantil", "Corte Degrade"]
  },
  {
    name: "Escova",
    action: "Fazer escova",
    categoryKey: "cabelo",
    specialties: ["Escova Simples", "Escova Modelada", "Escova Progressiva"]
  },
  {
    name: "Coloracao",
    action: "Colorir cabelo",
    categoryKey: "cabelo",
    specialties: ["Coloracao Global", "Tonalizacao", "Mechas", "Luzes"]
  },
  {
    name: "Hidratacao",
    action: "Hidratar cabelo",
    categoryKey: "terapia_capilar",
    specialties: ["Hidratacao Capilar", "Reconstrucao Capilar", "Tratamento do Couro Cabeludo"]
  },
  {
    name: "Barba",
    action: "Fazer barba",
    categoryKey: "barba",
    specialties: ["Barba Tradicional", "Barba Desenhada"]
  },
  {
    name: "Manicure",
    action: "Fazer manicure",
    categoryKey: "unhas",
    specialties: ["Nail Art", "Blindagem", "Fibra", "Banho em Gel"]
  },
  {
    name: "Pedicure",
    action: "Fazer pedicure",
    categoryKey: "unhas",
    specialties: ["Pedicure Tradicional", "Spa dos Pes"]
  },
  {
    name: "Maquiagem",
    action: "Fazer maquiagem",
    categoryKey: "maquiagem",
    specialties: ["Maquiagem Social", "Maquiagem Noiva"]
  },
  {
    name: "Limpeza de Pele",
    action: "Fazer limpeza de pele",
    categoryKey: "estetica_facial",
    specialties: ["Limpeza de Pele", "Hidratacao Facial"]
  },
  {
    name: "Massagem",
    action: "Fazer massagem",
    categoryKey: "massoterapia",
    specialties: ["Massagem Relaxante", "Massagem Terapeutica", "Drenagem Linfatica"]
  },
  {
    name: "Design de Sobrancelhas",
    action: "Fazer design de sobrancelhas",
    categoryKey: "sobrancelhas",
    specialties: ["Design de Sobrancelhas", "Henna"]
  },
  {
    name: "Extensao de Cilios",
    action: "Fazer extensao de cilios",
    categoryKey: "cilios",
    specialties: ["Extensao de Cilios", "Manutencao de Cilios"]
  }
] as const;

export const BELLORY_TAXONOMY_NAMING_RULES = {
  global: [
    "Usar singular.",
    "Usar primeira letra maiuscula.",
    "Evitar abreviacoes.",
    "Evitar emojis e caracteres especiais desnecessarios.",
    "Evitar duplicidade semantica.",
    "Evitar nomes longos."
  ],
  cargo: [
    "Usar substantivo profissional.",
    "Nao usar verbo.",
    "Nao usar frases longas.",
    "Evitar especializacao excessiva no nome."
  ],
  service: [
    "Usar nome comercial para cliente final.",
    "Evitar verbo no nome principal.",
    "Separar nome comercial de acao operacional quando necessario."
  ],
  specialty: [
    "Usar substantivo simples ou composto.",
    "Manter vinculo tecnico coerente com servico.",
    "Manter coerencia com cargo e categoria."
  ]
} as const;

export type BelloryOfficialCategory = (typeof BELLORY_OFFICIAL_CATEGORIES)[number];
export type BelloryOfficialOperationalCargo = (typeof BELLORY_OFFICIAL_OPERATIONAL_CARGOS)[number];
export type BelloryOfficialService = (typeof BELLORY_OFFICIAL_SERVICES)[number];
