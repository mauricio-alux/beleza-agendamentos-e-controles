# Taxonomia V2 - pre-configuracao de aplicabilidade por tipo de negocio

## Status

Aplicada no Supabase remoto em 2026-09-01, validada por consultas read-only antes/depois e testes automatizados.

Sem commit e sem push.

## Modelo confirmado

Tipo de Negocio governa aplicabilidade em `tipo_negocio_servicos_catalogo`.

Perfil Operacional governa recomendacao em `perfil_operacional_servicos.recomendado`.

O campo legado `tipo_negocio_servicos_catalogo.recomendado` permanece apenas por compatibilidade do contrato atual e nao foi reintroduzido como regra funcional.

## Estado antes

A leitura das migrations existentes mostra:

| Indicador | Baseline conhecido |
| --- | ---: |
| Tipos de negocio seedados | 24 |
| Relacoes Tipo x Servico documentadas apos Etapa 5A | 71 |
| Servicos recomendados por perfis com defaults Etapa 5B.2 | 11 |

Baseline remoto antes da aplicacao:

| Indicador remoto antes | Valor |
| --- | ---: |
| Projeto Supabase vinculado | `djbuzarzbpcpixudpnmg` |
| Versao ativa da taxonomia | `2.2.0` |
| Tipos de negocio ativos | 24 |
| Servicos ativos no catalogo | 73 |
| Registros em `tipo_negocio_servicos_catalogo` | 81 |
| Relacoes ativas | 81 |
| Relacoes inativas | 0 |
| Pares distintos Tipo x Servico | 81 |
| `perfil_operacional_servicos` total | 64 |
| `perfil_operacional_servicos` ativos | 64 |
| `perfil_operacional_servicos` recomendados ativos | 53 |
| Tenants | 7 |
| `servico_tenants` | 75 |
| `servico_tenant_especialidades` | 126 |
| Agendamentos | 107 |

Agendamentos por status antes:

| Status | Total |
| --- | ---: |
| cancelado | 9 |
| concluido | 83 |
| confirmado | 3 |
| no_show | 5 |
| pendente_atendente | 3 |
| pendente_cliente | 4 |

Fingerprints antes:

| Alvo | Fingerprint |
| --- | --- |
| `agendamentos` | `da750a36be0779ed8b21a30699f3abd8` |
| `perfil_operacional_servicos` | `24a84c01db32c5a6a5b79084ac678b70` |
| `servico_tenants` | `7319dc784fe499eca74aea31c0a99bf0` |
| `servico_tenant_especialidades` | `763162c8d52d8dbb99af5aecaf125605` |

## Matriz proposta/aplicada

| Tipo de negocio | Estado sugerido |
| --- | --- |
| Salao de Beleza | Ampliar para cabelo, terapia capilar, unhas, sobrancelhas, cilios, maquiagem/eventos, depilacao leve e estetica facial leve. |
| Barbearia | Manter corte/barba e adicionar acabamento, sobrancelhas e depilacao facial/cera coerentes. |
| Esmalteria / Nail Studio | Cobrir manicure, pedicure, gel, alongamento, manutencao, remocao, banho de gel e nail art. |
| Studio de Sobrancelhas | Cobrir design, laminacao, micropigmentacao e depilacao facial. |
| Studio de Cilios | Cobrir extensao, lifting, manutencao e remocao de cilios. |
| Maquiagem e Penteados | Cobrir maquiagem, maquiagem social/noiva, penteados, producao de festas, dia da noiva e apoio capilar. |
| Clinica de Estetica | Cobrir estetica facial, estetica corporal, depilacao, laser e micropigmentacao estetica. |
| Estetica Facial | Cobrir limpeza, hidratacao, drenagem, peeling, revitalizacao e depilacao facial. |
| Estetica Corporal | Cobrir modeladora, drenagem, tratamento corporal, spa corporal e depilacao. |
| Massoterapia | Cobrir massagem relaxante, terapeutica nao clinica, modeladora, drenagem, spa corporal e reflexologia. |
| Spa / Day Spa | Cobrir ritual de spa, massagens, estetica corporal/facial leve, unhas, aromaterapia e reflexologia. |
| Podologia | Cobrir podologia estetica/preventiva e pedicure correlato. |
| Depilacao | Cobrir cera, facial e laser. |
| Bronzeamento | Cobrir bronzeamento artificial e a jato. |
| Micropigmentacao | Cobrir micropigmentacao e design de sobrancelhas preparatorio. |
| Tatuagem | Cobrir tatuagem e retoque. |
| Body Piercing | Cobrir body piercing e troca/instalacao de joia. |
| Clinica Capilar / Tricologia | Cobrir tratamentos capilares, terapia capilar e servicos capilares correlatos. |
| Fisioterapia | Cobrir avaliacao e sessao de fisioterapia. |
| Pilates | Cobrir aula de Pilates. |
| Terapias Integrativas | Cobrir Reiki, reflexologia e aromaterapia. |
| Centro de Bem-estar | Cobrir bem-estar hibrido: massagens, spa, estetica facial/corporal, terapias, Pilates e fisioterapia. |
| Profissional Autonomo Multisservicos | Cobrir carteira ampla, mas ainda limitada a servicos coerentes de beleza, estetica e bem-estar. |
| Outro | Preservado sem carga ampla automatica; permanece minimo/manual. |

