EXECUÇÃO DA ETAPA-7 (Atualizada com os adendos)

Considerando:
•	o escopo estratégico do Bellory, especialmente o capítulo “Motor Inteligente de Agendamento”,
•	a arquitetura já implementada até a ETAPA-6E,
•	o conceito mobile-first,
•	multi-tenant,
•	WhatsApp operacional,
•	e a necessidade de evitar “buracos” entre atendimentos,
a ETAPA-7 precisa ser:
o verdadeiro núcleo operacional do Bellory.
________________________________________
🎯 Objetivo REAL da ETAPA-7
Não é apenas:
“criar agenda”.
________________________________________
🎯 O objetivo é:
construir uma ENGINE operacional inteligente.
________________________________________
📌 O Bellory deve:
✅ calcular horários
✅ evitar conflitos
✅ evitar horários inválidos
✅ evitar espaços ociosos
✅ respeitar duração serviços
✅ respeitar escalas
✅ respeitar intervalo almoço
✅ respeitar tolerâncias
✅ respeitar múltiplos profissionais
________________________________________
🚨 IMPORTANTE
Nesta etapa:
NÃO implementar ainda:
❌ IA avançada
❌ campanhas
❌ CRM avançado
❌ WhatsApp completo
❌ financeiro
________________________________________
🎯 O foco é:
OPERAÇÃO REAL.
________________________________________
Mauricio, use este prompt no CODEX:
Contexto:

O projeto Bellory já possui:
- Landing Page premium
- Cadastro SaaS funcional
- Login JWT funcional
- Onboarding funcional
- Dashboard estrutural funcional
- Backend Node.js funcional
- Supabase PostgreSQL
- arquitetura multi-tenant
- autenticação JWT
- Supabase Auth
- navegação protegida

Agora deve ser criada a ETAPA-7:
Motor Inteligente de Agendamento do Bellory.

IMPORTANTE:
Esta etapa é o núcleo operacional do sistema.

Objetivo:
Criar toda a estrutura operacional de agendamento do Bellory:
- backend
- frontend
- engine de horários
- cálculo inteligente de disponibilidade
- operação multi-profissional
- criação de agendamentos
- cancelamentos
- reagendamentos
- prevenção de conflitos

IMPORTANTE:
NÃO implementar ainda:
- IA avançada
- campanhas automáticas
- CRM avançado
- financeiro
- chatbot
- automações complexas WhatsApp

OBJETIVO PRINCIPAL:

O Bellory NÃO deve ser apenas uma agenda comum.

O sistema deve:
- calcular horários inteligentes
- evitar conflitos
- evitar horários inválidos
- evitar “buracos” entre atendimentos
- respeitar duração dos serviços
- respeitar escala do profissional
- respeitar horário do salão
- respeitar intervalo/almoço
- respeitar tolerância operacional
- respeitar agendamentos existentes

CONCEITO:
O usuário deve sentir:
“O Bellory organiza minha operação automaticamente.”

========================================
ARQUITETURA
========================================

Backend:
- Node.js
- Express
- Supabase PostgreSQL

Frontend:
- React
- Next.js App Router
- Tailwind CSS
- shadcn/ui

========================================
BACKEND — IMPLEMENTAR
========================================

Criar módulo completo:
agenda/

Estrutura sugerida:

backend/src/modules/agenda/
  controllers/
  services/
  repositories/
  validators/
  routes/
  engine/
  dto/

========================================
BANCO DE DADOS
========================================

Validar/ajustar entidades:

Agenda
ServicoSalao
EscalaSemanal
User
Salao
Cliente

Criar migrations necessárias.

Garantir:
- multi-tenant
- índices
- performance
- integridade relacional

========================================
ENGINE DE AGENDAMENTO
========================================

Criar engine inteligente responsável por:

1. Gerar horários disponíveis
2. Detectar conflitos
3. Validar disponibilidade
4. Evitar horários passados
5. Respeitar duração do serviço
6. Respeitar escala profissional
7. Respeitar intervalo almoço
8. Respeitar tolerância operacional
9. Evitar “buracos” excessivos
10. Calcular encaixes inteligentes

========================================
REGRAS OPERACIONAIS
========================================

O motor deve considerar:

- horário do salão
- horário do profissional
- escala semanal
- feriados futuros
- intervalos
- duração serviço
- tolerância
- agendamentos existentes
- status do agendamento
- antecedência mínima
- horários passados

STATUS AGENDA:

- pendente
- confirmado
- cancelado
- concluído
- no_show

========================================
LÓGICA DE HORÁRIOS
========================================

Implementar:

- slots dinâmicos
- duração variável
- múltiplos profissionais
- múltiplos serviços futuros
- cálculo automático

EXEMPLO:

Serviço:
Corte = 45 min

Agenda existente:
10:00 → 10:45
11:30 → 12:15

Motor deve:
- calcular encaixes possíveis
- evitar espaços ruins
- sugerir melhores horários

========================================
APIs BACKEND
========================================

