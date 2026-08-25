# Taxonomia V2 - Etapa 2

Data: 2026-08-25

## A. Auditoria previa

Inventario remoto antes da expansao:

- Cargos operacionais oficiais ativos: 11.
- Servicos oficiais ativos: 53.
- Especialidades oficiais ativas: 60.
- Cargo x Especialidade ativos: 60.
- Servico x Especialidade ativos: 92.
- TipoNegocio x Servico ativos: 40.
- Aliases ativos: 9.

Os 16 registros fora do recorte da Etapa 1 foram classificados assim:

| Registro | Tipo | Estado | Motivo da exclusao | Relacao com V2 | Acao |
| --- | --- | --- | --- | --- | --- |
| Trancista | CUSTOMIZADO_TENANT | ativo | `tenant_id` presente | Coincide com cargo V2 aprovado, mas e local | MANTER LEGADO |
| Polimento | CUSTOMIZADO_TENANT | ativo | `tenant_id` presente | Customizacao local de unhas | MANTER LEGADO |
| Corte Feminino | LEGADO | deleted | especialidade deletada | Conceito oficial ativo ja existe | IGNORAR_NESTA_ETAPA |
| Luzes | LEGADO | deleted | especialidade deletada | Conceito oficial ativo ja existe | IGNORAR_NESTA_ETAPA |
| Gel | LEGADO | deleted | especialidade deletada | Conceito oficial ativo ja existe | IGNORAR_NESTA_ETAPA |
| Drenagem | LEGADO | deleted | especialidade deletada | Conceito substituido por drenagens especificas | CONSOLIDAR_FUTURAMENTE |
| Relaxante | LEGADO | deleted | especialidade deletada | Conceito coberto por massagem relaxante | CONSOLIDAR_FUTURAMENTE |
| Maquiagem Social | LEGADO | deleted | especialidade deletada | Conceito oficial ativo ja existe | IGNORAR_NESTA_ETAPA |
| Maquiagem Noiva | LEGADO | deleted | especialidade deletada | Conceito oficial ativo ja existe | IGNORAR_NESTA_ETAPA |
| Terapeutica | LEGADO | deleted | especialidade deletada | Conceito coberto por massagem terapeutica nao clinica | CONSOLIDAR_FUTURAMENTE |
| Colorimetria | LEGADO | deleted | especialidade deletada | Alias de Colorista/Coloracao | ALIAS |
| Escova | LEGADO | deleted | especialidade deletada | Conceito oficial ativo por especialidades de escova | CONSOLIDAR_FUTURAMENTE |
| Progressiva | LEGADO | deleted | especialidade deletada | Conceito oficial ativo relacionado a transformacao | CONSOLIDAR_FUTURAMENTE |
| Barba | LEGADO | deleted | especialidade deletada | Conceito oficial ativo ja existe | IGNORAR_NESTA_ETAPA |
| Agendamento | LEGADO | deleted | especialidade deletada | Administrativo, fora da matriz operacional | IGNORAR_NESTA_ETAPA |
| Atendimento | LEGADO | deleted | especialidade deletada | Administrativo, fora da matriz operacional | IGNORAR_NESTA_ETAPA |

Nenhum desses registros foi reativado.

## B. Expansao

Cargos adicionados:

- Colorista.
- Especialista em cabelos cacheados/crespos.
- Nail Designer.
- Micropigmentador(a).
- Terapeuta de Spa.
- Trancista.

Servicos adicionados:

- `NAIL_EXTENSION_REMOVAL`: Remocao de alongamento.
- `LASH_MAINTENANCE`: Manutencao de cilios.
- `LASH_REMOVAL`: Remocao de cilios.
- `THERAPEUTIC_MASSAGE_NON_CLINICAL`: Massagem terapeutica nao clinica.
- `SPA_RITUAL`: Ritual de spa.
- `PODOLOGY_AESTHETIC_PREVENTIVE`: Podologia estetica/preventiva.
- `BRAID_MAINTENANCE`: Manutencao de trancas.

Especialidades adicionadas: 28, incluindo corte cacheado/crespo, retoque de raiz, correcao de cor, morena iluminada, finalizacao cacheada, acrilico, molde F1, remocao segura, reparo, manutencoes de cilios, remocao de extensao, alivio tensional, reflexologia, aromaterapia, pedras quentes, rituais de spa, podologia estetica/preventiva, manutencao/remocao de trancas e visagismo capilar.

Aliases adicionados: 13.

Relacoes adicionadas:

- Cargo x Especialidade: 41 novas relacoes.
- Servico x Especialidade: 28 novas relacoes.
- TipoNegocio x Servico: 11 novas relacoes.

## C. Conflitos

Duplicidades encontradas:

- Cargos aprovados como Trancista, Colorista, Nail designer e Micropigmentador ja existiam como registros inativos/deletados.
- A Etapa 2 criou novos conceitos oficiais ativos sem reativar os legados deletados.
- `Corte Masculino` permanece como duplicidade historica de especialidade por cargo e deve ser tratado em etapa de reconciliacao, nao nesta expansao.

Aliases encontrados:

- Aliases da Etapa 1 foram preservados.
- Novos aliases foram criados somente quando apontavam para conceito canonico ativo.

Legados encontrados:

