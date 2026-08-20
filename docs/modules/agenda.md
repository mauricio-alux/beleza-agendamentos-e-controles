# Identidade no Agendamento Publico

O agendamento publico aceita identificacao manual ou token. O token e validado
no backend e convertido em `cliente_id` antes da criacao do agendamento.

O payload persistido pode conter campanha, origem, sessao e link, mas nunca o
token bruto. Token invalido, expirado ou emitido para outro tenant nao cria
agendamento.

O primeiro convite para agendamento pode chegar por WhatsApp App/Business App
em modo assistido. Nesse caso, o Bellory nao conhece previamente o contato e
nao exige que ele tenha sido importado ou cadastrado. O cadastro/vinculo como
cliente acontece no primeiro acesso identificado ao link publico ou na criacao
do agendamento, sempre dentro do tenant atual.

## Tela publica de agendamento

A tela publica `/agendar/:slug` deve priorizar primeiro a identificacao do
cliente. Apos token valido, reconhecimento local ou identificacao manual, a
ordem visual esperada e:

1. `Seus dados`, com nome, email, WhatsApp e autorizacao de reconhecimento no
   dispositivo.
2. `Seus horarios`, somente quando houver carregamento ou atendimentos futuros
   ativos para o cliente identificado.
3. `Escolha o atendimento`, com servico e profissional.
4. `Escolha data e horario`, com data e slots disponiveis.
5. Resumo lateral e solicitacao do agendamento.

O bloco `Seus horarios` deve exibir acoes de reagendar/cancelar para
agendamentos futuros em aberto e deve ser omitido quando nao houver dados a
mostrar. Essa organizacao e visual/operacional: nao altera a validacao de
token, o contrato de identificacao, a busca de agendamentos futuros nem a
criacao do agendamento.

## Visao diaria e filtros operacionais

A tela administrativa `/agenda` opera em Modo Consulta. Ela separa a agenda do
dia dos calculos de disponibilidade, que pertencem ao Modo Novo Agendamento em
`/agenda/novo`.

No Modo Consulta, a prioridade visual e:

1. Cabecalho com estabelecimento, data e acao `Novo agendamento`.
2. Navegacao de data.
3. Filtros de consulta.
4. Alertas da Agenda.
5. Agenda do dia.
6. Ocupacao da Agenda.
7. Sugestoes para a Agenda, somente quando houver recomendacao relevante.

Para usuarios com visao de estabelecimento, como Administrador, Autonomo owner,
Gerente ou perfis administrativos com permissao de agenda, a timeline carrega
todos os agendamentos do estabelecimento no dia selecionado quando o filtro de
profissional esta em `Todos os profissionais`.

Selecionar um profissional passa a ser um filtro explicito da timeline. Perfis
de agenda pessoal, como Funcionario, Terceiro e Profissional, continuam
trabalhando no proprio contexto operacional e nao devem ampliar a visualizacao
para outros profissionais.

Para evitar deslocamento de dia por conversao UTC no navegador, a timeline
administrativa envia `data=YYYY-MM-DD` para `GET /agenda`. O backend e
responsavel por calcular o intervalo operacional local do dia, de `00:00` ate
`00:00` do dia seguinte, e aplica esse intervalo em `data_inicio`. Filtros de
profissional, servico, especialidade e status sao opcionais e cumulativos; sem
filtro de profissional, a API deve retornar todos os agendamentos do
estabelecimento para a data selecionada. O filtro de servico tambem deve ser
explicitamente escolhido pelo usuario; a agenda nao deve selecionar
automaticamente o primeiro servico como filtro oculto.

Horarios sugeridos nao aparecem em `/agenda`. Eles pertencem ao fluxo de
criacao de agendamento e devem ficar em `/agenda/novo`, onde existem data,
profissional, servico e especialidade suficientes para consultar
disponibilidade.

No Modo Novo Agendamento, a prioridade visual e:

1. Data.
2. Configuracao: profissional, servico e especialidade.
3. Horarios disponiveis.
4. Horarios recomendados.
5. Dados do cliente.
6. Criar agendamento.

Cards condicionais:

- `Alertas da Agenda` mostra pendencias ou a mensagem: `Tudo em ordem. Nenhuma pendencia importante para esta data.`
- `Ocupacao da Agenda` mostra somente metricas confiaveis recebidas do backend.
- `Sugestoes para a Agenda` fica ocultado quando nao houver recomendacao.
- `Horarios sugeridos` e `Horarios disponiveis` ficam restritos ao Modo Novo Agendamento.

Em mobile, filtros devem ficar em coluna ou em grid respiravel, os slots devem
ter area adequada para toque e os cards de atendimento priorizam hora, cliente,
servico, profissional e status. A acao principal fica visivel; acoes
secundarias podem ficar agrupadas em `Mais acoes`.

## Dropdowns dependentes da Agenda

Os seletores administrativos seguem a cadeia:

```text
Profissional -> Servico -> Especialidade
```

A fonte operacional das opcoes e a combinacao ativa:

```text
profissional_servico_especialidades
-> servico_tenant_especialidades
-> servico_tenants
-> servicos_catalogo
-> especialidades
```

Nao utilizar comparacao por nome, cargo, categoria ou apenas
`profissional_especialidades` para decidir disponibilidade operacional.

Em `/agenda/novo`:

- sem profissional selecionado, o servico fica como estado incompleto;
- apos selecionar profissional, aparecem apenas os servicos que ele pode executar;
- apos selecionar servico, aparecem apenas especialidades validas para aquela combinacao profissional e servico;
- `Todos os servicos` e `Todas as especialidades` nao disparam disponibilidade nem permitem criacao.

Em `/agenda`:

- `Todos os profissionais`, `Todos os servicos` e `Todas as especialidades` continuam sendo filtros amplos validos;
- ao selecionar um profissional especifico, servicos e especialidades sao restringidos pelas combinacoes dele;
- ao selecionar um servico especifico, especialidades sao restringidas pela regra mais restritiva disponivel;
- mudar profissional ou servico limpa somente valores dependentes incompatíveis;
- a timeline continua usando filtros aplicados somente depois de `Pesquisar`.

## Tolerancias de intervalo e fim do expediente

A disponibilidade da Agenda respeita duas tolerancias operacionais
tenant-aware, configuradas em `/configuracoes/operacao`:

- `tolerancia_intervalo_min`: minutos que um atendimento iniciado antes do
  intervalo pode invadir o inicio da pausa do profissional.
- `tolerancia_fim_expediente_min`: minutos que um atendimento iniciado antes
  do fim do expediente pode ultrapassar o horario final do profissional.

O valor padrao de ambas e `0`, preservando o comportamento restritivo anterior.
As tolerancias sao independentes, aceitam valores de `0` a `60` minutos e nao
alteram a duracao real do servico.

Mesmo com tolerancia configurada, a engine continua bloqueando:

- conflito com outro agendamento ou bloqueio operacional;
- inicio de atendimento dentro do intervalo;
- inicio de atendimento apos o fim do expediente;
- invasao do intervalo acima de `tolerancia_intervalo_min`;
- termino apos o fim do expediente acima de `tolerancia_fim_expediente_min`.

Essa regra e aplicada pelo backend em `agenda.engine.js`, portanto vale tanto
para a agenda interna quanto para o agendamento publico.

## Ciclo operacional implementado

A Agenda possui agora um ciclo operacional explicito para atendimentos:

- `pendente`: solicitacao criada pelo cliente ou pela operacao, ainda sem aceite final.
- `pendente_atendente`: solicitacao aguardando aceite do salao/profissional.
- `pendente_cliente`: solicitacao ja aceita pela operacao/profissional e
  aguardando a chegada/execucao do cliente. O clique operacional em confirmar
  deve manter o registro neste status e emitir o evento `appointment.confirmed`.
  O cliente nao precisa confirmar novamente.
