Contexto:

O projeto Bellory é um SaaS multi-tenant para profissionais da beleza, salões e profissionais autônomos.

Tecnologias do projeto:
- Frontend: React + Next.js
- Estilização: Tailwind CSS
- Componentes UI: shadcn/ui
- Backend: Node.js
- Banco: Supabase PostgreSQL
- Autenticação: Supabase Auth + JWT
- Integrações futuras:
  - WhatsApp
  - campanhas automáticas
  - IA
  - CRM
  - dashboard analítico

Objetivo:
Criar a Landing Page oficial do Bellory.

IMPORTANTE:
- Criar frontend profissional e moderno.
- Layout obrigatoriamente RESPONSIVO.
- Arquitetura MOBILE-FIRST.
- Não criar visual corporativo pesado estilo ERP.
- Design deve transmitir:
  - elegância
  - leveza
  - sofisticação
  - tecnologia
  - modernidade
  - simplicidade

Público-alvo:
- salões de beleza
- cabeleireiras
- manicures
- barbeiros
- esteticistas
- profissionais autônomos da beleza

DIREÇÃO VISUAL:

Conceito:
“Tecnologia elegante para profissionais da beleza”

Estilo visual:
- clean premium
- feminino moderno
- minimalista sofisticado
- visual instagramável
- UX moderna estilo SaaS premium

PALETA DE CORES:

Primária:
#C97B84

Secundária:
#F5E9E2

Destaque:
#7B4B94

Fundo:
#FFFDFB

Texto:
#2C2C2C

Evitar:
- azul corporativo pesado
- verde bancário
- vermelho agressivo
- excesso de gradientes
- aparência ERP tradicional

REQUISITOS TÉCNICOS:

1. Criar utilizando:
- React
- Next.js App Router
- Tailwind CSS
- shadcn/ui

2. Arquitetura:
- componentizada
- escalável
- organizada
- preparada para futuras integrações

3. Responsividade:
- mobile-first obrigatório
- adaptação completa:
  - mobile
  - tablet
  - notebook
  - desktop

4. Performance:
- otimizar carregamento
- evitar componentes pesados
- preparar SEO

5. Criar estrutura profissional:
frontend/
  src/
    app/
    components/
    sections/
    layouts/
    styles/

SEÇÕES DA LANDING PAGE: 

1. HERO SECTION
Objetivo:
- apresentar Bellory
- destacar proposta de valor
- CTA principal

Elementos:
- headline forte
- subtítulo moderno
- botão “Começar agora”
- botão “Ver demonstração”
- mockup ilustrativo do sistema

Mensagem:
Automatize seu salão e fidelize clientes com inteligência.

2. BENEFÍCIOS
Exibir:
- agenda inteligente
- confirmação automática
- CRM
- campanhas
- WhatsApp
- IA futura
- dashboards
- automação

3. COMO FUNCIONA
Fluxo:
1. cadastro
2. criação do salão
3. configuração inicial
4. compartilhamento do link
5. clientes agendam
6. Bellory automatiza

4. MÓDULO WHATSAPP
Explicar:
- confirmação automática
- campanhas
- relacionamento
- recuperação de clientes
- notificações

5. DASHBOARD PREVIEW
Criar mockups modernos mostrando:
- agenda
- métricas
- clientes
- faturamento
- ocupação

6. PLANOS
Preparar estrutura:
- Trial grátis
- Plano profissional
- Plano premium

7. DEPOIMENTOS
Criar layout elegante preparado para uso futuro.

8. CTA FINAL
Mensagem forte de conversão.

9. FOOTER
- links
- contato
- redes sociais
- termos
- privacidade

REQUISITOS UX/UI:

- utilizar espaçamento moderno
- tipografia sofisticada
- animações suaves
- hover effects leves
- cards elegantes
- sombras suaves
- bordas arredondadas modernas
- aparência SaaS premium internacional

IMPORTANTE:
- Criar componentes reutilizáveis.
- Separar seções em componentes independentes.
- Preparar integração futura com APIs do backend.
- Preparar futura integração com autenticação/login.
- Não usar dados mock excessivamente irreais.
- Priorizar experiência mobile.

RESULTADO ESPERADO:

Gerar:
- estrutura completa do frontend
- componentes
- páginas
- layout responsivo
- organização profissional
- código limpo
- arquitetura preparada para crescimento do Bellory


Landing Page do Bellory criada em `frontend/` com Next.js App Router, Tailwind CSS e componentes estilo shadcn/ui.

O que foi entregue:
- Página principal em [page.tsx](c:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/app/page.tsx)
- Layout global, SEO e fontes em [layout.tsx](c:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/app/layout.tsx)
- Seções componentizadas em `frontend/src/sections`
- Componentes reutilizáveis em `frontend/src/components`
- UI base em `frontend/src/components/ui`
- Páginas auxiliares para CTAs:
  - `/cadastro`
  - `/login`
  - `/demo`
  - `/termos`
  - `/privacidade`

Incluí as seções pedidas:
- Hero com CTA e mockup do sistema
- Benefícios
- Como funciona
- WhatsApp
- Preview do dashboard
- Planos
- Depoimentos
- CTA final
- Footer

Também preparei a arquitetura para integração futura com backend/API e autenticação.

Validação:
- `npm install` executado
- `npm run build` passou com sucesso
- servidor local iniciado e verificado com status `200 OK`

URL local:
`http://127.0.0.1:3001`

Observação: o `npm install` reportou 2 vulnerabilidades moderadas e um aviso de engine do ESLint porque o Node local é `20.11.1`, enquanto uma dependência prefere `20.19+`. O build do Next passou normalmente.