const TAXONOMY_ENTITY_TYPES = {
  CATEGORY: 'category',
  CARGO: 'cargo',
  SERVICE: 'service',
  SPECIALTY: 'specialty'
};

const BELLORY_OFFICIAL_CATEGORIES = [
  { key: 'cabelo', label: 'Cabelo' },
  { key: 'barba', label: 'Barba' },
  { key: 'unhas', label: 'Unhas' },
  { key: 'maquiagem', label: 'Maquiagem' },
  { key: 'estetica_facial', label: 'Estetica Facial' },
  { key: 'estetica_corporal', label: 'Estetica Corporal' },
  { key: 'podologia', label: 'Podologia' },
  { key: 'massoterapia', label: 'Massoterapia' },
  { key: 'terapia_capilar', label: 'Terapia Capilar' },
  { key: 'sobrancelhas', label: 'Sobrancelhas' },
  { key: 'cilios', label: 'Cilios' },
  { key: 'depilacao', label: 'Depilacao' }
];

const BELLORY_OFFICIAL_OPERATIONAL_CARGOS = [
  {
    name: 'Cabeleireira',
    categoryKey: 'cabelo',
    description: 'Profissional de cabelos, finalizacao e tratamentos capilares.'
  },
  {
    name: 'Barbeiro',
    categoryKey: 'barba',
    description: 'Profissional de barba, cabelo masculino e acabamento.'
  },
  {
    name: 'Manicure',
    categoryKey: 'unhas',
    description: 'Profissional de cuidados, embelezamento e design de unhas.'
  },
  {
    name: 'Esteticista',
    categoryKey: 'estetica_facial',
    description: 'Profissional de estetica facial e corporal.'
  },
  {
    name: 'Maquiadora',
    categoryKey: 'maquiagem',
    description: 'Profissional de maquiagem social, eventos e producoes.'
  },
  {
    name: 'Podologa',
    categoryKey: 'podologia',
    description: 'Profissional de cuidados especializados com os pes.'
  },
  {
    name: 'Massoterapeuta',
    categoryKey: 'massoterapia',
    description: 'Profissional de massagens e bem-estar.'
  },
  {
    name: 'Lash Designer',
    categoryKey: 'cilios',
    description: 'Profissional de extensao e manutencao de cilios.'
  },
  {
    name: 'Designer de Sobrancelhas',
    categoryKey: 'sobrancelhas',
    description: 'Profissional de design e manutencao de sobrancelhas.'
  },
  {
    name: 'Terapeuta Capilar',
    categoryKey: 'terapia_capilar',
    description: 'Profissional de tratamentos do couro cabeludo e fios.'
  },
  {
    name: 'Depiladora',
    categoryKey: 'depilacao',
    description: 'Profissional de depilacao com cera, facial e laser.'
  }
];

const BELLORY_OFFICIAL_ADMINISTRATIVE_CARGOS = [
  'Recepcionista',
  'Secretaria',
  'Caixa',
  'Auxiliar Administrativo',
  'Assistente Operacional',
  'Gerente',
  'Coordenadora',
  'Financeiro',
  'Marketing',
  'Atendente'
];

