# Auditoria - Taxonomia V2 Etapa 5A

## Escopo

Implementacao controlada da expansao global do catalogo, matrizes N:N e perfis operacionais da Taxonomia V2.

Nao foram criados defaults comerciais e nao houve alteracao direta em tenants, profissionais, agenda ou agendamentos.

## A. Estado Antes

Pre-auditoria remota:

| Tabela | Total antes |
| --- | ---: |
| tipos_negocio | 24 |
| servicos_catalogo | 60 |
| especialidades | 104 |
| cargos | 53 |
| tipo_negocio_servicos_catalogo | 53 |
| servico_catalogo_especialidades | 120 |
| cargo_especialidades | 101 |
| taxonomy_aliases | 22 |
| perfil_operacional_servicos | 51 |
| perfil_operacional_cargos | 45 |
| perfil_operacional_defaults | 139 |
| servico_tenants | 60 |
| servico_tenant_especialidades | 126 |
| profissionais | 13 |
| agendamentos | 107 |

Conceitos ja existentes reutilizados/observados na pre-auditoria:

- Especialidades oficiais `reflexologia`, `aromaterapia` e `corte_infantil`.
- Cargo `Fisioterapeuta` ja existia como nome no catalogo, mas a migration idempotente manteve a regra de criar somente quando nao houver cargo ativo equivalente.
- Tipo de negocio `outro` existente, sem perfil operacional automatico nesta etapa.

## B. Migration Criada

`supabase/migrations/20260826130000_taxonomy_v2_stage5a_catalog_matrix_profiles.sql`

Caracteristicas:

- Deterministica e idempotente.
- Aditiva para taxonomia global.
- Auditavel via `taxonomy_audit_log`.
- Versao de taxonomia `2.2.0`.
- Politica de `cargo_especialidades.principal`: recomendacao/ordenacao, nunca restricao de execucao.

## C. Conceitos Criados

Resultado pos-migration:

| Item | Esperado | Real observado |
| --- | ---: | ---: |
| Servicos globais novos | 13 | +13 |
| Especialidades globais novas | 11 | +11 |
| Cargos novos/reativos conforme regra idempotente | 6 | +6 |
| Aliases | 8 | +8 |

Servicos globais incluidos:

- Body piercing
- Troca/instalacao de joia
- Bronzeamento artificial
- Bronzeamento a jato
- Avaliacao fisioterapeutica
- Sessao de fisioterapia
- Aula de Pilates
- Tatuagem
- Retoque de tatuagem
- Reiki
- Reflexologia
- Aromaterapia
- Cauterizacao capilar

Especialidades globais incluidas:

- Perfuracao corporal
- Troca de joia
- Bronzeamento artificial
- Bronzeamento a jato
- Avaliacao fisioterapeutica
- Fisioterapia
- Pilates
- Tatuagem
- Retoque de tatuagem
- Reiki
- Polimento de unhas

## D. Conceitos Reutilizados

- Reflexologia: reutilizada como especialidade oficial existente.
- Aromaterapia: reutilizada como especialidade oficial existente.
- Tratamento Capilar: reutilizada para Cauterizacao capilar.
- Corte Infantil: preservada como especialidade.
- Progressiva/Escova Progressiva: nenhuma criacao nova nesta migration.

Observacao de auditoria: existe duplicidade legada em `especialidades.taxonomy_specialty_key = corte_masculino`, anterior e fora do escopo da Etapa 5A. A migration nao criou nem alterou esse conceito.

## E. Aliases

Criados como aliases globais:

- Piercing corporal -> Body piercing
- Perfuracao corporal -> Body piercing
- Troca de piercing -> Troca/instalacao de joia
- Bronzeadora -> Tecnica em bronzeamento
- Instrutor de Pilates -> Instrutora de Pilates
- Tatuadora -> Tatuador
- Terapia energetica -> Reiki
- Polimento -> Polimento de unhas

## F. Matrizes N:N

