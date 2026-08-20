O cadastro.md é um dos módulos mais críticos comercialmente no Bellory, porque ele representa:
•	a entrada do lead no ecossistema
•	a transformação do visitante em cliente SaaS
•	a criação automática da operação inicial
•	o início do tenant
•	a primeira percepção de automação inteligente
O ponto mais importante aqui é:
o cadastro do Bellory NÃO deve parecer:
•	ERP corporativo
•	formulário burocrático
•	sistema técnico
•	processo demorado
Ele deve transmitir:
•	simplicidade
•	rapidez
•	inteligência
•	automação
•	profissionalismo
O usuário deve sentir:
“Meu salão está sendo criado automaticamente.”
Abaixo está a especificação consolidada profissional do módulo.
________________________________________
docs/modules/cadastro.md
# Cadastro Module — Bellory

# 1. Objetivo do Módulo

O módulo Cadastro é responsável por:

- converter visitantes em clientes SaaS
- criar automaticamente tenants
- criar usuários administradores
- iniciar trial
- autenticar usuário
- iniciar onboarding

O objetivo principal é:
permitir ativação rápida do Bellory com mínima fricção.

# 2. Papel Estratégico

O módulo Cadastro representa:
- entrada oficial no ecossistema Bellory
- início operacional do tenant
- primeira experiência SaaS real
- ponto inicial da jornada do usuário

O módulo NÃO deve parecer:
- cadastro corporativo
- formulário ERP
- processo técnico complexo

Deve parecer:
- ativação inteligente
- automação premium
- experiência moderna

# 3. Objetivo UX

O usuário deve sentir:

"Meu salão está sendo criado automaticamente."

A experiência deve transmitir:
- rapidez
- simplicidade
- confiança
- profissionalismo
- modernidade

# 4. Público-Alvo

O módulo foi projetado para:
- profissionais autônomos
- pequenos salões
- baixa maturidade tecnológica
- usuários mobile-first

# 5. Conceito Arquitetural

O cadastro deve funcionar como:
- fluxo rápido
- ativação automatizada
- criação multi-tenant
- autenticação automática

O sistema deve:
- reduzir cliques
- minimizar campos
- evitar fricção
- automatizar configuração inicial

# 6. Fluxo Operacional

## Fluxo principal

1. usuário acessa:
   /cadastro

2. usuário preenche:
   - nome
   - email
   - senha
   - WhatsApp
   - nome salão

3. frontend envia:
   POST /auth/register

4. backend:
   - cria tenant
   - cria usuário admin
   - cria trial
   - cria estrutura inicial
   - gera JWT

5. frontend:
   - salva sessão
   - autentica usuário
   - redireciona onboarding

# 7. Estrutura Frontend

