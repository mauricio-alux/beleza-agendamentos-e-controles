Contexto:

O projeto Bellory já possui:
- Landing Page criada
- Hero Section premium com vídeo demonstrativo
- arquitetura frontend em React + Next.js
- backend Node.js funcional
- Supabase PostgreSQL
- autenticação JWT implementada
- Supabase Auth integrado
- multi-tenant
- onboarding inicial implementado

Frontend atual:
- Next.js App Router
- Tailwind CSS
- shadcn/ui
- arquitetura componentizada
- design “Premium Vibrante Controlado”

Objetivo:
Criar o frontend da ETAPA-6B — LOGIN do Bellory.

IMPORTANTE:
- NÃO criar dashboard ainda.
- NÃO criar agenda ainda.
- NÃO alterar Landing Page existente.
- Criar apenas o frontend de autenticação/login.
- Conectar o frontend às APIs já existentes do backend.
- Utilizar autenticação JWT já implementada.
- Utilizar Supabase Auth já integrado.
- Priorizar UX premium mobile-first.

Objetivo UX:
O login deve transmitir:
- simplicidade
- confiança
- elegância
- modernidade
- rapidez
- experiência SaaS premium

Fluxo esperado:

1. Usuário acessa:
/login

2. Usuário informa:
- email
- senha

3. Frontend chama:
POST /auth/login

4. Backend retorna:
- access_token
- refresh_token
- dados do usuário
- tenant

5. Frontend:
- salva sessão
- salva token
- redireciona para onboarding/dashboard futuro

REQUISITOS TÉCNICOS:

Tecnologias:
- React
- Next.js App Router
- Tailwind CSS
- shadcn/ui

Arquitetura:
frontend/src/
  app/
    login/
  components/
  layouts/
  services/
  hooks/
  lib/

Criar:
- página de login
- formulário de autenticação
- integração API
- gerenciamento de sessão
- gerenciamento JWT
- tratamento de erros
- loading states
- persistência de login

INTERFACE:

Layout:
- visual clean premium
- elegante
- moderno
- altamente responsivo
- mobile-first

Estrutura visual:
- card centralizado premium
- glow suave
- sombras modernas
- bordas arredondadas
- fundo elegante compatível com Landing Page

PALETA VISUAL:

Primária:
#E26D7C

Hover:
#D85C6C

Secundária:
#FFE8E2

Destaque:
#7B4BFF

Fundo:
#FFFDFC

Texto:
#2B2B2B

UX/UI:

- animações suaves
- loading elegante
- hover leve
- transitions modernas
- foco visual confortável
- aparência SaaS premium internacional

CAMPOS:

1. Email
2. Senha

AÇÕES:

- botão Entrar
- link “Esqueci minha senha”
- link “Criar conta”
- opção futura “Continuar conectado”

VALIDAÇÕES:

- email inválido
- senha incorreta
- usuário inexistente
- tenant inválido
- sessão expirada
- erro de conexão

TRATAMENTO DE ERROS:

Exibir mensagens amigáveis:
- “Email ou senha inválidos”
- “Sessão expirada”
- “Não foi possível conectar”
- “Tente novamente”

Não exibir:
- erros técnicos
- stack traces
- mensagens internas backend

SESSÃO:

Implementar:
- armazenamento JWT
- persistência de login
- renovação automática futura preparada
- logout preparado para futura implementação

Criar:
- auth service
- auth hooks
- auth context
- session provider

Exemplos:
- AuthProvider
- useAuth
- authService

IMPORTANTE:

- preparar estrutura para:
  - dashboard futuro
  - onboarding progressivo
  - roles/permissões futuras
  - refresh token futuro
  - middleware auth futuro

- proteger rotas futuras
- preparar redirecionamento autenticado

CRIAR:

1. Página:
/login

2. Componentes:
- LoginForm
- AuthCard
- AuthLayout
- LoadingButton

3. Serviços:
- auth.service.ts

4. Hooks:
- useAuth.ts

5. Context:
- AuthProvider.tsx

RESULTADO ESPERADO:

Gerar:
- frontend login completo
- integração com backend JWT
- experiência premium
- autenticação funcional
- estrutura escalável
- arquitetura preparada para crescimento do Bellory
- UX moderna mobile-first
- código limpo e componentizado


Implementei o frontend da ETAPA-6B Login do Bellory.

Criado/ajustado:

- Página `/login` em [page.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/app/login/page.tsx)
- `AuthProvider` global em [layout.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/app/layout.tsx)
- Componentes:
  - [AuthLayout.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/components/auth/AuthLayout.tsx)
  - [AuthCard.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/components/auth/AuthCard.tsx)
  - [LoginForm.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/components/auth/LoginForm.tsx)
  - [LoadingButton.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/components/auth/LoadingButton.tsx)
- Serviço JWT:
  - [auth.service.ts](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/services/auth.service.ts)
- Hook/context:
  - [useAuth.ts](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/hooks/useAuth.ts)
  - [AuthProvider.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/context/AuthProvider.tsx)
- UI base:
  - [input.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/components/ui/input.tsx)
  - [label.tsx](C:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/components/ui/label.tsx)

O login chama `POST /auth/login`, salva sessão JWT quando “Continuar conectado” estiver marcado, trata erros amigáveis e redireciona após sucesso para `NEXT_PUBLIC_AUTH_REDIRECT_PATH` ou, por padrão, `/cadastro`.

Validação feita:

```bash
npm run build
```

Build aprovado. Também subi o frontend e validei `/login` com HTTP `200 OK`.

URL local:

```text
http://127.0.0.1:3001/login
```