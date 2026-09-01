# Taxonomia SaaS

## Objetivo

Centralizar a manutencao administrativa da taxonomia global do SaaS para
MasterAdmin, separando configuracao oficial da plataforma de configuracoes
operacionais dos estabelecimentos.

## Area administrativa

Frontend:

- `/admin/taxonomia`: dashboard e manutencao da taxonomia SaaS.
- `/admin/catalogo/tipos-negocio`: caminho legado que reutiliza a mesma tela.

Backend:

```http
GET /admin/tipos-negocio
POST /admin/tipos-negocio
PATCH /admin/tipos-negocio/:id
PATCH /admin/tipos-negocio/:id/status
GET /admin/tipos-negocio/:id/servicos
PUT /admin/tipos-negocio/:id/servicos
GET /admin/tipos-negocio-catalogo
POST /admin/tipos-negocio-catalogo
PATCH /admin/tipos-negocio-catalogo/:id
GET /admin/tipos-negocio-catalogo/:id/especialidades
PUT /admin/tipos-negocio-catalogo/:id/especialidades
GET /admin/taxonomia/cargos
POST /admin/taxonomia/cargos
PATCH /admin/taxonomia/cargos/:id
GET /admin/taxonomia/especialidades
POST /admin/taxonomia/especialidades
PATCH /admin/taxonomia/especialidades/:id
```

Todas as rotas passam por `authMiddleware`, `requirePlatformAdmin` e
`platform.business_types.manage`.

## Matriz de entidades

| Entidade | Escopo | Manutencao | Observacao |
| --- | --- | --- | --- |
| `tipos_negocio` | Global SaaS | MasterAdmin | Segmentos/modelos de negocio. |
| `servicos_catalogo` | Global SaaS | MasterAdmin | Conceito canonico do servico. |
| `especialidades` com `tenant_id is null` | Global SaaS | MasterAdmin | Especialidades oficiais. |
| `cargos` | Global SaaS | MasterAdmin | Cargos oficiais usados por equipe. |
| `tipo_negocio_servicos_catalogo` | Global SaaS | MasterAdmin | Matriz Tipo negocio x Servicos aplicaveis. |
| `servico_catalogo_especialidades` | Global SaaS | MasterAdmin | Matriz Servico x Especialidades. |
| `especialidades.cargo_id` | Global SaaS | MasterAdmin | Matriz Cargo x Especialidades no MER atual. |
| `tenant_tipos_negocio` | Estabelecimento | Estabelecimento/Admin SaaS operacional | Selecao dos tipos aplicaveis ao estabelecimento. |
| `servico_tenants` | Estabelecimento | Estabelecimento | Oferta ativa/inativa do catalogo permitido. |
| `servico_tenant_especialidades` | Estabelecimento | Estabelecimento | Preco, duracao e aceite online por combinacao. |

Nao existe tabela `cargo_especialidades` no schema atual. A relacao Cargo x
Especialidades e expressa por `especialidades.cargo_id`; por isso a interface
mostra essa matriz sem criar tabela nova.

## Regras

- MasterAdmin pode criar e editar taxonomia global.
- Servicos de catalogo devem pertencer obrigatoriamente a uma categoria
  oficial ativa da taxonomia Bellory, gravada em `servicos_catalogo.categoria_key`.
  A manutencao administrativa usa dropdown de categorias oficiais e o backend
  aceita somente a chave canonica exata, sem texto livre ou aliases.
- Estabelecimentos consomem a taxonomia global e nao criam referencias
  globais.
- Especialidades oficiais criadas pelo Admin SaaS gravam `tenant_id = null`,
  `is_official = true` e `is_custom = false`.
- Alteracoes no catalogo global devem preservar dados operacionais,
  historico, agenda e configuracoes do estabelecimento.
- O termo exibido na interface e "Estabelecimento"; "tenant" fica restrito ao
  contrato tecnico e ao banco.

## Autoridades da Taxonomia V2

| Conceito | Fonte de verdade |
| --- | --- |
| Catalogo: servico existente | `servicos_catalogo` |
| Tipo de negocio: servico aplicavel | `tipo_negocio_servicos_catalogo` com `ativo = true` |
| Perfil operacional: servico recomendado | `perfil_operacional_servicos` com `ativo = true` e `recomendado = true` |
| Defaults: valores iniciais sugeridos | `perfil_operacional_defaults` |
| Tenant: servico efetivamente oferecido | `servico_tenants` e `servico_tenant_especialidades` |
| Booking: servico agendavel online | `servico_tenant_especialidades.aceita_agendamento_online` e vinculos operacionais ativos |

`tipo_negocio_servicos_catalogo.recomendado` permanece no schema como campo
legado/deprecated para compatibilidade historica. Novos fluxos administrativos
nao devem escrever esse campo, e regras de recomendacao nao devem le-lo como
fonte funcional. A recomendacao inicial pertence ao Perfil Operacional.

## Conclusao

MANUTENCAO ADMINISTRATIVA DA TAXONOMIA IMPLEMENTADA.