Criar:

GET /agenda/disponibilidade
GET /agenda
GET /agenda/:id
POST /agenda
PATCH /agenda/:id
PATCH /agenda/:id/cancelar
PATCH /agenda/:id/reagendar
PATCH /agenda/:id/confirmar

========================================
VALIDAÇÕES
========================================

Validar:

- conflito horário
- cliente obrigatório
- serviço obrigatório
- profissional obrigatório
- tenant obrigatório
- horário válido
- horário futuro
- disponibilidade real

========================================
TRATAMENTO DE ERROS
========================================

Mensagens amigáveis:

- “Horário indisponível”
- “Profissional sem disponibilidade”
- “Este horário já foi reservado”
- “Agendamento inválido”

NÃO expor:
- stack traces
- erros internos
- SQL errors

========================================
FRONTEND — IMPLEMENTAR
========================================

Criar páginas:

/agenda
/agenda/novo
/agenda/[id]

========================================
COMPONENTES FRONTEND
========================================

Criar:

- CalendarView
- DayAgenda
- TimeSlots
- AppointmentCard
- AgendaFilters
- ProfessionalSelector
- ServiceSelector
- AppointmentModal
- ScheduleTimeline
- EmptyAgendaState
- AvailabilityIndicator

========================================
FUNCIONALIDADES FRONTEND
========================================

Implementar:

- visualizar agenda
- visualizar horários
- criar agendamento
- cancelar
- reagendar
- confirmar
- filtros
- seleção profissional
- seleção serviço
- seleção data
- timeline diária

========================================
UX/UI
========================================

Visual:
- moderno
- extremamente intuitivo
- mobile-first
- rápido
- visualmente leve

Inspirar-se:
- Calendly
- Google Calendar
- Fresha
- Booksy

EVITAR:
- aparência ERP
- excesso tabelas
- excesso informações
- poluição visual

========================================
PALETA
========================================

Primária:
#E26D7C

Hover:
#D85C6C

Secundária:
#FFE8E2

Destaque:
#7B4BFF

Accent:
#FFB3C1

Fundo:
#FFFDFC

Texto:
#2B2B2B

========================================
RESPONSIVIDADE
========================================

OBRIGATÓRIO:
- mobile-first
- excelente UX mobile
- touch-friendly
- adaptação tablet
- adaptação desktop

========================================
MOBILE UX
========================================

Implementar:
- agenda vertical
- cards touch
- slots fáceis clicar
- navegação rápida
- modal mobile otimizado

========================================
DASHBOARD INTEGRAÇÃO
========================================

Integrar dashboard já existente:
- agenda do dia
- próximos atendimentos
- KPIs futuros

========================================
PREPARAÇÃO FUTURA
========================================

Preparar arquitetura para:

- WhatsApp confirmações
- lembretes automáticos
- CRM
- campanhas
- IA
- dashboard analítico
- cliente final
- múltiplas unidades

========================================
SEGURANÇA
========================================

Garantir:
- isolamento tenant
- validação JWT
- proteção rotas
- proteção APIs
- validação ownership

========================================
PERFORMANCE
========================================

Priorizar:
- queries eficientes
- índices
- cache futuro preparado
- engine otimizada
- paginação futura preparada

========================================
RESULTADO ESPERADO
========================================

Gerar:

- engine inteligente de agendamento
- backend operacional completo
- frontend agenda funcional
- criação real de agendamentos
- cancelamento
- reagendamento
- cálculo inteligente horários
- UX premium moderna
- arquitetura escalável
- código limpo
- estrutura preparada para evolução futura

O resultado final deve transmitir:
“o Bellory organiza automaticamente a operação do salão.”

========================================

ADENDO1:

EXECUÇÃO DA ETAPA-7B

Abaixo está o prompt profissional consolidado para o CODEX executar a evolução arquitetural da Agenda Bellory, alinhando:
•	a implementação atual da ETAPA-7
com
•	a arquitetura definitiva definida em agenda.md.
Esse prompt foi estruturado para:
•	preservar a engine já implementada
•	evitar retrabalho
•	evitar refatoração destrutiva
•	transformar a Agenda em núcleo operacional enterprise-ready
•	preparar IA, realtime, analytics e escalabilidade futura.
________________________________________
2.5.1.1 - EXECUÇÃO DA ETAPA-7B
(Evolução Arquitetural da Agenda)

CONTEXTO:

O Bellory já possui implementado:

- engine operacional de agendamento
- cálculo de disponibilidade
- prevenção de conflitos
- múltiplos profissionais
- frontend funcional da agenda
- backend Node.js
- Supabase PostgreSQL
- autenticação JWT
- arquitetura multi-tenant
- dashboard integrado
- onboarding funcional
- dashboard funcional
- mobile-first

A implementação atual da ETAPA-7 está correta.

IMPORTANTE:
NÃO recriar a Agenda.
NÃO destruir a engine atual.
NÃO refatorar tudo do zero.