- `confirmado`: status legado/reservado para compatibilidade. O fluxo atual de
  aceite profissional nao deve gravar novos agendamentos como `confirmado`.
- `cancelado`: atendimento encerrado por cancelamento.
- `concluido`: atendimento realizado e fechado operacionalmente.
- `no_show`: cliente nao compareceu ao atendimento confirmado.

Atendimentos `pendente_cliente` ou `confirmado` podem ser concluidos
manualmente pelo painel da agenda ou automaticamente apos o fim do atendimento,
respeitando a tolerancia configurada por
`APPOINTMENT_COMPLETION_TOLERANCE_MINUTES` (padrao: 120 minutos). Enquanto o
atendimento aceito ja terminou, mas ainda esta dentro da janela de tolerancia,
a API devolve `operational_alert` para o frontend destacar que o atendimento
precisa de acao operacional.

Para reduzir conclusoes acidentais, a acao manual `Concluir Agora` tem uma
proteção adicional quando `data_inicio` ainda esta no futuro. O frontend deve
exibir confirmacao obrigatoria com horario agendado e horario atual antes de
prosseguir. O backend tambem valida o horario atual do servidor e exige
`confirmar_conclusao_antecipada=true` para conclusoes manuais futuras,
retornando `EARLY_COMPLETION_REQUIRES_CONFIRMATION` quando a confirmacao nao
for enviada. Essa protecao nao se aplica a conclusao automatica
(`origem_status=auto_completion`) nem altera no-show, cancelamento,
reagendamento ou comunicacao WhatsApp.

As acoes operacionais disponiveis no backend sao:

```text
PATCH /agenda/:id/concluir
PATCH /agenda/:id/no-show
POST /agenda/processar-conclusao-automatica
```

Essas rotas exigem contexto autenticado do tenant. Concluir ou marcar no-show
e permitido para agendamentos aceitos pela operacao (`pendente_cliente`) ou
legados `confirmado`. A conclusao atualiza historico do cliente e CRM; o
no-show registra o nao comparecimento, mantem rastro operacional e tambem
alimenta CRM.

Ao gravar `concluido` ou `no_show`, a Agenda tambem sincroniza
`cliente_historico_atendimentos` com chave unica por `tenant_id` e
`agendamento_id`. Isso evita duplicidade historica mesmo em reprocessamentos e
cria uma base propria para dashboard, campanhas, CRM, retencao e analises de
frequencia. Conclusoes incrementam os contadores de atendimentos concluidos e
valor gasto no vinculo `cliente_tenants`; no-show atualiza somente
`data_ultimo_no_show` e `total_no_show`, sem somar atendimento concluido nem
valor gasto.

A migration `20260702130000_backfill_client_operational_history.sql` executa o
backfill idempotente dos dados legados, inserindo apenas agendamentos ja
existentes com status `concluido` ou `no_show` que ainda nao tenham registro no
historico. A propria migration informa via `notice` as contagens antes da
carga, elegiveis, inseridos e ignorados por duplicidade.

A acao `Cliente Nao Compareceu` so pode ser executada quando o atendimento ja
iniciou ou passou. Alem do status operacional elegivel (`pendente_cliente` ou
`confirmado`), o backend valida que `now >= data_inicio`; caso contrario,
retorna `NO_SHOW_BEFORE_APPOINTMENT_START` com mensagem amigavel. O frontend
deve manter o botao visivel, porem desabilitado para agendamentos futuros, com
orientacao de que a acao so fica disponivel apos o inicio do atendimento. Essa
restricao nao altera confirmacao, cancelamento, reagendamento, conclusao manual
ou conclusao automatica.

Payload manual de conclusao antecipada:

```json
{
  "motivo": "Concluido pelo painel",
  "confirmar_conclusao_antecipada": true
}
```

Eventos emitidos pela Agenda:

```text
appointment.confirmed
appointment.rescheduled
appointment.cancelled
appointment.completed
appointment.no_show
appointment.reminder_24h
appointment.reminder_2h
appointment.pending_attendant
appointment.pending_attendant_reminder_30m
appointment.pending_attendant_reminder_60m
appointment.pending_attendant_reminder_2h
```

Esses eventos carregam payload preparado para notificacao operacional e para
integracao WhatsApp/fila. O envio nao ocorre dentro da service de Agenda: a
Agenda publica eventos e o `CommunicationService` decide quais mensagens
operacionais devem ser geradas, enviadas e auditadas em `mensagens_whatsapp`.
No caso de `appointment.confirmed`, o cliente recebe apenas a confirmacao do
atendimento e as opcoes amigaveis de reagendar ou cancelar; nao ha pedido de
confirmacao de presenca nem URL tecnica no conteudo da mensagem.

Para atendimentos criados pelo cliente em `pendente_atendente` (`Aguardando
profissional`), o Bellory emite o alerta operacional imediato pelo evento
`appointment.pending_attendant`. Enquanto o status permanecer
`pendente_atendente`, o scheduler de lembretes deve emitir no maximo uma vez
cada evento operacional:

- `appointment.pending_attendant_reminder_30m`: segunda tentativa apos 30
  minutos da criacao.
- `appointment.pending_attendant_reminder_60m`: terceira tentativa apos 60
  minutos da criacao.
- `appointment.pending_attendant_reminder_2h`: ultimo alerta, com prioridade
  alta, quando faltar aproximadamente 2 horas para `data_inicio`, respeitando a
  janela operacional de `REMINDER_WINDOW_MINUTES`.

Os lembretes cessam naturalmente quando o agendamento sai de
`pendente_atendente`, incluindo confirmacao, cancelamento, reagendamento,
conclusao, no-show ou expiracao. A duplicidade e controlada por evento em
`mensagens_whatsapp`, usando `tipo_evento` e fallback por `template_nome`.

Falhas de comunicacao nao podem bloquear criacao, confirmacao, cancelamento,
reagendamento, conclusao ou no-show. O fluxo operacional da Agenda permanece
fonte da verdade; o WhatsApp e uma camada de comunicacao derivada do evento.

Cancelamentos feitos por atendente, administrador, profissional ou outro
responsavel interno exigem motivo obrigatorio antes de alterar o status para
`cancelado`. O backend rejeita payload interno sem motivo com
`CANCELLATION_REASON_REQUIRED`, e o frontend deve capturar esse motivo antes de
concluir a acao. Cancelamentos feitos pelo cliente via link operacional usam
`origem_status=link_operacional` e seguem template proprio de comunicacao.

Na interface da Agenda, o cancelamento interno deve abrir um modal proprio, nao
prompt nativo do navegador. O modal apresenta motivos padrao:
`Profissional indisponivel`, `Cliente solicitou alteracao`, `Erro no
agendamento`, `Servico indisponivel`, `Horario indisponivel`, `Problema
operacional do salao` e `Outro motivo`. A escolha do motivo e obrigatoria; ao
selecionar `Outro motivo`, o complemento tambem se torna obrigatorio. A origem
continua registrada internamente pelo fluxo da Agenda, mas o motivo enviado ao
WhatsApp deve ser o motivo escolhido/informado pelo usuario.
Depois que o agendamento fica `cancelado`, o detalhe do atendimento deve exibir
o motivo salvo para auditoria operacional do salao.

Para `appointment.no_show` e `appointment.cancelled`, a comunicacao ao cliente
nao deve expor URLs tecnicas no campo `mensagens_whatsapp.conteudo`. A acao
`Agendar Novamente` deve ser registrada em `payload.actions` como
`schedule_again`, apontando para `/agendar/{tenant_slug}` quando o slug do
tenant estiver disponivel.

