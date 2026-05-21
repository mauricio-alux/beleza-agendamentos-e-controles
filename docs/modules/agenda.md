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