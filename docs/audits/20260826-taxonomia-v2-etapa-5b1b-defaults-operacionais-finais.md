# Taxonomia V2 - Etapa 5B.1B

# Fechamento dos Defaults Operacionais

Etapa somente de auditoria e especificacao. Nao houve alteracao de banco, codigo, migration, tenants, reconcile, commit ou push.

## 1. Lista dos 11 Servicos

Estado persistido consultado no banco remoto nesta etapa:

| Tipo de Negocio | Perfil Operacional | Servico | Especialidade principal quando aplicavel | Defaults ativos |
|---|---|---|---|---:|
| Body Piercing | Perfil operacional - Body Piercing | Body piercing | Perfuracao corporal | 0 |
| Bronzeamento | Perfil operacional - Bronzeamento | Bronzeamento artificial | Bronzeamento artificial | 0 |
| Bronzeamento | Perfil operacional - Bronzeamento | Bronzeamento a jato | Bronzeamento a jato | 0 |
| Estetica Facial | Perfil operacional - Estetica Facial | Limpeza de pele | Limpeza de Pele | 0 |
| Estetica Facial | Perfil operacional - Estetica Facial | Hidratacao facial | Estetica Facial | 0 |
| Fisioterapia | Perfil operacional - Fisioterapia | Avaliacao fisioterapeutica | Avaliacao fisioterapeutica | 0 |
| Fisioterapia | Perfil operacional - Fisioterapia | Sessao de fisioterapia | Fisioterapia | 0 |
| Pilates | Perfil operacional - Pilates | Aula de Pilates | Pilates | 0 |
| Tatuagem | Perfil operacional - Tatuagem | Tatuagem | Tatuagem | 0 |
| Terapias Integrativas | Perfil operacional - Terapias Integrativas | Reiki | Reiki | 0 |
| Terapias Integrativas | Perfil operacional - Terapias Integrativas | Reflexologia | Reflexologia | 0 |

Observacao: o TXT cita 12 no historico, mas o estado persistido contem 11 servicos recomendados para a Etapa 5A. Nenhum 12o item foi presumido.

## 2. Tabela Final

Regiao inicial preferencial: `country = BR`, `state = SP`, `region_scope = state`.

Os valores abaixo sao **precos administrativos de referencia** para onboarding. Nao representam pesquisa estatistica nem preco de mercado.

| Tipo de Negocio | Servico | Regiao | Preco sugerido | Duracao | Retorno | Online | Justificativa |
|---|---|---|---:|---:|---:|---:|---|
| Body Piercing | Body piercing | BR / SP | R$ 120 | 45 | 90 | false | Procedimento exige triagem, orientacoes, restricoes e confirmacao antes de expor agenda publica. |
| Bronzeamento | Bronzeamento artificial | BR / SP | R$ 120 | 45 | 15 | true | Atendimento padronizavel, recorrente e adequado a agenda publica com orientacoes simples. |
| Bronzeamento | Bronzeamento a jato | BR / SP | R$ 150 | 45 | 15 | true | Atendimento padronizavel, recorrente e com duracao operacional previsivel. |
| Estetica Facial | Limpeza de pele | BR / SP | R$ 180 | 60 | 30 | true | Procedimento recorrente, comum no agendamento publico e com tempo operacional estavel. |
| Estetica Facial | Hidratacao facial | BR / SP | R$ 140 | 60 | 30 | true | Servico recorrente e simples de agendar diretamente. |
| Fisioterapia | Avaliacao fisioterapeutica | BR / SP | R$ 180 | 60 | null | true | Primeiro atendimento avaliativo pode ser solicitado pelo cliente; retorno depende do plano definido. |
| Fisioterapia | Sessao de fisioterapia | BR / SP | R$ 160 | 60 | 7 | false | Sessao deve depender de avaliacao/plano terapeutico anterior antes de aparecer no booking publico. |
| Pilates | Aula de Pilates | BR / SP | R$ 90 | 60 | 7 | true | Aula recorrente, geralmente semanal, com duracao padrao simples. |
| Tatuagem | Tatuagem | BR / SP | R$ 300 | 120 | null | false | Depende de briefing, desenho, area corporal, tempo variavel e aprovacao previa. |
| Terapias Integrativas | Reiki | BR / SP | R$ 120 | 60 | 15 | true | Sessao recorrente com duracao padronizavel e agendamento direto usual. |
| Terapias Integrativas | Reflexologia | BR / SP | R$ 120 | 45 | 15 | true | Sessao recorrente curta/media, adequada a agenda publica. |

## 3. Faixa Opcional