```text
frontend/src/
  app/
    cadastro/
  components/
    cadastro/
  hooks/
  services/
  context/
________________________________________
8. Estrutura Backend
backend/src/modules/auth/
________________________________________
9. Rota Principal
/cadastro
________________________________________
10. Estrutura Visual
O cadastro deve utilizar:
•	card central elegante
•	visual clean
•	layout premium
•	aparência SaaS internacional
________________________________________
11. Componentes Frontend
Estruturais
•	RegisterLayout
•	RegisterCard
Formulário
•	RegisterForm
•	TermsCheckbox
•	PasswordStrength
Estados
•	RegisterProgress
•	LoadingButton
________________________________________
12. Campos Obrigatórios
Usuário
•	nome completo
•	email
•	senha
•	confirmar senha
________________________________________
Operacional
•	nome salão
•	WhatsApp
________________________________________
Legal
•	aceite termos
________________________________________
13. Validações
Validar:
•	nome obrigatório
•	email válido
•	email único
•	senha mínima
•	confirmação senha
•	WhatsApp válido
•	aceite obrigatório
________________________________________
14. Força da Senha
Exibir indicador visual:
•	fraca
•	média
•	forte
Objetivo:
•	melhorar segurança
•	melhorar experiência usuário
________________________________________
15. Fluxo de Autenticação
Após sucesso:
•	salvar JWT
•	salvar refresh token
•	persistir sessão
•	autenticar automaticamente
•	redirecionar onboarding
________________________________________
16. Trial Automático
O backend deve:
•	iniciar período trial
•	associar plano inicial
•	preparar cobrança futura
________________________________________
17. Criação Automática Tenant
O backend deve criar:
•	tenant
•	usuário administrador
•	configurações iniciais
•	estrutura operacional mínima
________________________________________
18. Estrutura Inicial Automática
Criar automaticamente:
•	tenant
•	serviços iniciais
•	configurações padrão
•	timezone padrão
•	parâmetros iniciais
________________________________________
19. APIs Backend
Registro principal
POST /auth/register
________________________________________
Planos públicos
GET /public/plans
________________________________________
20. Hook Frontend
useRegister()
Responsável por:
•	submissão cadastro
•	loading
•	validações
•	autenticação automática
•	tratamento erros
________________________________________
21. Service Frontend
register.service.ts
Responsável por:
•	APIs
•	payloads
•	normalização
•	tratamento erros
________________________________________
22. Integração AuthProvider
Consumir:
•	JWT
•	refresh token
•	sessão autenticada
•	persistência login
________________________________________
23. UX/UI
A experiência deve ser:
•	elegante
•	leve
•	rápida
•	moderna
•	extremamente intuitiva
Inspirado em:
•	Stripe
•	Notion
•	Linear
•	Slack
________________________________________
24. Mobile-First
Priorizar:
•	poucos campos
•	preenchimento rápido
•	teclado mobile otimizado
•	navegação vertical
•	baixa fricção
________________________________________
25. Desktop
Desktop deve utilizar:
•	centralização elegante
•	espaçamento premium
•	visual clean
________________________________________
26. Estilo Visual
Utilizar:
•	glow discreto
•	gradientes suaves
•	sombras premium
•	glassmorphism leve
•	micro animações
•	transições suaves
Evitar:
•	aparência burocrática
•	excesso campos
•	visual ERP
•	excesso técnico
________________________________________
27. Paleta Visual
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
28. Tratamento de Erros
Nunca exibir:
•	stack traces
•	SQL errors
•	mensagens internas
Exibir:
•	"Email já cadastrado"
•	"Senha inválida"
•	"Não foi possível criar sua conta"
•	"Tente novamente"
________________________________________
29. Estados Operacionais
Loading
Exibir:
•	loading elegante
•	shimmer
•	feedback progresso
Mensagem:
"Criando seu salão..."
________________________________________
Empty State
Exibir:
•	incentivo operacional
•	mensagens acolhedoras
________________________________________
Error State
Exibir:
•	feedback amigável
•	retry simples
________________________________________
30. Navegação Pós-Cadastro
Após sucesso:
•	autenticar automaticamente
•	redirecionar:
/onboarding
________________________________________
31. Integração Onboarding
O cadastro deve iniciar:
•	onboarding progressivo
•	ativação operacional
•	setup inicial tenant
________________________________________
32. Integração Dashboard
Após onboarding:
•	redirecionar dashboard
•	iniciar experiência operacional
________________________________________
33. Integração Billing (Futuro)
Preparar:
•	assinatura
•	upgrade plano
•	cobrança
•	trial expiration
•	renovação
________________________________________
34. Integração AI Engine
Futuro suporte para:
•	onboarding inteligente
•	preenchimento automático
•	sugestões operacionais
•	ativação assistida IA
________________________________________
35. Multi-Tenant
Toda operação deve:
•	criar tenant isolado
•	associar ownership
•	validar escopo tenant
Nunca permitir:
•	compartilhamento indevido
•	vazamento cross-tenant
________________________________________
36. Segurança
Garantir:
•	JWT seguro
•	senha criptografada
•	refresh token
•	proteção APIs
•	validação tenant
Nunca:
•	armazenar senha localmente
•	expor secrets
•	expor dados internos
________________________________________
37. Performance
Priorizar:
•	payload reduzido
•	criação rápida
•	onboarding imediato
•	baixa latência
________________________________________
38. Polling e Realtime
MVP Inicial
Operação simples:
•	fluxo síncrono
•	autenticação imediata
________________________________________
Futuro
Preparar:
•	onboarding realtime
•	ativação inteligente
•	provisionamento assíncrono
________________________________________
39. Escalabilidade Futura
Arquitetura preparada para:
•	múltiplos planos
•	múltiplos nichos
•	franquias
•	marketplace
•	IA onboarding
•	multi-unidade
•	billing avançado
________________________________________
40. Objetivo Final
O módulo Cadastro deve representar:
•	entrada simples
•	ativação inteligente
•	automação invisível
•	profissionalização digital
O usuário deve sentir:
"O Bellory criou meu salão automaticamente."

________________________________________
41. Tipos de Negocio no Cadastro

Desde 2026-07-30, o cadastro deve carregar tipos de negocio ativos em
`GET /tipos-negocio/ativos` e enviar `tenant.tipo_negocio_id` para
`POST /auth/register`.

Regras:
•	o tipo de negocio e obrigatorio para novos tenants;
•	o tipo precisa existir e estar ativo em `tipos_negocio`;
•	o backend grava o vinculo principal em `tenant_tipos_negocio`;
•	a validacao tambem ocorre no backend; bypass do dropdown deve falhar;
•	o cadastro nao cria ofertas nem servicos canonicos automaticamente;
•	quando o tipo for `outro`, `descricao_tipo_negocio` registra o texto livre
  do tenant sem criar novo tipo global;
•	o campo textual legado `tipo_negocio` nao deve orientar catalogo ou
  recomendacao.
