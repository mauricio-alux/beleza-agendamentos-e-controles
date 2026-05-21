O `auth.md` é a fundação de segurança e identidade do Bellory.

Ele é um módulo transversal, isto é:
todos os outros módulos dependem dele.

Mas existe um ponto estratégico muito importante:

No Bellory, autenticação NÃO é apenas login.

Ela também controla:

* isolamento multi-tenant
* segurança operacional
* ownership
* experiência SaaS fluida
* persistência de sessão
* onboarding inteligente
* acesso contextual por role

O objetivo do Bellory NÃO é parecer um sistema corporativo rígido.

A autenticação deve ser:

* invisível
* segura
* fluida
* moderna
* transparente ao usuário

O usuário deve sentir:

“Eu entro rapidamente e o sistema já entende meu negócio.”

Abaixo está a especificação consolidada profissional do módulo.

---

# docs/modules/auth.md

````md id="h4k8qn"
# Auth Module — Bellory

# 1. Objetivo do Módulo

O módulo Auth é responsável por:

- autenticação
- autorização
- gerenciamento de sessão
- proteção operacional
- isolamento multi-tenant
- controle de acesso

O objetivo principal é:
garantir segurança sem gerar fricção operacional.

---

# 2. Papel Estratégico

O módulo Auth representa:
- fundação de segurança do Bellory
- núcleo de identidade operacional
- controle de acesso SaaS
- base do isolamento tenant-aware

Todos os módulos dependem dele.

---

# 3. Objetivo UX

O usuário deve sentir:

"O Bellory já reconhece meu ambiente automaticamente."

A experiência deve transmitir:
- rapidez
- simplicidade
- segurança invisível
- login fluido
- continuidade operacional

---

# 4. Público-Alvo

O módulo foi projetado para:
- usuários com baixa maturidade tecnológica
- profissionais mobile-first
- pequenos negócios
- operação simplificada

---

# 5. Conceito Arquitetural

A autenticação deve funcionar como:
- camada transversal
- sistema desacoplado
- provider central
- gateway operacional

O módulo deve:
- proteger rotas
- validar ownership
- validar tenant
- persistir sessão
- permitir expansão futura

---

# 6. Tecnologias

## Backend

- Node.js
- Express
- JWT
- Supabase Auth
- PostgreSQL

---

## Frontend

- React
- Next.js App Router
- AuthProvider
- Protected Routes

---

# 7. Estrutura Backend

```text
backend/src/modules/auth/
````

---

# 8. Estrutura Frontend

```text id="l6j4qt"
frontend/src/
  app/
    login/
  context/
  hooks/
  services/
  middleware/
