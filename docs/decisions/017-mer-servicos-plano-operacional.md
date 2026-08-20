# 017 - Plano operacional para refatoracao do MER de Servicos

Status: plano executivo para aprovacao. Nenhuma migration executada.

Base: `docs/decisions/016-mer-servicos-transicao-pre-producao.md`.

## Registro da Fase 1

Migration preparada:

- `supabase/migrations/20260728100000_create_service_catalog_mer_phase1.sql`

Escopo:

- cria `servicos_catalogo`;
- cria `servico_tenants`;
- cria `servico_catalogo_especialidades`;
- cria `servico_tenant_especialidades`;
- nao executa seed;
- nao executa backfill;
- nao remove ou altera destrutivamente tabelas legadas;
- nao altera consumidores de backend/frontend.

Decisao de compatibilidade tecnica:

- a tabela atual `servico_especialidades` nao foi reutilizada nesta fase porque
  ainda possui semantica tenant-scoped e campos comerciais transicionais;
- a Fase 1 usa `servico_catalogo_especialidades` como estrutura nova e explicita.

Decisao de recorrencia:

- `servicos_catalogo.natureza` aceita `recorrente` ou `ocasional`;
- campanhas futuras nao devem inferir recorrencia por nome textual.

## Registro da Fase 2

Migration preparada e aplicada isoladamente no remoto de desenvolvimento:

- `supabase/migrations/20260728110000_seed_service_catalog_mer_phase2.sql`

Escopo:

- semeia 53 servicos canonicos em `servicos_catalogo`;
- classifica 44 servicos como `recorrente` e 9 como `ocasional`;
- popula 92 vinculos tecnicos em `servico_catalogo_especialidades`;
- cria 24 ofertas em `servico_tenants`;
- cria 88 configuracoes em `servico_tenant_especialidades`;
- nao remove ou altera destrutivamente `servicos` e `servico_especialidades`;
- nao altera consumidores de backend/frontend, agenda, campanhas, cupons,
  profissionais ou scripts `campaign-test:*`.

Resultado por categoria do catalogo:

| Categoria | Servicos |
| --- | ---: |
| `barba` | 5 |
| `cabelo` | 11 |
| `cilios` | 2 |
| `depilacao` | 3 |
| `estetica_corporal` | 4 |
| `estetica_facial` | 5 |
| `maquiagem` | 7 |
| `massoterapia` | 1 |
| `sobrancelhas` | 3 |
| `terapia_capilar` | 5 |
| `unhas` | 7 |

Distribuicao de ofertas por tenant:

| Tenant | Ofertas |
| --- | ---: |
| BelaFlavia | 4 |
| Bella Rosa Studio | 4 |
| Bellory Test studio | 6 |
| Carmem Hair | 4 |
| Espaco Vivian Beauty | 4 |
| Roseli MakeUp | 1 |
| Viki | 1 |

Validacoes:

- `servicos`: 33 registros fisicos preservados, sendo 25 sem `deleted_at`
  e 8 com `deleted_at`;
- `servico_especialidades`: 138 registros fisicos preservados, sendo 136 sem
  `deleted_at` e 2 com `deleted_at`;
- servicos canonicos sem especialidade: 0;
- especialidades oficiais sem uso na matriz canonica: 3;
- configuracoes sem preco: 24, porque valores legados `0.00` foram migrados
  como `null` para nao inventar preco;
- configuracoes sem duracao: 0;
- configuracoes sem retorno recomendado: 6;
- configuracoes inativas: 10.

Pendencia/ambiguidade mantida fora do backfill automatico:

- tenant `Espaco Vivian Beauty`, servico legado `Sombrancelhas`, categoria
  `sobrancelhas`, sem `taxonomy_service_key`. Nao foi convertido
  automaticamente para `BROW_DESIGN` porque a demanda proibe mapear registros
  ambiguos sem validacao funcional.

Decisoes de seed:

- o catalogo nao e uma copia de `servicos`;
- o seed parte da taxonomia funcional oficial e usa o legado apenas para
  cobertura/backfill;
- variacoes tecnicas como corte feminino/masculino/infantil e coloracao de
  raiz/global entram como especialidades/vinculos quando a taxonomia permite,
  nao como regra dependente de nome;
- servicos ocasionais nao recebem fallback global automatico de inatividade;
- preco `0.00` do legado nao foi tratado como preco confiavel.

## Registro da Fase 2.6

Data: 2026-07-29.

Objetivo: sanear os bloqueadores encontrados na Fase 2.5 antes da Fase 3.

### Migration history

Foi confirmado que o projeto remoto vinculado e `Bellory`
(`djbuzarzbpcpixudpnmg`) e que:

- as quatro tabelas da Fase 1 existiam fisicamente;
- os dados esperados da Fase 2 existiam e batiam com os quantitativos
  documentados;
- as migrations locais `20260728100000` e `20260728110000` nao estavam
  registradas em `schema_migrations`.

Causa provavel: as Fases 1 e 2 foram materializadas no remoto por execucao SQL
fora do fluxo normal que registra o historico do Supabase CLI.

Mecanismo utilizado:

```text
supabase migration repair --linked --status applied 20260728100000 20260728110000
```

Esse comando reparou apenas o historico remoto e nao executou novamente o SQL
das migrations.

### Migrations antigas retiradas da fila

As migrations abaixo foram removidas de `supabase/migrations` porque foram
concebidas sobre o MER antigo e nao devem ser aplicadas acidentalmente por um
futuro `supabase db push`:

| Migration | Destino | Motivo |
| --- | --- | --- |
| `20260726120000_service_return_frequency.sql` | Parcialmente absorvida | Retorno recomendado pertence ao novo MER em `servico_tenant_especialidades.dias_retorno_recomendado`. |
| `20260727100000_expand_service_specialty_taxonomy_for_inactive_recovery.sql` | Parcialmente absorvida/substituida | Expansoes validas de taxonomia e catalogo ja estao cobertas pelo novo catalogo; alteracoes no legado e marcadores `CORRIGIR no CODEX` nao devem seguir. |
| `20260727110000_service_specialty_operational_pricing.sql` | Substituida/conflitante | Tentava promover `servico_especialidades` como fonte operacional/comercial, papel agora definido para `servico_tenant_especialidades`. |

Nenhuma dessas migrations foi marcada como aplicada no remoto.

### Decisao sobre Sombrancelhas

O servico legado `Sombrancelhas` do tenant `Espaco Vivian Beauty` nao foi
mapeado como servico guarda-chuva nem convertido automaticamente para
`BROW_DESIGN`.

Decisao aplicada: decompor a configuracao legada nas ofertas canonicas ja
existentes:

- `BROW_DESIGN` com especialidades `Design de Sobrancelhas` e `Henna`;
- `BROW_LAMINATION` com especialidade `Brow Lamination`;
- `BROW_MICROPIGMENTATION` com especialidade `Micropigmentacao`.

Foram preservados os valores confiaveis do legado:

- tenant;
- especialidade;
- preco `70`;
- duracao `45`;
- agendamento online;
- status ativo.

