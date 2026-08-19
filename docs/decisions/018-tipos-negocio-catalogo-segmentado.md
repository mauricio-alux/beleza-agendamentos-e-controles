# ADR-018 - Tipos de negocio e catalogo orientado por segmento

## Status

Aceita em 2026-07-30.

## Contexto

O novo MER de Servicos ja separa catalogo global, oferta do tenant,
compatibilidade tecnica por especialidade e execucao por profissional. Faltava
um eixo global para orientar o catalogo por segmento/modelo de negocio do
tenant, sem duplicar servicos canonicos e sem criar catalogos por tenant.

## Decisao

Tipos de negocio passam a ser entidades globais em `tipos_negocio`.

O catalogo oficial e segmentado pela relacao N:N
`tipo_negocio_servicos_catalogo`. O tenant se vincula a um ou mais tipos pela
relacao N:N `tenant_tipos_negocio`, com no maximo um principal ativo por tenant.

Tipos de negocio sao segmentacao e recomendacao. Eles nao sao categoria de
servico, cargo, profissao, especialidade, oferta comercial nem substituto de
`servicos_catalogo`.

## Consequencias

- MasterAdmin mantem tipos e associacoes globais no Admin SaaS.
- MasterAdmin tambem e o unico responsavel por `servicos_catalogo` e
  `servico_catalogo_especialidades`.
- Cadastro de novos tenants exige tipo ativo e grava o vinculo principal.
- Tenants podem alterar principal/complementares sem apagar ofertas,
  profissionais, agenda ou historico.
- O tipo principal nao integra a lista de complementares. Complementares sao
  opcionais e podem ser persistidos como lista vazia.
- `/configuracoes/servicos` lista somente servicos permitidos pelos tipos
  ativos do tenant.
- `servico_tenants` e materializado automaticamente para servicos permitidos
  pelos tipos ativos do tenant; `ativo = false` indica disponivel, ainda nao
  oferecido.
- Massas de teste e saneamentos devem auditar `servico_tenants` contra
  `tenant_tipos_negocio` e `tipo_negocio_servicos_catalogo`; o script
  `backend/scripts/audit-tenant-service-catalog-compliance.js` existe para
  essa verificacao.
- Tenant nao pode criar, editar ou reativar servico canonico global.
- Remover tipo do tenant e bloqueado quando ofertas ativas ficariam permitidas
  exclusivamente pelo tipo removido; nesses casos, o tenant deve manter o tipo
  ou desativar explicitamente as ofertas afetadas antes da remocao.
- A sincronizacao de `tenant_tipos_negocio` ocorre por funcao SQL transacional,
  preservando `UNIQUE (tenant_id, tipo_negocio_id)` e o indice de unico
  principal ativo por tenant.

## Atualizacao 2026-08-05

A regra foi expandida pela evolucao `3.1.3.1.4`: `servico_tenants` passa a
materializar todos os servicos disponibilizados ao tenant pelos tipos ativos,
mesmo quando ainda nao ofertados. O campo `ativo` passa a indicar oferta real
do tenant. Registros criados automaticamente pela sincronizacao nascem com
`ativo = false`.

A regra unica fica em
`backend/src/modules/services/tenant-service-catalog-sync.service.js` e e
acionada por alteracoes em tipos do tenant, associacoes Tipo x Servico e status
do catalogo/tipo. Agenda, Booking Publico, Campanhas, CRM e Cupons devem usar
somente servicos ativos, nunca apenas disponibilizados.
