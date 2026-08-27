# Taxonomia V2 - Etapa 5B.1

# Proposta dos Defaults Operacionais

Etapa somente de auditoria e especificacao. Nao houve alteracao de banco, codigo, migration, tenants, reconcile, commit ou push.

## A. Servicos Encontrados

Auditoria remota dos Perfis Operacionais implementados na Etapa 5A:

| Tipo de Negocio | Servicos recomendados encontrados |
| --- | ---: |
| Body Piercing | 1 |
| Bronzeamento | 2 |
| Estetica Facial | 2 |
| Fisioterapia | 2 |
| Pilates | 1 |
| Tatuagem | 1 |
| Terapias Integrativas | 2 |
| Outro | 0 |

Total persistido para o conjunto da Etapa 5A: **11 servicos recomendados**.

O TXT cita 12 servicos no resumo, mas a lista detalhada da secao 11 possui 11 itens e determina que servicos compativeis nao sejam promovidos automaticamente. O banco remoto confirma 11 recomendados para os tipos da Etapa 5A. Portanto, o 12o item nao esta persistido e nao deve ser presumido nesta etapa.

## B. Defaults Existentes

Para os 11 servicos recomendados encontrados, a auditoria remota retornou:

| Tipo de Negocio | Servico | Default existente | Classificacao |
| --- | --- | --- | --- |
| Body Piercing | Body piercing | nenhum | AUSENTE |
| Bronzeamento | Bronzeamento artificial | nenhum | AUSENTE |
| Bronzeamento | Bronzeamento a jato | nenhum | AUSENTE |
| Estetica Facial | Limpeza de pele | nenhum | AUSENTE |
| Estetica Facial | Hidratacao facial | nenhum | AUSENTE |
| Fisioterapia | Avaliacao fisioterapeutica | nenhum | AUSENTE |
| Fisioterapia | Sessao de fisioterapia | nenhum | AUSENTE |
| Pilates | Aula de Pilates | nenhum | AUSENTE |
| Tatuagem | Tatuagem | nenhum | AUSENTE |
| Terapias Integrativas | Reiki | nenhum | AUSENTE |
| Terapias Integrativas | Reflexologia | nenhum | AUSENTE |

## C. Defaults Ausentes

Todos os 11 servicos recomendados da Etapa 5A estao sem default ativo em `perfil_operacional_defaults`.

O banco possui 139 defaults ativos anteriores, todos com `region_scope = global`, mas nenhum deles corresponde aos 11 servicos recomendados acima.

## D. Significado dos Defaults

| Campo | Significado |
| --- | --- |
| Preco | Valor inicial sugerido ao novo tenant. Nao e regra permanente. |
| Duracao | Duracao inicial sugerida para agendamento. |
| Retorno | Intervalo recomendado em dias quando houver recorrencia funcional. |
| Online | Indica se o servico nasce disponivel para agendamento publico. |

Depois da materializacao no tenant, `tenant_customized` prevalece. Uma futura alteracao global/regional nao deve sobrescrever tenants ja personalizados.

## E. Arquitetura Regional Existente

A tabela `perfil_operacional_defaults` ja suporta regionalizacao por:

| Escopo | Campos exigidos |
| --- | --- |
| global | sem `country`, `state`, `city` |
| country | `country` |
| state | `country`, `state` |
| city | `country`, `state`, `city` |

Precedencia real implementada em `resolveDefaultForCombination`:

1. city
2. state
3. country
4. global

Quando existe default especifico por especialidade, ele recebe prioridade adicional sobre o default geral do mesmo servico.

Estado atual dos defaults ativos: todos `global`. Nao ha default ativo regional por pais, estado ou cidade.

## F. Brasil / Sao Paulo

A estrutura comporta uma proposta inicial regional para:

| Pais | Estado | Escopo tecnico recomendado |
| --- | --- | --- |
| BR | SP | `region_scope = state`, `country = BR`, `state = SP` |

Sao Paulo nao deve virar regra global. O fallback deve continuar permitindo `city -> state -> country -> global`.

## G. Proposta Final

Preco nao deve ser inventado sem evidencia confiavel. Portanto, para esta etapa, todos os precos abaixo ficam como **PRECO REQUER APROVACAO DO PRODUCT OWNER**.