`dias_retorno_recomendado` permaneceu `null`, pois nao havia valor confiavel no
legado para essas combinacoes.

### Validacao apos saneamento

| Indicador | Antes Fase 2.6 | Depois Fase 2.6 |
| --- | ---: | ---: |
| Servicos canonicos | 53 | 53 |
| Recorrentes | 44 | 44 |
| Ocasionais | 9 | 9 |
| Compatibilidades | 92 | 92 |
| Ofertas por tenant | 24 | 27 |
| Configuracoes por combinacao | 88 | 92 |
| Configuracoes sem preco | 24 | 24 |
| Configuracoes sem duracao | 0 | 0 |
| Configuracoes sem retorno | 6 | 10 |
| Configuracoes inativas | 10 | 10 |
| Orfaos estruturais | 0 | 0 |
| Duplicidades relevantes | 0 | 0 |

A alteracao dos quantitativos decorre exclusivamente da decomposicao de
`Sombrancelhas`: 3 novas ofertas e 4 novas configuracoes. A Fase 3 fica
liberada para adaptar os consumidores ao novo MER, sem iniciar remocao do
legado.

## Registro da Fase 3

Data: 2026-07-29.

Escopo aplicado: backend de Servicos e Especialidades, sem iniciar Fase 4 e sem
alterar frontend, Agenda, Booking publico, Historico, Campanhas, Cupons, CRM,
WhatsApp ou scripts `campaign-test:*`.

Resultado:

- `backend/src/modules/services` passou a usar `servicos_catalogo`,
  `servico_tenants`, `servico_catalogo_especialidades` e
  `servico_tenant_especialidades` como fontes oficiais;
- `servicos` e `servico_especialidades` deixaram de ser fonte definitiva para
  endpoints do modulo de Servicos;
- criacao/ativacao de servico cria ou reativa oferta em `servico_tenants`;
- preco, duracao, retorno recomendado, status da combinacao e agendamento
  online sao gravados somente em `servico_tenant_especialidades`;
- compatibilidade tecnica de especialidades e resolvida por
  `servico_catalogo_especialidades`;
- servicos customizados continuam permitidos de forma conservadora, com
  `codigo_canonico` protegido por hash de tenant/categoria/nome e metadata de
  origem;
- tenants nao podem alterar conceitos globais do catalogo via PATCH de oferta.

Validacoes executadas:

```text
node --test src/modules/services/service-specialty-update.test.js
npm run test:professional-services
node -e "require('./src/routes/index.routes'); console.log('backend routes ok')"
```

Busca estatica apos a Fase 3:

- `backend/src/modules/services`: referencias definitivas ao legado removidas;
  referencias restantes aparecem apenas no bloco historico desativado do teste;
- `backend/src/modules/team`: referencias a `servicos` e
  `servico_especialidades` permanecem como dependencia temporaria de Equipe /
  Profissionais, a ser tratada em fase posterior;
- modulos de Agenda, Booking publico, Historico, Campanhas, Cupons, CRM,
  WhatsApp e scripts `campaign-test:*` nao foram alterados nesta fase.

Nenhuma migration nova foi criada ou aplicada nesta fase.

## Registro da Fase 4

Data: 2026-07-29.

Escopo aplicado: frontend de Configuracoes para Servicos e Especialidades, sem
iniciar Profissionais, Agenda, Booking publico, Historico, Campanhas, Cupons,
CRM, WhatsApp ou scripts `campaign-test:*`.

Resultado:

- `/configuracoes/servicos` passou a renderizar uma tela baseada no novo MER:
  catalogo global, oferta do tenant, especialidades compativeis e configuracao
  operacional/comercial por especialidade;
- a tela consome `GET /services/catalog`, `GET /services`,
  `GET /services/compatible-specialties`, `POST /services`,
  `PATCH /services/:id` e `DELETE /services/:id`;
- preco, duracao, retorno recomendado, aceite online e status sao tratados por
  combinacao em `especialidades_config`;
- preco `null` e exibido como `Sob consulta`;
- retorno `null` e exibido como `Nao definido`;
- `servicos_catalogo.natureza` e exibido como `Recorrente` ou `Ocasional`, sem
  inferencia por nome;
- status da oferta do tenant foi separado do status da combinacao;
- `/configuracoes/especialidades` preserva o fluxo Cargo -> Categoria ->
  Especialidade e visualiza vinculos de servicos a partir das ofertas/configs
  retornadas pelo backend.

Validacoes executadas:

```text
npx tsc --noEmit
npm run build
```

`npm run lint` nao foi concluido porque `next lint` abriu prompt interativo para
configurar ESLint no projeto. Nenhum setup novo de lint foi criado nesta fase.

Pendencias para Fase 5:

- migrar Profissionais/Agenda/Booking publico/Historico para resolver oferta,
  especialidade e duracao pela combinacao do novo MER;
- revisar `profissional_servicos`, que ainda pertence ao modelo transicional.

## Registro da Fase 5

Data: 2026-07-29.

Escopo aplicado: Profissionais como capacidade operacional por especialidade,
Agenda interna, Booking publico, Agendamento e Historico, sem iniciar
Campanhas, Cupons, CRM, WhatsApp, Automacoes ou scripts `campaign-test:*`.

Resultado:

- Agenda passou a listar e resolver servicos a partir de `servico_tenants`,
  `servicos_catalogo` e `servico_tenant_especialidades`;
- disponibilidade e criacao de agendamento exigem a combinacao
  Servico oferecido pelo tenant + Especialidade + Profissional compativel;
- preco e duracao sao resolvidos exclusivamente pela configuracao
  `servico_tenant_especialidades`;
- quando houver mais de uma especialidade compativel, a API exige selecao
  explicita da especialidade;
- Booking publico lista somente ofertas ativas do tenant com configuracao ativa,
  online, duracao positiva e profissional online com a especialidade compativel;
- snapshots de `agendamento_servicos` passaram a carregar referencias do novo
  MER: `servico_catalogo_id`, `servico_tenant_id`,
  `servico_tenant_especialidade_id`, `especialidade_id`, nome da especialidade,
  preco e duracao;
- Historico de atendimentos passa a sincronizar as mesmas referencias do
  snapshot, preservando leitura futura mesmo que configuracoes mudem;
- Frontend da Agenda e Booking publico passou a selecionar na ordem Servico ->
  Especialidade -> Profissional.

`profissional_especialidades` e a fonte operacional para capacidade do
profissional nesta fase. `profissional_servicos` permanece no modulo de Equipe
como cadastro transicional e deve ser revisto em fase propria; Agenda e Booking
nao o usam mais como autoridade operacional.

Migration criada nesta fase:

```text
supabase/migrations/20260729120000_adapt_appointments_to_service_mer_phase5.sql
```

A migration nao foi aplicada automaticamente ao banco remoto porque a instrucao
da fase evita `supabase db push` generico e nao havia comando seguro para
aplicar apenas esta migration no ambiente alvo.

Validacoes executadas:

