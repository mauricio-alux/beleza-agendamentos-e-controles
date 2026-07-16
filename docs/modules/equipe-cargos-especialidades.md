# Equipe — Cargos e Especialidades

## Objetivo

Padronizar o cadastro de profissionais, removendo texto livre para cargo e especialidade.

## Estrutura

- `cargos`: catalogo global de cargos ativos.
- `especialidades`: catalogo misto com registros oficiais globais e registros
  customizados por tenant.
- `profissionais.cargo_id`: cargo principal do profissional.
- `profissional_especialidades`: relacao entre profissional e multiplas especialidades.
- `profissional_servicos`: relacao explicita entre profissional e os servicos
  que ele executa.

Os campos legados `profissionais.cargo` e `profissionais.especialidade` permanecem apenas para compatibilidade de leitura.

Especialidades oficiais possuem `tenant_id` nulo, `is_official = true` e
`is_custom = false`. Especialidades customizadas possuem `tenant_id`, `is_custom
= true` e `taxonomy_category_key` obrigatorio apontando para uma categoria
oficial Bellory.

## Regras

- Profissional possui um cargo.
- Profissional pode possuir varias especialidades.
- Cargo e especialidades descrevem o perfil profissional, mas nao autorizam
  servicos automaticamente.
- Um profissional executa somente os servicos ativos vinculados em
  `profissional_servicos`.
- Agenda interna, disponibilidade e agendamento publico devem consultar
  `profissional_servicos`, sem inferir capacidade pelo cargo.
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
