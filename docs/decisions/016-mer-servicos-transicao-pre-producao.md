# 016 - MER de Servicos antes da entrada em producao

Status: proposta de refatoracao controlada, sem execucao destrutiva.

## Registro de saneamento pre-Fase 3

Em 2026-07-29, a Fase 2.6 saneou os bloqueadores da reconciliacao:

- o historico remoto das migrations da Fase 1 e da Fase 2 foi reparado com
  `supabase migration repair --linked --status applied 20260728100000 20260728110000`,
  sem reexecutar o SQL das migrations;
- as migrations antigas do MER
  `20260726120000_service_return_frequency.sql`,
  `20260727100000_expand_service_specialty_taxonomy_for_inactive_recovery.sql`
  e `20260727110000_service_specialty_operational_pricing.sql` foram retiradas
  da fila local por estarem parcial ou totalmente absorvidas/conflitantes com
  o novo MER;
- o servico legado `Sombrancelhas` do tenant `Espaco Vivian Beauty` foi
  decomposto no novo MER em ofertas canonicas de `BROW_DESIGN`,
  `BROW_LAMINATION` e `BROW_MICROPIGMENTATION`, preservando preco, duracao,
  online e status quando confiaveis.

A Fase 3 fica liberada para adaptacao dos consumidores ao novo MER. A remocao
do legado continua proibida ate validacao das fases posteriores e aprovacao
explicita.

## Premissa

Os dados operacionais atuais ligados a servicos, vinculos de servico, agenda,
historico, campanhas e cupons sao predominantemente massa de desenvolvimento e
teste. Eles podem ser recriados depois que o MER definitivo estiver pronto.

Mesmo assim, nenhuma limpeza destrutiva deve ser executada sem aprovacao
explicita e sem plano de execucao revisado.

## Modelo atual

```text
tenants
  1:N servicos

servicos
  N:N especialidades via servico_especialidades
  N:N profissionais via profissional_servicos

especialidades
  N:N profissionais via profissional_especialidades

agendamentos / agendamento_servicos / historico / campanhas / cupons
  referenciam o servico tenant-scoped atual
```

Problema principal: `servicos` mistura conceito global, oferta por tenant,
preco, duracao, retorno e status operacional.

Exemplos reais em ambiente remoto:

| Servico conceitual | Registros | Tenants | Evidencia |
| --- | ---: | ---: | --- |
| Corte de Cabelo | 5 | 5 | Precos diferentes: 0, 60, 70, 80 |
| Escova | 5 | 5 | Precos diferentes: 0, 50, 60 |
| Hidratacao | 5 | 5 | Duracoes diferentes: 30 e 60 |
| Manicure | 6 | 6 | Precos diferentes: 50 e 60 |
| Maquiagem | 2 | 2 | Duracoes diferentes: 30 e 45 |

## Contagem atual para classificacao

Consulta somente leitura realizada no Supabase remoto em 2026-07-28.

| Tabela | Registros | Classificacao inicial | Estrategia |
| --- | ---: | --- | --- |
| tenants | 7 | Preservar | Dados estruturais do SaaS |
| usuarios | 14 | Preservar | Identidade/autenticacao/RBAC |
| cargos | 47 | Preservar | Catalogo operacional valido |
| especialidades | 75 | Preservar/revisar | Reutilizar catalogo valido, sem apagar categoria sem classificacao |
| tenant_especialidades | 0 | Recriar se necessario | Sem massa atual |
| servicos | 33 | Recriar/consolidar | Hoje mistura tenant e catalogo |
| servico_especialidades | 138 | Recriar | Hoje mistura compatibilidade e configuracao por tenant |
| profissionais | 13 | Preservar com revisao | Reapontar vinculos para novo modelo |
| profissional_especialidades | 88 | Preservar/revalidar | Relacao ainda conceitualmente valida |
| profissional_servicos | 44 | Recriar/revalidar | Deve apontar combinacoes validas do novo MER |
| agendamentos | 108 | Recriar em massa de teste | Dados operacionais de teste |
| agendamento_servicos | 108 | Recriar em massa de teste | Dependem do MER antigo |
| cliente_historico_atendimentos | 79 | Recriar em massa de teste | Historico operacional de teste |
| campanhas | 2 | Recriar se teste | Adaptar para novo MER |
| campanha_envios | 0 | Recriar se necessario | Sem massa atual |
| cupons | 6 | Recriar se teste | Reapontar para escopos novos |
| cupom_servicos | 2 | Recriar | Depende de `servicos` antigo |
| cupom_especialidades | 0 | Recriar | Sem massa atual |
| mensagens_whatsapp | 148 | Preservar templates/logs ou limpar por seed | Separar logs reais de massa de teste |
| templates_mensagem | 43 | Preservar | Catalogo estrutural de mensagens |