```text
node --test src\modules\agenda\domain\service-composition.test.js
node --test src\modules\agenda\domain\service-composition.test.js src\modules\agenda\agenda.engine.test.js src\modules\public-booking\booking-catalog-policy.test.js
npm run test:professional-services
npm run test:appointment-status
node -e "require('./src/routes/index.routes'); console.log('backend routes ok')"
npx tsc --noEmit
npm run build
```

Pendencias antes de declarar a Fase 5 operacional no ambiente:

- aplicar a migration especifica da Fase 5 no banco alvo;
- executar uma validacao integrada real criando agendamento com servico,
  especialidade e profissional compativeis;
- validar conclusao/no-show para confirmar snapshot no Historico com as novas
  referencias.

## Registro da Fase 5.1

Data: 2026-07-29.

Status: FASE 5 CONCLUIDA.

Projeto Supabase remoto confirmado:

- `project_ref`: `djbuzarzbpcpixudpnmg`;
- projeto: Bellory;
- diretorio oficial: `supabase/migrations`.

Aplicacao controlada:

- `supabase migration list` indicava `20260729120000` pendente no remoto;
- havia outras migrations pendentes independentes, por isso `supabase db push`
  generico nao foi usado;
- a migration `20260729120000_adapt_appointments_to_service_mer_phase5.sql`
  foi auditada e aplicada isoladamente via `supabase db query --linked --file`;
- o historico remoto foi reparado somente para `20260729120000` com status
  `applied`.

Auditoria da migration:

- altera `agendamento_servicos` e `cliente_historico_atendimentos`;
- adiciona referencias para `servico_catalogo_id`, `servico_tenant_id`,
  `servico_tenant_especialidade_id`;
- preserva colunas legadas e torna `agendamento_servicos.servico_id` nullable;
- adiciona `agendamento_servicos_service_reference_check`;
- cria indices parciais para busca por `servico_tenant_id` e
  `servico_tenant_especialidade_id`;
- nao contem `DROP TABLE`, `TRUNCATE`, limpeza em massa, remocao de colunas,
  backfill, `UPDATE` de dados operacionais ou interferencia nas migrations das
  Fases 1 e 2.

Validacao integrada remota:

- tenant usado: `Espaco Vivian Beauty`
  (`e62dacdc-08a8-431f-819e-7115d170e652`);
- Booking publico validado pelo slug `espaco-vivian-beauty`;
- Manicure/Fibra: profissional Lidia Alves, preco 50, duracao 30 minutos,
  16 slots em 2026-08-03;
- Corte de cabelo/Corte Degrade: profissional Julia Santos, preco 80,
  duracao 45 minutos, 14 slots em 2026-08-03;
- Booking publico listou 3 servicos disponiveis de 7 online e removeu
  combinacoes sem profissional compativel;
- snapshot criado no agendamento controlado
  `78c4be14-9f1c-4a41-8bd9-04a5c11cc51d` preservou `servico_tenant_id`,
  `servico_tenant_especialidade_id`, `especialidade_id`, nome, preco 50,
  duracao 30 e origens `servico_tenant_especialidade`;
- historico do mesmo agendamento foi gravado como `concluido` com as mesmas
  referencias e valores;
- remarcacao controlada do agendamento
  `d9573c32-1e61-4038-be6a-77ae2740c122` preservou snapshot comercial ao
  alterar somente data/hora;
- isolamento multi-tenant validado: servico/profissional/configuracao usados
  nao aparecem fora do tenant testado.

Efeito operacional controlado:

- o fluxo existente de Agenda gerou logs pendentes de WhatsApp para os
  agendamentos de teste;
- esses logs foram marcados como `cancelado` somente para os agendamentos de
  validacao, evitando envio externo sem alterar a logica de WhatsApp.

Validacoes automatizadas executadas:

```text
node --test src\modules\agenda\domain\service-composition.test.js src\modules\agenda\agenda.engine.test.js src\modules\public-booking\booking-catalog-policy.test.js
npm run test:professional-services
npm run test:appointment-status
node -e "require('./src/routes/index.routes'); console.log('backend routes ok')"
npx tsc --noEmit
npm run build
```

Referencias legadas restantes:

- Agenda mantem `servico:servicos` apenas para leitura de snapshots antigos;
- Equipe ainda usa `servicos`, `servico_especialidades` e
  `profissional_servicos` como cadastro transicional documentado;
- Public Booking nao depende do modelo legado como fonte principal.

## Registro da Fase 6

Campanhas e Cupons foram adaptados para consumir o novo MER de Servicos como
fonte oficial, sem iniciar a Fase 7 de massa de testes.

Decisoes aplicadas:

- campanhas por servico gravam a referencia operacional em
  `campanhas.servico_tenant_id`, com `servico_catalogo_id`,
  `servico_tenant_especialidade_id` e `especialidade_id` quando houver
  selecao de combinacao;
- `campanhas.servico_id` legado deixa de ser a fonte oficial para novas
  campanhas, permanecendo apenas como compatibilidade de leitura;
- a recuperacao de inativos usa o ultimo atendimento concluido, os snapshots
  do novo MER e `servico_tenant_especialidades.dias_retorno_recomendado`;
- o fallback de 45 dias so e aplicado quando a combinacao recorrente nao tem
  retorno recomendado; servicos de catalogo com `natureza = ocasional` nao usam
  fallback e nao tornam o cliente elegivel por si so;
- agendamento futuro valido continua excluindo o cliente da recuperacao; status
  cancelado/terminal nao bloqueia elegibilidade;
- em atendimento com multiplos servicos, a audiencia avalia as combinacoes
  recorrentes e usa o menor prazo vencido como combinacao principal, sem
  duplicar destinatario;
- Preview, Estimate e Start compartilham o mesmo resolvedor de audiencia;
- cupons passam a declarar escopo `geral`, `servico`, `especialidade` ou
  `combinacao`, apontando para oferta do tenant e/ou combinacao do novo MER;
- o frontend de campanhas e cupom rapido seleciona servicos a partir de
  `servico_tenants` e especialidades a partir de
  `servico_tenant_especialidades`;
- a migration `20260729150000_adapt_campaigns_coupons_to_service_mer_phase6.sql`
  e aditiva, preserva referencias legadas e adiciona indices/constraints para
  escopos novos de cupom.

Validacoes automatizadas da Fase 6:

```text
node --test src\modules\campaigns\campaigns.service.test.js
node -e "require('./src/routes/index.routes'); console.log('backend routes ok')"
npx tsc --noEmit
npm run build
```

Validacao remota controlada:

```text
supabase.cmd db query --linked --file supabase\migrations\20260729150000_adapt_campaigns_coupons_to_service_mer_phase6.sql
supabase.cmd migration repair --linked --status applied 20260729150000
supabase migration list
```

- projeto remoto validado: `djbuzarzbpcpixudpnmg`;
- migration `20260729150000` aparece aplicada no remoto;
- colunas novas em `campanhas` e `cupom_servicos` foram conferidas por
  `information_schema.columns`;
- constraints `cupom_servicos_scope_check` e
  `cupom_servicos_scope_reference_check` foram conferidas em `pg_constraint`;
- indices parciais e uniques de escopo foram conferidos em `pg_indexes`;
- nenhum `campaign-test:*` foi executado e nenhum envio real de WhatsApp foi
  disparado.

