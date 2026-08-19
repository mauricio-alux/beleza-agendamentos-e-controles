> Nota de reconciliacao 2026-08-15:
> a regra vigente de Campanhas esta nas atualizacoes datadas deste arquivo,
> em `docs/project-context.md`, `docs/roadmap.md` e nas ADRs 014-018.
> Em caso de divergencia com os blocos conceituais antigos abaixo, prevalecem:
> campanha como entidade unica, modo de entrega por capacidade do tenant,
> templates WhatsApp obrigatorios, dry-run em desenvolvimento, exclusao de
> usuarios internos, novo MER de Servicos como fonte oficial, Fase 8.3 com
> legado removido e campanhas sugeridas por IA/regras com aprovacao do tenant.

O `campanhas.md` é um dos módulos mais estratégicos comercialmente no Bellory, porque ele representa:

* crescimento automático do salão
* retenção operacional
* recuperação de clientes
* ativação comercial simplificada
* marketing automatizado via WhatsApp

Esse é um dos maiores diferenciais do Bellory.

A maioria dos pequenos profissionais:

* não sabe fazer marketing
* não cria campanhas
* não possui automação
* depende apenas do boca-a-boca

O Bellory resolve isso criando:

* campanhas simples
* campanhas automatizadas
* campanhas assistidas por IA
* comunicação operacional inteligente

O módulo Campaigns NÃO deve parecer:

* ferramenta complexa de marketing
* gerenciador técnico de anúncios
* automação corporativa pesada

Ele deve parecer:

* assistente de vendas
* marketing automático
* promoção inteligente
* recuperação automática de clientes

O usuário deve sentir:

“O Bellory ajuda meu salão a vender sozinho.”

Abaixo está a especificação consolidada profissional do módulo.

---

# docs/modules/campaigns.md

````md id="camp91x"
# Campaigns Module — Bellory

# 1. Objetivo do Módulo

O módulo Campaigns é responsável por:

- criar campanhas promocionais
- aumentar retenção
- recuperar clientes
- aumentar recorrência
- automatizar relacionamento comercial
- impulsionar faturamento

O objetivo principal é:
transformar comunicação em crescimento operacional.

---

# 2. Papel Estratégico

O módulo Campaigns representa:
- motor comercial do Bellory
- automação marketing operacional
- recuperação clientes
- retenção automatizada
- crescimento assistido

O módulo NÃO deve parecer:
- plataforma complexa anúncios
- gerenciador técnico marketing
- CRM corporativo pesado

Deve parecer:
- assistente comercial inteligente
- ferramenta simples promoções
- automação invisível

---

# 3. Objetivo UX

O usuário deve sentir:

"O Bellory me ajuda a trazer clientes automaticamente."

A experiência deve transmitir:
- simplicidade
- automação
- crescimento
- praticidade
- inteligência

---

# 4. Público-Alvo

O módulo foi projetado para:
- profissionais autônomos
- pequenos salões
- baixa maturidade tecnológica
- operação mobile-first

---

# 5. Conceito Arquitetural

O módulo Campaigns deve funcionar como:

- camada comercial automatizada
- sistema operacional campanhas
- estrutura promoção integrada
- motor relacionamento comercial

O módulo deve:
- integrar CRM
- integrar WhatsApp
- integrar IA
- integrar Agenda
- utilizar segmentações inteligentes

---

# 6. Estrutura Backend

```text
backend/src/modules/campaigns/
  controllers/
  services/
  repositories/
  validators/
  routes/
  dto/
````

---

# 7. Estrutura Frontend

```text id="camp11a"
frontend/src/
  app/
    campanhas/
  components/
    campaigns/
  hooks/
  services/