## Relacoes adicionadas

A migration `20260901100000_taxonomy_v2_business_type_service_applicability_preconfiguration.sql` define uma matriz oficial com 193 pares Tipo x Servico, inserindo somente pares ausentes e preservando linhas existentes.

Tambem insere, quando ausente, qualquer servico recomendado por perfil operacional como aplicavel ao tipo correspondente. Essa etapa trata recomendacao como evidencia de lacuna, nao como fonte permanente.

Impacto remoto previsto antes da aplicacao:

| Indicador | Valor |
| --- | ---: |
| Pares oficiais declarados | 193 |
| Pares resolvidos no remoto | 193 |
| Ja existentes | 80 |
| Ja existentes ativos | 80 |
| Inativos preservados | 0 |
| Novos previstos | 113 |
| Gaps de perfil recomendado antes | 0 |

Impacto real registrado em `taxonomy_audit_log`:

| Indicador | Valor |
| --- | ---: |
| Tipos ativos antes | 24 |
| Servicos ativos no catalogo antes | 73 |
| Relacoes ativas antes | 81 |
| Relacoes oficiais inseridas | 113 |
| Relacoes inseridas por evidencia de perfil | 0 |
| Relacoes ativas depois | 194 |

O aumento real foi 113 relacoes, exatamente igual ao previsto. A diferenca entre previsto e realizado foi 0.

## Matriz remota por tipo

| Tipo | Antes | Inseridos | Depois |
| --- | ---: | ---: | ---: |
| Barbearia | 5 | 3 | 8 |
| Body Piercing | 2 | 0 | 2 |
| Bronzeamento | 2 | 0 | 2 |
| Centro de Bem-estar | 3 | 13 | 16 |
| Clinica Capilar / Tricologia | 4 | 8 | 12 |
| Clinica de Estetica | 1 | 12 | 13 |
| Depilacao | 1 | 2 | 3 |
| Esmalteria / Nail Studio | 8 | 0 | 8 |
| Estetica Corporal | 1 | 4 | 5 |
| Estetica Facial | 5 | 1 | 6 |
| Fisioterapia | 2 | 0 | 2 |
| Maquiagem e Penteados | 5 | 4 | 9 |
| Massoterapia | 3 | 3 | 6 |
| Micropigmentacao | 1 | 1 | 2 |
| Pilates | 1 | 0 | 1 |
| Podologia | 1 | 1 | 2 |
| Profissional Autonomo Multisservicos | 3 | 23 | 26 |
| Salao de Beleza | 19 | 25 | 44 |
| Spa / Day Spa | 3 | 10 | 13 |
| Studio de Cilios | 2 | 2 | 4 |
| Studio de Sobrancelhas | 3 | 1 | 4 |
| Tatuagem | 2 | 0 | 2 |
| Terapias Integrativas | 3 | 0 | 3 |

## Possiveis inconsistencias

Nenhuma relacao existente e removida automaticamente. Associacoes atuais aparentemente amplas ou incoerentes devem ser revisadas pelo MasterAdmin em fluxo manual.

Se houver perfil operacional recomendando servico sem relacao ativa aplicavel apos as insercoes, a migration falha com erro explicito de inconsistencia taxonomica.

## Perfis operacionais

Nao houve `insert` ou `update` em `perfil_operacional_servicos`, `perfil_operacional_defaults` ou `perfil_operacional_cargos`.

Antes/depois remoto:

| Indicador | Antes | Depois |
| --- | ---: | ---: |
| `perfil_operacional_servicos` total | 64 | 64 |
| `perfil_operacional_servicos` ativos | 64 | 64 |
| `perfil_operacional_servicos` recomendados ativos | 53 | 53 |
| Recomendacoes ativas fora da matriz aplicavel | 0 | 0 |

Fingerprint de `perfil_operacional_servicos` permaneceu `24a84c01db32c5a6a5b79084ac678b70`.

## MasterAdmin

A manutencao manual continua preservada. A migration usa `on conflict do nothing`; portanto, uma decisao manual ja persistida nao e sobrescrita em reexecucao.

O teste `business-types.service.test.js` confirma que o MasterAdmin pode manter a matriz por campos de aplicabilidade e que a remocao de aplicabilidade e bloqueada somente quando existe recomendacao ativa de perfil dependente.

## Tenants

Nao houve alteracao em `servico_tenants`, `servico_tenant_especialidades`, precos, duracoes, retorno, online, profissionais ou configuracoes locais.