## 1. Resumo executivo

O MER atual funciona para prototipo, mas mistura responsabilidades em
`servicos`. A mesma tabela representa:

- conceito do servico;
- oferta do tenant;
- preco;
- duracao;
- retorno recomendado;
- habilitacao online;
- vinculos com especialidades.

Como os dados operacionais atuais sao de desenvolvimento/teste e podem ser
recriados, a estrategia recomendada e corrigir o modelo antes da entrada em
producao, adaptando backend, frontend, agenda, campanhas, cupons e scripts de
teste para uma unica fonte oficial.

Nenhum DROP, TRUNCATE, delete em massa ou migration destrutiva deve ocorrer sem
aprovacao explicita.

## 2. MER atual

| Tabela | Responsabilidade atual | Problema |
| --- | --- | --- |
| `servicos` | Servico tenant-scoped com preco, duracao, retorno, categoria e status | Mistura catalogo global e configuracao do tenant |
| `especialidades` | Catalogo global/custom de especialidades por cargo/categoria | Deve ser preservada, mas precisa manter coerencia com servicos |
| `tenant_especialidades` | Status da especialidade por tenant | Hoje esta vazia no remoto consultado |
| `servico_especialidades` | Vinculo tenant + servico + especialidade e campos comerciais transicionais | Mistura compatibilidade tecnica e configuracao comercial |
| `profissional_especialidades` | Especialidades executadas por profissional | Continua conceitualmente valida |
| `profissional_servicos` | Servicos executados por profissional | Precisa ser revalidada para combinacoes Servico + Especialidade |
| `agendamentos` | Agenda principal | Depende de resolucao correta de servico/preco/duracao |
| `agendamento_servicos` | Itens/snapshot do agendamento | Deve preservar snapshot no novo modelo |
| `cliente_historico_atendimentos` | Historico operacional do cliente | Deve preservar snapshot do atendimento |
| `campanhas` | Campanhas e segmentacoes | Recuperacao de inativos depende de retorno por combinacao |
| `cupons` / `cupom_servicos` / `cupom_especialidades` | Escopos promocionais | Precisam apontar para servico, especialidade ou combinacao sem ambiguidade |

Dependencias principais:

- Configuracoes > Servicos;
- Configuracoes > Especialidades;
- Equipe/Profissionais;
- Agenda e booking publico;
- Historico;
- Campanhas;
- Cupons;
- WhatsApp e templates operacionais;
- scripts `campaign-test:*`.

## 3. MER alvo

### `servicos_catalogo`

Finalidade: catalogo conceitual/global de servicos.

Campos principais:

- `id uuid primary key`
- `codigo_canonico varchar(120) not null`
- `nome varchar(150) not null`
- `categoria_key varchar(80) not null`
- `descricao text`
- `ativo boolean not null default true`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints e indices:

- unique `codigo_canonico`
- FK `categoria_key -> taxonomia_categorias(key)`
- index por `categoria_key`
- index parcial por `ativo where ativo = true`

Fonte de verdade: conceito global do servico.

### `servico_tenants`

Finalidade: indicar que um tenant oferece um servico do catalogo.

Campos principais:

- `id uuid primary key`
- `tenant_id uuid not null`
- `servico_catalogo_id uuid not null`
- `ativo boolean not null default true`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints e indices:

- FK `tenant_id -> tenants(id)`
- FK `servico_catalogo_id -> servicos_catalogo(id)`
- unique `(tenant_id, servico_catalogo_id)`
- index `(tenant_id, ativo)`

Fonte de verdade: servico oferecido pelo tenant.

### `servico_especialidades`

Finalidade: compatibilidade tecnica global entre servico conceitual e
especialidade.

Campos principais:

- `id uuid primary key`
- `servico_catalogo_id uuid not null`
- `especialidade_id uuid not null`
- `ativo boolean not null default true`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints e indices:

- FK `servico_catalogo_id -> servicos_catalogo(id)`
- FK `especialidade_id -> especialidades(id)`
- unique `(servico_catalogo_id, especialidade_id)`
- index por `especialidade_id`

Fonte de verdade: compatibilidade Servico x Especialidade.

### `servico_tenant_especialidades`

Finalidade: configuracao operacional/comercial da combinacao no tenant.

Campos principais:

- `id uuid primary key`
- `servico_tenant_id uuid not null`
- `especialidade_id uuid not null`
- `preco numeric(10,2)`
- `duracao_minutos integer`
- `dias_retorno_recomendado integer`
- `aceita_agendamento_online boolean not null default true`
- `ativo boolean not null default true`
- `metadata jsonb not null default '{}'::jsonb`
- `created_at timestamptz not null default now()`
- `updated_at timestamptz not null default now()`

Constraints e indices:

- FK `servico_tenant_id -> servico_tenants(id)`
- FK `especialidade_id -> especialidades(id)`
- unique `(servico_tenant_id, especialidade_id)`
- check `preco is null or preco >= 0`
- check `duracao_minutos is null or duracao_minutos > 0`
- check `dias_retorno_recomendado is null or dias_retorno_recomendado > 0`
- index por `servico_tenant_id`
- index por `(especialidade_id, ativo)`

Fonte de verdade:

- preco;
- duracao;
- retorno recomendado;
- disponibilidade online da combinacao.

## 4. Diagrama textual final

```text
taxonomia_categorias
  -> servicos_catalogo

cargos
  -> especialidades

servicos_catalogo
  -> servico_especialidades
  -> especialidades

tenants
  -> servico_tenants
  -> servicos_catalogo

servico_tenants
  -> servico_tenant_especialidades
  -> especialidades

profissionais
  -> profissional_especialidades
  -> especialidades

profissionais
  -> profissional_servicos
  -> servico_tenants ou servico_tenant_especialidades

agendamentos
  -> agendamento_servicos
  -> snapshot de servico/especialidade/preco/duracao
```

## 5. Dados a preservar e recriar

| Tabela | Registros atuais | Acao | Motivo |
| --- | ---: | --- | --- |
| `tenants` | 7 | Preservar | Identidade dos saloes/empresas |
| `usuarios` | 14 | Preservar | Autenticacao/RBAC |
| `cargos` | 47 | Preservar | Catalogo operacional valido |
| `especialidades` | 75 | Preservar/revisar | Base de especialidades continua valida |
| `tenant_especialidades` | 0 | Recriar se necessario | Sem massa atual |
| `templates_mensagem` | 43 | Preservar | Catalogo estrutural de comunicacao |
| `mensagens_whatsapp` | 148 | Preservar ou limpar por seed | Separar logs reais de teste |
| `profissionais` | 13 | Preservar com revisao | Entidade do tenant, mas vinculos mudam |
| `profissional_especialidades` | 88 | Preservar/revalidar | Continua conceitualmente valido |
| `servicos` | 33 | Recriar/consolidar | Sera substituida por catalogo + oferta |
| `servico_especialidades` | 138 | Recriar/reclassificar | Hoje mistura tenant e configuracao comercial |
| `profissional_servicos` | 44 | Recriar/revalidar | Deve apontar para combinacoes validas |
| `agendamentos` | 108 | Recriar se teste | Massa operacional atual e recriavel |
| `agendamento_servicos` | 108 | Recriar se teste | Depende do MER antigo |
| `cliente_historico_atendimentos` | 79 | Recriar se teste | Historico operacional atual e recriavel |
| `campanhas` | 2 | Recriar se teste | Adaptar criterios ao novo MER |
| `campanha_envios` | 0 | Recriar se necessario | Sem massa atual |
| `cupons` | 6 | Recriar se teste | Escopos mudam |
| `cupom_servicos` | 2 | Recriar | Depende de `servicos` antigo |
| `cupom_especialidades` | 0 | Recriar se necessario | Sem massa atual |