const BELLORY_OFFICIAL_SERVICES = [
  {
    name: 'Manicure Tradicional',
    action: 'Fazer manicure tradicional',
    categoryKey: 'unhas',
    specialties: ['Manicure']
  },
  {
    name: 'Esmaltacao em Gel',
    action: 'Fazer esmaltacao em gel',
    categoryKey: 'unhas',
    specialties: ['Esmaltacao em Gel']
  },
  {
    name: 'Alongamento de Unhas',
    action: 'Fazer alongamento de unhas',
    categoryKey: 'unhas',
    specialties: ['Alongamento de Unhas', 'Gel']
  },
  {
    name: 'Manutencao de Alongamento',
    action: 'Fazer manutencao de alongamento',
    categoryKey: 'unhas',
    specialties: ['Alongamento de Unhas', 'Gel']
  },
  {
    name: 'Banho de Gel',
    action: 'Fazer banho de gel',
    categoryKey: 'unhas',
    specialties: ['Alongamento de Unhas', 'Gel']
  },
  {
    name: 'Nail Art',
    action: 'Fazer nail art',
    categoryKey: 'unhas',
    specialties: ['Nail Art']
  },
  {
    name: 'Corte de Cabelo',
    action: 'Cortar cabelo',
    categoryKey: 'cabelo',
    specialties: ['Corte Feminino', 'Corte Masculino', 'Corte Infantil', 'Corte Degrade']
  },
  {
    name: 'Corte Masculino',
    action: 'Cortar cabelo masculino',
    categoryKey: 'cabelo',
    specialties: ['Corte Masculino']
  },
  {
    name: 'Corte Feminino',
    action: 'Cortar cabelo feminino',
    categoryKey: 'cabelo',
    specialties: ['Corte Feminino']
  },
  {
    name: 'Corte Infantil',
    action: 'Cortar cabelo infantil',
    categoryKey: 'cabelo',
    specialties: ['Corte Infantil']
  },
  {
    name: 'Escova',
    action: 'Fazer escova',
    categoryKey: 'cabelo',
    specialties: ['Escova Simples', 'Escova Modelada', 'Escova Progressiva']
  },
  {
    name: 'Coloracao de Raiz',
    action: 'Colorir raiz',
    categoryKey: 'cabelo',
    specialties: ['Coloracao']
  },
  {
    name: 'Coloracao Global',
    action: 'Colorir cabelo',
    categoryKey: 'cabelo',
    specialties: ['Coloracao']
  },
  {
    name: 'Coloracao',
    action: 'Colorir cabelo',
    categoryKey: 'cabelo',
    specialties: ['Coloracao', 'Tonalizacao', 'Mechas', 'Luzes']
  },
  {
    name: 'Tonalizacao',
    action: 'Tonalizar cabelo',
    categoryKey: 'cabelo',
    specialties: ['Coloracao', 'Tonalizacao']
  },
  {
    name: 'Luzes',
    action: 'Fazer luzes',
    categoryKey: 'cabelo',
    specialties: ['Mechas', 'Luzes']
  },
  {
    name: 'Mechas',
    action: 'Fazer mechas',
    categoryKey: 'cabelo',
    specialties: ['Mechas', 'Luzes']
  },
  {
    name: 'Balayage',
    action: 'Fazer balayage',
    categoryKey: 'cabelo',
    specialties: ['Mechas', 'Luzes']
  },
  {
    name: 'Hidratacao',
    action: 'Hidratar cabelo',
    categoryKey: 'terapia_capilar',
    specialties: ['Tratamento Capilar']
  },
  {
    name: 'Nutricao Capilar',
    action: 'Nutrir cabelo',
    categoryKey: 'terapia_capilar',
    specialties: ['Tratamento Capilar']
  },
  {
    name: 'Reconstrucao Capilar',
    action: 'Reconstruir cabelo',
    categoryKey: 'terapia_capilar',
    specialties: ['Tratamento Capilar']
  },
  {
    name: 'Terapia Capilar',
    action: 'Tratar couro cabeludo',
    categoryKey: 'terapia_capilar',
    specialties: ['Terapia Capilar']
  },
  {
    name: 'Progressiva',
    action: 'Fazer progressiva',
    categoryKey: 'cabelo',
    specialties: ['Alisamento e Transformacao']
  },
  {
    name: 'Alisamento',
    action: 'Fazer alisamento',
    categoryKey: 'cabelo',
    specialties: ['Alisamento e Transformacao']
  },
  {
    name: 'Relaxamento',
    action: 'Fazer relaxamento',
    categoryKey: 'cabelo',
    specialties: ['Alisamento e Transformacao']
  },
  {
    name: 'Botox Capilar',
    action: 'Fazer botox capilar',
    categoryKey: 'terapia_capilar',
    specialties: ['Tratamento Capilar']
  },
  {
    name: 'Trancas',
    action: 'Fazer trancas',
    categoryKey: 'cabelo',
    specialties: ['Trancas']
  },
  {
    name: 'Manutencao de Trancas',
    action: 'Fazer manutencao de trancas',
    categoryKey: 'cabelo',
    specialties: ['Trancas']
  },
  {
    name: 'Extensao Capilar',
    action: 'Fazer extensao capilar',
    categoryKey: 'cabelo',
    specialties: ['Extensao Capilar']
  },
  {
    name: 'Manutencao de Extensao',
    action: 'Fazer manutencao de extensao',
    categoryKey: 'cabelo',
    specialties: ['Extensao Capilar']
  },
  {
    name: 'Barba',
    action: 'Fazer barba',
    categoryKey: 'barba',
    specialties: ['Barba Tradicional', 'Barba Desenhada']
  },
  {
    name: 'Corte e Barba',
    action: 'Fazer corte e barba',
    categoryKey: 'barba',
    specialties: ['Corte Masculino', 'Barba']
  },
  {
    name: 'Acabamento',
    action: 'Fazer acabamento',
    categoryKey: 'barba',
    specialties: ['Acabamento']
  },
  {
    name: 'Pigmentacao de Barba',
    action: 'Pigmentar barba',
    categoryKey: 'barba',
    specialties: ['Pigmentacao e Coloracao Masculina']
  },
  {
    name: 'Camuflagem de Fios Brancos',
    action: 'Camuflar fios brancos',
    categoryKey: 'barba',
    specialties: ['Pigmentacao e Coloracao Masculina']
  },
  {
    name: 'Manicure',
    action: 'Fazer manicure',
    categoryKey: 'unhas',
    specialties: ['Manicure', 'Nail Art', 'Alongamento de Unhas', 'Gel']
  },
  {
    name: 'Pedicure',
    action: 'Fazer pedicure',
    categoryKey: 'unhas',
    specialties: ['Pedicure']
  },
  {
    name: 'Maquiagem',
    action: 'Fazer maquiagem',
    categoryKey: 'maquiagem',
    specialties: ['Maquiagem']
  },
  {
    name: 'Maquiagem Social',
    action: 'Fazer maquiagem social',
    categoryKey: 'maquiagem',
    specialties: ['Maquiagem']
  },
  {
    name: 'Maquiagem para Noiva',
    action: 'Fazer maquiagem para noiva',
    categoryKey: 'maquiagem',
    specialties: ['Maquiagem']
  },
  {
    name: 'Penteado para Eventos',
    action: 'Fazer penteado para eventos',
    categoryKey: 'maquiagem',
    specialties: ['Penteados']
  },
  {
    name: 'Penteado para Noiva',
    action: 'Fazer penteado para noiva',
    categoryKey: 'maquiagem',
    specialties: ['Penteados']
  },
  {
    name: 'Producao para Festas',
    action: 'Fazer producao para festas',
    categoryKey: 'maquiagem',
    specialties: ['Maquiagem', 'Penteados']
  },
  {
    name: 'Dia da Noiva',
    action: 'Fazer dia da noiva',
    categoryKey: 'maquiagem',
    specialties: ['Maquiagem', 'Penteados']
  },
  {
    name: 'Limpeza de Pele',
    action: 'Fazer limpeza de pele',
    categoryKey: 'estetica_facial',
    specialties: ['Estetica Facial']
  },
  {
    name: 'Hidratacao Facial',
    action: 'Fazer hidratacao facial',
    categoryKey: 'estetica_facial',
    specialties: ['Estetica Facial']
  },
  {
    name: 'Peeling Estetico Superficial',
    action: 'Fazer peeling estetico superficial',
    categoryKey: 'estetica_facial',
    specialties: ['Peeling']
  },
  {
    name: 'Revitalizacao Facial',
    action: 'Fazer revitalizacao facial',
    categoryKey: 'estetica_facial',
    specialties: ['Estetica Facial']
  },
  {
    name: 'Drenagem Facial',
    action: 'Fazer drenagem facial',
    categoryKey: 'estetica_facial',
    specialties: ['Drenagem Facial']
  },
  {
    name: 'Massagem',
    action: 'Fazer massagem',
    categoryKey: 'massoterapia',
    specialties: ['Massoterapia']
  },
  {
    name: 'Massagem Relaxante',
    action: 'Fazer massagem relaxante',
    categoryKey: 'massoterapia',
    specialties: ['Massoterapia']
  },
  {
    name: 'Massagem Modeladora',
    action: 'Fazer massagem modeladora',
    categoryKey: 'estetica_corporal',
    specialties: ['Massoterapia', 'Estetica Corporal']
  },
  {
    name: 'Drenagem Linfatica',
    action: 'Fazer drenagem linfatica',
    categoryKey: 'estetica_corporal',
    specialties: ['Drenagem Linfatica']
  },
  {
    name: 'Tratamento Corporal Recorrente',
    action: 'Fazer tratamento corporal recorrente',
    categoryKey: 'estetica_corporal',
    specialties: ['Estetica Corporal']
  },
  {
    name: 'Spa Corporal',
    action: 'Fazer spa corporal',
    categoryKey: 'estetica_corporal',
    specialties: ['Estetica Corporal']
  },
  {
    name: 'Depilacao com Cera',
    action: 'Fazer depilacao com cera',
    categoryKey: 'depilacao',
    specialties: ['Depilacao']
  },
  {
    name: 'Depilacao Facial',
    action: 'Fazer depilacao facial',
    categoryKey: 'depilacao',
    specialties: ['Depilacao']
  },
  {
    name: 'Depilacao a Laser',
    action: 'Fazer depilacao a laser',
    categoryKey: 'depilacao',
    specialties: ['Depilacao a Laser']
  },
  {
    name: 'Design de Sobrancelhas',
    action: 'Fazer design de sobrancelhas',
    categoryKey: 'sobrancelhas',
    specialties: ['Design de Sobrancelhas']
  },
  {
    name: 'Design com Henna',
    action: 'Fazer design com henna',
    categoryKey: 'sobrancelhas',
    specialties: ['Design de Sobrancelhas']
  },
  {
    name: 'Brow Lamination',
    action: 'Fazer brow lamination',
    categoryKey: 'sobrancelhas',
    specialties: ['Brow Lamination']
  },
  {
    name: 'Micropigmentacao Manutencao',
    action: 'Fazer manutencao de micropigmentacao',
    categoryKey: 'sobrancelhas',
    specialties: ['Micropigmentacao']
  },
  {
    name: 'Extensao de Cilios',
    action: 'Fazer extensao de cilios',
    categoryKey: 'cilios',
    specialties: ['Extensao de Cilios', 'Manutencao de Cilios']
  },
  {
    name: 'Manutencao de Cilios',
    action: 'Fazer manutencao de cilios',
    categoryKey: 'cilios',
    specialties: ['Extensao de Cilios']
  },
  {
    name: 'Lash Lifting',
    action: 'Fazer lash lifting',
    categoryKey: 'cilios',
    specialties: ['Lash Lifting']
  }
];