Objetivo:
EVOLUIR a engine atual para alinhar com:
docs/modules/agenda.md

A Agenda agora deve evoluir de:
- agenda operacional avançada

para:
- ENGINE OPERACIONAL CENTRAL DO BELLORY

IMPORTANTE:
Esta etapa NÃO deve implementar:
- IA completa
- CRM completo
- Campaigns completos
- financeiro
- chatbot
- automações completas WhatsApp

Implementar apenas:
- preparação arquitetural
- evolução da engine
- inteligência operacional
- desacoplamento
- analytics-ready
- realtime-ready
- AI-ready signals

========================================
OBJETIVOS PRINCIPAIS
========================================

1. Evoluir Agenda para engine operacional central
2. Melhorar heurística de ocupação
3. Melhorar encaixes inteligentes
4. Implementar slot ranking
5. Preparar arquitetura event-driven
6. Preparar realtime futuro
7. Preparar IA futura
8. Melhorar observabilidade operacional
9. Melhorar desacoplamento engine
10. Melhorar analytics operacionais

========================================
BACKEND
========================================

EVOLUIR:

backend/src/modules/agenda/

MANTER:
- APIs atuais
- CRUD atual
- estrutura atual

EVOLUIR:
- engine
- heurísticas
- domain layer
- observabilidade
- inteligência operacional

========================================
ARQUITETURA DOMAIN-DRIVEN
========================================

SEPARAR claramente:

1. Agenda CRUD
2. Agenda Engine
3. Agenda Domain Logic

CRIAR:

backend/src/modules/agenda/domain/

Objetivo:
desacoplar:
- regras operacionais
- heurísticas
- inteligência agenda

do CRUD tradicional.

========================================
OCCUPANCY ENGINE
========================================

CRIAR:

OccupancyEngine

Responsável por:

- calcular score ocupação
- reduzir horários mortos
- melhorar distribuição horários
- priorizar encaixes inteligentes
- evitar espaços ruins
- sugerir melhores horários

IMPORTANTE:

Hoje:
o sistema apenas encontra horários válidos.

Novo objetivo:
o sistema deve ranquear os MELHORES horários.

========================================
SLOT RANKING
========================================

Implementar:

ranking de horários disponíveis.

Critérios:

- menor espaço morto
- melhor ocupação
- menor fragmentação agenda
- proximidade operacional
- agrupamento inteligente atendimentos

Cada slot deve possuir:

- occupancy_score
- ranking_score
- slot_quality

========================================
EXEMPLO OPERACIONAL
========================================

Agenda:
10:00 → 10:45
11:30 → 12:15

Serviço:
45 minutos

O sistema deve:

NÃO apenas:
- listar horários válidos

MAS:
- priorizar horários que reduzam buracos
- sugerir encaixes inteligentes
- melhorar eficiência operacional

========================================
ADVANCED AVAILABILITY ENGINE
========================================

EVOLUIR engine atual para considerar:

- ocupação futura
- fragmentação agenda
- qualidade encaixe
- previsão buracos
- score operacional

========================================
DOMAIN EVENTS
========================================

CRIAR:

backend/src/modules/agenda/events/

Preparar eventos:

- appointment.created
- appointment.confirmed
- appointment.cancelled
- appointment.rescheduled
- appointment.completed
- slot.occupied
- occupancy.changed

IMPORTANTE:

NÃO implementar filas completas agora.

Preparar arquitetura para:
- pub/sub
- event-driven
- realtime
- automações futuras

========================================
ANALYTICS HOOKS
========================================

CRIAR métricas operacionais:

- occupancy_rate
- cancellation_rate
- no_show_rate
- average_gap_time
- slot_efficiency
- agenda_fragmentation

IMPORTANTE:

Preparar consumo futuro:
- dashboard
- AI Engine
- CRM
- analytics

========================================
AI-READY SIGNALS
========================================

Preparar estrutura para IA futura.

CRIAR:

backend/src/modules/agenda/signals/

Gerar sinais:

- high_cancellation_risk
- low_occupancy_period
- recurring_client_pattern
- ideal_return_window
- schedule_fragmentation
- high_no_show_window

NÃO implementar IA real agora.

Apenas:
- estrutura
- providers
- sinais
- contexto

========================================
REALTIME PREPARATION
========================================

Preparar arquitetura para:

- websocket
- realtime agenda
- pub/sub
- subscriptions
- optimistic updates

IMPORTANTE:
NÃO implementar websocket completo ainda.

Preparar:
- abstrações
- services
- eventos

========================================
MULTI-SERVICE PREPARATION
========================================

Preparar arquitetura para:

- múltiplos serviços no mesmo atendimento
- duração combinada
- múltiplos profissionais
- dependências serviços

NÃO implementar fluxo completo ainda.

========================================
MULTI-PROFESSIONAL EVOLUTION
========================================

Preparar engine para:

- atendimento colaborativo
- recursos compartilhados
- múltiplos profissionais simultâneos

========================================
OBSERVABILIDADE
========================================