## Modelo alvo

```text
servicos_catalogo
  id
  codigo_canonico
  nome
  categoria_id ou categoria_key
  descricao
  ativo
  metadata
  created_at
  updated_at

servico_tenants
  id
  tenant_id
  servico_catalogo_id
  ativo
  created_at
  updated_at
  unique (tenant_id, servico_catalogo_id)

servico_especialidades
  id
  servico_catalogo_id
  especialidade_id
  ativo
  created_at
  updated_at
  unique (servico_catalogo_id, especialidade_id)

servico_tenant_especialidades
  id
  servico_tenant_id
  especialidade_id
  preco
  duracao_minutos
  dias_retorno_recomendado
  aceita_agendamento_online
  ativo
  created_at
  updated_at
  unique (servico_tenant_id, especialidade_id)
```

## Fonte oficial por conceito

| Conceito | Fonte oficial |
| --- | --- |
| Conceito global do servico | `servicos_catalogo` |
| Tenant oferece servico | `servico_tenants` |
| Compatibilidade tecnica Servico x Especialidade | `servico_especialidades` |
| Preco | `servico_tenant_especialidades.preco` |
| Duracao | `servico_tenant_especialidades.duracao_minutos` |
| Retorno recomendado | `servico_tenant_especialidades.dias_retorno_recomendado` |
| Online por combinacao | `servico_tenant_especialidades.aceita_agendamento_online` |
| Especialidade | `especialidades` |
| Cargo | `cargos` |

Depois da refatoracao, `servicos.preco`, `servicos.duracao_minutos` e campos
equivalentes nao podem permanecer como fonte definitiva.

## Catalogo inicial

O catalogo deve usar codigos canonicos estaveis, independentes do nome exibido.

Exemplos:

| Codigo canonico | Nome sugerido | Categoria |
| --- | --- | --- |
| HAIR_CUT | Corte de cabelo | Cabelo |
| HAIR_BRUSH | Escova | Cabelo |
| HAIR_COLOR | Coloracao | Cabelo |
| MANICURE | Manicure | Unhas |
| PEDICURE | Pedicure | Unhas |
| EYEBROW_DESIGN | Design de sobrancelhas | Sobrancelhas |
| EYEBROW_HENNA | Henna | Sobrancelhas |
| EYEBROW_BROW_LAMINATION | Brow Lamination | Sobrancelhas |
| EYEBROW_MICROPIGMENTATION | Micropigmentacao | Sobrancelhas |
| LASH_EXTENSION | Extensao de cilios | Cilios |
| MAKEUP | Maquiagem | Maquiagem |
| WAXING | Depilacao | Depilacao |
| FACIAL_CLEANING | Limpeza de pele | Estetica Facial |
| BODY_MASSAGE | Massagem | Estetica Corporal ou Massoterapia |

Nao criar regra de negocio baseada em comparacao textual de `nome`.

## Tabelas afetadas

### Criadas

- `servicos_catalogo`
- `servico_tenants`
- `servico_tenant_especialidades`

### Alteradas ou reclassificadas

- `servico_especialidades`: deve deixar de ser tenant-scoped e comercial.
- `profissional_servicos`: deve ser revisada para garantir execucao de
  combinacoes validas. A decisao pendente e se aponta para `servico_tenants`
  ou para `servico_tenant_especialidades`.
- `agendamento_servicos`: deve preservar snapshot de servico/especialidade,
  preco, duracao e origem.
- `cliente_historico_atendimentos`: deve preservar snapshot operacional.
- `campanhas`: referencias a servico devem migrar para catalogo/oferta conforme
  o tipo de campanha.
- `cupons`, `cupom_servicos`, `cupom_especialidades`: devem apontar para escopos
  coerentes do novo MER.

### Descontinuadas ou limpas posteriormente

- Colunas comerciais em `servicos` como fonte oficial: `preco`,
  `duracao_minutos`, `dias_retorno_recomendado`, `permite_online`.
- `tenant_id` em `servico_especialidades`, se a tabela for mantida com o mesmo
  nome para compatibilidade tecnica global.
- Vinculos antigos de teste em `servico_especialidades`,
  `profissional_servicos`, agenda, historico, campanhas e cupons.

## Ordem proposta de execucao