const BELLORY_TAXONOMY_NAMING_RULES = {
  global: [
    'Usar singular.',
    'Usar primeira letra maiuscula.',
    'Evitar abreviacoes.',
    'Evitar emojis e caracteres especiais desnecessarios.',
    'Evitar duplicidade semantica.',
    'Evitar nomes longos.'
  ],
  cargo: [
    'Usar substantivo profissional.',
    'Nao usar verbo.',
    'Nao usar frases longas.',
    'Evitar especializacao excessiva no nome.'
  ],
  service: [
    'Usar nome comercial para cliente final.',
    'Evitar verbo no nome principal.',
    'Separar nome comercial de acao operacional quando necessario.'
  ],
  specialty: [
    'Usar substantivo simples ou composto.',
    'Manter vinculo tecnico coerente com servico.',
    'Manter coerencia com cargo e categoria.'
  ]
};

const BELLORY_OFFICIAL_CATEGORY_KEYS = BELLORY_OFFICIAL_CATEGORIES.map((category) => category.key);

const BELLORY_CATEGORY_ALIASES = {
  manicure: 'unhas',
  pedicure: 'unhas',
  estetica: 'estetica_facial',
  massagem: 'massoterapia',
  sobrancelha: 'sobrancelhas',
  tratamento: 'terapia_capilar',
  tintura_coloracao: 'cabelo'
};