CRIAR:

logs operacionais agenda.

Registrar:

- conflitos
- cancelamentos
- reagendamentos
- ocupação
- fragmentação
- performance cálculos

Preparar:
- telemetry futura
- audit trail
- métricas IA

========================================
FRONTEND
========================================

EVOLUIR:

frontend/src/components/agenda/

MANTER:
- componentes atuais

ADICIONAR:

- slot ranking visual
- quality indicators
- occupancy indicators
- smart suggestions

========================================
NOVOS COMPONENTES
========================================

Criar:

- SmartSlotSuggestions
- OccupancyIndicator
- SlotRankingBadge
- AgendaInsights
- ScheduleOptimizationHints

========================================
HOOK
========================================

EVOLUIR:

useAgenda()

Adicionar:

- smart suggestions
- occupancy data
- slot ranking
- analytics states
- polling inteligente

========================================
SERVICE
========================================

EVOLUIR:

agenda.service.ts

Adicionar suporte:
- occupancy APIs
- analytics APIs
- signals APIs
- ranking APIs

========================================
UX/UI
========================================

A Agenda deve parecer:

- extremamente inteligente
- operacional
- rápida
- elegante
- mobile-first
- invisivelmente automatizada

O usuário deve sentir:

"O Bellory organiza automaticamente meus horários."

========================================
MOBILE-FIRST
========================================

MANTER:
- UX touch
- timeline vertical
- slots simples

ADICIONAR:
- sugestões inteligentes
- badges visuais
- indicadores ocupação

========================================
PERFORMANCE
========================================

OTIMIZAR:

- cálculos disponibilidade
- queries agenda
- cálculo slots
- ranking engine

PREPARAR:
- cache futuro
- workers futuros
- processamento assíncrono
- memoization futura

========================================
SEGURANÇA
========================================

MANTER:

- JWT validation
- tenant validation
- ownership validation
- isolamento multi-tenant

Toda inteligência deve respeitar:
- tenant_id
- escopo usuário
- permissões

========================================
IMPORTANTE
========================================

NÃO:
- quebrar engine atual
- recriar agenda do zero
- remover APIs existentes

FAZER:
- evolução incremental
- melhoria arquitetural
- preparação enterprise
- desacoplamento progressivo

========================================
RESULTADO ESPERADO
========================================

Gerar:

- occupancy engine
- slot ranking
- analytics-ready architecture
- event-driven preparation
- AI-ready signals
- observabilidade operacional
- engine desacoplada
- realtime-ready architecture
- agenda intelligence layer
- arquitetura enterprise SaaS

A Agenda deve representar:

- engine operacional inteligente
- núcleo operacional Bellory
- motor de ocupação inteligente
- sistema ativo de organização

O usuário deve sentir:

"O Bellory organiza automaticamente toda minha operação."

========================================

ADENDO2:

AJUSTES NO AGENDAMENTO

Transformar a Agenda Bellory,
De: agenda simples baseada no salão
Para: engine real de disponibilidade por profissional
Esse é exatamente o comportamento esperado em:
•	SaaS profissional
•	agenda multi-profissional
•	operação real de salão
•	arquitetura enterprise-ready
O ponto crítico é:
O horário do SALÃO deve ser apenas o padrão (fallback).
Enquanto:
o horário do PROFISSIONAL deve prevalecer sempre que existir configuração própria.
Isso muda completamente:
•	cálculo disponibilidade
•	encaixes
•	agenda
•	conflitos
•	ocupação
•	regras operacionais
________________________________________
IMPLEMENTAÇÃO — DISPONIBILIDADE AVANÇADA POR PROFISSIONAL

CONTEXTO:

O Bellory já possui:

- Agenda Engine
- cálculo de disponibilidade
- prevenção conflitos
- horários do salão
- múltiplos profissionais
- multi-tenant
- backend Node.js
- Supabase PostgreSQL

Foi identificado que:
a disponibilidade operacional NÃO pode depender apenas:
- do horário do salão

Cada profissional pode possuir:
- horários próprios
- intervalos próprios
- exceções semanais próprias
- escalas diferenciadas

Portanto:
a Agenda Engine deve evoluir para:
- disponibilidade individual por profissional
- fallback inteligente
- escalas diferenciadas
- regras semanais específicas

==================================================
OBJETIVO PRINCIPAL
==================================================

Implementar:

- disponibilidade individual por profissional
- fallback para horário do salão
- exceções semanais
- múltiplas janelas trabalho
- múltiplas janelas intervalo
- cálculo real de disponibilidade

==================================================
REGRA PRINCIPAL
==================================================

SE:

o profissional possuir configuração própria:
- usar configuração profissional

SENÃO:
- usar configuração padrão do salão

==================================================
EXEMPLO
==================================================

SALÃO:
08:00 → 18:00

PROFISSIONAL:
09:00 → 17:00

Resultado:
usar:
09:00 → 17:00

==================================================
NOVA ARQUITETURA
==================================================

A disponibilidade deverá considerar:

1. horário padrão salão
2. horário específico profissional
3. exceções semanais
4. intervalos individuais
5. dias não trabalhados
6. duração serviço
7. conflitos agenda
8. ocupação inteligente

==================================================
DATABASE
==================================================

CRIAR estrutura para:
- escalas profissionais
- exceções semanais
- horários diferenciados

==================================================
TABELA
==================================================

Criar:

```text id="t1p9vo"
professional_schedules
==================================================
ESTRUTURA
id UUID
tenant_id UUID
user_id UUID

weekday INTEGER

work_start_morning TIME
work_end_morning TIME

work_start_afternoon TIME
work_end_afternoon TIME

break_start TIME
break_end TIME

is_working BOOLEAN

is_exception BOOLEAN

created_at TIMESTAMP
updated_at TIMESTAMP
==================================================
SEMÂNTICA
weekday:
0 = domingo
1 = segunda
2 = terça
3 = quarta
4 = quinta
5 = sexta
6 = sábado
==================================================
CENÁRIO 1
User-1:
Segunda/Terça/Quinta/Sexta:
08:00 → 12:00
13:00 → 17:00
Intervalo:
12:00 → 13:00
Quarta:
não trabalha manhã
13:00 → 19:00
==================================================
CENÁRIO 2
User-2:
Dias normais:
09:00 → 13:00
14:00 → 18:00
Intervalo:
13:00 → 14:00
Sábado:
10:00 → 14:00
14:30 → 18:30
Intervalo:
14:00 → 14:30
==================================================
IMPORTANTE
A engine NÃO pode assumir:
•	horários fixos
•	horários iguais
•	mesma escala todos profissionais
==================================================
FALLBACK OBRIGATÓRIO
Se o profissional NÃO possuir escala própria:
usar:
•	horário padrão salão
==================================================
SERVIÇO
A duração do serviço deve continuar sendo considerada.
Exemplo:
Serviço:
45 minutos
Slot só é válido se:
•	houver tempo contínuo disponível
•	dentro da escala profissional
•	respeitando intervalos
•	respeitando conflitos
==================================================
ENGINE
EVOLUIR:
AvailabilityEngine
Adicionar suporte:
•	professional schedule
•	weekly exceptions
•	schedule overrides
•	break windows
•	working windows
==================================================
ARQUITETURA
Separar:
1.	salon availability
2.	professional availability
3.	final merged availability
==================================================
PRIORIDADE
Prioridade cálculo:
1.	exceção profissional
2.	escala profissional
3.	escala salão
==================================================
EXEMPLO LÓGICO
Se:
quarta-feira
Profissional:
13:00 → 19:00
Salão:
08:00 → 18:00
Resultado:
13:00 → 19:00
==================================================
INTERVALOS
A engine deve:
•	bloquear intervalo
•	impedir encaixe parcial
•	impedir serviços atravessando intervalo
==================================================
EXEMPLO
Intervalo:
12:00 → 13:00
Serviço:
11:30 → 12:15
Resultado:
INVÁLIDO
==================================================
MULTI-JANELAS
A engine deve suportar:
•	manhã
•	tarde
•	múltiplas janelas futuras
==================================================
PREPARAÇÃO FUTURA
Preparar arquitetura para:
•	escalas especiais
•	feriados
•	férias
•	bloqueios temporários
•	afastamentos
•	eventos
•	plantões
•	horários sazonais
==================================================
REGRAS IMPORTANTES
O profissional pode:
•	trabalhar menos que salão
•	trabalhar mais que salão
•	não trabalhar determinados dias
•	possuir intervalos diferentes
•	possuir horários especiais
==================================================
FRONTEND
CRIAR:
/configuracoes/equipe/[id]/agenda
Permitir configurar:
•	horários semanais
•	intervalos
•	exceções
•	dias não trabalhados
==================================================
COMPONENTES
Criar:
•	WeeklyScheduleEditor
•	ProfessionalScheduleForm
•	BreakTimeEditor
•	WorkingDaysSelector
•	ScheduleExceptionEditor
==================================================
UX/UI
A experiência deve ser:
•	extremamente simples
•	visual
•	intuitiva
•	mobile-first
==================================================
MOBILE-FIRST
NO MOBILE:
Editar horários através:
•	cards
•	selects simples
•	time pickers touch-friendly
Evitar:
•	tabelas complexas
•	grids administrativos
==================================================
VALIDAÇÕES
Impedir:
•	horários inválidos
•	sobreposição intervalos
•	início maior que fim
•	janelas conflitantes
==================================================
MULTI-TENANT
Toda escala deve respeitar:
•	tenant_id
•	ownership
•	user_id
==================================================
PERFORMANCE
Otimizar:
•	cálculo disponibilidade
•	merges horários
•	filtros conflitos
•	queries agenda
Preparar:
•	cache futuro
•	memoization
•	realtime futuro
==================================================
ANALYTICS FUTURO
Preparar métricas:
•	ocupação profissional
•	horas disponíveis
•	eficiência agenda
•	gaps operacionais
==================================================
AI FUTURA
Preparar sinais:
•	baixa ocupação
•	excesso carga
•	horários ociosos
•	padrões atendimento
==================================================
IMPORTANTE
NÃO:
•	usar horários hardcoded
•	assumir horário único
•	depender apenas salão
FAZER:
•	engine profissional real
•	fallback inteligente
•	escalas individuais
•	arquitetura flexível
==================================================
RESULTADO ESPERADO
Gerar:
•	engine disponibilidade profissional
•	fallback para salão
•	suporte exceções semanais
•	intervalos individuais
•	horários personalizados
•	arquitetura enterprise-ready
•	Agenda operacional real
O usuário deve sentir:
“O Bellory entende automaticamente os horários reais de cada profissional.”
==================================================

ADENDO3:

PARÂMETROS DO AGENDAMENTO


Esses campos definem as **regras operacionais da agenda** do salão/tenant. Eles não são só “cadastro”; eles orientam como o Bellory deve permitir, sugerir ou bloquear agendamentos.

**Antecedência mínima (min)**  
Define com quanto tempo mínimo de antecedência um cliente pode marcar um horário.

Exemplo: se estiver `60`, um cliente não consegue agendar para daqui 10 minutos. O primeiro horário permitido será pelo menos 60 minutos no futuro.

Uso: evita agendamentos em cima da hora e dá tempo para o salão se organizar.

**Janela de agenda (dias)**  
Define até quantos dias no futuro a agenda ficará aberta para marcações.

Exemplo: se estiver `30`, o cliente só pode agendar até 30 dias à frente.

Uso: evita marcações muito distantes, reduz remarcações e mantém previsibilidade operacional.

**Tolerância de atraso (min)**  
Define quantos minutos de atraso ainda são considerados aceitáveis antes do atendimento virar problema operacional.

Exemplo: se estiver `10`, um cliente com até 10 minutos de atraso ainda pode ser tratado como dentro da tolerância.

Uso futuro: sinalizar risco de atraso, no-show, reagendamento, encaixe ou impacto nos próximos horários.

**Intervalo padrão (min)**  
Define a “grade” base da agenda, ou seja, de quanto em quanto tempo os horários são oferecidos.

Exemplo: se estiver `15`, a agenda pode sugerir horários como `09:00`, `09:15`, `09:30`, `09:45`.  
Se estiver `30`, sugere `09:00`, `09:30`, `10:00`.

Uso: organiza a visualização da agenda e influencia o motor de disponibilidade.

**Limite cancelamento (h)**  
Define até quantas horas antes do atendimento o cliente pode cancelar sozinho.

Exemplo: se estiver `24`, o cliente só pode cancelar pelo sistema até 24 horas antes do horário. Depois disso, o cancelamento pode exigir contato manual.

Uso: protege o salão contra cancelamentos em cima da hora e ajuda campanhas futuras de confirmação/lembrete.

Resumo prático: esses campos são as “regras de convivência” da agenda. Eles dizem ao Bellory quando pode agendar, até quando pode agendar, como lidar com atrasos, como montar os horários e até quando o cliente pode cancelar.
==================================================

ADENDO4:
SEGURANÇA PARA AGENDAMENTOS
Segue o prompt para implementar corretamente:
•	identidade operacional progressiva
•	antifraude leve
•	confirmação dupla
•	políticas de confirmação
•	validações operacionais
•	controle contextual
•	preparação WhatsApp
•	arquitetura preparada para trust-score futuro
SEM ainda implementar:
•	integração real WhatsApp
•	webhooks
•	templates
•	Cloud API
O prompt também considera:
•	que já existe uma estrutura de Agenda implementada;
•	que a engine atual NÃO deve ser quebrada;
•	que a solução deve evoluir incrementalmente.
________________________________________
IMPLEMENTAÇÃO — IDENTIDADE OPERACIONAL E FLUXO DE CONFIRMAÇÃO DE AGENDAMENTOS

CONTEXTO:

O Bellory já possui implementado:

- Agenda Engine
- Availability Engine
- Occupancy Engine
- Dashboard
- onboarding
- arquitetura multi-tenant
- backend Node.js
- Supabase PostgreSQL
- autenticação JWT
- cálculo disponibilidade
- prevenção conflitos
- slots inteligentes
- mobile-first

IMPORTANTE:

Já existe uma estrutura funcional de Agenda implementada.

NÃO:
- recriar Agenda
- quebrar fluxo atual
- refatorar engine do zero

FAZER:
- evolução incremental
- proteção operacional
- confirmação contextual
- antifraude leve
- identidade operacional progressiva

==================================================
OBJETIVO PRINCIPAL
==================================================

Implementar:

- identidade operacional cliente
- token persistente cliente
- confirmação dupla operacional
- fluxo pendente confirmação
- antifraude contextual
- políticas operacionais
- validações comportamentais
- preparação WhatsApp futura

==================================================
IMPORTANTE
==================================================

NÃO implementar ainda:

- WhatsApp Cloud API
- envio real mensagens
- webhooks WhatsApp
- OTP real
- templates reais
- integração Meta

FAZER:
- arquitetura preparada
- services preparados
- status preparados
- eventos preparados
- placeholders preparados

==================================================
CONCEITO PRINCIPAL
==================================================

O Bellory NÃO utilizará:
- login/senha obrigatório cliente

O Bellory utilizará:
- identidade operacional progressiva
- token persistente
- confiança contextual
- confirmação operacional

==================================================
IDENTIDADE OPERACIONAL
==================================================

CRIAR:

```text id="opid01"
client_identity
Objetivo:
•	reconhecer cliente
•	reduzir fricção
•	evitar fraude simples
•	evitar múltiplos nomes
•	evitar abuso operacional


