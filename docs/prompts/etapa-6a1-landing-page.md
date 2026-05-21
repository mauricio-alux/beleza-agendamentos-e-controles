Contexto:
O projeto Bellory é um SaaS para profissionais da beleza, salões e autônomos. A landing page já existe ou está em desenvolvimento. O objetivo agora é incluir uma seção de vídeo demonstrativo para aumentar conversão de leads.

Objetivo:
Adicionar uma seção de vídeo na página de apresentação do SaaS, com foco em conversão, clareza e percepção de valor.

Localização da seção:
Implementar o vídeo diretamente na Hero Section, substituindo o mockup estático do dashboard por um vídeo demonstrativo premium em looping silencioso.

Estrutura da Hero:
- lado esquerdo:
  - headline
  - subtítulo
  - CTA principal
  - botão “Ver demonstração”

- lado direito:
  - vídeo demonstrativo curto do Bellory
  - autoplay silencioso
  - loop suave
  - aparência cinematográfica premium
  - totalmente responsivo

O vídeo da Hero deve funcionar como um “preview vivo” do produto, mostrando:
- dashboard
- agenda
- WhatsApp
- automações
- métricas
- interações do sistema

IMPORTANTE:
- o vídeo da Hero NÃO deve ser um tutorial longo
- NÃO usar áudio automático
- NÃO usar aparência de player YouTube tradicional
- manter visual elegante, clean e sofisticado
- otimizar performance e carregamento

O botão “Ver demonstração” deve abrir um modal contendo a demonstração completa do sistema com áudio opcional.

Implementar:
1. Seção “Veja o Bellory em ação”
2. Botão “Assistir demonstração”
3. Player de vídeo responsivo
4. Modal opcional para abrir o vídeo
5. Thumbnail elegante com botão play
6. Layout mobile-first
7. Boa adaptação para mobile, tablet e desktop
8. CTA após o vídeo: “Começar teste grátis” ou “Criar minha conta”

Direção visual:
- Estilo premium, clean, moderno e elegante.
- Usar cards com bordas arredondadas, sombras suaves e espaçamento generoso.
- O vídeo deve parecer parte natural da landing page, sem poluir o layout.

Conteúdo sugerido para o vídeo:
O vídeo deve ter entre 45 e 90 segundos, no máximo 2 minutos.

Roteiro recomendado:
1. Mostrar a dor:
   - agenda desorganizada;
   - confirmações manuais;
   - clientes que esquecem horários;
   - dificuldade de fazer campanhas;
   - WhatsApp cheio de mensagens soltas.

2. Apresentar o Bellory:
   - agenda inteligente;
   - cadastro do salão;
   - link de agendamento;
   - dashboard;
   - clientes;
   - campanhas;
   - WhatsApp como canal operacional;
   - automação e IA futura.

3. Mostrar o resultado:
   - mais organização;
   - mais retorno de clientes;
   - menos trabalho manual;
   - mais profissionalismo;
   - mais crescimento para o salão.

4. Fechar com CTA:
   - “Teste o Bellory gratuitamente”
   - “Organize seu salão com tecnologia simples e elegante”

O que fazer:
- Usar thumbnail atrativa.
- Usar botão play bem visível.
- Permitir abertura em modal.
- Garantir carregamento leve.
- Usar lazy loading no vídeo.
- Garantir responsividade total.
- Manter CTA próximo ao vídeo.
- Priorizar experiência mobile.
- Preparar o componente para trocar facilmente o link do vídeo no futuro.

O que evitar:
- Não usar autoplay com som.
- Não colocar vídeo pesado carregando imediatamente.
- Não criar vídeo longo demais.
- Não deixar o vídeo acima da proposta de valor principal.
- Não usar visual corporativo pesado.
- Não criar aparência de ERP antigo.
- Não usar excesso de texto na seção.
- Não depender apenas do vídeo para explicar o produto.
- Não bloquear a navegação se o vídeo não carregar.

Requisitos técnicos:
- Usar React + Next.js.
- Usar Tailwind CSS.
- Criar componente reutilizável, por exemplo:
  components/VideoDemoSection.tsx