const BELLORY_LEGACY_CATEGORY_KEYS = Object.keys(BELLORY_CATEGORY_ALIASES);

function normalizeTaxonomyKey(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function normalizeOfficialCategoryKey(value) {
  const normalized = normalizeTaxonomyKey(value);
  return BELLORY_CATEGORY_ALIASES[normalized] || normalized || null;
}

function isOfficialCategoryKey(value) {
  return BELLORY_OFFICIAL_CATEGORY_KEYS.includes(normalizeOfficialCategoryKey(value));
}

function getOfficialCategoryLabel(value) {
  const category = BELLORY_OFFICIAL_CATEGORIES.find((item) => item.key === normalizeOfficialCategoryKey(value));
  return category?.label || null;
}

function getOfficialServiceByName(name) {
  const normalizedName = normalizeTaxonomyKey(name);
  return BELLORY_OFFICIAL_SERVICES.find((service) => normalizeTaxonomyKey(service.name) === normalizedName) || null;
}

function getOfficialOperationalCargoByName(name) {
  const normalizedName = normalizeTaxonomyKey(name);
  return BELLORY_OFFICIAL_OPERATIONAL_CARGOS.find((cargo) => normalizeTaxonomyKey(cargo.name) === normalizedName) || null;
}

module.exports = {
  TAXONOMY_ENTITY_TYPES,
  BELLORY_OFFICIAL_CATEGORIES,
  BELLORY_OFFICIAL_CATEGORY_KEYS,
  BELLORY_CATEGORY_ALIASES,
  BELLORY_LEGACY_CATEGORY_KEYS,
  BELLORY_OFFICIAL_OPERATIONAL_CARGOS,
  BELLORY_OFFICIAL_ADMINISTRATIVE_CARGOS,
  BELLORY_OFFICIAL_SERVICES,
  BELLORY_TAXONOMY_NAMING_RULES,
  normalizeTaxonomyKey,
  normalizeOfficialCategoryKey,
  isOfficialCategoryKey,
  getOfficialCategoryLabel,
  getOfficialServiceByName,
  getOfficialOperationalCargoByName
};