==================================================
TOKEN CLIENTE
CRIAR:
client_token
Persistente.
Associado a:
•	cliente
•	tenant
•	WhatsApp
•	device fingerprint leve
•	contexto operacional
==================================================
COMPORTAMENTO
Se cliente já possui:
•	token válido
•	device conhecido
Então:
•	não solicitar novamente todos os dados
==================================================
DATABASE
EVOLUIR entidade cliente.
Adicionar:
client_token VARCHAR
trusted_device_hash VARCHAR NULL

trust_score INTEGER DEFAULT 0

last_known_device VARCHAR NULL
last_known_ip VARCHAR NULL

identity_status VARCHAR DEFAULT 'normal'
==================================================
STATUS IDENTIDADE
Possíveis:
normal
suspeito
bloqueado
validacao_pendente
==================================================
TRUST SCORE
Preparar estrutura para:
trust_score
==================================================
OBJETIVO FUTURO
Permitir:
•	menos fricção clientes confiáveis
•	mais validação clientes suspeitos
==================================================
PREPARAR EVENTOS
Preparar estrutura para:
•	comparecimento
•	cancelamentos
•	confirmações rápidas
•	no-show
•	devices suspeitos
•	múltiplos nomes
•	múltiplos tokens
==================================================
NÃO IMPLEMENTAR IA AGORA
Apenas:
•	estrutura
•	campos
•	eventos
•	services
==================================================
NOVO FLUXO AGENDA
Fluxo correto:
SOLICITADO
↓
PENDENTE_ATENDENTE
↓
PENDENTE_CLIENTE
↓
CONFIRMADO
↓
CONCLUIDO
==================================================
NOVOS STATUS
Adicionar:
PENDENTE_ATENDENTE
PENDENTE_CLIENTE