- Se houver modal, criar componente:
  components/VideoModal.tsx
- Preparar propriedade para receber:
  - videoUrl
  - thumbnailUrl
  - title
  - subtitle
  - ctaLabel
  - ctaHref

Além da inclusão do vídeo, a paleta atual do SaaS está muito opaca e sem vida visual.
AJUSTE VISUAL IMPORTANTE:
Atualizar o design da landing page para transmitir:
- mais modernidade
- mais energia visual
- mais sofisticação
- mais apelo premium
- mais identidade “Beauty Tech”

Nova direção visual:
“Premium Vibrante Controlado”

Objetivo:
Criar uma experiência visual:
- elegante
- moderna
- tecnológica
- feminina sofisticada
- confortável visualmente
- altamente atrativa para conversão

NOVA PALETA:

Primária:
#E26D7C

Hover primário:
#D85C6C

Secundária:
#FFE8E2

Destaque premium:
#7B4BFF

Accent glow:
#FFB3C1

Fundo principal:
#FFFDFC

Cards:
#FFFFFF

Texto principal:
#2B2B2B

Texto secundário:
#6B6B6B

DIRETRIZES IMPORTANTES:

- aumentar contraste visual dos CTAs
- usar gradientes suaves e modernos
- utilizar sombras suaves premium
- utilizar glow discreto em elementos estratégicos
- manter aparência clean
- evitar aparência infantil
- evitar excesso de rosa
- evitar neon
- evitar poluição visual
- evitar aparência ERP corporativa

UX/UI:
- aparência SaaS premium internacional
- visual mais “Instagramável”
- transmitir sensação de modernidade e inovação
- priorizar experiência mobile
- usar micro animações suaves
- melhorar percepção visual de profundidade

Objetivo final:
A landing page deve parecer:
- moderna
- viva
- premium
- memorável
- sofisticada
- tecnológica
- altamente conversiva

NOTA:
- 1 No cabeçalho elimine o texto “Bealty SaaS”, deixe apenas a palavra “Bellory” em destaque.
- 2 Nas imagens do Dashboard,  substitua a palavra “Dashboard” por uma expressão em português, tal como “Painel”, para facilitar o entendimento dos usuários. 

Resultado esperado:
Criar uma seção de vídeo profissional, responsiva e orientada à conversão, integrada à landing page do Bellory, mantendo identidade visual premium, foco em transformar visitantes em leads/clientes, e uma paleta de cores atraente, vibrante e elegante.
Esse prompt deve orientar o CODEX a criar a seção de vídeo sem comprometer performance, estética ou conversão.


Ajustes aplicados na landing do Bellory.

Criei a seção de vídeo na Hero substituindo o mockup estático por um preview premium com autoplay silencioso, loop, poster leve e fallback visual caso o MP4 ainda não exista.

Principais arquivos:
- [VideoDemoSection.tsx](c:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/components/VideoDemoSection.tsx)
- [VideoModal.tsx](c:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/components/VideoModal.tsx)
- [hero-section.tsx](c:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/src/sections/hero-section.tsx)
- [bellory-video-thumbnail.svg](c:/WorkSpaces/Projetos/Projeto-Bellory/bellory-codex/frontend/public/images/bellory-video-thumbnail.svg)

Também atualizei:
- paleta para o visual “Premium Vibrante Controlado”
- CTA com mais contraste
- sombras/glows mais modernos
- header removendo “Beauty SaaS”
- “Dashboard Bellory” para “Painel Bellory”
- textos com acentuação corrigida em partes visíveis

O componente está preparado para trocar os vídeos facilmente:
- preview Hero: `/videos/bellory-hero-preview.mp4`
- demo completa modal: `/videos/bellory-demo-completo.mp4`
- thumbnail: `/images/bellory-video-thumbnail.svg`

Validação:
- `npm run build` passou com sucesso
- servidor local reiniciado e respondendo `200 OK`

URL local:
`http://127.0.0.1:3001`