Para `appointment.confirmed`, a confirmacao do profissional/operacao mantem o
destino operacional `pendente_cliente` e comunica o cliente pelo template
oficial `appointment_confirmed`. Esse template deve possuir as acoes Bellory
`Reagendar` e `Cancelar` em `templates_mensagem.metadata.actions`. No envio
pelo provider WhatsApp, essas acoes sao representadas como botoes URL do
template `appointment_confirmed`: o backend nao envia a URL-base no corpo nem
como texto, apenas fornece `agendamentos.token_confirmacao` como parametro
dinamico de cada botao. Conceitualmente, `BUTTON 0 {{1}}` recebe o token para
Reagendar e `BUTTON 1 {{1}}` recebe o mesmo token para Cancelar; a acao e
definida pela URL configurada no template da Meta. As rotas publicas continuam
sem exigir login do cliente e protegidas por token, tenant do proprio
agendamento, status nao terminal e horario futuro.

---

## Historico legado

O bloco abaixo foi preservado apenas como historico de especificacao antiga.
A regra vigente do modulo esta nas secoes anteriores deste arquivo, nos docs
mestres e nas ADRs 014-018. Em caso de divergencia, prevalecem as secoes
recentes: Agenda backend-first, novo MER de Servicos, `pendente_cliente` apos
confirmacao operacional e `appointment_confirmed` com acoes Reagendar/Cancelar
via `token_confirmacao`.

O `agenda.md` é provavelmente o documento mais importante do núcleo operacional do Bellory, porque ele define:

* a engine principal do negócio
* as regras reais de operação
* a inteligência operacional do salão
* a experiência central do usuário

O ponto mais importante aqui é:
o Bellory NÃO é uma “agenda comum”.

Ele é:

* uma engine operacional inteligente
* orientada a ocupação
* redução de ociosidade
* automação operacional
* experiência mobile-first
* multi-tenant
* preparada para IA futura

Abaixo está a especificação consolidada profissional do módulo.

---

# docs/modules/agenda.md

````md id="r9t2mq"
# Agenda Module — Bellory

# 1. Objetivo do Módulo

O módulo Agenda é o núcleo operacional do Bellory.

Seu objetivo é:
- organizar a operação do salão
- automatizar disponibilidade
- calcular horários inteligentes
- evitar conflitos
- reduzir ociosidade
- simplificar agendamentos
- profissionalizar atendimentos

O módulo Agenda NÃO deve funcionar como:
- agenda manual simples
- calendário passivo
- sistema burocrático

O módulo deve funcionar como:
- engine operacional inteligente
- sistema ativo de organização
- núcleo de automação operacional

---

# 2. Papel Estratégico

O módulo Agenda é responsável por:

- geração de horários
- controle operacional
- disponibilidade
- ocupação
- encaixes inteligentes
- confirmação
- reagendamento
- cancelamento
- controle multi-profissional

É o principal motor operacional do Bellory.

---

# 3. Objetivo UX

O usuário deve sentir:

"O Bellory organiza minha agenda automaticamente."

A experiência deve transmitir:
- simplicidade
- rapidez
- inteligência operacional
- organização automática
- facilidade de uso

---

# 4. Público-Alvo

O módulo foi projetado para:
- profissionais autônomos
- pequenos salões
- usuários mobile-first
- baixa maturidade tecnológica

---

# 5. Conceito Arquitetural

A Agenda deve funcionar como:

- engine operacional desacoplada
- motor inteligente de horários
- sistema orientado a disponibilidade
- núcleo operacional multi-tenant

A lógica operacional deve permanecer:
- backend-driven
- centralizada na engine
- desacoplada do frontend

O frontend NÃO deve:
- calcular disponibilidade complexa
- validar conflitos críticos
- gerar lógica operacional principal

---

# 6. Estrutura Backend

```text
backend/src/modules/agenda/
  controllers/
  services/
  repositories/
  validators/
  routes/
  engine/
  dto/
````

---

# 7. Estrutura Frontend

```text
frontend/src/
  app/
    agenda/
  components/
    agenda/
  hooks/
  services/