EXPIRADO_ATENDENTE
EXPIRADO_CLIENTE

SUSPEITO
==================================================
CONFIRMAÇÃO ATENDENTE
Após cliente solicitar:
•	agenda NÃO nasce confirmada
Ela nasce:
PENDENTE_ATENDENTE
==================================================
COMPORTAMENTO
Profissional:
•	aprova
OU
•	rejeita
OU
•	ignora
==================================================
TIMEOUT
Implementar timeout configurável.
Exemplo:
15 minutos
30 minutos
60 minutos
==================================================
SEM CONFIRMAÇÃO ATENDENTE
Ao expirar:
•	agenda cancelada automaticamente
•	slot liberado
•	status:
EXPIRADO_ATENDENTE
==================================================
CONFIRMAÇÃO CLIENTE
Após confirmação atendente:
status:
PENDENTE_CLIENTE
Cliente deverá:
•	confirmar presença
==================================================
IMPORTANTE
NÃO implementar envio WhatsApp ainda.
Preparar apenas:
•	estrutura
•	services
•	placeholders
•	eventos
==================================================
SEM CONFIRMAÇÃO CLIENTE
Ao expirar:
•	comportamento depende política salão
==================================================
CRIAR
confirmation_policy
==================================================
POLÍTICAS
Possíveis:
strict
flexible
auto_confirm
==================================================
STRICT
Sem confirmação cliente:
•	cancela automaticamente
==================================================
FLEXIBLE
Profissional decide.
==================================================
AUTO_CONFIRM
Ignora confirmação cliente.
==================================================
CONFIGURAÇÃO
Adicionar em:
/configuracoes/operacao
==================================================
LIMITES OPERACIONAIS
NÃO usar limite fixo rígido.
NÃO bloquear automaticamente:
2 agendamentos semana
==================================================
IMPLEMENTAR
Soft operational limits.
==================================================
CRIAR
weekly_booking_limit
Configurável por tenant.
==================================================
COMPORTAMENTO
Ao exceder:
•	gerar alerta operacional
•	aumentar trust risk
•	profissional decide
==================================================
NÃO BLOQUEAR DIRETAMENTE
A menos que:
•	tenant configure
==================================================
DEVICE VALIDATION
Se:
•	cancelamento
•	alteração crítica
for feito:
•	mesmo token/device
→ permitir normalmente
==================================================
OUTRO DEVICE
Se:
•	outro token
•	outro device
•	outro contexto
Preparar:
•	validação WhatsApp futura
•	OTP futura
==================================================
IMPORTANTE
NÃO implementar OTP agora.
Preparar:
•	hooks
•	services
•	eventos
•	placeholders
==================================================
DEVICE FINGERPRINT

