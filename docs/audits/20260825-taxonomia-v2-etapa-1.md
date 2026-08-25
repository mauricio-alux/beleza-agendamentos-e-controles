# Taxonomia V2 - Etapa 1

Data: 2026-08-25

## A. Auditoria Inicial

Schema encontrado antes da migration:

- `cargos`: catálogo global de cargos, incluindo cargos operacionais e administrativos.
- `especialidades`: catálogo global/local de especialidades com `cargo_id` legado obrigatório.
- `servico_catalogo_especialidades`: relação global Serviço de Catálogo x Especialidade.
- `servico_tenant_especialidades`: configuração comercial local por estabelecimento.
- `profissional_especialidades`: vínculo local Profissional x Especialidade.
- `cargo_especialidades`, `taxonomy_aliases`, `taxonomy_versions` e `taxonomy_audit_log`: inexistentes antes da Etapa 1.

Consumidores identificados de `especialidades.cargo_id`:

- `backend/src/modules/team/team.repository.js`: filtro/listagem por cargo, leitura por IDs e bloqueio de remoção de cargo.
- `backend/src/modules/team/team.service.js`: validação de compatibilidade de especialidade com cargo.
- `backend/src/modules/business-types/business-types.repository.js`: listagem/administração de especialidades por cargo e contadores por cargo.
- `backend/src/modules/business-types/business-types.service.js`: criação/edição administrativa de especialidades com `cargo_id`.
- `backend/src/modules/services/services.service.js`: payloads e compatibilidade de especialidade em serviços.
- `frontend/src/components/team/*`, `frontend/src/components/operational/OperationalCatalogManager.tsx`, `frontend/src/components/platform/BusinessTypesManager.tsx`, `frontend/src/services/team.service.ts` e `frontend/src/services/business-types.service.ts`: consumo de cargo legado para exibição/administração.

Divergências:

- `especialidades.cargo_id` ainda misturava a relação oficial global Cargo x Especialidade com vínculo local/transicional.
- Não havia tabela própria para aliases.
- Não havia versionamento formal nem trilha de auditoria global para alterações estruturais da taxonomia.
- A validação de equipe usava `cargo_id` como restrição de execução para especialidades oficiais.

## B. Estrutura Implementada

Migration criada e aplicada:

- `supabase/migrations/20260825090000_taxonomy_v2_foundation.sql`

Tabelas:

- `taxonomy_versions`: versionamento da taxonomia, com `version`, `status`, `origem`, `metadata`, `activated_at`, timestamps e soft delete.
- `taxonomy_audit_log`: auditoria das alterações globais, com entidade, ação, valores anterior/posterior, origem, ator opcional e metadata.
- `cargo_especialidades`: matriz oficial global N:N Cargo x Especialidade.
- `taxonomy_aliases`: aliases canônicos por entidade (`cargo`, `especialidade`, `servico_catalogo`, `tipo_negocio`).

Constraints, FKs e índices:

- FKs de `cargo_especialidades.cargo_id` para `cargos(id)` e `especialidade_id` para `especialidades(id)`.
- FK de `taxonomy_audit_log.taxonomy_version_id` para `taxonomy_versions(id)`.
- Índice único ativo em `cargo_especialidades(cargo_id, especialidade_id)` quando `deleted_at is null`.
- Índice único ativo em `taxonomy_aliases(entidade_tipo, locale, normalizado)` quando `deleted_at is null and ativo = true`.
- Índices por cargo, especialidade, entidade auditada e status de versão.
- RLS habilitado nas quatro tabelas, com leitura autenticada para dados globais operacionais e escrita restrita a master admin.

Política de `principal`:

- `cargo_especialidades.principal` foi formalizado como dica de recomendação/ordenação.
- `principal` nunca restringe execução, agenda, serviços ou elegibilidade profissional.

Aliases:

- Aliases passam a ter tabela própria em V2.
- Foram inseridos apenas aliases de cargos ativos existentes, sem criar novos cargos ou expandir catálogo.
- Casos cobertos: Cabeleireiro/Cabeleireira/o, Depilador/Depilador(a), Maquiador/Maquiador(a), Massagista, Podologo/Podologo(a).