| Matriz | Previsto | Real observado |
| --- | ---: | ---: |
| TipoNegocio x Servico | 18 | +18 |
| Servico x Especialidade | 19 | +19 |
| Cargo x Especialidade | 17 | +15 |

A diferenca em Cargo x Especialidade ocorreu por reutilizacao de relacoes ja existentes, sem forcar inserts duplicados.

## G. Perfis Operacionais

Servicos recomendados por tipo de negocio apos a migration:

| Tipo | Recomendados ativos |
| --- | ---: |
| Body Piercing | 1 |
| Bronzeamento | 2 |
| Estetica Facial | 2 |
| Fisioterapia | 2 |
| Pilates | 1 |
| Tatuagem | 1 |
| Terapias Integrativas | 2 |
| Outro | 0 |

O TXT informa 12 recomendados no resumo, mas a secao 11 lista 11 recomendados e determina que os demais compativeis nao sejam promovidos automaticamente. A migration aplicou a lista detalhada, sem inventar recomendacao adicional.

## H. Defaults Pendentes

`perfil_operacional_defaults` permaneceu inalterada em 139 registros.

Nenhum preco, duracao, retorno ou agendamento online foi inventado. Os defaults comerciais permanecem pendentes para Etapa 5B.

## I. Tenants Alterados

Alteracoes diretas em tenants: 0.

Contagens preservadas:

- `servico_tenants`: 60 antes, 60 depois.
- `servico_tenant_especialidades`: 126 antes, 126 depois.
- `profissionais`: 13 antes, 13 depois.

## J. Agendamentos Alterados

Alteracoes diretas em agendamentos: 0.

`agendamentos`: 107 antes, 107 depois.

## K. Testes

Executados:

- `npm run check:migrations`: passou.
- `supabase db push --dry-run`: passou; migration prevista: `20260826130000_taxonomy_v2_stage5a_catalog_matrix_profiles.sql`.
- `supabase db push`: passou.
- `supabase migration list`: local/remoto alinhados ate `20260826130000`.
- `node --test src/modules/operational-profiles/taxonomy-v2-stage5a-migration.test.js`: passou.
- `npm run test:professional-services`: passou.
- `npm run test:appointment-status`: passou.
- `npm run test:client-identity`: passou.
- `npx tsc --noEmit`: passou.
- `npm run build`: passou apos parar temporariamente o `next dev` que bloqueava `.next` no Windows.

Validados:

- Ausencia de duplicidade nos novos codigos de servico.
- Aliases ativos sem duplicidade.
- Relacoes N:N sem duplicidade.
- Reflexologia e Aromaterapia nao duplicadas pela Etapa 5A.
- Polimento nao criado como servico.
- Cauterizacao capilar criada como servico.
- `principal` preservado como recomendacao/ordenacao.
- `Outro` sem recomendacao/perfil automatico.

## L. Estado Local/Remoto

Pós-auditoria remota:

| Tabela | Total depois |
| --- | ---: |
| tipos_negocio | 24 |
| servicos_catalogo | 73 |
| especialidades | 115 |
| cargos | 59 |
| tipo_negocio_servicos_catalogo | 71 |
| servico_catalogo_especialidades | 139 |
| cargo_especialidades | 116 |
| taxonomy_aliases | 30 |
| perfil_operacional_servicos | 62 |
| perfil_operacional_cargos | 53 |
| perfil_operacional_defaults | 139 |
| servico_tenants | 60 |
| servico_tenant_especialidades | 126 |
| profissionais | 13 |
| agendamentos | 107 |

Arquivos da Etapa 5A para checkpoint posterior:

- `supabase/migrations/20260826130000_taxonomy_v2_stage5a_catalog_matrix_profiles.sql`
- `backend/src/modules/operational-profiles/taxonomy-v2-stage5a-migration.test.js`
- `docs/audits/20260826-taxonomia-v2-etapa-5a.md`

Nao foi executado `git commit` nem `git push`.

TAXONOMIA V2 - ETAPA 5A CONCLUIDA: CATALOGO, MATRIZES E PERFIS OPERACIONAIS EXPANDIDOS COM SEGURANCA