| Tipo de Negocio | Servico | Regiao | Preco | Duracao | Retorno | Online | Fonte/Justificativa |
|---|---|---|---:|---:|---:|---|---|
| Body Piercing | Body piercing | BR/SP proposto | PO | 45 | 90 | false | Procedimento requer verificacao, termo/orientacao e avaliacao de elegibilidade antes do agendamento publico direto. |
| Bronzeamento | Bronzeamento artificial | BR/SP proposto | PO | 45 | 15 | true | Servico recorrente, padronizavel e com duracao operacional curta/media. |
| Bronzeamento | Bronzeamento a jato | BR/SP proposto | PO | 45 | 15 | true | Servico recorrente, geralmente agendavel diretamente com orientacoes previas simples. |
| Estetica Facial | Limpeza de pele | BR/SP proposto | PO | 60 | 30 | true | Servico recorrente e comum em agenda publica. |
| Estetica Facial | Hidratacao facial | BR/SP proposto | PO | 60 | 30 | true | Servico recorrente e agendavel diretamente, com baixa necessidade de triagem previa. |
| Fisioterapia | Avaliacao fisioterapeutica | BR/SP proposto | PO | 60 | null | true | Primeiro atendimento avaliativo; pode ser agendado online, mas nao possui retorno periodico previsivel. |
| Fisioterapia | Sessao de fisioterapia | BR/SP proposto | PO | 60 | 7 | false | Sessao deve depender de avaliacao/plano terapeutico anterior, por isso nao deve nascer como agendamento publico direto. |
| Pilates | Aula de Pilates | BR/SP proposto | PO | 60 | 7 | true | Aula recorrente com periodicidade semanal comum. |
| Tatuagem | Tatuagem | BR/SP proposto | PO | 120 | null | false | Depende de briefing, orcamento, desenho, area corporal e tempo variavel. |
| Terapias Integrativas | Reiki | BR/SP proposto | PO | 60 | 15 | true | Sessao recorrente, com duracao padronizavel e agendamento direto usual. |
| Terapias Integrativas | Reflexologia | BR/SP proposto | PO | 45 | 15 | true | Sessao recorrente, com duracao curta/media e agendamento direto usual. |

## H. Campos que Dependem do Product Owner

| Campo | Situacao |
| --- | --- |
| preco_min_referencia | Requer politica comercial/regional aprovada. |
| preco_referencia | Requer aprovacao do Product Owner. |
| preco_max_referencia | Requer politica comercial/regional aprovada. |

Duracao, retorno e online possuem proposta funcional inicial acima, mas ainda devem ser aprovados antes da implementacao da Etapa 5B.

## I. Gaps de Governanca MasterAdmin

Backend/API:

- Permite criar/atualizar default com preco minimo, preco referencia, preco maximo, duracao, retorno, online, fonte e regiao.
- Valida compatibilidade do servico com o perfil e da especialidade com o servico.
- Registra metadata de governanca e politica de nao propagacao automatica para tenants existentes.

Frontend MasterAdmin atual:

- Permite criar referencia de default apenas como `global`.
- Permite informar preco, duracao e retorno.
- Forca `aceita_agendamento_online: true` no cadastro via tela.
- Nao expõe campos de `country`, `state`, `city`.
- Nao expõe preco minimo/maximo.
- Nao expõe controle de online true/false para default.
- A listagem exibe ate 6 defaults por perfil.

GAP DE GOVERNANCA:

- A manutencao regional completa existe na estrutura/backend, mas nao esta completa na tela MasterAdmin.
- A decisao `online = false` para Body piercing, Sessao de fisioterapia e Tatuagem nao pode ser mantida corretamente pela tela atual sem ajuste futuro.

## J. Comportamento Esperado do Onboarding

Fluxo esperado para novo tenant:

1. Tenant informa tipo de negocio principal.
2. Sistema resolve Perfil Operacional pelo tipo principal.
3. Perfil seleciona servicos recomendados/obrigatorios.
4. Sistema resolve especialidades compativeis pela matriz Servico x Especialidade.
5. Sistema resolve cargos recomendados pela matriz Cargo x Especialidade.
6. Sistema resolve default pela localizacao do tenant com precedencia `city -> state -> country -> global`.
7. Configuracao inicial e materializada em `servico_tenants` e `servico_tenant_especialidades`.
8. Depois da materializacao, o proprietario pode alterar servicos, especialidades, preco, duracao, retorno e online.

Dependencia para Etapa 5B:

- Como os 11 recomendados da Etapa 5A nao possuem defaults, o onboarding V2 pode materializar configuracoes com `preco = null`, `duracao_minutos = null` e `retorno = null` se executado sem defaults aprovados.
- Para agendamento publico, a camada de public booking exige configuracao online ativa, duracao maior que zero e preco preenchido. Portanto, defaults completos sao necessarios para que os novos servicos nascam imediatamente agendaveis online quando `online = true`.

## K. Resultado Final

- Servicos recomendados encontrados na Etapa 5A: 11.
- Defaults existentes para esses servicos: 0.
- Defaults ausentes: 11.
- Arquitetura regional existente: `global`, `country`, `state`, `city`.
- Fallback existente: `city -> state -> country -> global`, com preferencia adicional para especialidade especifica.
- Proposta inicial regional: BR/SP em escopo `state`.
- Precos: requerem aprovacao do Product Owner.
- Duracao/retorno/online: proposta funcional gerada para aprovacao.
- Gaps MasterAdmin: tela nao suporta manutencao regional completa, online false, preco minimo/maximo e edicao completa dos defaults.
- Tenants existentes: nao alterados.
- Banco/codigo/migrations: nao alterados nesta etapa.

TAXONOMIA V2 - ETAPA 5B.1 CONCLUIDA: PROPOSTA DE DEFAULTS OPERACIONAIS GERADA PARA APROVACAO
