# Taxonomia Oficial Bellory

## Objetivo

A taxonomia oficial Bellory padroniza os nomes usados em categorias, cargos,
servicos, especialidades e vinculos operacionais. Ela evita nomenclaturas
aleatorias, duplicidade conceitual e confusao entre o que e vendido, quem
executa e qual tecnica ou variacao esta envolvida.

Esta taxonomia deve orientar:

- onboarding;
- configuracoes operacionais;
- cadastro e manutencao de equipe;
- servicos;
- agenda;
- filtros;
- dashboards e relatorios;
- campanhas;
- IA operacional futura.

## Conceitos

### Categoria

Categoria e a macro area operacional do negocio.

Regras:

- usar substantivo;
- usar singular;
- usar nome simples e comercialmente compreensivel;
- evitar termos tecnicos demais;
- evitar duplicidade semantica.

Categorias oficiais iniciais:

- Cabelo
- Barba
- Unhas
- Maquiagem
- Estetica Facial
- Estetica Corporal
- Podologia
- Massoterapia
- Terapia Capilar
- Sobrancelhas
- Cilios

### Cargo

Cargo e a funcao profissional que executa servicos.

Regras:

- usar substantivo profissional;
- usar singular;
- nao usar verbo;
- nao usar frases longas;
- evitar especializacao excessiva no nome do cargo.

Cargos operacionais oficiais iniciais:

- Cabeleireira
- Barbeiro
- Manicure
- Esteticista
- Maquiadora
- Podologa
- Massoterapeuta
- Lash Designer
- Designer de Sobrancelhas
- Terapeuta Capilar

Cargos administrativos oficiais iniciais:

- Recepcionista
- Secretaria
- Caixa
- Auxiliar Administrativo
- Assistente Operacional
- Gerente
- Coordenadora
- Financeiro
- Marketing
- Atendente

Exemplos invalidos:

- Fazer cabelo
- Especialista em barba
- Profissional de escova

### Servico

Servico e o item comercial vendido, agendado e usado em campanhas,
financeiro e atendimento.

Regras:

- usar nome comercial claro para cliente final;
- evitar verbo no nome principal;
- usar singular;
- separar o nome comercial da acao operacional quando necessario.

Estrutura recomendada:

- `nome_servico`: nome exibido ao cliente e usado na agenda.
- `acao_servico`: acao operacional opcional, usada para IA, automacao e
  linguagem natural.

Exemplos:

| nome_servico | acao_servico |
| --- | --- |
| Corte de Cabelo | Cortar cabelo |
| Escova | Fazer escova |
| Coloracao | Colorir cabelo |
| Barba | Fazer barba |
| Manicure | Fazer manicure |
| Hidratacao | Hidratar cabelo |

Exemplos invalidos como nome principal:

- Cortar cabelo
- Fazer unha
- Fazer progressiva

### Especialidade

Especialidade e a variacao tecnica ou subcategoria ligada a um servico.

Regras:

- usar substantivo simples ou composto;
- manter vinculo tecnico coerente com servico;
- manter coerencia com cargo e categoria;
- evitar nomes longos;
- evitar duplicidade semantica.

Exemplos:

| Servico | Especialidades |
| --- | --- |
| Corte de Cabelo | Corte Feminino, Corte Masculino, Corte Infantil, Corte Degrade |
| Escova | Escova Simples, Escova Modelada, Escova Progressiva |
| Manicure | Nail Art, Blindagem, Fibra, Banho em Gel |
| Barba | Barba Tradicional, Barba Desenhada |

## Regras Globais de Nomenclatura

- usar singular;
- usar primeira letra maiuscula;
- nao usar abreviacoes;
- nao usar emojis;
- evitar caracteres especiais desnecessarios;
- evitar mistura de idiomas sem necessidade;
- evitar nomes longos;
- evitar duplicidade semantica;
- evitar verbos em cargos e nomes principais de servicos.

## Fonte de Verdade Consolidada

### Estrutural e global

As entidades estruturais representam a taxonomia base do Bellory e sao a fonte
principal de verdade para categorias, servicos oficiais, especialidades e cargos:

- categorias;
- servicos oficiais;
- cargos;
- especialidades.