Implementar fingerprint operacional leve.

OBJETIVO:
- reconhecer contexto operacional do cliente
- reduzir fraude simples
- reduzir abuso operacional
- reduzir múltiplos nomes mesmo dispositivo
- reduzir cancelamentos suspeitos

IMPORTANTE:

NÃO usar fingerprint invasivo.
O fingerprint NÃO deve:
- identificar absolutamente o usuário
- bloquear automaticamente
- funcionar como segurança bancária
- coletar dados invasivos
- realizar rastreamento agressivo

O fingerprint deve funcionar apenas como:
- sinal contextual
- indicador confiança operacional
- apoio ao trust_score

==================================================
ANTIFRAUDE LEVE
Implementar:
 múltiplos cancelamentos
 múltiplos nomes
 múltiplos agendamentos
 excesso tentativas
==================================================
IMPLEMENTAR APENAS
==================================================

Fingerprint leve baseado em:
- browser hash simples
- device hash simples
- session context

==================================================
EXEMPLOS
==================================================

Browser hash:
- user-agent resumido
- idioma
- timezone
- plataforma
- resolução

Device hash:
- mobile/desktop
- navegador
- sistema operacional

Session context:
- token atual
- tenant_id
- contexto operacional
- última sessão conhecida

==================================================
IMPORTANTE
==================================================

NÃO implementar:
- canvas fingerprint
- audio fingerprint
- tracking invasivo
- fingerprint bancário
- rastreamento oculto

==================================================
LGPD
==================================================

A implementação deve:
- minimizar coleta dados
- evitar identificação excessiva
- evitar persistência invasiva
- respeitar privacidade usuário

==================================================
COMPORTAMENTO ESPERADO
==================================================

Mesmo contexto:
- menor fricção

Contexto diferente:
- aumentar confiança necessária
- preparar validação futura WhatsApp

==================================================
IMPORTANTE
==================================================

Fingerprint deve:
- aumentar ou reduzir trust_score

Fingerprint NÃO deve:
- bloquear automaticamente sozinho  
==================================================
ANTIFRAUDE LEVE
Implementar:
•	múltiplos cancelamentos
•	múltiplos nomes
•	múltiplos agendamentos
•	excesso tentativas
==================================================
RATE LIMIT
Preparar:
•	limite solicitações
•	flood protection
Exemplo:
3 solicitações em 10 minutos
==================================================
BLACKLIST FUTURA
Preparar estrutura:
blocked_clients
==================================================
EVENTS
CRIAR:
appointment.requested
appointment.pending_attendant
appointment.pending_client
appointment.confirmed
appointment.expired_attendant
appointment.expired_client
appointment.suspicious
==================================================
WHATSAPP PREPARATION
CRIAR:
NotificationProvider
==================================================
IMPORTANTE
Provider deve suportar futuro:
•	WhatsApp
•	SMS
•	Push
•	Email
==================================================
NÃO IMPLEMENTAR ENVIO REAL
Apenas:
•	interfaces
•	abstrações
•	providers
•	placeholders
==================================================
CRIAR PLACEHOLDERS
Exemplo:
sendPendingAttendantConfirmation()

sendPendingClientConfirmation()

sendAppointmentExpiredNotification()
==================================================
FRONTEND
EVOLUIR:
•	agenda
•	dashboard
•	status cards
•	timeline agenda
==================================================
EXIBIR STATUS
Exemplos:
Aguardando confirmação profissional

Aguardando sua confirmação

Expirado

Confirmado
==================================================
MOBILE-FIRST
OBRIGATÓRIO:
Fluxo deve ser:
•	extremamente simples
•	baixa fricção
•	touch-friendly
==================================================
MULTI-TENANT
Toda lógica deve respeitar:
•	tenant_id
•	ownership
•	permissions
==================================================
SEGURANÇA
Implementar:
•	token validation
•	ownership validation
•	anti replay básico
•	expiração tokens
•	contexto operacional
==================================================
NÃO FAZER
NÃO:
•	exigir login cliente
•	criar fricção excessiva
•	bloquear agressivamente
•	criar UX bancária
==================================================
FAZER
FAZER:
•	confiança progressiva
•	antifraude leve
•	confirmação contextual
•	UX fluida
•	arquitetura preparada WhatsApp
==================================================
RESULTADO ESPERADO
Gerar:
•	identidade operacional progressiva
•	confirmação dupla
•	proteção operacional
•	antifraude contextual
•	trust-ready architecture
•	WhatsApp-ready architecture
•	Agenda enterprise-ready
O usuário deve sentir:
“O Bellory organiza e protege automaticamente os agendamentos sem complicar a experiência.”