```

---

# 9. Rotas Frontend

## Login

```text id="kz4d9m"
/login
```

---

## Cadastro

```text id="o3y57g"
/cadastro
```

---

## Recuperação futura

```text id="vh8sm2"
/recuperar-senha
```

---

# 10. APIs Backend

## Login

```text id="u9a6hp"
POST /auth/login
```

---

## Registro

```text id="0f7gde"
POST /auth/register
```

---

## Refresh Token

```text id="d8u8pn"
POST /auth/refresh
```

---

## Logout

```text id="7mq0nh"
POST /auth/logout
```

---

## Perfil Atual

```text id="ek72qo"
GET /auth/me
```

---

# 11. Fluxo de Login

## Fluxo principal

1. usuário informa:

   * email
   * senha

2. frontend envia:
   POST /auth/login

3. backend:

   * valida credenciais
   * valida tenant
   * gera JWT
   * gera refresh token

4. frontend:

   * salva sessão
   * autentica usuário
   * redireciona dashboard/onboarding

---

# 12. Fluxo de Cadastro

O módulo Auth também é responsável por:

* criação usuário
* criação tenant
* inicialização trial
* autenticação automática

---

# 13. JWT

O sistema deve utilizar:

* access token
* refresh token

---

# 14. Access Token

Responsável por:

* autenticação requests
* autorização operacional
* identificação usuário

---

# 15. Refresh Token

Responsável por:

* renovação sessão
* persistência login
* continuidade operacional

---

# 16. Persistência de Sessão

O sistema deve:

* manter login ativo
* restaurar sessão automaticamente
* minimizar necessidade novo login

---

# 17. AuthProvider

```text id="r0yq9u"
AuthProvider.tsx
```

Responsável por:

* estado global auth
* sessão autenticada
* refresh automático
* logout
* persistência frontend

---

# 18. Hook Frontend

## Hook principal

```text id="g9vsm4"
useAuth()
```

Responsável por:

* login
* logout
* sessão
* refresh
* usuário atual

---

# 19. Services Frontend

## Serviço principal

```text id="i5v2oi"
auth.service.ts
```

Responsável por:

* APIs auth
* JWT
* refresh token
* payloads
* tratamento erros

---

# 20. Middleware Frontend

## Proteção de rotas

```text id="m57m7v"
middleware.ts
```

Responsável por:

* proteger dashboard
* validar sessão
* bloquear acesso anônimo

---

# 21. Rotas Protegidas

Exigir autenticação:

```text id="rwmcrs"
/dashboard
/agenda
/clientes
/campanhas
/configuracoes
```

---

# 22. Rotas Públicas

Permitir acesso anônimo:

```text id="yd3r9l"
/login
/cadastro
/apresentacao
```

---

# 23. Multi-Tenant

Toda autenticação deve respeitar:

* tenant_id
* ownership
* escopo usuário

Nunca permitir:

* acesso cross-tenant
* vazamento dados

---

# 24. Roles

## Roles iniciais

```text id="3c0q7d"
master_admin
administrador
autonomo
funcionario
cliente
```

---

# 25. Controle de Permissões

O sistema deve permitir:

* role-based access
* permissions futuras
* dashboards adaptativos
* módulos condicionais

---

# 26. Ownership Validation

Toda operação deve validar:

* usuário pertence tenant
* recurso pertence tenant
* usuário possui acesso recurso

---

# 27. Segurança Backend

Garantir:

* JWT validation
* token expiration
* refresh seguro
* hashing senha
* validação ownership
* proteção rotas

---

# 28. Segurança Frontend

Garantir:

* proteção páginas
* bloqueio acesso sem sessão
* logout automático
* refresh transparente

Nunca:

* expor secrets
* armazenar senha
* expor tokens indevidamente

---

# 29. Hash de Senha

Senhas devem:

* ser criptografadas
* nunca armazenadas em texto puro

---

# 30. Expiração de Sessão

O sistema deve:

* renovar tokens automaticamente
* evitar logout frequente
* manter experiência fluida

---

# 31. Logout

Logout deve:

* invalidar sessão
* limpar tokens
* limpar contexto auth
* redirecionar login

---

# 32. UX/UI

A autenticação deve parecer:

* moderna
* rápida
* invisível
* elegante

Inspirado em:

* Stripe
* Notion
* Slack
* Linear

---

# 33. Mobile-First

Priorizar:

* login rápido
* teclado otimizado
* poucos cliques
* baixa fricção

---

# 34. Desktop

Desktop deve:

* manter experiência clean
* centralização elegante
* visual premium

---

# 35. Estilo Visual

Utilizar:

* glow discreto
* gradientes suaves
* micro animações
* glassmorphism leve
* feedback elegante

Evitar:

* aparência técnica
* excesso burocrático
* excesso corporativo

---

# 36. Paleta Visual

## Primária

```text id="5vb1eq"
#E26D7C
```

## Hover

```text id="wlp49m"
#D85C6C
```

## Secundária

```text id="c6p7xj"
#FFE8E2
```

## Destaque

```text id="s7cv2f"
#7B4BFF
```

## Accent

```text id="5lj2mk"
#FFB3C1
```

## Fundo

```text id="4slnb5"
#FFFDFC
```

## Texto

```text id="8sxh8j"
#2B2B2B
```

---

# 37. Tratamento de Erros

Nunca exibir:

* SQL errors
* stack traces
* mensagens internas

Exibir:

* "Login inválido"
* "Sessão expirada"
* "Não foi possível autenticar"
* "Tente novamente"

---

# 38. Estados Operacionais

## Loading

Exibir:

* loading elegante
* skeletons
* feedback suave

---

## Error State

Exibir:

* retry simples
* mensagens amigáveis

---

# 39. Integração Cadastro

Consumir:

* criação tenant
* criação usuário
* autenticação automática

---

# 40. Integração Onboarding

Consumir:

* onboarding status
* progresso onboarding
* redirecionamento inteligente

---

# 41. Integração Dashboard

Após login:

* redirecionar dashboard
* carregar contexto operacional

---

# 42. Integração Cliente Final

Futuro suporte:

* magic links
* login WhatsApp
* token acesso
* autenticação simplificada

---

# 43. Integração AI Engine

Futuro suporte:

* autenticação adaptativa
* detecção risco
* comportamento suspeito
* proteção inteligente

---

# 44. Polling e Realtime

## MVP Inicial

Operação:

* refresh token tradicional

---

## Futuro

Preparar:

* realtime session sync
* device sync
* websocket auth

---

# 45. Performance

Priorizar:

* baixo payload
* autenticação rápida
* cache sessão
* recuperação eficiente

---

# 46. Escalabilidade Futura

Arquitetura preparada para:

* MFA
* SSO
* login social
* autenticação WhatsApp
* multi-device
* device management
* sessões simultâneas

---

# 47. Objetivo Final

O módulo Auth deve representar:

* segurança invisível
* autenticação fluida
* isolamento operacional
* experiência SaaS moderna

O usuário deve sentir:

"O Bellory já entende meu ambiente automaticamente."