Elas orientam padronizacao, filtros, sugestoes, compatibilidades e validacoes.
A categoria persistida em `servicos.categoria` deve ser sempre uma chave oficial:

- `cabelo`
- `barba`
- `unhas`
- `maquiagem`
- `estetica_facial`
- `estetica_corporal`
- `podologia`
- `massoterapia`
- `terapia_capilar`
- `sobrancelhas`
- `cilios`

Categorias antigas como `manicure`, `pedicure`, `massagem`, `tratamento`,
`sobrancelha` e `tintura_coloracao` nao sao fonte de verdade. Elas podem ser
aceitas apenas como aliases de entrada para normalizacao de dados legados.

### Operacional por tenant

As entidades operacionais representam a realidade de cada salao:

- servicos;
- precos;
- duracao;
- especialidades customizadas;
- `servico_especialidades`;
- `tenant_especialidades`;
- profissionais;
- escalas;
- links publicos.

`servico_especialidades` e a fonte operacional por tenant para dizer quais
especialidades podem executar quais servicos. A compatibilidade operacional e
persistida por IDs e refinada pelo salao, sempre dentro de uma categoria oficial.

Servicos e especialidades podem ser oficiais ou customizados:

- servicos oficiais usam `taxonomy_service_key`, `taxonomy_category_key`,
  `is_official = true` e `is_custom = false`;
- servicos customizados continuam em `servicos`, sao tenant-scoped e usam uma
  categoria oficial em `taxonomy_category_key`;
- especialidades oficiais ficam globais, com `tenant_id` nulo;
- especialidades customizadas pertencem ao tenant, usam `tenant_id` e devem
  persistir `taxonomy_category_key` oficial;
- categorias continuam controladas pelo sistema e nao podem ser criadas por
  tenants.

Exemplo: `Trancas Afro Premium` pode existir como servico customizado do tenant
na categoria oficial `cabelo`, vinculado por ID a uma especialidade customizada
como `Trancista`, tambem marcada com `taxonomy_category_key = cabelo`.

## Catalogo Oficial Persistente

O catalogo oficial esta representado em codigo e persistido no banco:

- `backend/src/constants/bellory-taxonomy.js`;
- `frontend/src/constants/bellory-taxonomy.ts`.
- `public.taxonomia_categorias`;
- `public.taxonomia_servicos`;
- `public.taxonomia_especialidades`;
- `public.taxonomia_servico_especialidades`.

Esse catalogo orienta o seed do onboarding, validacoes, sugestoes nas telas
operacionais, compatibilidade de equipe e consistencia da agenda.

## Cuidados de Evolucao

- Nao reintroduzir categorias operacionais paralelas como fonte principal.
- Manter aliases antigos apenas na borda de entrada para normalizar dados
  legados.
- Registrar inconsistencias encontradas em dados legados.
- Evitar que manutencao operacional do tenant altere catalogo global sem
  regra administrativa clara.
- Usar `servico_especialidades` para compatibilidade operacional por tenant.
- Exigir ao menos uma especialidade compativel para criar ou atualizar servicos.
- Validar compatibilidade por IDs e `taxonomy_category_key`, nao por texto livre.
- Nao misturar cargos administrativos com especialidades tecnicas executoras.

## Validacoes Aplicadas

As validacoes da taxonomia devem bloquear novos cadastros claramente fora do
padrao e orientar o usuario para nomes oficiais.

Nesta fase, o backend valida:

- servicos criados ou editados em `services.validators.js`;
- servicos customizados enviados pelo onboarding em `onboarding.validators.js`;
- cargos criados ou editados em `team.validators.js`;
- especialidades criadas ou editadas em `team.validators.js`.
- categorias de servico contra a taxonomia oficial Bellory.

Regras bloqueadas:

- emoji em nomes de cargos, servicos e especialidades;
- caracteres especiais fora do conjunto permitido;
- verbos no inicio de cargos, servicos e especialidades;
- frases genericas como `profissional de`, `especialista em` ou `servico de`;
- nomes longos demais para uso operacional.

O frontend tambem executa validacao preventiva no onboarding para servicos
customizados, exibindo sugestoes oficiais quando possivel.
