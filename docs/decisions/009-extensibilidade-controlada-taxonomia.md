# 009 - Extensibilidade Controlada da Taxonomia

## Contexto

A taxonomia oficial Bellory permanece como fonte principal de verdade para
categorias, servicos oficiais, especialidades oficiais e compatibilidades base.
Ao mesmo tempo, saloes precisam cadastrar tecnicas e nomenclaturas locais, como
`Trancas`, `Box Braids`, `Dreads`, `Brow Lamination` ou outras variacoes de
mercado.

## Decisao

Permitir servicos e especialidades customizadas por tenant, sem permitir
categorias customizadas.

Regras:

- categorias continuam oficiais e controladas pelo sistema;
- todo servico possui `taxonomy_category_key` oficial;
- todo servico deve ter ao menos uma especialidade vinculada por ID;
- especialidades oficiais sao globais e possuem `tenant_id` nulo;
- especialidades customizadas pertencem ao tenant e possuem
  `taxonomy_category_key` oficial;
- compatibilidade operacional e gravada em `servico_especialidades`;
- cargos administrativos nao podem ser usados como executores de especialidade.

## Consequencias

O backend deixa de depender de fallback textual para permitir cadastro de
servicos customizados. O nome do servico pode ser local, mas a categoria oficial
e as especialidades vinculadas preservam consistencia semantica para agenda,
equipe, analytics e IA futura.

O frontend passa a guiar a criacao:

- escolher categoria oficial;
- informar o servico;
- selecionar especialidade compativel existente; ou
- criar especialidade customizada vinculada a cargo operacional e categoria
  oficial.

## Tabelas Afetadas

- `servicos`: recebe `taxonomy_category_key`, `taxonomy_service_key`,
  `is_official`, `is_custom` e `created_by_tenant`.
- `especialidades`: recebe `tenant_id`, `taxonomy_category_key`,
  `taxonomy_specialty_key`, `is_official`, `is_custom`, `created_by_tenant` e
  `metadata`.
- `servico_especialidades`: permanece como fonte formal de compatibilidade por
  tenant.

## Migration

Implementado por `20260608100000_controlled_taxonomy_extensibility.sql`.