```

---

# 8. Rotas Frontend

## Agenda principal

```text
/agenda
```

## Novo agendamento

```text
/agenda/novo
```

## Detalhes do agendamento

```text
/agenda/[id]
```

---

# 9. Objetivos Operacionais

O módulo deve:

* gerar horários válidos
* impedir conflitos
* impedir horários inválidos
* impedir horários passados
* reduzir buracos operacionais
* respeitar escalas
* respeitar intervalos
* respeitar duração serviços
* respeitar múltiplos profissionais

---

# 10. Entidades Principais

## Agenda

Representa:

* agendamento operacional

---

## Cliente

Representa:

* cliente final

---

## ServicoSalao

Representa:

* serviço executado

---

## User

Representa:

* profissional executante

---

## EscalaSemanal

Representa:

* disponibilidade operacional

---

## Salao

Representa:

* tenant operacional

---

# 11. Estados da Agenda

## Status possíveis

```text
pendente
confirmado
cancelado
concluido
no_show
```

---

# 12. Engine Inteligente de Agendamento

A engine é responsável por:

* gerar disponibilidade
* detectar conflitos
* calcular encaixes
* evitar horários inválidos
* validar horários futuros
* calcular ocupação
* reduzir espaços ociosos

---

# 13. Regras Operacionais

A engine deve considerar:

* horário do salão
* horário profissional
* escala semanal
* duração serviço
* tolerância operacional
* intervalo almoço
* feriados
* bloqueios agenda
* antecedência mínima
* horários passados
* agendamentos existentes

---

# 14. Horários Inteligentes

O sistema deve:

* sugerir melhores horários
* priorizar encaixes inteligentes
* reduzir espaços mortos
* melhorar ocupação operacional

---

# 15. Exemplo Operacional

## Serviço

```text
Corte = 45 minutos
```

## Agenda existente

```text
10:00 → 10:45
11:30 → 12:15
```

## Engine deve

* calcular encaixes válidos
* evitar espaços ruins
* sugerir melhores opções

---

# 16. Multi-Profissionais

O módulo deve suportar:

* múltiplos profissionais
* múltiplas agendas
* disponibilidade individual
* regras independentes
* serviços específicos por profissional

---

# 17. Multi-Serviços (Futuro)

Arquitetura preparada para:

* múltiplos serviços no mesmo atendimento
* duração combinada
* profissionais múltiplos
* dependências operacionais

---

# 18. APIs Backend

## Disponibilidade

```text
GET /agenda/disponibilidade
```

---

## Listagem

```text
GET /agenda
```

---

## Detalhes

```text
GET /agenda/:id
```

---

## Criar

```text
POST /agenda
```

---

## Atualizar

```text
PATCH /agenda/:id
```

---

## Cancelar

```text
PATCH /agenda/:id/cancelar
```

---

## Reagendar

```text
PATCH /agenda/:id/reagendar
```

---

## Confirmar

```text
PATCH /agenda/:id/confirmar
```

---

# 19. Validações Obrigatórias

Validar:

* cliente obrigatório
* serviço obrigatório
* profissional obrigatório
* tenant obrigatório
* disponibilidade real
* horário futuro
* conflito operacional
* ownership
* escala válida

---

# 20. Conflitos

O sistema deve impedir:

* sobreposição horários
* dupla reserva
* encaixes inválidos
* horários fora escala
* horários passados

---

# 21. Antecedência Mínima

O sistema deve permitir:

* configuração tenant-aware
* bloqueio de horários próximos
* controle operacional

Exemplo:

* não permitir agendamento com menos de 30 minutos

---

# 22. Tolerância Operacional

Permitir:

* tolerância final expediente
* encaixe controlado
* flexibilidade operacional

---

# 23. Intervalos

A engine deve respeitar:

* almoço
* pausas
* bloqueios operacionais
* indisponibilidades

---

# 24. Bloqueios Operacionais

Futuro suporte para:

* férias
* ausência
* manutenção
* eventos externos
* bloqueios manuais

---

# 25. Frontend — Componentes

## Estruturais

* CalendarView
* DayAgenda
* ScheduleTimeline

## Operacionais

* TimeSlots
* AppointmentCard
* AppointmentModal
* AgendaFilters
* AvailabilityIndicator

## Seletores

* ProfessionalSelector
* ServiceSelector

## Estados

* EmptyAgendaState

---

# 26. Funcionalidades Frontend

Permitir:

* visualizar agenda
* criar agendamento
* cancelar
* confirmar
* reagendar
* visualizar horários
* filtrar agenda
* selecionar profissional
* selecionar serviço

---

# 27. UX/UI

Visual deve ser:

* moderno
* rápido
* extremamente intuitivo
* leve
* touch-friendly

Inspirado em:

* Calendly
* Fresha
* Google Calendar
* Booksy

---

# 28. Mobile-First

Priorizar:

* navegação vertical
* slots touch
* cards empilhados
* modais mobile
* baixo atrito operacional

---

# 29. Desktop

Desktop deve utilizar:

* timeline organizada
* grids modernos
* visual clean
* produtividade operacional

---

# 30. Estilo Visual

Utilizar:

* cards modernos
* glow discreto
* micro animações
* glassmorphism leve
* feedback visual elegante

Evitar:

* tabelas pesadas
* aparência ERP
* excesso visual

---

# 31. Paleta Visual

## Primária

```text
#E26D7C
```

## Hover

```text
#D85C6C
```

## Secundária

```text
#FFE8E2
```

## Destaque

```text
#7B4BFF
```

## Accent

```text
#FFB3C1
```

## Fundo

```text
#FFFDFC
```

## Texto

```text
#2B2B2B
```

---

# 32. Dashboard Integração

O Dashboard deve consumir:

* agenda do dia
* próximos atendimentos
* ocupação
* KPIs operacionais

---

# 33. Integração CRM

A Agenda alimenta:

* histórico cliente
* frequência
* retenção
* relacionamento

---

# 34. Integração WhatsApp

Preparar:

* confirmações
* lembretes
* reagendamentos
* notificações
* recuperação cliente

---

# 35. Integração AI Engine

Futuro suporte para:

* previsão cancelamento
* previsão retorno
* horários ideais
* encaixes inteligentes
* previsão ocupação
* recomendações operacionais

---

# 36. Segurança

Garantir:

* autenticação JWT
* proteção rotas
* ownership validation
* isolamento tenant

Nunca permitir:

* acesso cross-tenant
* visualização indevida

---

# 37. Multi-Tenant

Toda operação deve respeitar:

* tenant_id
* escopo usuário
* permissões
* ownership

---

# 38. Performance

Priorizar:

* queries eficientes
* índices operacionais
* paginação futura
* cache futuro
* engine otimizada

---

# 39. Polling e Realtime

## MVP Inicial

Atualização via:

* polling leve

---

## Futuro

Preparar:

* websocket
* realtime
* event-driven
* pub/sub
* sincronização instantânea

---

# 40. Hook Frontend

```text
useAgenda()
```

Responsável por:

* carregar agenda
* disponibilidade
* criação
* reagendamento
* cancelamento
* atualização

---

# 41. Service Frontend

```text
agenda.service.ts
```

Responsável por:

* APIs
* payloads
* normalização
* tratamento erros

---

# 42. Estados Operacionais

## Loading

Exibir:

* skeletons
* shimmer
* loading elegante

---

## Empty State

Exibir:

* mensagens amigáveis
* incentivo operacional

---

## Error State

Nunca exibir:

* SQL errors
* stack traces
* erros internos

Exibir:

* "Horário indisponível"
* "Profissional sem disponibilidade"
* "Não foi possível concluir"

---

# 43. Escalabilidade Futura

Arquitetura preparada para:

* WhatsApp automático
* IA operacional
* campanhas automáticas
* CRM avançado
* marketplace
* múltiplas unidades
* franquias
* agenda cliente
* recorrência
* fila inteligente

---

# 44. Objetivo Final

O módulo Agenda deve representar:

* organização automática
* inteligência operacional
* redução de ociosidade
* profissionalização do salão

O usuário deve sentir:

"O Bellory organiza automaticamente minha operação."

---

# 45. Novo MER de Servicos na Agenda

A partir da Fase 5, Agenda interna e Booking publico usam o novo MER de
Servicos para resolver oferta, especialidade, preco e duracao.

Fluxo operacional:

* Servico ofertado pelo tenant: `servico_tenants`
* Conceito do servico: `servicos_catalogo`
* Configuracao por especialidade: `servico_tenant_especialidades`
* Capacidade profissional: `profissional_especialidades`
* Snapshot do agendamento: `agendamento_servicos`
* Historico do atendimento: `cliente_historico_atendimentos`

Regras:

* `servico_tenants` pode conter servicos apenas disponibilizados ao tenant. A
  Agenda nao lista servico apenas pela existencia do registro; exige
  `servico_tenants.ativo = true`.
* Booking publico lista somente combinacoes ativas, online, com duracao positiva
  e profissional compativel.
* Agenda interna exige especialidade quando um servico tiver mais de uma
  combinacao compativel para o profissional.
* Backend e a autoridade de preco e duracao; frontend nunca envia esses valores
  como fonte confiavel.
* Novos snapshots preservam `servico_catalogo_id`, `servico_tenant_id`,
  `servico_tenant_especialidade_id`, `especialidade_id`, preco, duracao,
  profissional e nomes exibidos.
* Historico deve ser alimentado pelo snapshot do atendimento, nao por leitura
  tardia da configuracao atual do servico.

`profissional_servicos` nao e autoridade para Agenda ou Booking publico nesta
fase. O modulo de Equipe ainda pode manter esse cadastro como transicao ate a
fase propria de saneamento.

## Validacao da Fase 5.1

Em 2026-07-29, a migration `20260729120000` foi aplicada de forma controlada no
Supabase remoto `djbuzarzbpcpixudpnmg` e a Fase 5 foi validada com dados reais
do tenant de desenvolvimento `Espaco Vivian Beauty`.

Resultados validados:

* Manicure/Fibra usou preco 50 e duracao 30 minutos da combinacao
  `servico_tenant_especialidades`.
* Corte de cabelo/Corte Degrade usou preco 80 e duracao 45 minutos da
  combinacao.
* Slots mudaram conforme a duracao: 16 slots para 30 minutos e 14 slots para
  45 minutos na data 2026-08-03.
* Novo agendamento gravou snapshot com `servico_tenant_id`,
  `servico_tenant_especialidade_id`, `especialidade_id`, preco, duracao,
  profissional e nomes exibidos.
* Conclusao do atendimento gerou historico com as mesmas referencias.
* Remarcacao apenas de data/hora preservou o snapshot comercial.

## Atualizacao 2026-07-29 - Fase 8.2

As FKs remanescentes de `agendamento_servicos` e
`cliente_historico_atendimentos` para `servicos` e `servico_especialidades`
foram removidas pela migration `20260729180000`. As colunas legadas seguem
fisicamente presentes apenas para compatibilidade transicional e leitura de
snapshot historico.

Novos agendamentos e historicos devem continuar usando
`servico_catalogo_id`, `servico_tenant_id` e
`servico_tenant_especialidade_id` como referencias oficiais do MER de Servicos.

## Atualizacao 2026-07-29 - Fase 8.3

As tabelas legadas `servicos`, `servico_especialidades` e
`profissional_servicos` foram removidas fisicamente. Agenda interna, Booking
publico e historico nao devem consultar legado nem fazer fallback para IDs
antigos.

Snapshots antigos continuam legiveis pelos campos materializados em
`agendamento_servicos` e `cliente_historico_atendimentos`; novos fluxos usam o
novo MER como fonte de preco, duracao, especialidade, profissional e servico.