Antes/depois remoto:

| Indicador | Antes | Depois |
| --- | ---: | ---: |
| Tenants | 7 | 7 |
| `servico_tenants` | 75 | 75 |
| `servico_tenant_especialidades` | 126 | 126 |

Fingerprints preservados:

| Alvo | Antes | Depois |
| --- | --- | --- |
| `servico_tenants` | `7319dc784fe499eca74aea31c0a99bf0` | `7319dc784fe499eca74aea31c0a99bf0` |
| `servico_tenant_especialidades` | `763162c8d52d8dbb99af5aecaf125605` | `763162c8d52d8dbb99af5aecaf125605` |

## Booking/Agenda

Booking e Agenda nao passam a consumir diretamente a matriz global. Nenhuma tabela de agendamento ou booking foi alterada.

Agendamentos antes/depois:

| Indicador | Antes | Depois |
| --- | ---: | ---: |
| Agendamentos total | 107 | 107 |
| cancelado | 9 | 9 |
| concluido | 83 | 83 |
| confirmado | 3 | 3 |
| no_show | 5 | 5 |
| pendente_atendente | 3 | 3 |
| pendente_cliente | 4 | 4 |

Fingerprint de `agendamentos` permaneceu `da750a36be0779ed8b21a30699f3abd8`.

## Casos representativos

Barbearia apos migration:

- Acabamento;
- Corte masculino;
- Barba;
- Corte + barba;
- Pigmentacao/camuflagem de barba;
- Design de sobrancelhas;
- Depilacao com cera;
- Depilacao facial.

Salao de Beleza apos migration: 44 servicos aplicaveis, incluindo Alisamento, Balayage, Coloracao, Corte de cabelo, Escova, Extensao/aplique capilar, Hidratacao capilar, Luzes/mechas, Progressiva, unhas, sobrancelhas, cilios, maquiagem/eventos, depilacao leve e estetica facial leve.

Body Piercing apos migration:

- Body piercing;
- Troca/instalacao de joia.

Esmalteria / Nail Studio apos migration:

- Banho de gel;
- Esmaltacao em gel;
- Manicure;
- Pedicure;
- Alongamento de unhas;
- Manutencao de alongamento;
- Nail art;
- Remocao de alongamento.

Outro apos migration: nao recebeu catalogo arbitrario; consulta retornou nenhum servico aplicavel real.

## Testes

Criado teste estatico em `backend/src/modules/operational-profiles/taxonomy-v2-applicability-preconfiguration-migration.test.js` cobrindo:

- ausencia de alteracoes em dados runtime de tenant;
- ausencia de alteracoes em perfis operacionais;
- carga ampla de aplicabilidade oficial;
- tratamento minimo/manual para `outro`;
- separacao entre aplicabilidade e recomendacao;
- preservacao de decisoes do MasterAdmin.

Testes executados apos aplicacao remota:

| Comando | Resultado |
| --- | --- |
| `node --test backend\src\modules\operational-profiles\taxonomy-v2-applicability-preconfiguration-migration.test.js backend\src\modules\business-types\business-types.service.test.js backend\src\modules\operational-profiles\operational-profiles.service.test.js backend\src\modules\operational-profiles\operational-profiles.governance.test.js` | 45 passed |
| `npm run test:professional-services` | 34 passed, 1 suite skipped conforme teste legado |
| `npm run test:client-identity` | 14 passed |
| `npm run test:appointment-status` | 5 passed |
| `node --test backend\src\modules\agenda\agenda.engine.test.js backend\src\modules\agenda\agenda-date-range.test.js backend\src\modules\agenda\domain\service-composition.test.js backend\src\modules\agenda\domain\appointment-status.test.js` | 22 passed |

## Migration

Migration criada e aplicada no Supabase remoto:

`supabase/migrations/20260901100000_taxonomy_v2_business_type_service_applicability_preconfiguration.sql`

Ela cria/ativa a versao `2.3.0` da taxonomia e registrou auditoria de contadores reais no banco aplicado.

`supabase migration list` confirmou `20260901100000` presente em Local e Remote.

## Banco

Migration aplicada no Supabase remoto vinculado `djbuzarzbpcpixudpnmg`.

Versao ativa antes: `2.2.0`.

Versao ativa depois: `2.3.0`.

Nao foi executado `db reset`.

Nao foi executado `seed`, `reconcile`, `cleanup`, `DROP`, `TRUNCATE` ou `DELETE`.

## Validacao visual

Validacao visual interativa pendente: a rota local `/admin/taxonomia` respondeu `200 OK`, mas nao havia navegador controlado disponivel nesta sessao.

## Git

Sem commit.

Sem push.

TAXONOMIA V2 - MATRIZ DE SERVICOS APLICAVEIS PRE-CONFIGURADA E GOVERNANCA DO MASTERADMIN PRESERVADA