1. Aprovar este plano e escopo destrutivo.
2. Criar novas tabelas sem remover estruturas antigas.
3. Semear `servicos_catalogo` com codigos canonicos.
4. Criar `servico_tenants` a partir dos servicos tenant-scoped atuais.
5. Criar `servico_especialidades` conceitual por catalogo e especialidade.
6. Criar `servico_tenant_especialidades` com preco/duracao/retorno atuais.
7. Adaptar backend de Servicos para ler/escrever no novo MER.
8. Adaptar frontend de Configuracoes > Servicos.
9. Adaptar Profissionais para validar combinacoes Servico + Especialidade.
10. Adaptar Agenda para resolver:
    `tenant -> servico_tenant -> especialidade -> profissional -> preco/duracao`.
11. Adaptar Historico para snapshot novo.
12. Adaptar Campanhas, especialmente recuperacao de inativos.
13. Adaptar Cupons para servico, especialidade e combinacao.
14. Atualizar scripts `campaign-test:audit|seed|validate|cleanup`.
15. Recriar massa de teste.
16. Rodar testes obrigatorios.
17. Somente depois, remover dependencias do MER antigo.
18. Executar limpeza destrutiva aprovada, com backup/rollback.

## Dados que podem ser descartados depois da aprovacao

- `servicos` tenant-scoped antigos, apos consolidacao em `servicos_catalogo` e
  `servico_tenants`.
- `servico_especialidades` atuais de teste, apos recriar compatibilidade global
  e configuracao por tenant.
- `profissional_servicos` atuais, se incompativeis com o novo MER.
- `agendamentos`, `agendamento_servicos` e `cliente_historico_atendimentos` de
  teste.
- `campanhas`, `campanha_envios`, `cupons`, `cupom_servicos`,
  `cupom_especialidades` de teste.
- Massa de campanhas criada pelos scripts de seed.

## Dados que devem ser preservados

- `tenants`
- `usuarios`
- autenticacao/RBAC/memberships
- `cargos`
- `especialidades` validas
- taxonomia oficial
- templates de mensagens
- configuracoes de provider
- planos/assinaturas
- configuracoes gerais do tenant

## Testes obrigatorios antes da remocao do legado

- Cadastro de servico no catalogo.
- Associacao de servico ao tenant.
- Associacao a especialidades.
- Preco por especialidade.
- Duracao por especialidade.
- Dias de retorno por combinacao.
- Profissional compativel com Servico + Especialidade.
- Geracao de slots.
- Criacao de agendamento.
- Snapshot no historico.
- Campanha de recuperacao de clientes inativos.
- Cupons por servico, especialidade e combinacao.
- Isolamento multi-tenant.
- Alteracao de preco sem alterar historicos passados.
- Mesmo servico em dois tenants com precos diferentes.
- Scripts `campaign-test:audit`, `campaign-test:seed`,
  `campaign-test:validate`, `campaign-test:cleanup`.

## Criterio para remover legado

O legado so pode ser removido quando:

- nenhum endpoint ativo depender do MER antigo;
- nenhum componente frontend depender do MER antigo;
- Agenda estiver validada;
- Historico estiver validado;
- Campanhas estiverem validadas;
- Cupons estiverem validados;
- scripts de teste usarem exclusivamente o novo MER;
- testes automatizados e validacao manual tiverem sido concluidos;
- houver aprovacao explicita para limpeza destrutiva.

## Riscos

- `servicos` atuais sao referenciados por agenda, historico, campanhas e cupons.
- `servico_especialidades` ja foi usado como fonte transicional de preco e
  duracao; isso precisa migrar para `servico_tenant_especialidades`.
- `profissional_servicos` pode precisar mudar de granularidade.
- Scripts de campanha ainda criam dados em tabelas antigas.
- Remocao prematura quebra public booking, agenda e campanhas.

## Decisao pendente

Antes da primeira migration destrutiva, decidir se:

1. `servicos` sera renomeada para `servicos_catalogo`, ou
2. `servicos_catalogo` sera criada como nova tabela e `servicos` sera
   descontinuada depois.

Recomendacao: criar `servicos_catalogo` como nova tabela na transicao, validar
os modulos e so depois decidir se `servicos` sera removida/renomeada.

## Encerramento em 2026-07-29

A transicao pre-producao do MER de Servicos foi concluida pela Fase 8.3. As
tabelas legadas `servicos`, `servico_especialidades` e
`profissional_servicos` foram removidas fisicamente do schema `public` apos
backup remoto validado e migration destrutiva especifica.

Arquitetura operacional oficial:

- `servicos_catalogo`;
- `servico_tenants`;
- `servico_catalogo_especialidades`;
- `servico_tenant_especialidades`;
- `profissional_servico_especialidades`.

As secoes anteriores desta ADR permanecem como historico da transicao. A
decisao pendente foi encerrada: `servicos_catalogo` foi mantida como tabela
oficial nova, e `servicos` foi descontinuada/removida.