- `especialidades.cargo_id` permanece transicional.
- Registros deletados e customizados foram preservados sem remapeamento automatico.

Customizacoes tenant coincidentes:

- `Trancista` customizado e `Polimento` customizado permanecem locais.
- Nenhuma customizacao foi promovida automaticamente a global.

Tratamento aplicado:

- Criacao aditiva, auditada, sem delete, sem seed de tenant, sem reconcile, sem cleanup.

## D. Versionamento

- Versao anterior: `2.0.0`, marcada como `deprecated`.
- Nova versao: `2.1.0`, marcada como `active`.
- Registros de auditoria da Etapa 2: 135.

## E. Banco

Migration criada:

- `supabase/migrations/20260825110000_taxonomy_v2_catalog_expansion.sql`

Dry-run:

- `supabase db push --dry-run`
- Resultado: aplicaria somente `20260825110000_taxonomy_v2_catalog_expansion.sql`.

Db push:

- `supabase db push`
- Resultado: migration aplicada com sucesso.

Migration list:

- `20260825110000` consta aplicada no remoto.

Quantitativos finais:

- Cargos operacionais oficiais ativos: 17.
- Servicos oficiais ativos: 60.
- Especialidades oficiais ativas: 88.
- Cargo x Especialidade ativos: 101.
- Servico x Especialidade ativos: 120.
- TipoNegocio x Servico ativos: 51.
- Aliases ativos: 22.
- Versao vigente: `2.1.0`.

## F. Seguranca multi-tenant

Alteracoes automaticas decorrentes da expansao:

- `servico_tenants`: 0.
- `servico_tenant_especialidades`: 0.
- `profissionais`: 0.
- `agendamentos`: 0.

Tenants monitorados antes e depois:

| Tenant | servico_tenants | servico_tenants ativos | configuracoes | profissionais | agendamentos |
| --- | ---: | ---: | ---: | ---: | ---: |
| bellory-test-studio | 19 | 7 | 21 | 4 | 34 |
| espaco-vivian-beauty | 17 | 15 | 37 | 3 | 46 |

Os contadores permaneceram iguais aos da auditoria previa.

## G. Validacao funcional

Servicos:

- Catalogo global expandido sem criar oferta tenant.
- Novos servicos aparecem apenas como conceitos globais/configuraveis.

Equipe:

- Cargo x Especialidade N:N continua governando compatibilidade oficial.
- Profissionais nao receberam novas habilitacoes automaticamente.

Agenda:

- Nenhum agendamento foi alterado.
- Slots, duracao e disponibilidade continuam dependentes das configuracoes tenant existentes.

Booking:

- Booking publico continua dependente de `servico_tenants`, `servico_tenant_especialidades` e profissionais habilitados.
- A expansao global nao aumenta oferta agendavel automaticamente.

Onboarding atual:

- Nenhuma tela ou fluxo de onboarding foi alterado.
- Exposicao completa do catalogo V2 permanece reservada para a Etapa 3.

Campanhas:

- Nenhuma campanha, segmentacao ou historico foi alterado.
- Campanhas seguem usando combinacoes/servicos existentes.

Encadeamentos reais validados:

- Unhas -> Nail Designer -> Alongamento de unhas -> Acrilico / Molde F1.
- Cabelos -> Trancista -> Manutencao de trancas -> Manutencao de trancas / Remocao de trancas.
- Micropigmentacao -> Micropigmentador(a) -> Micropigmentacao -> Micropigmentacao.
- Massoterapia/Estetica corporal -> Drenagem Linfatica -> Massoterapeuta e Esteticista.

N:N real comprovado:

- Especialidade unica: `drenagem_linfatica`.
- Cargos ativos: Massoterapeuta (`principal=true`) e Esteticista (`principal=false`).
- `principal=false` nao exclui elegibilidade.

## H. Qualidade

Valido:

- `npm run check:migrations`: passou.
- `node --test src/modules/team/taxonomy-v2-catalog-expansion.test.js`: 4/4 passou.
- `node --test src/modules/team/taxonomy-v2-catalog-expansion.test.js src/modules/team/team-operational-update.test.js`: 12/12 passou.
- `npm run test:professional-services`: 34 testes passaram, 1 suite legada skipada.
- `npx tsc --noEmit`: passou.
- `npm run build`: passou.
- `supabase migration list`: local/remoto alinhados.

Observacao:

- A primeira tentativa de build falhou por `EPERM` em `frontend/.next/trace` com o servidor Next ativo. O frontend foi parado temporariamente, o build passou e o servidor foi religado.

## I. Pendencias

- `especialidades.cargo_id` segue como campo legado/transicional.
- Registros legados deletados permanecem para reconciliacao futura.
- Customizacoes tenant coincidentes nao foram promovidas nem remapeadas.
- Etapa 3 deve tratar onboarding, manutencao administrativa e exposicao completa do catalogo V2.
- Uma etapa posterior deve tratar limpeza/reconciliacao de legados e possiveis novas categorias dedicadas para Spa, Trancas, Visagismo e Micropigmentacao, sem quebrar os contratos atuais de `categoria_key`.

TAXONOMIA V2 — ETAPA 2 CONCLUÍDA: CATÁLOGO OFICIAL EXPANDIDO SEM ALTERAR OFERTAS DOS TENANTS
