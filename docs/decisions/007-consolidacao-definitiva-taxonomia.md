# 007 - Consolidacao Definitiva da Taxonomia Bellory

## Status

Aceita.

## Contexto

A auditoria da taxonomia identificou convivencia entre a taxonomia oficial e
categorias operacionais legadas como `manicure`, `pedicure`, `massagem`,
`tratamento`, `sobrancelha` e `tintura_coloracao`.

Essa convivencia gerava risco de filtros inconsistentes entre servicos,
especialidades, equipe, onboarding e agenda.

## Decisao

A taxonomia oficial Bellory passa a ser a fonte principal de verdade para:

- categorias;
- servicos oficiais;
- especialidades tecnicas;
- cargos operacionais;
- cargos administrativos;
- compatibilidade base entre servico e especialidade.

`servicos.categoria` deve armazenar somente chaves oficiais da taxonomia.
Aliases legados podem existir apenas na borda de entrada para normalizar dados
antigos.

Foram materializadas tabelas globais de catalogo:

- `taxonomia_categorias`;
- `taxonomia_servicos`;
- `taxonomia_especialidades`;
- `taxonomia_servico_especialidades`.

## Consequencias

- Onboarding cria servicos com categorias oficiais.
- Frontend exibe apenas categorias oficiais.
- Backend valida categorias contra a taxonomia oficial.
- Equipe e agenda passam a depender de vinculos oficiais e de
  `servico_especialidades`.
- Cargos e especialidades administrativas nao devem ser tratados como
  especialidades executoras.
- Registros legados sao normalizados ou desativados por migration, sem delecao
  fisica abrupta.
