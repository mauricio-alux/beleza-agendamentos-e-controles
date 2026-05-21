Essa decisão arquitetural é extremamente importante porque ela define a espinha dorsal técnica do Bellory.
O 003-backend-first.md formaliza uma escolha estratégica crítica:
O Bellory NÃO será construído começando pela interface.
Ele será construído começando pelo domínio operacional.
Essa decisão impacta:
•	escalabilidade
•	multi-tenant
•	IA
•	integrações
•	WhatsApp
•	performance
•	segurança
•	consistência operacional
Esse é um dos principais motivos pelos quais muitos SaaS falham:
•	começam pelo frontend
•	acoplam lógica na interface
•	criam regras espalhadas
•	tornam impossível escalar
O Bellory deve fazer o contrário:
•	backend primeiro
•	domínio primeiro
•	engine primeiro
•	APIs primeiro
•	frontend como camada consumidora
O usuário nunca verá essa decisão diretamente…
mas ela é uma das maiores responsáveis pela:
•	estabilidade
•	velocidade
•	capacidade futura de crescimento
Abaixo está a especificação consolidada profissional do ADR.
________________________________________
docs/decisions/003-backend-first.md
# ADR-003 — Estratégia Backend-First

# Status

ACEITO

# Contexto

O Bellory foi concebido como uma plataforma SaaS:
- multi-tenant
- orientada operação
- altamente integrada
- preparada para IA
- preparada para automações
- preparada para crescimento escalável

Durante a definição arquitetural do projeto foi identificado que:

A maior parte dos sistemas SaaS pequenos:
- nasce frontend-first
- concentra regras na interface
- mistura UI com negócio
- possui APIs frágeis
- torna-se difícil de escalar

Também foi identificado que:
- o Bellory possui forte complexidade operacional
- múltiplos módulos dependem dos mesmos dados
- a Agenda é uma engine operacional crítica
- IA futura exigirá domínio bem estruturado

# Problema

Definir:
qual deve ser a estratégia principal de construção arquitetural do Bellory.

As opções consideradas foram:

## Opção 1
Frontend-first.

## Opção 2
Fullstack simultâneo sem prioridade arquitetural.

## Opção 3
Backend-first com frontend desacoplado.

# Decisão

Foi decidido que:

> O Bellory seguirá estratégia backend-first.

A arquitetura deverá priorizar:

- domínio operacional
- APIs
- regras negócio
- engines operacionais
- multi-tenant
- segurança
- integridade dados

O frontend funcionará como:
- camada apresentação
- camada experiência
- consumidor APIs

# Motivação Estratégica

A decisão foi tomada porque:

## 1. Complexidade operacional

O Bellory possui:
- agenda inteligente
- CRM
- campanhas
- IA
- WhatsApp
- automações

Todas essas camadas dependem:
- do mesmo domínio operacional
- das mesmas regras negócio

## 2. Escalabilidade futura

Backend-first facilita:
- crescimento módulos
- integrações
- APIs públicas
- mobile futuro
- IA futura
- realtime futuro

## 3. Reutilização operacional

A lógica backend poderá ser consumida por:
- frontend web
- PWA
- mobile app futuro
- WhatsApp
- APIs externas
- integrações futuras

## 4. Redução de acoplamento

Separar:
- lógica negócio
- apresentação visual

reduz:
- retrabalho
- bugs
- inconsistência operacional

## 5. Segurança multi-tenant

A segurança do Bellory depende:
- isolamento tenant
- ownership validation
- validação centralizada

Essas regras devem existir:
- no backend
- nunca apenas frontend

# Consequências Arquiteturais

Toda lógica crítica deverá existir:
- backend
- services
- engines
- validators
- repositories

Nunca:
- exclusivamente frontend

# Consequências Técnicas

O frontend deverá:
- consumir APIs
- evitar regras complexas
- evitar validações críticas locais
- atuar como camada UX

# Consequências Operacionais

O backend passa a centralizar:

- Agenda Engine
- CRM Rules
- Campaign Rules
- WhatsApp Logic
- AI Context
- Permissions
- Ownership
- Multi-tenant Isolation

# Estrutura Arquitetural

## Backend

