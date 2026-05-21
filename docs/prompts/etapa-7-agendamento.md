considerando:
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








Implementei a ETAPA-7: Motor Inteligente de Agendamento do Bellory.

**Backend**
Criado módulo `agenda` com:

- `GET /agenda/meta`
- `GET /agenda/disponibilidade`
- `GET /agenda`
- `GET /agenda/:id`
- `POST /agenda`
- `PATCH /agenda/:id`
- `PATCH /agenda/:id/cancelar`
- `PATCH /agenda/:id/reagendar`
- `PATCH /agenda/:id/confirmar`

Inclui:

- engine de disponibilidade
- validação de escala semanal
- duração real do serviço/profissional
- bloqueio de horários passados
- antecedência mínima
- intervalo/almoço
- conflitos com agendamentos existentes
- bloqueios de agenda
- criação de cliente quando necessário
- criação real em `agendamentos` e `agendamento_servicos`
- histórico de status
- rollback simples para evitar registros órfãos

Também criei a migration:

- `database/migrations/20260519110000_agenda_engine_indexes.sql`

com índices para performance em agenda, escala, bloqueios, serviços e profissionais.

**Frontend**
Substituí o placeholder de `/agenda` por uma agenda funcional e criei:

- `/agenda`
- `/agenda/novo`
- `/agenda/[id]`

Componentes criados:

- `CalendarView`
- `DayAgenda`
- `TimeSlots`
- `AppointmentCard`
- `AgendaFilters`
- `ProfessionalSelector`
- `ServiceSelector`
- `AppointmentModal`
- `ScheduleTimeline`
- `EmptyAgendaState`
- `AvailabilityIndicator`
- `NewAppointmentForm`
- `AppointmentDetail`

Também criei:

- `frontend/src/services/agenda.service.ts`
- `frontend/src/hooks/useAgenda.ts`

**Dashboard**
Integrei o dashboard com a agenda: agora ele tenta carregar atendimentos reais do dia via `/agenda`.

**Validação**
Executado com sucesso:

```bash
npm run build
```

Também validei:

```text
http://127.0.0.1:3000/public/health -> 200 OK
http://127.0.0.1:3000/agenda/meta -> 401 sem token, esperado
http://127.0.0.1:3001/agenda -> 200 OK
```

Backend e frontend foram reiniciados localmente para carregar as novas rotas.