## 6. Migrations propostas

### 1 - `create_service_catalog_mer.sql`

Objetivo: criar o novo schema sem remover legado.

Cria:

- `servicos_catalogo`
- `servico_tenants`
- `servico_tenant_especialidades`

Altera:

- nenhuma tabela legada de forma destrutiva.

Constraints/indices:

- uniques e FKs descritos no MER alvo.
- checks de preco/duracao/retorno.

Backfill:

- nenhum nesta migration.

Risco:

- baixo, pois e aditiva.

Reversibilidade:

- simples enquanto sem dados dependentes; depois exige cuidado.

### 2 - `seed_service_catalog.sql`

Objetivo: popular `servicos_catalogo` com codigos canonicos.

Cria dados:

- catalogo inicial de beleza.

Backfill:

- mapeia nomes/categorias atuais para `codigo_canonico`.

Risco:

- medio: exige revisar nomes canonicos e categorias antes de rodar.

Reversibilidade:

- remover seeds por `metadata.seed` ou `codigo_canonico`, se ainda sem uso.

### 3 - `backfill_service_tenants.sql`

Objetivo: transformar servicos tenant-scoped atuais em ofertas por tenant.

Cria dados:

- `servico_tenants` por `(tenant_id, servico_catalogo_id)`.

Backfill:

- usa `servicos.taxonomy_service_key`, `metadata.taxonomy_service_key`,
  `categoria`, `taxonomy_category_key` e regras aprovadas de catalogo.

Risco:

- medio: nomes customizados precisam classificacao ou codigo canonico custom.

Reversibilidade:

- possivel se houver coluna/metadata de origem e se nao houver limpeza.

### 4 - `backfill_service_specialty_compatibility.sql`

Objetivo: recriar compatibilidade tecnica global.

Altera:

- idealmente cria nova versao de `servico_especialidades` ou migra a atual apos
  congelar dependencias.

Backfill:

- deriva das relacoes atuais, taxonomia oficial e categorias aprovadas.

Risco:

- medio/alto: a tabela atual tem `tenant_id` e campos comerciais.

Reversibilidade:

- manter backup/export dos vinculos atuais ate validacao final.

### 5 - `backfill_service_tenant_specialties.sql`

Objetivo: preencher preco/duracao/retorno por combinacao.

Cria dados:

- `servico_tenant_especialidades`.

Backfill:

- preferir valores atuais de `servico_especialidades`.
- fallback temporario apenas durante migration: `servicos`.

Risco:

- medio: valores nulos/zerados precisam regra funcional.

Reversibilidade:

- possivel enquanto legado existir.

### 6 - `adapt_appointment_snapshots.sql`

Objetivo: garantir snapshots completos para agenda/historico.

Altera:

- `agendamento_servicos`
- `cliente_historico_atendimentos`

Backfill:

- copiar nome, preco, duracao, especialidade e origem para snapshot.

Risco:

- medio: dados de teste podem ser recriados, mas estrutura deve ficar correta.

Reversibilidade:

- manter colunas antigas ate testes passarem.

### 7 - `adapt_campaign_coupon_references.sql`

Objetivo: preparar campanhas e cupons para novo escopo.

Altera:

- `campanhas`
- `cupons`
- tabelas de escopo de cupom.

Backfill:

- apenas para massas que forem preservadas.

Risco:

- medio: campanhas de teste podem ser recriadas.

Reversibilidade:

- manter IDs antigos ate scripts de teste serem atualizados.

### 8 - `remove_legacy_service_mer.sql`

Objetivo: limpar legado.

Executar somente quando:

- backend novo ativo;
- frontend novo ativo;
- agenda/campanhas/cupons testados;
- massa recriada;
- aprovacao explicita.

Risco:

- alto e destrutivo.

Reversibilidade:

- exige backup/export previo.

## 7. Adaptacao backend

### Servicos

Arquivos provaveis:

- `backend/src/modules/services/services.repository.js`
- `backend/src/modules/services/services.service.js`
- `backend/src/modules/services/services.validators.js`
- `backend/src/modules/services/services.controller.js`

Mudancas:

- criar/listar catalogo;
- ativar/desativar oferta do tenant;
- salvar configuracao por especialidade em `servico_tenant_especialidades`;
- remover leitura definitiva de preco/duracao em `servicos`.

### Especialidades

Arquivos provaveis:

- `backend/src/modules/team/team.repository.js`
- `backend/src/modules/team/team.service.js`
- `backend/src/constants/team-service-compatibility.js`

Mudancas:

- manter catalogo de especialidades;
- validar compatibilidade por categoria/cargo;
- expor especialidades compativeis com servico de catalogo.

### Profissionais

Arquivos provaveis:

- `backend/src/modules/team/team.service.js`
- `backend/src/modules/team/team.repository.js`
- `backend/src/modules/team/professional-service-compatibility.js`

Mudancas:

- validar que profissional executa combinacao valida;
- decidir alvo de `profissional_servicos`: `servico_tenants` ou
  `servico_tenant_especialidades`.

### Agenda e historico

Arquivos provaveis:

- `backend/src/modules/agenda/agenda.service.js`
- `backend/src/modules/agenda/agenda.repository.js`
- `backend/src/modules/agenda/domain/service-composition.js`

Mudancas:

- resolver preco/duracao pela combinacao;
- bloquear slots sem duracao valida;
- gravar snapshot no agendamento e historico.

### Campanhas

Arquivos provaveis:

- `backend/src/modules/campaigns/campaigns.service.js`
- `backend/src/modules/campaigns/campaigns.repository.js`

Mudancas:

- recuperacao de inativos deve usar `dias_retorno_recomendado` da combinacao;
- campanhas por servico devem referenciar catalogo/oferta sem ambiguidade.

### Cupons

Arquivos provaveis:

- modulo financeiro/campanhas conforme implementacao atual.

Mudancas:

- escopos por servico de catalogo, especialidade e combinacao tenant.

### CRM e WhatsApp

Mudancas:

- preservar snapshots e textos gerados;
- nao usar nome textual como chave de regra.

### Scripts de teste

Arquivos:

- `backend/scripts/campaign-test-data-v2.js`
- `backend/scripts/campaign-test-data.js` se ainda usado.

Mudancas:

- `campaign-test:audit`
- `campaign-test:seed`
- `campaign-test:validate`
- `campaign-test:cleanup`

