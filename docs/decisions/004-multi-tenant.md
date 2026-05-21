Essa é uma das decisões arquiteturais MAIS importantes do Bellory.
O 004-multi-tenant.md define:
•	como os dados serão isolados
•	como o SaaS será escalável
•	como a segurança será garantida
•	como franquias futuras funcionarão
•	como a IA manterá contexto separado
•	como o Bellory poderá crescer sem colapsar operacionalmente
Esse documento é a fundação do Bellory como SaaS real.
Sem multi-tenant corretamente definido:
•	o sistema vira aplicação monousuário
•	segurança fica vulnerável
•	IA mistura dados
•	dashboards vazam informações
•	escalabilidade futura se torna extremamente difícil
O Bellory NÃO deve apenas “ter vários usuários”.
Ele deve:
•	isolar completamente cada operação
•	tratar cada salão como ambiente independente
•	garantir segurança contextual
•	manter arquitetura tenant-aware desde o início
Abaixo está a especificação consolidada profissional do ADR.
________________________________________
docs/decisions/004-multi-tenant.md
# ADR-004 — Arquitetura Multi-Tenant

# Status

ACEITO
# Contexto

O Bellory foi concebido como:
- plataforma SaaS
- escalável
- multi-cliente
- preparada para franquias
- preparada para IA
- preparada para crescimento operacional

Durante a definição arquitetural do sistema foi identificado que:

Cada salão:
- possui operação própria
- possui clientes próprios
- possui agenda própria
- possui campanhas próprias
- possui métricas próprias

Também foi identificado que:
- dados não podem se misturar
- IA não pode compartilhar contexto
- campanhas devem ser isoladas
- dashboards devem ser independentes

# Problema

Definir:
como o Bellory deve estruturar isolamento operacional entre clientes SaaS.

As opções consideradas foram:

## Opção 1
Banco separado por cliente.

## Opção 2
Schema separado por cliente.

## Opção 3
Banco compartilhado com isolamento tenant-aware.

# Decisão

Foi decidido que:

> O Bellory utilizará arquitetura multi-tenant baseada em tenant_id.

Com:
- banco compartilhado
- tabelas compartilhadas
- isolamento lógico tenant-aware

Toda entidade operacional deverá possuir:
- tenant_id
- ownership validation
- escopo isolado

# Motivação Estratégica

A decisão foi tomada porque:

## 1. Escalabilidade

Banco compartilhado:
- reduz custo operacional
- simplifica infraestrutura
- facilita crescimento SaaS
- melhora manutenção

## 2. Simplificação Operacional

Permite:
- deploy único
- infraestrutura única
- observabilidade centralizada
- monitoramento simplificado

## 3. Performance e Evolução

Arquitetura tenant-aware facilita:
- cache
- filas
- realtime
- IA
- APIs públicas
- analytics futuros

## 4. Preparação IA

A IA dependerá:
- contexto isolado
- tenant context
- ownership context

## 5. Crescimento Comercial

A arquitetura permite:
- múltiplos salões
- franquias futuras
- múltiplas unidades
- expansão nacional

# Estrutura Tenant

Cada tenant representa:

- um salão
- uma operação independente
- um ambiente operacional isolado

# Entidade Principal

## tenants

Tabela principal responsável por:
- identificação tenant
- configurações globais
- plano
- status
- timezone
- parâmetros operacionais

# Estratégia de Isolamento

Todo dado operacional deverá possuir:

```text id="tenant01"
tenant_id
________________________________________
Entidades Obrigatórias Tenant-Aware
Operacionais
•	usuarios
•	agendas
•	clientes
•	servicos
•	campanhas
•	cupons
•	mensagens_whatsapp
________________________________________
Inteligência
•	crm_interacoes
•	ai_predictions
•	ai_context
________________________________________
Analytics
•	dashboard_metrics
•	insights
•	logs futuros
________________________________________
Ownership Validation
Toda operação deverá validar:
•	usuário pertence tenant
•	recurso pertence tenant
•	operação pertence tenant
________________________________________
Segurança
Toda consulta backend deverá:
•	filtrar tenant_id
•	validar ownership
•	impedir cross-tenant access
Nunca confiar:
•	apenas frontend
•	apenas JWT sem validação tenant
________________________________________
Backend
Toda lógica multi-tenant deverá existir:
•	backend
•	services
•	repositories
•	middleware
Nunca apenas frontend.
________________________________________
Middleware Tenant
O sistema deverá possuir:
TenantMiddleware
Responsável por:
•	identificar tenant atual
•	validar escopo
•	anexar tenant context request
________________________________________
JWT Tenant-Aware
O JWT deverá possuir:
tenant_id
user_id
role
________________________________________
Repositories Tenant-Aware
Todos repositories deverão:
•	filtrar tenant_id
•	impedir consultas globais
________________________________________
APIs Tenant-Aware
Toda API deverá:
•	consumir tenant context
•	validar ownership
•	operar contexto isolado
________________________________________
Frontend
O frontend deverá:
•	consumir contexto tenant
•	carregar branding tenant futuro
•	carregar permissões tenant
Mas:
•	isolamento real sempre backend
________________________________________
Branding Futuro
Arquitetura preparada para:
•	cores tenant
•	logos tenant
•	white-label futuro
•	customização visual
________________________________________
Multi-Unidade Futuro
Arquitetura preparada para:
Estrutura futura
tenant
 └── unidades
      └── profissionais
________________________________________
Franquias Futuras
Arquitetura preparada para:
•	franquias
•	grupos econômicos
•	múltiplas unidades
•	dashboards consolidados
________________________________________
IA Tenant-Aware
Toda IA deverá:
•	utilizar tenant context
•	manter isolamento operacional
•	impedir mistura dados
Nunca permitir:
•	aprendizado cruzado indevido
•	vazamento contexto IA
________________________________________
WhatsApp Tenant-Aware
Toda comunicação deverá:
•	respeitar tenant
•	utilizar branding tenant
•	utilizar campanhas tenant
________________________________________
Dashboard Tenant-Aware
Todo dashboard deverá:
•	exibir apenas métricas tenant
•	impedir agregações indevidas
________________________________________
CRM Tenant-Aware
Clientes pertencem:
•	exclusivamente ao tenant
Nunca compartilhar:
•	histórico
•	campanhas
•	recorrência
________________________________________
Agenda Tenant-Aware
Toda Agenda deverá:
•	pertencer tenant
•	validar ownership
•	validar escopo operacional
________________________________________
Estratégia Database
Banco compartilhado:
•	PostgreSQL
•	Supabase
•	índices tenant-aware
________________________________________
Índices Obrigatórios
Toda tabela operacional deverá possuir índices:
(tenant_id)
(tenant_id, created_at)
(tenant_id, status)
________________________________________
Queries
Toda query deverá:
•	iniciar tenant filter
•	evitar scans globais
•	otimizar isolamento
________________________________________
Observabilidade
Logs futuros deverão possuir:
tenant_id
request_id
user_id
________________________________________
Filas Futuras
Filas deverão respeitar:
•	tenant context
•	isolamento processamento
________________________________________
Realtime Futuro
Realtime deverá:
•	separar canais tenant
•	impedir broadcast global
________________________________________
Cache Futuro
Cache deverá utilizar:
•	tenant namespace
Exemplo:
tenant:{tenant_id}:dashboard
________________________________________
Storage Futuro
Arquivos deverão respeitar:
•	tenant folders
•	tenant namespace
Exemplo:
/tenants/{tenant_id}/
________________________________________
Estratégia de Escalabilidade
Arquitetura preparada para:
•	milhares tenants
•	crescimento horizontal
•	workers
•	filas
•	microsserviços futuros
________________________________________
Estratégia de Segurança
Nunca permitir:
•	cross-tenant query
•	vazamento dados
•	mistura contexto IA
•	mistura campanhas
•	mistura dashboards
________________________________________
Estratégia de Auditoria
Futuro suporte:
•	audit logs
•	trilha tenant-aware
•	rastreabilidade operacional
________________________________________
Riscos Identificados
Falha isolamento
Maior risco:
•	vazamento cross-tenant
________________________________________
Queries incorretas
Consultas sem tenant_id:
•	podem expor dados indevidos
________________________________________
Estratégia Mitigação
Mitigar através:
•	middleware obrigatório
•	repositories tenant-aware
•	linters futuros
•	testes segurança
•	validação ownership
________________________________________
Diretriz Arquitetural Final
Todo módulo Bellory deverá ser:
tenant-aware por padrão.
Nunca:
•	global-first
•	monousuário
•	parcialmente isolado
________________________________________
Resultado Esperado
O Bellory deverá possuir:
•	isolamento completo
•	segurança operacional
•	escalabilidade SaaS real
•	IA contextual isolada
•	franquias futuras suportadas
________________________________________
Decisão Final
DECISÃO APROVADA:
O Bellory utilizará arquitetura:
•	multi-tenant
•	tenant-aware
•	banco compartilhado
•	isolamento lógico por tenant_id
•	ownership validation obrigatória