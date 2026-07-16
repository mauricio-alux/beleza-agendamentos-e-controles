# ADR-006 - Taxonomia Oficial Bellory

## Status

Proposto.

## Contexto

O Bellory possui fluxos de onboarding, equipe, servicos, agenda e
configuracoes que dependem de nomes consistentes para categorias, cargos,
servicos, especialidades e vinculos operacionais.

Sem uma taxonomia oficial, o sistema tende a acumular variacoes como cargos
parecidos, servicos nomeados com verbos, categorias redundantes e
especialidades dificeis de associar a servicos. Isso prejudica UX, filtros,
agenda, relatorios e a futura IA operacional.

## Decisao

Adotar uma taxonomia oficial Bellory como referencia de produto e arquitetura.

A taxonomia separa:

- entidades estruturais e globais: categorias, cargos e especialidades;
- entidades operacionais por tenant: servicos, precos, duracao,
  `servico_especialidades`, `tenant_especialidades`, profissionais e escalas.

O catalogo oficial inicial passa a existir como artefato documentado e como
constante de codigo, ainda sem alterar comportamento dos fluxos existentes
nesta primeira fase.

## Racional

O catalogo oficial reduz inconsistencias antes que elas se espalhem por
onboarding, manutencao operacional, agenda e automacoes.

Manter categorias, cargos e especialidades como estruturas globais preserva um
vocabulario comum do SaaS. Manter servicos e vinculos por tenant preserva a
liberdade operacional de cada salao.

`servico_especialidades` continua sendo a fonte operacional para compatibilidade
entre servico e especialidade, evitando depender apenas de inferencia textual.

## Impactos Esperados

### Curto prazo

- Documentacao oficial da taxonomia.
- Catalogo reutilizavel no backend e frontend.
- Nenhuma mudanca funcional obrigatoria nos fluxos existentes.

### Proximas fases

- Atualizar seed do onboarding para usar nomenclatura oficial.
- Criar migration de normalizacao para dados antigos.
- Adicionar validacoes de nomenclatura no backend e frontend.
- Adicionar sugestoes automaticas nas telas operacionais.
- Reduzir fallbacks por compatibilidade textual.

## Trade-offs

- A padronizacao reduz flexibilidade livre, mas melhora consistencia do SaaS.
- Normalizar dados antigos exige cuidado para nao alterar historico operacional
  sem rastreabilidade.
- A manutencao de catalogo global precisa ter regra administrativa clara, pois
  pode impactar varios tenants.
- A coexistencia temporaria entre taxonomia oficial e nomes legados aumenta a
  complexidade ate a normalizacao ser concluida.

## Regras Arquiteturais

- O onboarding deve criar estrutura inicial usando a taxonomia oficial.
- `servico_especialidades` deve ser priorizado sobre inferencia por nome.
- Dados operacionais devem respeitar `tenant_id`.
- Cargos e especialidades globais nao devem ser alterados por tenant sem
  controle administrativo.
- O tenant pode ativar/inativar o uso operacional de especialidades via
  `tenant_especialidades`.
- Validacoes devem impedir verbos em cargos e nomes principais de servicos.

## Referencias

- `docs/business/taxonomia-bellory.md`
- `docs/decisions/005-onboarding-seed-operacional.md`
- `database/migrations/20260602113000_service_specialties_association.sql`
- `database/migrations/20260602123000_tenant_specialties_operational_status.sql`