Todos devem criar e validar massa usando somente novo MER.

## 8. Adaptacao frontend

| Tela | Mudanca funcional |
| --- | --- |
| `/configuracoes/servicos` | Separar catalogo/oferta/configuracao por especialidade |
| `/configuracoes/especialidades` | Continuar usando cargo/categoria/especialidade sem duplicar regra |
| Fluxo de profissionais | Selecionar especialidades e servicos compativeis por combinacao |
| Agenda | Escolher servico ofertado pelo tenant e especialidade valida |
| Booking publico | Listar combinacoes online de `servico_tenant_especialidades` |
| Campanhas | Selecionar servico/oferta/combinacao com criterios claros |
| Cupons | Definir escopo: servico, especialidade ou combinacao |

## 9. Nova fonte de verdade

| Conceito | Fonte oficial |
| --- | --- |
| Servico conceitual | `servicos_catalogo` |
| Servico oferecido pelo tenant | `servico_tenants` |
| Compatibilidade Servico x Especialidade | `servico_especialidades` |
| Preco | `servico_tenant_especialidades.preco` |
| Duracao | `servico_tenant_especialidades.duracao_minutos` |
| Retorno recomendado | `servico_tenant_especialidades.dias_retorno_recomendado` |
| Agendamento online | `servico_tenant_especialidades.aceita_agendamento_online` |

Nao manter fonte definitiva concorrente.

## 10. Ordem de implementacao

### Fase 1 - Schema novo

Entrada:

- aprovacao deste plano;
- decisao sobre nomes definitivos.

Saida:

- tabelas novas criadas;
- nenhum consumidor migrado ainda;
- nenhum dado destruido.

### Fase 2 - Catalogo e backfill

Entrada:

- schema novo criado.

Saida:

- catalogo semeado;
- ofertas por tenant criadas;
- configuracoes por combinacao preenchidas.

### Fase 3 - Backend de Servicos/Especialidades

Entrada:

- backfill validado.

Saida:

- endpoints principais usando novo MER;
- testes de servicos passando.

### Fase 4 - Frontend de configuracoes

Entrada:

- endpoints novos estaveis.

Saida:

- telas de servicos e especialidades usando novo MER.

### Fase 5 - Profissionais, Agenda e Historico

Entrada:

- configuracao por combinacao funcionando.

Saida:

- slots por duracao da combinacao;
- agendamento cria snapshot;
- historico preserva preco/duracao.

### Fase 6 - Campanhas e Cupons

Entrada:

- historico novo validado.

Saida:

- recuperacao por retorno da combinacao;
- cupons por escopo correto.

### Fase 7 - Massa de testes

Entrada:

- modulos consumidores adaptados.

Saida:

- scripts `campaign-test:*` atualizados;
- massa recriada no novo MER.

### Fase 8 - Remocao do legado

Entrada:

- todos os testes passando;
- aprovacao explicita para limpeza.

Saida:

- dependencias antigas removidas;
- estruturas obsoletas removidas ou descontinuadas.

## 11. Pontos de decisao

- Usar `servicos_catalogo` permanentemente ou renomear para `servicos` no fim.
- `categoria_id` UUID ou `categoria_key` textual referenciando taxonomia.
- `profissional_servicos` aponta para `servico_tenants` ou para
  `servico_tenant_especialidades`.
- Defaults para preco, duracao e retorno quando ausentes.
- Como representar servicos ocasionais.
- Se cupom por servico deve usar catalogo global ou oferta do tenant.
- Se campanha por servico deve mirar catalogo, oferta ou combinacao.
- Como tratar servicos customizados criados pelo tenant.
- Como tratar especialidades customizadas por tenant.
- Politica para limpar mensagens/logs de WhatsApp de teste.

## 12. Estrategia de recriacao da massa

`campaign-test:audit`:

- deve auditar tabelas novas;
- deve avisar se houver dependencia em `servicos` antigo.

`campaign-test:seed`:

- deve criar servico no catalogo ou reutilizar codigo canonico;
- deve criar `servico_tenants`;
- deve criar `servico_tenant_especialidades`;
- deve criar profissionais compativeis;
- deve criar agenda/historico com snapshot novo.

`campaign-test:validate`:

- deve validar retorno por combinacao;
- deve validar campanhas/cuponagem no novo escopo.

`campaign-test:cleanup`:

- deve limpar apenas registros com seed controlada;
- deve respeitar ordem de dependencias do novo MER.

## Registro da Fase 7

Data: 2026-07-29

Escopo aplicado: recriacao da massa controlada de testes no novo MER de
Servicos, sem iniciar a Fase 8.

Implementacao:

- os scripts `campaign-test:audit`, `campaign-test:seed`,
  `campaign-test:validate` e `campaign-test:cleanup` agora apontam para
  `backend/scripts/campaign-test-data-v3.js`;
- a seed ativa e `campaign_test_v3`;
- o cleanup reconhece `campaign_test_v3` e a seed antiga
  `campaign_test_seed_2026` apenas para remocao controlada;
- a massa usa `servicos_catalogo`, `servico_tenants`,
  `servico_catalogo_especialidades` e `servico_tenant_especialidades` como
  fontes oficiais;
- novos snapshots de agenda e historico sao gravados com `servico_id` legado
  nulo e com referencias/snapshots do novo MER;
- cupons cobrem escopos `geral`, `servico`, `especialidade` e `combinacao`;
- campanhas cobrem recuperacao de inativos, aniversario, promocao por servico,
  campanha geral e relacionamento recorrente;
- mensagens WhatsApp criadas pela massa permanecem em dry-run e nao disparam
  provider externo.

Garantias verificadas:

- `campaign-test:audit` executado antes da limpeza;
- `campaign-test:cleanup -- --confirm-campaign-test-cleanup` removeu somente
  massa marcada;
- `campaign-test:seed` recriou a massa dos tenants `espaco-vivian-beauty` e
  `bellory-test-studio`;
- `campaign-test:validate` confirmou contadores, snapshots do novo MER,
  recuperacao de inativos, aniversarios, cupons e isolamento multi-tenant;
- reexecucao de `campaign-test:seed` e `campaign-test:validate` manteve a
  massa idempotente.

## Registro da Fase 8

Data: 2026-07-29

Status: auditoria executada e remocao fisica bloqueada.

Escopo aplicado nesta passagem:

- auditoria de codigo por referencias a `servicos`, `servico_especialidades` e
  `profissional_servicos`;
- auditoria de FKs do banco remoto;
- auditoria de volume de dados com referencias legadas;
- auditoria de views/functions/triggers;
- validacao previa de `campaign-test:audit` e `campaign-test:validate`;
- remocao parcial de fallbacks/embeds ativos em Agenda, Comunicacao,
  Campanhas e Dashboard quando o novo MER ja possuia snapshot ou relacao
  oficial equivalente.

Bloqueadores para DROP/remocao fisica nesta fase:

- `backend/src/modules/onboarding` ainda cria e sincroniza `servicos`,
  `servico_especialidades` e `profissional_servicos`;
- `backend/src/modules/team` ainda usa `profissional_servicos` como vinculo
  explicito de servicos por profissional;