Versionamento e auditoria:

- Versão ativa criada: `2.0.0`.
- Origem padrão: `taxonomy_v2_foundation`.
- Auditoria gravada para ativação da versão, backfill V1 -> V2 e aliases.

## C. Migração V1 -> V2

Resultado auditado no remoto:

- Relações V1 válidas: 60.
- Relações migradas para `cargo_especialidades`: 60.
- Relações ativas em V2: 60.
- Conflitos: 0.
- Duplicidades ativas: 0.
- Paridade V1/V2 faltante: 0.
- Especialidades ignoradas pela Etapa 1: 16.

Critério de migração:

- Migrou somente `especialidades` oficiais, ativas, globais (`tenant_id is null`), não customizadas, sem soft delete e com cargo operacional ativo.
- Especialidades customizadas/local tenant continuam fora da matriz oficial global e permanecem representadas por `especialidades.tenant_id` + `cargo_id` transicional.

## D. Banco Remoto

Dry-run:

- `supabase db push --dry-run`
- Resultado: aplicaria somente `20260825090000_taxonomy_v2_foundation.sql`.

Push remoto:

- `supabase db push`
- Resultado: migration aplicada com sucesso.

Lista de migrations:

- `20260825090000` consta como aplicada no remoto.
- A migration local anterior `20260824190000` já constava aplicada antes do push desta etapa.

Validação pós-migração:

- `cargo_especialidades`: 60 registros, 60 ativos.
- `taxonomy_aliases`: 9 registros.
- `taxonomy_versions`: `2.0.0` ativa.
- `taxonomy_audit_log`: 3 registros.

## E. Compatibilidade

Equipe:

- `team.repository.listSpecialties` passa a consultar `cargo_especialidades` quando a matriz V2 existe.
- Se a matriz V2 ainda não existir, mantém fallback para `especialidades.cargo_id`.
- Especialidades customizadas locais continuam usando `especialidades.tenant_id` e `cargo_id` transicional.

Execução profissional:

- `team.service.ensureCompatibleSpecialties` usa `cargo_especialidades` para especialidades oficiais.
- `principal=false` não bloqueia execução.
- O legado `cargo_id` só restringe especialidades locais/customizadas do próprio tenant ou fallback V1.

Serviços, agenda, booking público, onboarding, campanhas e tenants:

- Não houve expansão ou alteração de catálogo operacional nesta etapa.
- O MER de serviços e agenda permanece usando as relações de serviço/especialidade existentes.
- Booking público, onboarding, campanhas e tenants preservam comportamento atual.

## F. Validações

Executado:

- `node --test src/modules/team/team-operational-update.test.js`: 8/8 passou.
- `npm run test:professional-services`: 34 testes passaram, 1 suíte legada skipada.
- `npm run test:client-identity`: 14/14 passou.
- `npm run test:appointment-status`: 5/5 passou.
- `npm run check:migrations`: passou.
- `npx tsc --noEmit`: passou.
- `npm run build`: passou.
- `supabase migration list`: migration `20260825090000` aplicada no remoto.
- Auditoria pós-migração remota: paridade V1/V2 igual a 0 faltantes.

Observação:

- A primeira tentativa de build falhou por `EPERM` em `frontend/.next/trace` enquanto o servidor Next estava ativo na porta 3000. O processo do frontend foi parado temporariamente, o build passou e o servidor foi iniciado novamente.
- Portas finais: 3000 e 3001 escutando.

## G. Pendências

- `especialidades.cargo_id` permanece como campo legado/transicional, conforme especificação da Etapa 1.
- Consumidores administrativos e telas que exibem/administrem `cargo_id` ainda existem para compatibilidade e deverão ser tratados em etapa posterior.
- Etapa 2 deve tratar expansão/revisão de catálogo, novas especialidades/cargos e eventual remoção do legado.
- Micropigmentador(a) foi mantido como decisão arquitetural/alias canônico futuro, mas não foi ativado nem expandido porque a Etapa 1 proíbe expansão de catálogo.

TAXONOMIA V2 — ETAPA 1 CONCLUÍDA: FUNDAÇÃO N:N IMPLEMENTADA COM COMPATIBILIDADE V1