A estrutura suporta `preco_min_referencia`, `preco_referencia` e `preco_max_referencia`. O onboarding deve usar apenas `preco_referencia`.

| Servico | Minimo | Recomendado | Maximo |
|---|---:|---:|---:|
| Body piercing | R$ 80 | R$ 120 | R$ 180 |
| Bronzeamento artificial | R$ 80 | R$ 120 | R$ 160 |
| Bronzeamento a jato | R$ 100 | R$ 150 | R$ 220 |
| Limpeza de pele | R$ 120 | R$ 180 | R$ 250 |
| Hidratacao facial | R$ 90 | R$ 140 | R$ 200 |
| Avaliacao fisioterapeutica | R$ 120 | R$ 180 | R$ 250 |
| Sessao de fisioterapia | R$ 100 | R$ 160 | R$ 220 |
| Aula de Pilates | R$ 60 | R$ 90 | R$ 140 |
| Tatuagem | R$ 150 | R$ 300 | R$ 600 |
| Reiki | R$ 80 | R$ 120 | R$ 180 |
| Reflexologia | R$ 80 | R$ 120 | R$ 180 |

## 4. Defaults Nacionais e Globais Recomendados

Recomendacao para a proxima implementacao:

| Escopo | Recomendacao |
|---|---|
| `state` BR/SP | Criar a primeira carga aprovada com os valores desta proposta. |
| `country` BR | Criar apenas se o Product Owner aprovar um fallback nacional diferente ou equivalente para estados sem referencia propria. |
| `global` | Evitar nesta primeira carga; usar somente se houver necessidade de fallback para tenants sem pais/estado confiavel. |
| `city` | Nao criar agora, salvo necessidade comprovada posterior. |

O fallback esperado permanece: `city -> state -> country -> global`.

## 5. Casos com Online = False

| Servico | Motivo | Onboarding | Booking publico |
|---|---|---|---|
| Body piercing | Requer triagem, orientacao e confirmacao previa. | Pode ser criado no tenant com configuracao inicial inativa para booking publico. | Nao deve aparecer enquanto `aceita_agendamento_online = false`. |
| Sessao de fisioterapia | Depende de avaliacao ou plano terapeutico anterior. | Pode ser criado para configuracao interna inicial. | Nao deve aparecer enquanto `aceita_agendamento_online = false`. |
| Tatuagem | Requer briefing, desenho, orcamento e duracao variavel. | Pode ser criado como servico configuravel pelo proprietario. | Nao deve aparecer enquanto `aceita_agendamento_online = false`. |

## 6. Regra do Tenant

Default global/regional e usado somente na inicializacao.

Depois da materializacao:

- `tenant_customized` prevalece;
- alteracao futura do default nao sobrescreve tenant ja personalizado;
- proprietario pode alterar servico, especialidade, preco, duracao, retorno e online.

## 7. Gaps da UI MasterAdmin

O backend e a tabela suportam `country`, `state`, `city`, faixa de preco e `aceita_agendamento_online`.

Na tela MasterAdmin atual, os ajustes necessarios para a proxima implementacao sao:

1. Incluir seletor de `region_scope` com opcoes `global`, `country`, `state`, `city`.
2. Exibir campos condicionais `country`, `state` e `city` conforme o escopo.
3. Permitir configurar explicitamente `aceita_agendamento_online` como `true` ou `false`.
4. Permitir informar `preco_min_referencia`, `preco_referencia` e `preco_max_referencia`.
5. Manter o onboarding usando apenas `preco_referencia`.
6. Exibir defaults por perfil sem limitar a leitura operacional aos 6 primeiros quando houver mais registros.
7. Validar no frontend a mesma compatibilidade ja validada pelo backend: servico permitido no perfil e especialidade compativel com o servico.

## 8. Campos que Exigem Decisao do Product Owner

| Campo | Decisao pendente |
|---|---|
| `preco_min_referencia` | Aprovar ou ajustar faixa minima administrativa BR/SP. |
| `preco_referencia` | Aprovar valor recomendado usado no onboarding. |
| `preco_max_referencia` | Aprovar ou ajustar faixa maxima administrativa BR/SP. |
| fallback `country = BR` | Decidir se ja deve existir fallback nacional na primeira carga. |
| fallback `global` | Decidir se sera criado agora ou somente quando houver necessidade operacional. |

Duracao, retorno e online ficam definidos nesta proposta para aprovacao final, mas ainda nao implementados.

TAXONOMIA V2 - DEFAULTS OPERACIONAIS DOS 11 SERVICOS DEFINIDOS PARA APROVACAO FINAL