- a function remota `public.update_professional_operational_links` ainda grava
  em `profissional_servicos`;
- o schema remoto ainda possui FKs de `agendamento_servicos`,
  `cliente_historico_atendimentos`, `campanhas`, `cliente_tenants`,
  `cupom_servicos`, `cupom_especialidades`, `profissional_servicos` e
  `servico_especialidades` para `servicos` e/ou `servico_especialidades`;
- existem 33 registros em `servicos`, 138 em `servico_especialidades` e 44 em
  `profissional_servicos`;
- existem 26 snapshots de `agendamento_servicos` e 10 historicos com referencia
  legada ainda populada, embora os snapshots novos ja tenham campos do novo MER;
- nao foi executado backup/export verificavel antes de operacao destrutiva.

Decisao:

- nao executar `DROP`, `DELETE` em massa, remocao de FK, indice, coluna ou
  tabela enquanto os bloqueadores acima existirem;
- tratar `profissional_servicos` como decisao arquitetural pendente: criar uma
  relacao final no novo MER ou formalizar que servicos executaveis sao
  derivados de `profissional_especialidades` +
  `servico_tenant_especialidades`;
- somente apos essa decisao e backup/export aplicar migration destrutiva
  especifica da Fase 8.

## 13. Plano de testes minimo

| Modulo | Cenario | Resultado esperado |
| --- | --- | --- |
| Servicos | Mesmo servico em dois tenants com precos distintos | Um catalogo, duas ofertas, duas configuracoes |
| Especialidades | Servico com multiplas especialidades | Vinculos tecnicos corretos |
| Servicos | Alterar preco de uma especialidade | Apenas a combinacao do tenant muda |
| Profissionais | Profissional sem especialidade compativel | Servico nao pode ser executado |
| Agenda | Duracao por especialidade | Slot usa duracao da combinacao |
| Agenda | Criar agendamento | Snapshot preserva preco/duracao/especialidade |
| Historico | Alterar preco depois do atendimento | Historico nao muda |
| Campanhas | Recuperacao de inativos | Publico usa retorno da combinacao |
| Cupons | Desconto para combinacao especifica | Aplica somente no escopo correto |
| Multi-tenant | Tenant A altera preco | Tenant B nao e afetado |
| Scripts | `campaign-test:seed` duas vezes | Idempotente ou limpo por seed |

## 14. Criterio de autorizacao

Primeiro autorizar:

1. migration aditiva de schema novo;
2. seed do catalogo canonico;
3. backfill nao destrutivo para ofertas/configuracoes.

Depois autorizar:

1. adaptacao de backend;
2. adaptacao de frontend;
3. adaptacao de agenda/historico;
4. adaptacao de campanhas/cupons;
5. revisao dos scripts de teste.

Seguro recriar dados de teste quando:

- schema novo estiver criado;
- backend e frontend principais estiverem no novo MER;
- agenda e campanhas estiverem funcionando no novo MER.

Seguro remover modelo antigo somente quando:

- nenhum backend depender dele;
- nenhum frontend depender dele;
- testes integrados passarem;
- scripts de teste usarem exclusivamente o novo MER;
- houver backup/export;
- houver aprovacao explicita para limpeza destrutiva.

## Registro da Fase 8.1

Data: 2026-07-29.

Objetivo: eliminar consumidores ativos remanescentes do MER legado sem executar
remocao fisica de `servicos`, `servico_especialidades` ou
`profissional_servicos`.

Relacao final adotada:

- tabela: `profissional_servico_especialidades`;
- semantica: profissional autorizado a executar uma combinacao especifica de
  `servico_tenant_especialidades`;
- chave unica: `profissional_id` + `servico_tenant_especialidade_id`;
- regra funcional: profissional so executa um servico quando existir oferta do
  tenant, especialidade ofertada naquela combinacao e vinculo explicito ativo
  com a combinacao.

Migration aditiva criada e aplicada isoladamente no remoto:

- `supabase/migrations/20260729170000_phase8_1_professional_service_specialties.sql`

Escopo da migration:

- cria `profissional_servico_especialidades`;
- cria indices, RLS e trigger de `updated_at`;
- faz backfill controlado a partir de `profissional_servicos` somente quando o
  servico legado mapeia para `servico_tenants` e a especialidade do
  profissional coincide com `servico_tenant_especialidades`;
- substitui `public.update_professional_operational_links` para gravar
  `profissional_especialidades` e `profissional_servico_especialidades`, sem
  consultar ou gravar `servicos`, `servico_especialidades` ou
  `profissional_servicos`.

Consumidores migrados:

- Onboarding cria/reutiliza `servicos_catalogo`, `servico_tenants`,
  `servico_tenant_especialidades` e `profissional_servico_especialidades`;
- Team lista e atualiza vinculos de profissionais por
  `profissional_servico_especialidades`;
- `reconcile:professional-services` aponta para
  `backend/scripts/reconcile-professional-service-specialty-links.js`.

Dependencias legadas restantes:

- migrations historicas preservadas;
- scripts historicos `campaign-test-data.js`, `campaign-test-data-v2.js` e
  `reconcile-professional-service-links.js` fora das rotas npm ativas;
- FKs remotas legadas identificadas na Fase 8 seguem fisicamente existentes ate
  a migration destrutiva final;
- auditoria remota apos a 8.1 confirmou 38 vinculos em
  `profissional_servico_especialidades` e preservacao fisica de 44 registros em
  `profissional_servicos`, 33 em `servicos` e 138 em
  `servico_especialidades`;
- a function `public.update_professional_operational_links` nao contem mais
  acesso direto a `public.servicos`, `public.servico_especialidades` ou
  `public.profissional_servicos`;
- FKs remotas legadas ainda existem em `agendamento_servicos`, `campanhas`,
  `cliente_historico_atendimentos`, `cliente_tenants`, `cupom_especialidades`,
  `cupom_servicos`, `profissional_servicos` e `servico_especialidades`.

Status: REMOCAO FISICA DO LEGADO NAO LIBERADA.

## Registro da Fase 8.2

Data: 2026-07-29.

Objetivo: eliminar dependencias relacionais restantes do MER legado e preparar
o banco para a futura remocao fisica de `servicos`,
`servico_especialidades` e `profissional_servicos`, sem executar o DROP final.

Remoto confirmado:

- project ref: `djbuzarzbpcpixudpnmg`;
- migration da Fase 8.1 `20260729170000` aplicada no historico remoto;
- migration da Fase 8.2 aplicada isoladamente, sem `supabase db push`
  generico.

Migration criada e aplicada:

- `supabase/migrations/20260729180000_phase8_2_remove_legacy_service_foreign_keys.sql`

Inventario inicial de FKs legadas e classificacao:

