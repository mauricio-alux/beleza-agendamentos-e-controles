Contexto:

O projeto Bellory já possui:
- Landing Page criada
- Hero premium com vídeo demonstrativo
- Login JWT funcional
- Backend Node.js funcional
- Supabase PostgreSQL
- Supabase Auth integrado
- autenticação JWT implementada
- multi-tenant
- onboarding backend já implementado
- tenant setup já implementado

Frontend atual:
- Next.js App Router
- React
- Tailwind CSS
- shadcn/ui
- AuthProvider funcional
- persistência JWT funcional
- arquitetura componentizada
- visual “Premium Vibrante Controlado”

Objetivo:
Criar o frontend da ETAPA-6C — ONBOARDING INTERNO do Bellory.

IMPORTANTE:
- NÃO criar dashboard completo ainda.
- NÃO criar agenda ainda.
- NÃO alterar Landing Page.
- NÃO alterar Login existente.
- Criar apenas o fluxo frontend do onboarding interno pós-login.
- Conectar às APIs já existentes do backend.
- Utilizar autenticação JWT já funcional.
- Priorizar experiência premium mobile-first.

Objetivo UX:
O onboarding deve transmitir:
- simplicidade
- acolhimento
- modernidade
- rapidez
- facilidade
- sensação de evolução
- ativação rápida do salão

CONCEITO:
O usuário deve sentir que:
“o Bellory já está montando meu salão para mim”.

FLUXO ESPERADO:

Após login:
1. usuário autenticado acessa onboarding interno
2. sistema identifica status onboarding
3. usuário completa etapas guiadas
4. progresso é salvo automaticamente
5. onboarding pode ser retomado futuramente
6. ao finalizar:
   - redirecionar para dashboard futuro

OBJETIVO OPERACIONAL:
Ativar rapidamente:
- salão
- profissional administrador
- serviços iniciais
- configurações básicas

CRIAR:

1. Página:
/onboarding

2. Estrutura:
frontend/src/
  app/
    onboarding/
  components/
    onboarding/
  services/
  hooks/

CRIAR COMPONENTES:

- OnboardingLayout
- OnboardingStepper
- OnboardingProgress
- WelcomeCard
- SetupCard
- CompletionCard
- StepNavigation
- OnboardingHeader
- OnboardingSidebar (desktop)
- MobileStepIndicator

ETAPAS DO ONBOARDING:

1. Boas-vindas
Exibir:
- nome do usuário
- nome do salão
- mensagem acolhedora
- progresso inicial

Mensagem:
“Vamos configurar seu salão em poucos minutos.”

2. Informações do salão
Campos:
- nome fantasia
- telefone
- WhatsApp
- cidade
- estado
- horário inicial de funcionamento

3. Configuração operacional
Campos:
- intervalo padrão agenda
- duração padrão serviços
- moeda
- timezone

4. Serviços iniciais
Permitir:
- selecionar serviços sugeridos
- adicionar novos serviços

Sugestões:
- Corte
- Escova
- Manicure
- Hidratação

5. Profissional administrador
Exibir:
- usuário administrador
- permissões
- papel principal

Preparar futura expansão multi-profissionais.

6. Finalização
Exibir:
- resumo da configuração
- status concluído
- CTA:
“Entrar no Bellory”

UX/UI:

- aparência SaaS premium internacional
- onboarding moderno estilo Notion/Stripe/Linear
- visual elegante
- fluxo leve
- altamente intuitivo
- mobile-first obrigatório

PALETA VISUAL:

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

REQUISITOS UX:

- animações suaves
- progresso visual elegante
- salvar automaticamente etapas
- loading elegante
- feedback visual claro
- transitions suaves
- validações amigáveis
- evitar aparência de formulário burocrático

IMPORTANTE:
- transformar onboarding em experiência agradável
- evitar excesso de campos por etapa
- utilizar step-by-step progressivo
- manter sensação premium
- priorizar usabilidade mobile

INTEGRAÇÃO API:

Consumir APIs existentes:
- onboarding status
- tenant settings
- create/update services
- update onboarding progress

CRIAR:

1. Hook:
useOnboarding

2. Service:
onboarding.service.ts

3. Context:
OnboardingProvider.tsx

FUNCIONALIDADES:

- salvar progresso
- recuperar progresso
- continuar onboarding
- concluir onboarding
- proteger rota autenticada
- impedir acesso sem login

VALIDAÇÕES:

- nome obrigatório
- WhatsApp válido
- horário válido
- serviço obrigatório mínimo
- tratar erros de conexão

TRATAMENTO DE ERROS:

Exibir mensagens amigáveis:
- “Não foi possível salvar”
- “Tente novamente”
- “Conexão perdida”

Não exibir:
- erros internos
- stack traces
- mensagens técnicas backend

RESPONSIVIDADE:

- mobile-first obrigatório
- excelente UX mobile
- adaptação tablet
- adaptação desktop
- stepper responsivo

RESULTADO ESPERADO:

Gerar:
- frontend onboarding completo
- integração com backend existente
- fluxo premium de ativação
- experiência moderna
- arquitetura escalável
- código limpo
- onboarding progressivo funcional
- UX elegante e intuitiva
- estrutura preparada para dashboard futuro


Implementei a ETAPA-6C do frontend: onboarding interno pós-login.

Criado:

- Rota `/onboarding`
- `OnboardingProvider`
- `useOnboarding`
- `onboarding.service.ts`
- Componentes:
  - `OnboardingLayout`
  - `OnboardingHeader`
  - `OnboardingSidebar`
  - `OnboardingStepper`
  - `MobileStepIndicator`
  - `OnboardingProgress`
  - `WelcomeCard`
  - `SetupCard`
  - `CompletionCard`
  - `StepNavigation`
  - `OnboardingFlow`

Também ajustei o pós-login para redirecionar por padrão para `/onboarding`.

O fluxo cobre:

- boas-vindas
- informações do salão
- configuração operacional
- serviços iniciais
- profissional administrador
- finalização com CTA “Entrar no Bellory”

Integrações usadas:

- `GET /onboarding/status`
- `PATCH /onboarding/steps/:step`
- `POST /onboarding/complete`
- `GET /tenant/settings`
- `PATCH /tenants/current`
- `PATCH /tenants/current/settings`

Observação importante: como ainda não existe rota dedicada no backend para criar/editar serviços pelo frontend, a seleção de serviços iniciais está sendo persistida como metadata da etapa `services_created`. Ficou preparado para trocar facilmente por uma API real de serviços depois.

Validação feita:

```bash
npm run build
```

Build aprovado. Servidor local está ativo e a rota respondeu `200 OK`:

```text
http://127.0.0.1:3001/onboarding
```