```text
backend/src/modules/
Cada módulo deve possuir:
controllers/
services/
repositories/
validators/
routes/
dto/
________________________________________
Engines Operacionais
Engines críticas devem permanecer backend:
Agenda Engine
Responsável por:
•	disponibilidade
•	encaixes
•	conflitos
•	horários
________________________________________
CRM Engine
Responsável por:
•	retenção
•	frequência
•	recorrência
________________________________________
Campaign Engine
Responsável por:
•	segmentações
•	campanhas
•	automações
________________________________________
AI Engine
Responsável por:
•	recomendações
•	previsões
•	insights
________________________________________
Frontend
O frontend deve funcionar como:
•	camada UX
•	camada visual
•	camada navegação
•	consumidor APIs
________________________________________
O que NÃO deve ficar no frontend
Nunca colocar no frontend:
•	regras multi-tenant
•	validações críticas
•	ownership validation
•	cálculos operacionais
•	regras Agenda
•	regras segurança
________________________________________
O que pode existir no frontend
Frontend pode conter:
•	validações UX
•	máscaras
•	loading
•	feedback visual
•	estados interface
________________________________________
APIs como Contrato Principal
As APIs passam a ser:
•	contrato oficial sistema
•	camada integração
•	ponto desacoplamento
________________________________________
Estratégia API-Driven
Todos os módulos devem ser:
•	API-first
•	desacoplados
•	consumíveis externamente
________________________________________
Consequências para IA
A IA dependerá:
•	domínio estruturado
•	APIs organizadas
•	contexto operacional consistente
Backend-first facilita:
•	pipelines IA
•	contexto IA
•	automações IA
•	integrações modelos
________________________________________
Consequências para WhatsApp
O WhatsApp deverá consumir:
•	APIs backend
•	tokens seguros
•	regras centralizadas
Nunca:
•	lógica operacional local
________________________________________
Consequências para Mobile Futuro
Backend-first permitirá:
•	app mobile nativo futuro
•	reutilização APIs
•	expansão multiplataforma
________________________________________
Consequências para Performance
Backend poderá otimizar:
•	queries
•	índices
•	cache
•	pipelines
•	filas
Sem depender frontend.
________________________________________
Consequências para Segurança
Toda segurança deverá permanecer:
•	centralizada backend
•	validada servidor
•	isolada tenant-aware
________________________________________
Multi-Tenant
Toda regra multi-tenant deve existir:
•	backend
•	middleware
•	services
•	repositories
Nunca apenas frontend.
________________________________________
Estratégia Frontend
Frontend deverá ser:
•	leve
•	componentizado
•	desacoplado
•	mobile-first
•	orientado UX
________________________________________
Estratégia Database
Banco deverá refletir:
•	domínio operacional
•	integridade relacional
•	ownership
•	tenant isolation
________________________________________
Estratégia de Escalabilidade
Backend-first prepara:
•	microsserviços futuros
•	filas
•	realtime
•	event-driven
•	workers
•	APIs públicas
________________________________________
Estratégia de Integrações
Permitir futuras integrações:
•	WhatsApp Cloud API
•	OpenAI
•	gateways pagamento
•	sistemas terceiros
•	marketplaces
________________________________________
Estratégia de Realtime
Preparar:
•	websocket
•	pub/sub
•	realtime dashboards
•	realtime agenda
________________________________________
Estratégia de Filas
Preparar:
•	filas mensagens
•	filas IA
•	processamento assíncrono
•	jobs futuros
________________________________________
Riscos Identificados
Maior esforço inicial backend
Backend-first:
•	exige modelagem mais cuidadosa
•	exige domínio mais bem definido
________________________________________
Frontend inicial mais lento
O frontend depende:
•	APIs estáveis
•	contratos definidos
________________________________________
Estratégia Mitigação
Mitigar através:
•	arquitetura modular
•	documentação módulos
•	ADRs
•	APIs padronizadas
•	DTOs consistentes
________________________________________
Diretriz Arquitetural Final
O Bellory deverá ser desenvolvido:
primeiro como plataforma operacional.
E depois:
•	como interface visual.
Nunca o contrário.
________________________________________
Resultado Esperado
O Bellory deverá possuir:
•	domínio sólido
•	APIs consistentes
•	regras centralizadas
•	escalabilidade real
•	IA preparada
•	multi-tenant robusto
________________________________________
Decisão Final
DECISÃO APROVADA:
O Bellory seguirá estratégia:
•	backend-first
•	API-driven
•	domain-driven
•	multi-tenant-aware
•	desacoplada frontend/backend
com frontend atuando como:
•	camada UX
•	camada visual
•	consumidor APIs