```

---

# 8. Rotas Frontend

## Campanhas

```text id="camp22b"
/campanhas
```

---

## Nova campanha

```text id="camp33c"
/campanhas/nova
```

---

## Detalhes campanha

```text id="camp44d"
/campanhas/[id]
```

---

# 9. Objetivos Operacionais

O módulo deve permitir:

* criar campanhas
* programar campanhas
* segmentar clientes
* enviar promoções
* acompanhar engajamento
* recuperar clientes
* aumentar recorrência

---

# 10. Tipos de Campanhas

## Promoções

Exemplo:

* desconto
* pacote promocional
* semana especial

---

## Recuperação Clientes

Exemplo:

* clientes inativos
* clientes sem retorno

---

## Datas Comemorativas

Exemplo:

* Dia das mães
* Dia da mulher
* Natal
* Ano novo

---

## Fidelização

Exemplo:

* retorno automático
* bônus recorrência
* cupons fidelidade

---

## Relacionamento

Exemplo:

* aniversário
* agradecimento
* pós-atendimento

---

# 11. Entidades Principais

## Campanha

Representa:

* campanha principal

---

## Destaque

Representa:

* template promocional

---

## DestaqueSalao

Representa:

* customização tenant

---

## Cupom

Representa:

* benefício operacional

---

## Cliente

Representa:

* público alvo

---

# 12. Estrutura Campanha

Cada campanha deve possuir:

* título
* descrição
* imagem
* mensagem
* público alvo
* período
* status
* canal envio
* CTA

---

# 13. Status Campanha

## Status possíveis

```text id="camp55e"
rascunho
agendada
ativa
pausada
finalizada
cancelada
```

---

# 14. Segmentação Clientes

Permitir segmentar:

* clientes ativos
* clientes inativos
* aniversariantes
* recorrentes
* VIP
* risco abandono
* clientes novos

---

# 15. Integração CRM

Consumir:

* segmentações
* frequência clientes
* retenção
* recorrência

---

# 16. Integração WhatsApp

O WhatsApp é o principal canal operacional.

Permitir:

* envio campanhas
* envio promoções
* lembretes
* mensagens automáticas
* CTA agendamento

---

# 17. Integração Agenda

Campanhas devem:

* incentivar novos agendamentos
* aumentar ocupação
* reduzir horários ociosos

---

# 18. Integração AI Engine

Futuro suporte para:

* campanhas automáticas
* sugestões inteligentes
* previsão engajamento
* previsão retorno
* mensagens IA
* automação contextual

---

# 19. Templates Campanhas

O sistema deve possuir:

* templates prontos
* campanhas rápidas
* campanhas inteligentes

## Catalogo inicial WhatsApp

O SaaS mantem um catalogo base de templates de campanha em
`public.templates_mensagem`. Esses templates sao modelos para tenants e devem
ser personalizados pelo salao/autonomo antes do uso operacional.

Classificacao:

* `canal = whatsapp`
* `tipo = marketing`
* `metadata.categoria = campanha`
* `metadata.escopo = tenant`
* `metadata.owner = tenant`
* `metadata.catalogo = campanhas_saas`
* `language = pt_BR`
* `categoria_provider = Marketing`
* `ativo = true`
* `aprovado_provider = false` inicialmente

Catalogo inicial:

* `campaign_promotion`
* `campaign_birthday`
* `campaign_inactive_client`
* `campaign_return_reminder`
* `campaign_new_service`
* `campaign_new_professional`
* `campaign_holiday`
* `campaign_flash_sale`
* `campaign_loyalty`
* `campaign_package`
* `campaign_seasonal`
* `campaign_custom`

Esses templates nao disparam mensagens automaticamente. Eles apenas
disponibilizam modelos preparados para futura aprovacao na WhatsApp Business
Platform, usando parametros posicionais (`{{1}}`, `{{2}}`, etc.) e linguagem
comercial cordial.

O template `campaign_birthday` representa a campanha "Aniversariantes do mes".
Ele deve comunicar que o beneficio e referente ao mes do aniversario, sem
induzir que a mensagem sera enviada exatamente no dia do aniversario. Caso uma
versao ja esteja aprovada na Meta, qualquer mudanca de conteudo exige nova
versao/reaprovacao antes de envio real.

Templates promocionais do catalogo (`campaign_promotion` e
`campaign_flash_sale`) usam blocos comerciais condicionais:

* `beneficios_campanha`: linha(s) montada(s) a partir de `desconto`,
  `valor_promocional` e/ou `brinde`;
* `vigencia_campanha`: texto amigavel em pt-BR para `data_inicio` e
  `data_fim`.

Esses blocos devem ser omitidos quando nao houver valor real configurado, sem
exibir `null`, `undefined`, placeholders ou rotulos vazios.

---

# 20. Biblioteca Visual

Preparar:

* imagens promocionais
* banners
* artes campanhas
* assets marketing

---

# 21. Campanhas Assistidas

Futuro:

* IA sugere campanhas
* IA sugere horários
* IA sugere públicos
* IA sugere mensagens

---

# 22. Cupons

Campanhas podem gerar:

* cupons
* descontos
* bônus
* promoções limitadas

---

# 23. KPIs Campaigns

Exibir:

* campanhas ativas
* taxa abertura
* taxa retorno
* clientes recuperados
* agendamentos gerados
* faturamento associado

---

# 24. APIs Backend

## Listar campanhas

```text id="camp66f"
GET /campaigns
```

---

## Criar campanha

```text id="camp77g"
POST /campaigns
```

---

## Atualizar campanha

```text id="camp88h"
PATCH /campaigns/:id
```

---

## Enviar campanha

```text id="camp99i"
POST /campaigns/:id/send
```

---

## KPIs campanhas

```text id="camp00j"
GET /campaigns/kpis
```

---

# 25. Hook Frontend

```text id="camp12k"
useCampaigns()
```

Responsável por:

* carregar campanhas
* criar campanhas
* segmentações
* métricas
* status campanhas

---

# 26. Service Frontend

```text id="camp13l"
campaigns.service.ts
```

Responsável por:

* APIs
* payloads
* normalização
* tratamento erros

---

# 27. Componentes Frontend

## Estruturais

* CampaignLayout
* CampaignBuilder
* CampaignPreview

## Operacionais

* CampaignCard
* CampaignMetrics
* CampaignAudience
* CampaignScheduler
* CouponGenerator

## Estados

* EmptyCampaignState

---

# 28. Funcionalidades Frontend

Permitir:

* criar campanhas
* editar campanhas
* agendar envio
* visualizar métricas
* segmentar público
* gerar cupons
* visualizar preview

---

# 29. UX/UI

A experiência deve ser:

* visual
* intuitiva
* moderna
* acolhedora
* extremamente simples

Inspirado em:

* Canva simplificado
* Mailchimp simplificado
* Notion
* Fresha

---

# 30. Mobile-First

Priorizar:

* criação rápida campanhas
* templates touch
* poucos cliques
* preview vertical
* navegação simples

---

# 31. Desktop

Desktop deve:

* utilizar grids modernos
* visual marketing clean
* edição confortável
* métricas organizadas

---

# 32. Estilo Visual

Utilizar:

* cards modernos
* gradientes suaves
* glow discreto
* micro animações
* glassmorphism leve

Evitar:

* excesso técnico
* aparência corporativa
* visual ERP

---

# 33. Paleta Visual

## Primária

```text id="camp14m"
#E26D7C
```

## Hover

```text id="camp15n"
#D85C6C
```

## Secundária

```text id="camp16o"
#FFE8E2
```

## Destaque

```text id="camp17p"
#7B4BFF
```

## Accent

```text id="camp18q"
#FFB3C1
```

## Fundo

```text id="camp19r"
#FFFDFC
```

## Texto

```text id="camp20s"
#2B2B2B
```

---

# 34. Automações Futuras

Preparar:

* campanhas automáticas
* retorno automático
* recuperação clientes
* campanhas recorrentes
* campanhas sazonais

---

# 35. Agendamentos Inteligentes

Campanhas futuras devem:

* sugerir horários livres
* preencher agenda ociosa
* incentivar baixa ocupação

---

# 36. Segurança

Garantir:

* autenticação JWT
* ownership validation
* tenant isolation
* proteção campanhas

Nunca permitir:

* campanhas cross-tenant
* vazamento contatos

---

# 37. Multi-Tenant

Toda operação deve respeitar:

* tenant_id
* permissões
* ownership

---

# 38. Privacidade

Preparar:

* LGPD
* opt-out campanhas
* consentimento mensagens
* bloqueio contatos

---

# 39. Tratamento de Erros

Nunca exibir:

* SQL errors
* stack traces
* erros internos

Exibir:

* "Não foi possível enviar campanha"
* "Tente novamente"

---

# 40. Estados Operacionais

## Loading

Exibir:

* shimmer
* loading elegante
* skeletons

---

## Empty State

Exibir:

* incentivo campanhas
* sugestões marketing

Exemplo:
"Crie campanhas e atraia mais clientes."

---

## Error State

Exibir:

* retry simples
* mensagens amigáveis

---

# 41. Polling e Realtime

## MVP Inicial

Atualização:

* polling leve

---

## Futuro

Preparar:

* envio realtime
* métricas instantâneas
* atualizações live

---

# 42. Performance

Priorizar:

* filas futuras
* envio assíncrono
* paginação
* lazy loading
* cache futuro

---

# 43. Escalabilidade Futura

Arquitetura preparada para:

* IA campanhas
* marketplace templates
* campanhas multi-canal
* push notifications
* email marketing
* automações avançadas
* funis retenção

---

# 44. Objetivo Final

O módulo Campaigns deve representar:

* crescimento automático
* marketing simplificado
* retenção inteligente
* recuperação operacional

O usuário deve sentir:

"O Bellory ajuda meu salão a crescer automaticamente."

---

# 45. Regras oficiais da Nova Campanha

Atualizacao 2026-07-14:

* toda campanha WhatsApp exige `template_id` no frontend e no backend;
* templates disponiveis para campanhas devem ser ativos, WhatsApp, de marketing e do escopo global ou do tenant;
* envio real exige template aprovado no provider, com nome do provider e idioma; dry-run e preview podem usar template pendente;
* campanhas sem `agendada_para` iniciam como `rascunho`;
* campanhas com `agendada_para` futura iniciam como `agendada`;
* `agendada_para` passada ou invalida deve ser rejeitada tambem na criacao;
* `tipo`, `publico`, `nome` e `template` sao sempre obrigatorios;
* `promocao_servico`, `novo_servico` e `horarios_disponiveis` exigem `servico_id`;
* `promocao_servico` exige valor promocional positivo ou cupom valido;
* cupons exibidos devem estar ativos, dentro da validade, com beneficio efetivo, com limite disponivel e respeitando restricao de servico;
* o campo de servico da campanha deve usar `servicos` reais do tenant, nao texto livre;
* `nome_servico`, `beneficios_campanha` e `vigencia_campanha` sao os parametros preferenciais para templates promocionais novos;
* `valor_promocional`, `valor_especial`, `desconto`, `brinde` e `validade_promocao` continuam suportados para compatibilidade com templates ja existentes;

Atualizacao 2026-07-17:

* campanha e uma entidade unica; o modo de entrega varia conforme a capacidade
  WhatsApp do tenant;
* tenants com WhatsApp Business API usam modo automatico, com mensagens
  individuais, fila em `mensagens_whatsapp`, auditoria tecnica e status de
  provider;
* tenants com WhatsApp comum ou WhatsApp Business App sem Cloud API devem usar
  modo assistido, em que o Bellory prepara texto, link publico de agendamento e
  acoes de copiar/compartilhar/abrir WhatsApp;
* o modo assistido pode orientar o uso de Lista de Transmissao, mas nao deve
  registrar entrega/leitura/falha como se fosse envio automatico;
* Listas de Transmissao so entregam para contatos que tenham salvo o numero do
  profissional/salao, portanto servem melhor para clientes recorrentes do que
  para prospeccao ampla.

Atualizacao 2026-07-20:

* primeiro convite para agendamento nao deve depender de importacao obrigatoria
  de contatos nem de cadastro previo dos destinatarios como clientes;
* primeiro convite e ativacao inicial assistida pelo WhatsApp App/Business App
  do tenant, inclusive quando houver coexistencia App + Cloud API;
* campanhas recorrentes continuam destinadas a clientes ja conhecidos pelo
  Bellory, com segmentacao, templates, `campanha_envios`,
  `mensagens_whatsapp`, `CommunicationService` e Cloud API quando aplicavel;
* a existencia de Cloud API nao torna obrigatorio seu uso no primeiro convite;
* coexistencia App + API nao concede ao Bellory acesso automatico aos contatos,
  agenda, conversas ou Listas de Transmissao do aplicativo.

Publico inicial sugerido por tipo:

Atualizacao 2026-07-21:

* campanhas passam a ter ciclo orientado por sugestao: IA/regras identificam
  oportunidade, Bellory sugere, tenant aprova/rejeita e parametriza, Bellory
  prepara ou executa, resultados alimentam nova analise;
* tenant deixa de ser apenas criador principal e passa a ser aprovador e
  parametrizador das campanhas sugeridas por IA ou MasterAdmin;
* estrategia da campanha deve conter, no minimo, sugestao, aprovacao e
  execucao;
* campanhas sugeridas nao devem executar sem aprovacao quando dependerem de
  oferta, desconto, periodo, publico ou autorizacao comercial do tenant;
* campanha e canal permanecem separados: a campanha define regra, publico,
  mensagem e estrategia; o canal define Cloud API, WhatsApp App, envio
  assistido, envio pela infraestrutura do SaaS ou canais futuros;
* ausencia de Cloud API propria nao implica automaticamente modo assistido: o
  tenant pode escolher envio assistido, envio pela infraestrutura do SaaS
  quando disponivel ou decisao a cada campanha.
* destinatarios de campanha devem ser exclusivamente clientes finais do tenant;
  usuarios internos do tenant, como Administrador, Funcionario, Autonomo e
  Terceiro, sao inelegiveis mesmo que possuam telefone valido, historico,
  agendamento, aniversario no periodo ou registro tambem em `clientes`;
* a exclusao de usuario interno tem precedencia sobre qualquer criterio de
  segmentacao e deve ser aplicada por `tenant_id`, permitindo que a mesma
  pessoa seja inelegivel em um tenant onde atua internamente e elegivel em
  outro onde e apenas cliente.

Atualizacao 2026-07-22:

* campanhas passam a declarar dimensoes separadas em `metadata`, sem exigir
  migration imediata: `origem_campanha`, `tipo_publico`,
  `natureza_campanha`, `status_campanha`, `status_processamento`,
  `estrategia_envio`, `intervalo_envio_dias`, `prioridade_campanha` e
  `cooldown_comercial_dias`;
* campanhas comerciais de tenant/IA usam `tipo_publico = clientes` e continuam
  excluindo usuarios internos do mesmo tenant;
* a exclusao de usuarios internos tambem considera metadados de origem do
  publico (`owner_role`, `tipo_usuario`, `role`, `user_role`) e vinculos por
  `owner_user_id`/`responsible_profissional_id`, evitando que rascunhos e
  previas usem Administrador, Funcionario, Autonomo ou Terceiro como
  destinatario de exemplo;
* campanhas de plataforma usam `tipo_publico = usuarios_saas` e resolvem
  destinatarios em `usuarios`, inicialmente apenas `Administrador` e
  `Autonomo`, sem criar registros artificiais em `clientes`;
* campanhas promocionais exigem `data_inicio` e pelo menos um beneficio
  (`desconto`, `valor_promocional` ou `brinde`) para aprovacao, agendamento ou
  execucao;
* beneficios e vigencia exibidos em preview e em `mensagens_whatsapp` devem vir
  dos parametros aprovados da campanha, de `metadata.strategy.approval`, de
  `parametros_template`, de `data_inicio`/`data_fim` e, quando aplicavel, do
  cupom vinculado;
* enquanto a campanha nao iniciou geracao/processamento, a previa deve buscar
  o conteudo vigente em `templates_mensagem` pelo `template_id`; depois que
  houver mensagem gerada, a previa deve usar o snapshot salvo em
  `mensagens_whatsapp.conteudo`, congelando a versao efetivamente usada;
* a renderizacao de campanha deve ser condicional: parametros inexistentes sao
  omitidos junto com seus rotulos, sem gerar linhas comerciais vazias;
* a aprovacao e idempotente apos `metadata.lifecycle_stage = approved`: nova
  chamada ao endpoint nao altera parametros, status, destinatarios ou logs;
* o payload para WhatsApp deve preservar a ordem determinada por
  `metadata.provider_variable_mapping` quando ela existir; caso contrario, usa
  a ordem declarada em `templates_mensagem.variaveis`;
* `data_fim` permanece opcional, mas quando informada deve ser maior ou igual a
  `data_inicio`;
* alterar `data_fim` de uma campanha encerrada nao reativa automaticamente a
  campanha; reativacao futura deve ser acao explicita;
* o status comercial (`status_campanha`) nao deve ser confundido com o status
  tecnico (`status_processamento`): uma campanha pode estar `EM_ANDAMENTO`
  comercialmente e `CONCLUIDO` tecnicamente para o lote atual;
* sugestoes de IA verificam campanha equivalente ativa/pendente e cooldown do
  tipo antes de criar nova sugestao;
* envio comercial aplica cooldown por cliente de 7 dias por padrao, sem afetar
  comunicacoes operacionais de agenda;
* `estrategia_envio = UNICO` e o padrao inicial, garantindo idempotencia por
  tenant/campanha/cliente/template; `RECORRENTE` exige intervalo em dias e
  `EVENTO` fica reservado para oportunidades acionadas por regra de negocio;
* na UI, o status comercial deve aparecer como "Em andamento" quando a campanha
  estiver ativa, e o processamento deve ser exibido separadamente quando
  necessario.

* `campanha_geral`: todos os clientes elegiveis;
* `promocao_servico`: todos os clientes elegiveis;
* `recuperacao_inativos`: clientes cujo ultimo atendimento concluido ultrapassou
  o prazo esperado de retorno da combinacao servico + especialidade realizada.
  A regra usa os snapshots do novo MER em `cliente_historico_atendimentos` e
  `servico_tenant_especialidades.dias_retorno_recomendado`. Quando a
  combinacao recorrente nao tiver retorno recomendado, usa fallback de 45 dias.
  Servicos cujo catalogo tenha `servicos_catalogo.natureza = ocasional` nao
  usam fallback e nao classificam o cliente como inativo por si so. Em um mesmo
  atendimento com multiplos servicos, a campanha ignora ocasionais, avalia as
  combinacoes recorrentes e usa o menor prazo vencido como combinacao principal,
  sem duplicar destinatarios. A regra preserva telefone valido, consentimento,
  opt-out, usuarios internos reais, multi-tenant e exclusao por agendamento
  futuro valido; agendamentos futuros cancelados ou terminais nao bloqueiam a
  elegibilidade. A mesma funcao central alimenta estimativa, previa e inicio da
  campanha e expõe explicabilidade em `stats.inactive_recovery`;
* `aniversario`: aniversariantes do mes. Seleciona clientes cujo
  `clientes.data_nascimento` pertence ao mes atual, mantendo telefone valido,
  consentimento, opt-out, usuario interno e demais filtros existentes. As
  mensagens sao geradas no start da campanha para todos os aniversariantes
  elegiveis do mes; o dia do aniversario nao agenda individualmente o envio.
  A automacao `Feliz aniversario` e outro fluxo, documentado em
  `docs/modules/automacoes-relacionamento.md`, com trigger diario por dia/mes,
  horario configuravel por tenant e idempotencia anual por tenant, cliente,
  ano e tipo de automacao;
* `novo_servico`: todos os clientes elegiveis;
* `horarios_disponiveis`: clientes sem agendamento futuro;
* `relacionamento`: clientes recorrentes.

Atualizacao 2026-07-29 - Fase 6 do MER de Servicos:

* campanhas e cupons devem usar `servicos_catalogo`, `servico_tenants`,
  `servico_catalogo_especialidades` e `servico_tenant_especialidades` como
  fontes oficiais;
* novas campanhas por servico gravam `servico_tenant_id` e, quando aplicavel,
  `servico_tenant_especialidade_id`/`especialidade_id`;
* `servico_id` legado permanece apenas como compatibilidade de leitura, nao
  como fonte oficial para novas campanhas;
* cupons podem ter escopo `geral`, `servico`, `especialidade` ou `combinacao`;
* escopo `servico` aponta para `servico_tenants`;
* escopo `combinacao` aponta para `servico_tenant_especialidades`;
* `servico_tenants` pode conter servicos apenas disponibilizados pelos tipos de
  negocio; campanhas e cupons devem listar somente servicos com
  `servico_tenants.ativo = true` e especialidades configuradas para o servico
  selecionado;
* cupom rapido deve enviar `escopo`, `servico_tenant_id`,
  `especialidade_id` e/ou `servico_tenant_especialidade_id` conforme a selecao.

Atualizacao 2026-07-29 - Fase 7 da massa de testes:

* a massa ativa de campanhas/cupons usa a seed `campaign_test_v3`;
* os scripts `campaign-test:*` foram migrados para o novo MER de Servicos;
* clientes de teste usam nomes naturais, com chaves tecnicas somente em
  `metadata`;
* os cenarios cobrem recuperacao por retorno recomendado da combinacao,
  servico ocasional, aniversario, opt-out, telefone invalido e agendamento
  futuro;
* cupons de teste cobrem escopos `geral`, `servico`, `especialidade` e
  `combinacao`;
* mensagens WhatsApp criadas pela massa permanecem em dry-run e nao devem
  chamar provider externo.

Atualizacao 2026-07-29 - Fase 8.2:

* as FKs legadas de campanhas e cupons para `servicos` e
  `servico_especialidades` foram removidas pela migration `20260729180000`;
* `cupom_servicos` nao aceita mais o escopo `servico_legado`;
* campanhas e cupons permanecem ancorados nos escopos `geral`, `servico`,
  `especialidade` e `combinacao`, usando as referencias do novo MER.

Atualizacao 2026-07-29 - Fase 8.3:

* o MER legado fisico foi removido do schema `public`;
* campanhas e cupons nao possuem fallback para `servicos` legado;
* previews, estimates, start em dry-run, recuperacao de inativos,
  aniversariantes, cupons e massa `campaign_test_v3` foram validados usando
  somente o novo MER;
* scripts antigos de massa de campanhas foram removidos fisicamente; a rota npm
  ativa permanece em `campaign-test-data-v3.js`.
