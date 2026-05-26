O dashboard.md pode ser tratado como um dos principais documentos estruturais do Bellory, porque ele representa:
•	HUB operacional central
•	camada de inteligência operacional
•	ponto principal de navegação
•	gateway de expansão analítica futura
•	núcleo visual da experiência SaaS
Abaixo está a especificação profissional consolidada do módulo.
________________________________________
docs/modules/dashboard.md
Dashboard Module — Bellory
1. Objetivo do Módulo
O módulo Dashboard é o HUB operacional central do Bellory.
Seu objetivo é consolidar:
•	operação diária
•	visão executiva
•	navegação principal
•	indicadores operacionais
•	ações rápidas
•	visão resumida dos módulos
•	entry points contextuais
•	visão inteligente da operação
O Dashboard NÃO deve funcionar como:
•	ERP complexo
•	painel burocrático
•	sistema técnico pesado
•	central administrativa pesada
O Dashboard deve transmitir:
•	simplicidade
•	modernidade
•	profissionalismo
•	organização
•	automação
•	crescimento operacional
•	inteligência operacional
________________________________________
2. Papel Estratégico
O Dashboard é:
•	principal ponto de entrada operacional
•	centro de navegação do sistema
•	painel executivo simplificado
•	camada visual do negócio
•	interface principal do usuário
•	HUB operacional inteligente
O Dashboard centraliza:
•	agenda
•	clientes
•	serviços
•	campanhas
•	financeiro
•	indicadores
•	notificações
•	atividades recentes
•	ações rápidas
Mas NÃO deve centralizar:
•	formulários administrativos pesados
•	manutenção cadastral completa
•	regras complexas de negócio
________________________________________
3. Objetivos de UX
O Dashboard deve fazer o usuário sentir:
"Meu negócio agora é profissional."
A experiência deve transmitir:
•	facilidade operacional
•	clareza
•	controle
•	velocidade
•	organização automática
•	baixa fricção
•	simplicidade operacional
________________________________________
4. Público-Alvo
O módulo foi projetado para:
•	profissionais autônomos
•	pequenos salões
•	profissionais com baixa maturidade tecnológica
•	usuários mobile-first
________________________________________
5. Conceito Arquitetural
O Dashboard deve funcionar como:
•	camada agregadora de dados
•	consumidor resumido dos módulos
•	interface desacoplada
•	estrutura preparada para analytics futuro
•	HUB operacional inteligente
O Dashboard NÃO deve:
•	conter regras pesadas de negócio
•	centralizar lógica operacional
•	executar cálculos complexos diretamente
•	virar painel administrativo pesado
As regras devem permanecer:
•	nos módulos específicos
•	nos serviços backend
•	nas engines operacionais
________________________________________
6. Estrutura Geral
Frontend
frontend/src/
  app/
    dashboard/
    configuracoes/
  components/
    dashboard/
    settings/
  layouts/
  hooks/
  services/