| Origem | Coluna | FK | Destino legado | Nova referencia/snapshot | Acao |
| --- | --- | --- | --- | --- | --- |
| `agendamento_servicos` | `servico_id` | `agendamento_servicos_servico_id_fkey` | `servicos` | novo MER e snapshot | B - remover FK |
| `agendamento_servicos` | `servico_especialidade_id` | `agendamento_servicos_servico_especialidade_id_fkey` | `servico_especialidades` | `servico_tenant_especialidade_id` e snapshot | B - remover FK |
| `cliente_historico_atendimentos` | `servico_id` | `cliente_historico_atendimentos_servico_id_fkey` | `servicos` | historico/snapshot | B - remover FK |
| `cliente_historico_atendimentos` | `servico_especialidade_id` | `cliente_historico_atendimentos_servico_especialidade_id_fkey` | `servico_especialidades` | novo MER e snapshot | B - remover FK |
| `campanhas` | `servico_id` | `campanhas_servico_id_fkey` | `servicos` | `servico_catalogo_id`, `servico_tenant_id`, `servico_tenant_especialidade_id` | B - remover FK |
| `cliente_tenants` | `servico_mais_recente` | `cliente_tenants_servico_mais_recente_fkey` | `servicos` | historico/snapshots do novo MER | B - remover FK |
| `cupom_servicos` | `servico_id` | `cupom_servicos_servico_id_fkey` | `servicos` | escopos novos | B - remover FK |
| `cupom_especialidades` | `servico_id` | `cupom_especialidades_servico_id_fkey` | `servicos` | `cupom_servicos` com escopo novo | B - remover FK |
| `cupom_especialidades` | `servico_especialidade_id` | `cupom_especialidades_servico_especialidade_id_fkey` | `servico_especialidades` | `cupom_servicos.servico_tenant_especialidade_id` | B - remover FK |
| `profissional_servicos` | `servico_id` | `profissional_servicos_servico_id_fkey` | `servicos` | `profissional_servico_especialidades` | B - remover FK |
| `servico_especialidades` | `servico_id` | `servico_especialidades_servico_id_fkey` | `servicos` | `servico_catalogo_especialidades` e `servico_tenant_especialidades` | B - remover FK |

Alteracoes executadas:

- removidas as 11 FKs legadas;
- `cupom_servicos` deixou de aceitar `escopo = 'servico_legado'`;
- `agendamento_servicos_service_reference_check` passou a permitir registros
  historicos por snapshot, sem exigir FK antiga;
- colunas legadas foram comentadas como transitorias, sem remocao fisica.

Auditoria apos migration:

- FKs para `servicos`, `servico_especialidades` e
  `profissional_servicos`: 0;
- functions/views/policies remotas com dependencia ativa do legado: 0;
- `agendamento_servicos`: 26 registros antigos com `servico_id` legado sem
  `servico_tenant_id`, todos com snapshot minimo completo;
- `cliente_historico_atendimentos`: 10 registros antigos com `servico_id`
  legado sem `servico_tenant_id`, todos com campos historicos minimos;
- `campanhas`, `cupom_servicos`, `cupom_especialidades` e
  `cliente_tenants`: 0 referencias legadas ativas nos campos auditados.

Diferenca `profissional_servicos` x vinculos finais:

- 44 registros legados preservados fisicamente;
- 15 registros legados convertiveis geraram 38 combinacoes finais, porque um
  vinculo legado por servico pode corresponder a multiplas combinacoes
  `servico_tenant_especialidades`;
- 29 registros nao foram convertidos: 15 inativos/deletados, 4 profissionais
  sem especialidade ativa, 9 sem intersecao segura entre profissional e
  combinacao, 1 sem oferta nova mapeada.

Comparacao `servico_especialidades`:

- legado: 138 registros, 2 inativos/deletados;
- `servico_catalogo_especialidades`: 92 vinculos tecnicos;
- `servico_tenant_especialidades`: 94 configuracoes, 10 inativas;
- diferenca esperada por consolidacao canonica, duplicidade entre tenants,
  configuracoes inativas e separacao entre compatibilidade tecnica e
  configuracao operacional.

Objetos candidatos ao DROP final, em ordem segura preliminar:

1. policies/triggers/indices remanescentes diretamente associados a
   `profissional_servicos`, `servico_especialidades` e `servicos`;
2. `profissional_servicos`;
3. `servico_especialidades`;
4. `servicos`.

Procedimento de backup previsto antes do DROP final:

- exportar schema e dados das tres tabelas legadas e tabelas historicas
  relacionadas;
- validar arquivo de exportacao fora da transaction destrutiva;
- somente depois executar migration final especifica.

Status: REMOCAO FISICA DO LEGADO LIBERADA, mas o DROP final nao foi executado
nesta fase.

## Registro da Fase 8.3

Data: 2026-07-29.

Objetivo: executar backup pre-DROP, remover fisicamente o MER legado de
Servicos e validar o novo MER como arquitetura unica operacional.

Backup realizado:

- metodo: backup remoto no proprio Supabase por schema dedicado;
- identificador: `backup_phase8_3_20260729_pre_drop`;
- conteudo: copias `LIKE INCLUDING ALL` e carga integral de `servicos`,
  `servico_especialidades` e `profissional_servicos`;
- validacao: contagens equivalentes antes do DROP (`servicos` 33/33,
  `servico_especialidades` 138/138, `profissional_servicos` 44/44).

Migration final:

- `supabase/migrations/20260729190000_remove_legacy_service_mer_phase8_3.sql`;
- aplicada de forma isolada, sem `supabase db push` generico;
- registrada no historico remoto com `supabase migration repair`.

Objetos removidos do schema `public`:

- policies, triggers e constraints proprios das tabelas legadas;
- `profissional_servicos`;
- `servico_especialidades`;
- `servicos`.

Objetos preservados:

- `servicos_catalogo`;
- `servico_tenants`;
- `servico_catalogo_especialidades`;
- `servico_tenant_especialidades`;
- `profissional_servico_especialidades`;
- `especialidades`;
- `profissional_especialidades`.

Validacao pos-DROP:

- tabelas legadas no schema `public`: 0;
- tabelas oficiais do novo MER existentes: 5;
- contagens oficiais: `servicos_catalogo` 53, `servico_tenants` 29,
  `servico_catalogo_especialidades` 92, `servico_tenant_especialidades` 94,
  `profissional_servico_especialidades` 38;
- orfaos funcionais no novo MER: 0;
- functions, views, materialized views e policies dependentes do legado: 0;
- `agendamento_servicos`: 26 snapshots antigos interpretaveis;
- `cliente_historico_atendimentos`: 10 historicos antigos interpretaveis.

Codigo morto removido:

- `backend/scripts/campaign-test-data.js`;
- `backend/scripts/campaign-test-data-v2.js`;
- `backend/scripts/reconcile-professional-service-links.js`.

Testes executados:

- `npm run test:professional-services`;
- suites focadas de Agenda, Campanhas e Comunicacao;
- `npm run test:appointment-status`;
- `npm run test:client-identity`;
- testes de automacoes, communication repository/provider, plataforma e plano;
- `npm run campaign-test:audit`;
- `npm run campaign-test:validate`;
- `node -e "require('./src/routes/index.routes')"`;
- `npx tsc --noEmit`;
- `npm run build`.

Resultado: FASE 8 CONCLUIDA. O novo MER de Servicos e agora a unica
arquitetura operacional ativa do projeto Bellory.
