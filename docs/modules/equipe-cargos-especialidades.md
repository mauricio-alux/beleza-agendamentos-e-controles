# Equipe — Cargos e Especialidades

## Objetivo

Padronizar o cadastro de profissionais, removendo texto livre para cargo e especialidade.

## Estrutura

- `cargos`: catalogo global de cargos ativos.
- `especialidades`: catalogo misto com registros oficiais globais e registros
  customizados por tenant.
- `profissionais.cargo_id`: cargo principal do profissional.
- `profissional_especialidades`: relacao entre profissional e multiplas especialidades.
- `profissional_servico_especialidades`: relacao explicita entre profissional e
  as combinacoes de servico ofertado + especialidade que ele executa.

Os campos legados `profissionais.cargo` e `profissionais.especialidade` permanecem apenas para compatibilidade de leitura.

Nota da Fase 8.1 do MER de Servicos: `profissional_servicos` deixou de ser o
vinculo operacional ativo. Equipe usa `profissional_servico_especialidades`,
apontando para `servico_tenant_especialidades`.

Nota da Fase 4: `/configuracoes/especialidades` preserva o contexto Cargo ->
Categoria -> Especialidade. A tela de Servicos consulta a compatibilidade
oficial pelo backend, sem assumir que toda especialidade de uma categoria
executa todos os servicos dessa categoria.

Nota da Fase 5/Fase 8.1: Agenda interna e Booking publico resolvem capacidade
por combinacoes do novo MER. Equipe mantem a autorizacao explicita por
`profissional_servico_especialidades`.

Especialidades oficiais possuem `tenant_id` nulo, `is_official = true` e
`is_custom = false`. Especialidades customizadas possuem `tenant_id`, `is_custom
= true` e `taxonomy_category_key` obrigatorio apontando para uma categoria
oficial Bellory.

## Telas de configuracao

Desde 2026-08-05, as telas de cargos e especialidades ficam separadas por
responsabilidade:

| Tela | Responsabilidade | Fonte principal |
| --- | --- | --- |
| `/configuracoes/cargos-especialidades` | Mantem cargos e competencias profissionais por cargo. | `cargos`, `especialidades` |
| `/configuracoes/especialidades` | Exibe visao consolidada das especialidades do tenant, origem, status e vinculos com servicos. | `especialidades`, `tenant_especialidades`, `servico_tenant_especialidades` |
| `/configuracoes/servicos` | Mantem configuracao operacional e comercial de Servico + Especialidade. | `servico_tenants`, `servico_tenant_especialidades` |

`/configuracoes/cargos-especialidades` e a fonte visual de manutencao de cargos,
criacao de especialidades customizadas, edicao de especialidades customizadas e
ativacao/inativacao tenant-scoped da especialidade.

`/configuracoes/especialidades` e uma visao consolidada. Ela nao cria cargos,
nao cria especialidades, nao remove especialidades e nao edita configuracoes
comerciais. Quando mostra servicos vinculados, os dados sao somente leitura e a
acao correta e abrir `/configuracoes/servicos`.

O status "Ativa/Inativa no salao" e tenant-scoped. Ele e persistido em
`tenant_especialidades` e nao altera a especialidade canonica global. Esse
status pode impedir que a especialidade seja usada em novas configuracoes do
tenant, mas nao cria nem ativa `servico_tenant_especialidades` automaticamente.

Exclusoes estruturais devem respeitar dependencias. Cargo com especialidades
associadas nao deve ser excluido em cascata. Especialidade customizada com
vinculos profissionais, compatibilidades globais ou configuracoes de servico do
tenant deve ser bloqueada com mensagem funcional. Historico, agenda e snapshots
nao devem ser alterados por essas manutencoes.

## Regras

- Profissional possui um cargo.
- Profissional pode possuir varias especialidades.
- Cargo e especialidades descrevem o perfil profissional, mas nao autorizam
  servicos automaticamente.
- Um profissional executa operacionalmente as combinacoes de servico e
  especialidade para as quais sua especialidade ativa esta vinculada ao novo
  MER.
- Agenda interna, disponibilidade e agendamento publico devem consultar
  `profissional_especialidades` + `servico_tenant_especialidades`, sem inferir
  capacidade pelo cargo.
- A manutencao da equipe pode selecionar qualquer servico ativo do mesmo tenant.
- Especialidade sempre pertence a um cargo.
- Especialidade sempre pertence a uma categoria oficial.
- Especialidade selecionada deve pertencer ao cargo do profissional.
- Especialidade customizada deve pertencer ao tenant e a um cargo operacional.
- Especialidade oficial pode ser ativada/inativada por tenant, mas nao editada
  ou removida pelo salao.
- Frontend nao permite digitacao livre para cargo ou especialidade.

## Endpoints

```http
GET /cargos
GET /cargos/:id/especialidades
GET /especialidades
POST /especialidades
GET /profissionais
POST /profissionais
PUT /profissionais/:id
```

`/team` segue disponivel como alias interno do modulo de equipe.

## Payloads

Criar profissional:

```json
{
  "nome_publico": "Ana Silva",
  "cargo_id": "uuid-do-cargo",
  "especialidade_ids": ["uuid-especialidade-1", "uuid-especialidade-2"],
  "servico_ids": ["uuid-servico-1", "uuid-servico-2"],
  "percentual_comissao": 40,
  "aceita_agendamento_online": true
}
```

Criar especialidade:

```json
{
  "cargo_id": "uuid-do-cargo",
  "nome": "Colorimetria",
  "taxonomy_category_key": "cabelo",
  "descricao": "Coloracao, tonalizacao e correcao de cor."
}
```

## Cuidados

- Aplicar a migration `20260526090000_team_roles_specialties.sql` antes de validar o fluxo em ambiente integrado.
- Aplicar a migration `20260608100000_controlled_taxonomy_extensibility.sql`
  para habilitar especialidades customizadas por tenant.
- Aplicar a migration
  `20260612160000_decouple_professional_services_from_cargo.sql` para
  preencher os vinculos existentes e remover a validacao de servico por cargo.
- Manter queries de equipe tenant-aware.
- Nao usar cargo ou especialidade como fallback de autorizacao na agenda.
- Nao recriar option sets no frontend; a fonte de verdade e o banco relacional.

## Atualizacao 2026-07-29 - Fase 8.3

O MER legado de servicos foi removido fisicamente do schema `public`. Equipe e
Especialidades devem usar exclusivamente `profissional_especialidades`,
`servico_tenant_especialidades` e `profissional_servico_especialidades` para
validar a capacidade operacional de um profissional.

`profissional_servicos` nao existe mais como tabela operacional. Qualquer nova
manutencao de profissional x servico deve gravar a combinacao final em
`profissional_servico_especialidades`.