Backend
backend/src/modules/dashboard/
backend/src/modules/settings/
________________________________________
7. Rotas Frontend
Principais
/dashboard
/configuracoes
/configuracoes/perfil
/configuracoes/salao
/configuracoes/operacao
/configuracoes/servicos
/configuracoes/equipe
/configuracoes/assinatura
/configuracoes/seguranca
Rotas futuras integradas
/agenda
/clientes
/servicos
/equipe
/campanhas
/financeiro
Rotas futuras administrativas
/admin
/admin/tenants
/admin/usuarios
/admin/planos
/admin/saude-operacional
Rotas futuras cliente final
/minha-conta
/minha-conta/perfil
/minha-conta/agendamentos
________________________________________
8. Estrutura Visual
8.1 Header Superior
Exibir:
•	nome do salão
•	avatar usuário
•	notificações
•	acesso perfil
•	acesso configurações
•	logout
8.2 Sidebar Desktop
Itens:
•	Dashboard
•	Agenda
•	Clientes
•	Serviços
•	Equipe
•	Campanhas
•	Financeiro
•	Configurações
8.3 Bottom Navigation Mobile
Objetivo:
•	navegação rápida touch
•	experiência mobile-first
•	baixa fricção operacional
Itens:
•	Dashboard
•	Agenda
•	Clientes
•	Campanhas
•	Mais/Configurações
________________________________________
9. Configurações Operacionais
As manutenções cadastrais devem existir como:
•	camada desacoplada
•	central de configurações
•	área operacional secundária
E NÃO como:
•	cards permanentes no Dashboard
•	formulários administrativos na home
•	módulos pesados visíveis constantemente
A área:
/configuracoes
será responsável por:
•	perfil usuário
•	dados salão
•	operação
•	equipe
•	serviços
•	assinatura
•	segurança
________________________________________
10. Navegação de Configurações
O fluxo recomendado:
1.	Usuário entra no /dashboard
2.	Executa tarefas operacionais
3.	Para manutenção cadastral acessa /configuracoes
4.	Navega por seções organizadas
Desktop
Layout recomendado:
| Navegação Settings | Conteúdo |
Mobile
Lista vertical touch-friendly:
•	Minha Conta
•	Dados do Salão
•	Horários e Agenda
•	Serviços
•	Equipe
•	Plano
•	Segurança
Cada item abre:
•	página dedicada
OU
•	painel focado
________________________________________
11. Componentes Principais
Estruturais
•	DashboardLayout
•	TopHeader
•	Sidebar
•	MobileBottomNav
•	UserMenu
•	SettingsLayout
•	SettingsNavigation
Widgets
•	KPIWidget
•	DashboardCard
•	ActivityFeed
•	WelcomeBanner
•	QuickActions
•	EmptyState
Operacionais
•	AgendaPreview
•	NextAppointments
•	NotificationsCenter
•	CampaignPreview
Settings
•	SettingsHome
•	SettingsSectionCard
•	MobileSettingsList
•	OperationalSettingsForm
•	TenantProfileForm
•	UserProfileForm
________________________________________
12. KPIs Operacionais
KPIs iniciais
•	faturamento hoje
•	clientes ativos
•	ocupação
•	atendimentos do dia
•	próximos atendimentos
Características
Os KPIs devem:
•	ser resumidos
•	rápidos
•	visuais
•	fáceis de entender
Evitar:
•	excesso numérico
•	excesso gráfico
•	aparência analítica pesada
________________________________________
13. Quick Actions
Botões rápidos:
•	Novo agendamento
•	Novo cliente
•	Novo serviço
•	Nova campanha
Objetivo
•	reduzir cliques
•	aumentar velocidade operacional
QuickActions Contextuais
Permitir apenas:
•	completar cadastro salão
•	ajustar horários operação
•	adicionar equipe
•	cadastrar serviços
IMPORTANTE:
Esses cards devem:
•	aparecer apenas contextualizados
•	desaparecer após configuração
•	nunca virar painel administrativo fixo
________________________________________
14. Atualização de Dados
MVP Inicial
Atualização via:
•	polling periódico
Estratégia:
•	refresh automático leve
•	intervalos controlados
•	baixo consumo
Preparação futura
Arquitetura preparada para:
•	websocket
•	realtime
•	event-driven updates
•	filas
•	pub/sub
•	streaming operacional
________________________________________
15. Dashboard Adaptativo por Role
O Dashboard deve adaptar:
•	widgets
•	navegação
•	permissões
•	indicadores
•	acessos de configuração
conforme o tipo de usuário.
________________________________________
16. Roles
Administrador
Visualiza:
•	operação do salão
•	equipe
•	campanhas
•	financeiro
•	KPIs completos
•	configurações operacionais
•	dados do tenant
Autônomo
Visualiza:
•	agenda pessoal
•	clientes próprios
•	ganhos próprios
•	campanhas pessoais
•	configurações próprias
•	operação própria
Cliente
Visualiza:
•	próximos agendamentos
•	histórico
•	promoções
•	notificações
•	reagendamentos
•	dados pessoais
NÃO acessa:
•	configurações administrativas
•	equipe
•	tenant
MasterAdmin
Visualiza:
•	tenants
•	métricas globais
•	faturamento SaaS
•	usuários ativos
•	métricas plataforma
•	saúde operacional
•	configurações globais plataforma
________________________________________
17. Integrações
O Dashboard consome dados resumidos dos módulos:
•	Agenda
•	CRM
•	WhatsApp
•	Campaigns
•	Financeiro
•	AI Engine
•	Settings
________________________________________
18. Integração Agenda
Consumir:
•	agenda do dia
•	próximos atendimentos
•	status operacional
•	ocupação
________________________________________
19. Integração CRM
Consumir:
•	clientes ativos
•	retenção
•	frequência
•	aniversariantes
•	retorno previsto
________________________________________
20. Integração WhatsApp
Consumir:
•	mensagens enviadas
•	confirmações
•	lembretes
•	status operacional
________________________________________
21. Integração Campaigns
Consumir:
•	campanhas ativas
•	campanhas futuras
•	engajamento
•	promoções
________________________________________
22. Integração AI Engine
Futuro:
•	insights automáticos
•	recomendações
•	previsão de cancelamentos
•	previsão de retorno
•	sugestões operacionais
________________________________________
23. Layout Mobile-First
O Dashboard deve priorizar:
•	uso vertical
•	navegação touch
•	leitura rápida
•	cards empilhados
•	baixa fricção
Configurações devem:
•	usar lista vertical
•	evitar tabelas pesadas
•	usar forms curtos
•	utilizar botões grandes
________________________________________
24. Layout Desktop
Desktop deve:
•	utilizar sidebar elegante
•	grids modernos
•	widgets organizados
•	visual premium clean
•	navegação interna settings
Evitar:
•	visual ERP
•	excesso administrativo
•	tabelas densas como experiência principal
________________________________________
25. Estilo Visual
Inspirado em:
•	Linear
•	Stripe
•	Notion
•	Calendly
•	Hubspot
•	Fresha
________________________________________
26. Paleta Visual
Primária
#E26D7C
Hover
#D85C6C
Secundária
#FFE8E2
Destaque
#7B4BFF
Accent
#FFB3C1
Fundo
#FFFDFC
Texto
#2B2B2B
________________________________________
27. Diretrizes Visuais
Utilizar:
•	glassmorphism leve
•	glow discreto
•	gradientes suaves
•	sombras premium
•	micro animações
•	transições suaves
•	progressive disclosure
Evitar:
•	excesso visual
•	tabelas pesadas
•	aparência ERP
•	poluição visual
•	formulários excessivos na home
________________________________________
28. Segurança
O Dashboard deve:
•	exigir autenticação JWT
•	validar tenant
•	validar ownership
•	proteger rotas
•	impedir acesso cross-tenant
________________________________________
29. Multi-Tenant
Todo dado exibido deve respeitar:
•	tenant_id
•	permissões
•	escopo do usuário
Nunca permitir:
•	vazamento cross-tenant
•	consultas globais indevidas
________________________________________
30. Performance
Priorizar:
•	queries resumidas
•	lazy loading
•	cache futuro
•	paginação futura
•	carregamento progressivo
________________________________________
31. APIs Backend
Dashboard
GET /dashboard/summary
GET /dashboard/kpis
GET /dashboard/activity
GET /dashboard/agenda-preview
Settings
GET /settings/summary
GET /settings/profile
PATCH /settings/profile
GET /settings/tenant
PATCH /settings/tenant
GET /settings/operation
PATCH /settings/operation
________________________________________
32. Hook Frontend
Dashboard
useDashboard()
Responsável por:
•	carregar KPIs
•	atualizar widgets
•	controlar loading
•	tratar erros
•	polling inicial
Settings
useSettings()
Responsável por:
•	carregar configurações
•	atualizar perfil
•	atualizar tenant
•	atualizar operação
•	controlar permissões
________________________________________
33. Services Frontend
Dashboard
dashboard.service.ts
Responsável por:
•	chamadas API
•	transformação payload
•	normalização dados
Settings
settings.service.ts
Responsável por:
•	APIs configurações
•	payloads
•	normalização
•	tratamento erros
________________________________________
34. Estados Operacionais
Loading
Exibir:
•	skeletons
•	shimmer
•	placeholders elegantes
Empty State
Exibir:
•	mensagens amigáveis
•	incentivo operacional
•	onboarding contextual
Error State
Nunca exibir:
•	stack traces
•	SQL errors
•	mensagens técnicas
Exibir:
•	"Não foi possível carregar"
•	"Tente novamente"
________________________________________
35. Como Evitar Poluição Visual
Regras importantes:
•	Não colocar todos os cadastros no Dashboard
•	Não criar muitos botões permanentes
•	Usar QuickActions apenas operacionalmente
•	Usar alertas contextuais apenas quando necessário
•	Centralizar manutenção em /configuracoes
•	Usar progressive disclosure
O Dashboard deve responder:
"O que está acontecendo hoje?"
Configurações responde:
"Como meu negócio está parametrizado?"
________________________________________
36. Escalabilidade Futura
Arquitetura preparada para:
•	BI
•	Analytics
•	IA preditiva
•	realtime
•	dashboards avançados
•	múltiplas unidades
•	franquias
•	marketplace
•	gamificação operacional
________________________________________
37. Objetivo Final
O Dashboard deve representar:
•	profissionalização do salão
•	central operacional inteligente
•	experiência SaaS premium
•	crescimento operacional assistido
•	organização operacional simplificada
O usuário deve sentir:
"O Bellory organiza meu negócio para mim."