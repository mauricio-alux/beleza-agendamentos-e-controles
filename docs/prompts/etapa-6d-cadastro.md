Contexto:

O projeto Bellory já possui:
- Landing Page premium criada
- Hero com vídeo demonstrativo
- Login JWT funcional
- Onboarding interno funcional
- Backend Node.js funcional
- Supabase PostgreSQL
- Supabase Auth integrado
- autenticação JWT implementada
- multi-tenant funcional
- tenant setup backend funcional
- onboarding backend funcional

Frontend atual:
- React
- Next.js App Router
- Tailwind CSS
- shadcn/ui
- arquitetura componentizada
- AuthProvider funcional
- persistência JWT funcional
- design “Premium Vibrante Controlado”

Objetivo:
Implementar a ETAPA-6D — Frontend funcional de Cadastro SaaS do Bellory.

IMPORTANTE:
- NÃO alterar Landing Page.
- NÃO alterar Login já funcional.
- NÃO alterar Onboarding já funcional.
- Criar apenas o fluxo frontend REAL de cadastro SaaS.
- Conectar ao backend já existente.
- Utilizar APIs reais já implementadas.
- Priorizar UX premium mobile-first.

OBJETIVO OPERACIONAL:
Permitir que o visitante:
- crie sua conta SaaS
- crie automaticamente seu tenant
- crie usuário administrador
- receba autenticação JWT
- seja redirecionado automaticamente para onboarding

FLUXO ESPERADO:

1. Usuário acessa:
/cadastro

2. Usuário preenche:
- nome
- email
- senha
- nome do salão
- WhatsApp
- aceite dos termos

3. Frontend chama:
POST /auth/register

4. Backend:
- cria tenant
- cria usuário admin
- inicia trial
- retorna JWT
- retorna onboarding status

5. Frontend:
- salva sessão
- salva JWT
- autentica usuário
- redireciona automaticamente:
  /onboarding

OBJETIVO UX:
O cadastro deve transmitir:
- simplicidade
- modernidade
- confiança
- rapidez
- onboarding inteligente
- sensação premium

CONCEITO:
O usuário deve sentir:
“meu salão está sendo criado automaticamente”.

REQUISITOS TÉCNICOS:

Tecnologias:
- React
- Next.js App Router
- Tailwind CSS
- shadcn/ui

Estrutura:
frontend/src/
  app/
    cadastro/
  components/
    cadastro/
  services/
  hooks/
  context/

CRIAR:

1. Página:
/cadastro

2. Componentes:
- RegisterForm
- RegisterCard
- RegisterLayout
- RegisterProgress
- LoadingButton
- PasswordStrength
- TermsCheckbox

3. Serviços:
- register.service.ts

4. Hooks:
- useRegister.ts

5. Context:
- reaproveitar AuthProvider existente

INTERFACE:

Layout:
- premium
- clean
- elegante
- moderno
- mobile-first
- altamente responsivo

Estrutura visual:
- card centralizado elegante
- glow suave
- sombras premium
- bordas arredondadas
- gradientes suaves
- visual compatível com Landing Page

PALETA:

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

CAMPOS:

1. Nome completo
2. Nome do salão
3. Email
4. WhatsApp
5. Senha
6. Confirmar senha
7. Aceite dos termos

VALIDAÇÕES:

- nome obrigatório
- email válido
- email já existente
- senha mínima
- força da senha
- confirmação senha
- WhatsApp válido
- aceite obrigatório dos termos

EXIBIR:

Indicador visual de força da senha:
- fraca
- média
- forte

AÇÕES:

Botão:
“Criar minha conta”

Links:
- “Já possui conta? Entrar”
- “Termos de uso”
- “Política de privacidade”

TRATAMENTO DE ERROS:

Exibir mensagens amigáveis:
- “Email já cadastrado”
- “Senha inválida”
- “Não foi possível criar sua conta”
- “Tente novamente”

Não exibir:
- stack traces
- erros internos
- mensagens técnicas backend

SESSÃO:

Após sucesso:
- salvar JWT
- salvar refresh token
- autenticar automaticamente
- persistir sessão
- redirecionar:
  /onboarding

LOADING:

Durante criação:
- exibir loading elegante
- bloquear múltiplos submits
- exibir progresso:
  “Criando seu salão...”

UX/UI:

- aparência SaaS premium internacional
- experiência fluida
- micro animações suaves
- transitions modernas
- feedback visual elegante
- foco total em mobile

IMPORTANTE:

- evitar aparência burocrática
- evitar excesso de campos
- transformar cadastro em experiência agradável
- sensação de automação inteligente
- transmitir modernidade e tecnologia

SEGURANÇA:

- nunca expor secrets
- nunca armazenar senha localmente
- utilizar JWT corretamente
- preparar renovação futura de sessão

RESPONSIVIDADE:

- mobile-first obrigatório
- excelente UX mobile
- adaptação tablet
- adaptação desktop

INTEGRAÇÃO:

Consumir:
POST /auth/register

Preparar:
- onboarding progressivo
- dashboard futuro
- roles futuras
- múltiplos planos futuros

RESULTADO ESPERADO:

Gerar:
- frontend cadastro completo
- integração funcional com backend
- criação real de tenant
- autenticação automática
- redirecionamento onboarding
- UX premium moderna
- arquitetura escalável
- código limpo
- experiência SaaS profissional
- fluxo completo funcional do Bellory


Implementei a ETAPA-6D: frontend funcional de cadastro SaaS do Bellory.

Criado:

- Página `/cadastro`
- Componentes em `frontend/src/components/cadastro/`:
  - `RegisterForm`
  - `RegisterCard`
  - `RegisterLayout`
  - `RegisterProgress`
  - `PasswordStrength`
  - `TermsCheckbox`
  - `LoadingButton`
- Serviço:
  - `frontend/src/services/register.service.ts`
- Hook:
  - `frontend/src/hooks/useRegister.ts`
- Ajuste no `AuthProvider` para aceitar sessão autenticada retornada pelo cadastro.

Fluxo implementado:

- Busca plano inicial em `GET /public/plans`
- Envia cadastro real para `POST /auth/register`
- Monta payload com:
  - nome
  - email
  - senha
  - WhatsApp
  - nome do salão
  - plano inicial
  - serviços iniciais
- Salva `access_token` e `refresh_token`
- Atualiza a sessão no `AuthProvider`
- Redireciona automaticamente para `/onboarding`

Validações incluídas:

- nome obrigatório
- nome do salão obrigatório
- email válido
- WhatsApp válido
- senha mínima
- força da senha
- confirmação de senha
- aceite dos termos

Validação técnica feita:

```bash
npm run build
```

Build aprovado. Também validei a rota local:

```text
http://127.0.0.1:3001/cadastro
```
A rota respondeu `200 OK`. O teste completo de criação real depende do backend/Supabase estar rodando com planos ativos em `/public/plans`.