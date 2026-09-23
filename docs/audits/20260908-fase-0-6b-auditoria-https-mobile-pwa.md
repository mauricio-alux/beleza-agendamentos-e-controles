# STATUS

Auditoria realizada em 08/09/2026, conforme o TXT “Aplicar via CODEX”. Somente este relatório foi criado. Nenhuma ferramenta instalada, túnel aberto, certificado criado, servidor reiniciado, build executado ou configuração alterada nesta auditoria. A recomendação abaixo é um plano futuro, condicionado à autorização.

O TXT informa que o Booking mobile foi validado após a correção de UUID; esse resultado é contexto fornecido, não um teste repetido nesta execução. A instalação PWA em HTTPS no celular permanece pendente.

# AMBIENTE WINDOWS

| Item | Evidência observada |
|---|---|
| Sistema | Windows 11 Pro, versão 10.0.26200; registro indica 25H2, revisão 9168 |
| Node.js | 20.11.1 |
| npm / npx | 10.5.2 / 10.5.2 |
| VS Code | 1.136.2 instalado; também há arquivos da versão 1.136.1 |
| Git | 2.54.0 instalado |
| Frontend | Next.js 15.5.18 instalado; package.json declara ^15.0.3 |
| Backend | Express 4.22.2 instalado; package.json declara ^4.19.2 |
| Bindings | Next: [::]:3000, também acessível por IPv4; backend: 0.0.0.0:3001 |

O registro mantém um ProductName legado “Windows 10 Pro”; a identificação Windows 11 foi confirmada por Win32_OperatingSystem. Consultas inicialmente limitadas pelo sandbox foram repetidas com permissão somente para leitura.

Processos associados às portas: frontend PID 35968, iniciado por `node .../next dev -p 3000` (pai 14488); backend PID 13248, `node src/server.js`. Foram vistos outros processos `node --watch src/server.js`, sem atribuí-los a estas portas ou encerrá-los.

# FRONTEND

`frontend/package.json`: dev = `next dev`; build = `next build`; start = `next start`; lint = `next lint`. O script `scripts/start-frontend-dev.cmd` também inicia Next em dev na porta 3000. O processo atual está em desenvolvimento, não em `next start`.

`frontend/next.config.ts` contém apenas `reactStrictMode: true`. Não há rewrite, proxy, API route ou configuração HTTPS identificada no frontend. O CLI instalado oferece `--experimental-https` e opções de chave, certificado e CA; não estão em uso. Um certificado autossinado gerado pelo Next não passa a ser confiável no celular automaticamente.

`frontend/src/config/app-brand.ts` resolve API_URL de NEXT_PUBLIC_API_URL, com fallback localhost. APP_BRAND.appUrl prioriza NEXT_PUBLIC_PLATFORM_WEBSITE e depois NEXT_PUBLIC_APP_URL. O `.env` efetivo usa as URLs LAN abaixo; o `.env.example` não é configuração ativa. Não foi encontrado arquivo `.env.local` ou override de produção nessa inspeção.

`layout.tsx` usa `buildAppUrl('/manifest.webmanifest')`: a referência ao manifest é absoluta. Também usa a origem configurada em metadataBase, canonical e OpenGraph. Só abrir uma URL de túnel mantendo o build LAN deixa referências erradas. As variáveis NEXT_PUBLIC são incorporadas ao bundle durante o build; configurar antes de compilar. [Documentação Next.js](https://nextjs.org/docs/app/guides/environment-variables).

# BACKEND

`backend/package.json`: dev = `node --watch src/server.js`; start = `node src/server.js`. Os demais scripts são reconciliações, auditorias, operações de dados e testes; nenhum foi executado. O script PowerShell de desenvolvimento desativa somente REMINDER_SCHEDULER_ENABLED.

`server.js` inicia HTTP Express e schedulers. `app.js` monta as mesmas rotas em `/api` e `/`, aceita JSON até 1 MB e usa CORS global. A API pode receber `/api/public/booking/...` ou `/public/booking/...`.

URLs reais no `.env`: APP_URL aponta para a porta 3001; PUBLIC_APP_URL para 3000; BOOKING_BASE_URL para 3000/agendar. Atenção: APP_URL não é simplesmente “URL da API”. É usada como origem de marca e por links de campanhas; em uma configuração futura, deve apontar para a origem pública do frontend. PLATFORM_WEBSITE, se definido, tem precedência. PUBLIC_APP_URL tem precedência sobre FRONTEND_URL para links públicos.

Geração de links: `client-identity.service.js` usa BOOKING_BASE_URL; `appointment-operational-token.js` usa PUBLIC_APP_URL e fallbacks; campanhas usam buildAppUrl; recuperação de senha usa buildPublicAppUrl('/redefinir-senha'). Testar recuperação exigiria revisar allowlist de redirects do Supabase, mas ela não integra este teste PWA e não será alterada.

Não foi encontrado uso de cookies de sessão ou `credentials: 'include'` nos fluxos auditados. Autenticação SaaS usa Bearer; Public Booking envia token em payload/query. Query strings com tokens exigem cuidado nos logs do proxy. A dependência `ws` é transporte do cliente Supabase no backend; não foi encontrado servidor WebSocket público próprio. Não há dependência funcional que exija HTTP no cliente; as origens são configuráveis.

`error.middleware.js` não retorna stack de erros genéricos, mas registra erros no console e permite details em AppError. Não foram encontrados middleware global de rate limiting, Helmet ou configuração trust proxy. Isso é diagnóstico, não autorização para alterar segurança nesta etapa.

# PWA ATUAL

Leituras HTTP locais, sem enviar operações de negócio:

| Recurso | Resultado |
|---|---|
| `/manifest.webmanifest` | 200, application/manifest+json |
| Manifest retornado | start_url=/acesso; scope=/; display=standalone |
| `/sw.js` | 200, application/javascript; Cache-Control public,max-age=0 |
| `/api/public/health` | 200 |

`pwa-manifest.ts` deriva nome e descrição da configuração de marca e declara ícones 192, 512 e maskable. `PwaServiceWorker.tsx` registra `/sw.js` no evento load, sem restrição a production. O script na raiz permite escopo padrão `/`, sem necessidade de Service-Worker-Allowed adicional. O SW guarda `/offline`, usa rede para navegação e evita cache de APIs/identidade; não implementa Booking offline.

O registro captura erros silenciosamente e depende do evento load; portanto a validação futura deve verificar registro, ativação e controle de fato. Um GET 200 no script não comprova isso. Não foi alterado esse comportamento.

O CTA depende de beforeinstallprompt nos navegadores compatíveis. No iOS exibe instruções para compartilhar/adicionar à Tela de Início. Detecta standalone e pode ocultar o CTA por 14 dias após dispensa. HTTPS habilita condições técnicas, não garante que o navegador apresente o CTA imediatamente. Instalar um atalho também não comprova todos os critérios PWA. [Instalação PWA](https://developer.mozilla.org/en-US/docs/Web/Progressive_web_apps/Guides/Making_PWAs_installable), [Safari no iPhone](https://support.apple.com/en-au/guide/iphone/iphea86e5236/ios).

# SECURE CONTEXT

Service worker requer origem confiável: HTTPS válido ou exceção local como localhost. No celular, localhost identifica o próprio celular; HTTP para o IP do notebook não recebe a exceção de localhost. HTTPS temporário com certificado válido é adequado, independentemente de ser produção. O SW e o manifest devem permanecer na origem HTTPS usada no teste. [Registro de service worker](https://developer.mozilla.org/en-US/docs/Web/API/ServiceWorkerContainer/register).

Mudar de HTTP LAN para HTTPS cria outra origem: localStorage, sessionStorage, known-tenants, preferred-tenant, tokens e instalação não migram automaticamente. Preparar a identidade de teste na nova origem. Reiniciar um Quick Tunnel com outra URL exige novo build e nova preparação; preservar o processo durante todo o ciclo instalação/reabertura.

# CORS ATUAL

`app.use(cors())` usa defaults do pacote: Access-Control-Allow-Origin: *. Confirmado via HEAD no health com Origin HTTPS fictícia. Access-Control-Allow-Credentials não é emitido; credentials=true não é usado. Localhost não está hardcoded numa allowlist: todas as origens, inclusive IP LAN e HTTPS temporário, já são aceitas por CORS.

Não existe variável de allowlist conectada ao middleware. Restringir origens dentro do Express exigiria alteração de código; não basta inventar CORS_ORIGIN no `.env`. Nada foi liberado nesta auditoria. CORS não é autenticação nem bloqueia clientes fora do navegador.

# MIXED CONTENT

Frontend HTTPS chamando `http://192.168.68.54:3001` por fetch não é uma solução compatível: normalmente é bloqueado como mixed content e pode enfrentar restrições de rede local. Há navegadores recentes que permitem exceções mediante permissão de Local Network Access; não é correto garantir bloqueio universal, nem depender dessas exceções para este teste. Nenhuma flag ou relaxamento será recomendado. [Mixed content](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Mixed_content), [exceções atuais de rede local](https://developer.mozilla.org/en-US/docs/Web/Security/Defenses/Local_network_access).

A proposta faz o celular chamar somente a mesma origem HTTPS, incluindo a API. O transporte HTTP final ocorre exclusivamente no loopback do notebook, entre proxy e processos locais; não é uma chamada insegura feita pelo navegador.

# DEV MODE / RISCOS

NEXT_PUBLIC_DEV_MODE=true e NODE_ENV=development estão definidos no frontend; o backend também está em development. `ClientDebugPanel` fica ativo em `/agendar` quando ambas as condições se cumprem. Exibe/copia token, cliente, telefone, tenant, sessão e diagnósticos, além de permitir limpar a identidade local. Risco alto de exposição acidental em uma sessão de teste real.

Next dev acrescenta overlay, diagnósticos e artefatos de desenvolvimento. Um túnel direto para 3000 torna alcançáveis também `/admin`, `/login`, `/cadastro` e demais páginas. O backend administrativo tem authMiddleware, requirePlatformAdmin e permissões, mas isso não equivale a manter essas rotas fora da exposição pública.

Endpoints sem autenticação SaaS incluem health, plans, landing, login/cadastro/recuperação e catálogo/identificação/reserva públicos. As operações de cliente possuem validações próprias. O POST de webhook WhatsApp não verifica assinatura na cadeia inspecionada; não deve ser incluído na exposição do teste. O backend monta esses caminhos com e sem `/api`.

SUPABASE_URL: CONFIGURADO. SUPABASE_ANON_KEY: CONFIGURADO. SUPABASE_SERVICE_ROLE_KEY: CONFIGURADO. WHATSAPP_CLOUD_ACCESS_TOKEN: NÃO CONFIGURADO. WHATSAPP_WEBHOOK_VERIFY_TOKEN: NÃO CONFIGURADO. Nenhum valor secreto foi incluído neste relatório. Não foram encontrados nomes de secrets sob NEXT_PUBLIC no `.env` do frontend, nem importação do cliente administrativo Supabase no código frontend inspecionado. Isso não constitui auditoria completa de todos os bundles/dependências.

WHATSAPP_DRY_RUN=true no arquivo; os quatro interruptores de scheduler não estão definidos no `.env`. O launcher conhecido desativa lembretes, mas os demais defaults são ativos. Um teste com acesso ao Supabase remoto pode causar efeitos por jobs ou operações de negócio. Planejar apenas tenant/dados de teste e desativar jobs para a sessão futura.

# FERRAMENTAS HTTPS/TÚNEL ENCONTRADAS

| Ferramenta | Situação | Evidência/limite |
|---|---|---|
| cloudflared | NÃO INSTALADO nas localizações consultadas | Sem comando no PATH ou instalação registrada |
| ngrok | NÃO INSTALADO nas localizações consultadas | Sem comando no PATH ou instalação registrada |
| Localtunnel | INSTALADO | Pacote npm global 2.0.2, comando lt |
| mkcert | NÃO INSTALADO nas localizações consultadas | Sem comando ou CA local correspondente encontrada |
| OpenSSL | INSTALADO | 3.5.6 incluído no Git; fora do PATH padrão |
| Caddy | NÃO INSTALADO nas localizações consultadas | Sem comando/registro encontrado |
| nginx | NÃO INSTALADO nas localizações consultadas | Sem comando/registro encontrado |
| IIS | NÃO INSTALADO como servidor detectável | Sem W3SVC/IISADMIN ou inetinfo.exe; componentes opcionais não inventariados integralmente |
| VS Code Port Forwarding | INSTALADO/DISPONÍVEL | Recurso embutido; código de forwarding localizado; conta e conexão não verificados |
| devtunnel CLI / Tailscale | NÃO INSTALADO nas localizações consultadas | Sem comando encontrado |
| OpenSSH | INSTALADO | ssh.exe do Windows; não fornece sozinho origem HTTPS pública confiável |
| Docker | NÃO INSTALADO no PATH consultado | Não necessário para a recomendação |
| Certificados de desenvolvimento | NÃO ENCONTRADOS | Sem arquivos próprios no projeto ou CA mkcert/Caddy identificada nos stores consultados |
| Certificados pessoais/de terceiros | NÃO APLICÁVEL | Existem no Windows; não são evidência de certificado servidor para o IP LAN; não serão reutilizados |

“Não instalado” indica ausência nas verificações realizadas, não prova de inexistência de executável portátil em qualquer pasta. Nenhuma ferramenta foi instalada ou autenticada. Não foram inspecionados tokens de conta de túneis.

# ALTERNATIVA A — CLOUDFLARE TUNNEL

Quick Tunnel fornece subdomínio HTTPS aleatório em trycloudflare.com, sem conta ou domínio próprio, após instalar cloudflared. É gratuito e destinado a testes; não há garantia de disponibilidade. A documentação informa limite de 200 requisições simultâneas e ausência de SSE. Um processo deve permanecer vivo durante o teste. [Cloudflare Quick Tunnels](https://developers.cloudflare.com/cloudflare-one/networks/connectors/cloudflare-tunnel/do-more-with-tunnels/trycloudflare/).

Dois túneis permitem frontend HTTPS e API HTTPS independentes, porém multiplicam URLs/configuração e tornam CORS necessário no navegador. Publicar portas inteiras também amplia a superfície. Um único túnel para proxy restrito é preferível. Quick Tunnel não torna a aplicação privada por ter URL aleatória; políticas de acesso privadas gerenciadas exigem outra configuração, fora desse modo simples.

# ALTERNATIVA B — NGROK

Requer agente, conta e authtoken. O plano gratuito consultado inclui HTTPS automático, um domínio dev atribuído, até três endpoints online, 1 GB/mês e 20 mil requisições/mês; há página intersticial. Não assumir dois hostnames gratuitos independentes: a documentação limita a um dev domain. O intersticial pode interferir na primeira visita e na experiência PWA, exigindo validação. Domínio persistente favorece retestes. [Limites oficiais](https://ngrok.com/docs/pricing-limits/free-plan-limits).

Dois upstreams exigiriam roteamento compatível com a conta/plano; um único endpoint para o proxy local evita essa dependência. CORS é dispensável no browser com origem única. Não configurar authtoken no frontend. Preços/limites devem ser reconfirmados na configuração, sem contratar plano automaticamente.

# ALTERNATIVA C — HTTPS LOCAL / MKCERT

CA local instalada no notebook e confiada no celular, certificado com SAN do IP/hostname LAN e proxy HTTPS para ambas as aplicações. Next experimental HTTPS pode servir o frontend, mas não resolve sozinho a API nem a confiança móvel. OpenSSL sozinho também não instala confiança. Android/Chrome exige verificar aceitação da CA de usuário no dispositivo; iOS requer perfil e confiança completa. Não compartilhar a chave privada da CA. [mkcert](https://github.com/FiloSottile/mkcert).

Sem conta externa, DNS público ou túnel; exige mesma LAN/rota privada. HTTPS local não exige internet para si, mas o backend atual precisa alcançar Supabase remoto. Mudança de IP exige certificado compatível. Complexidade e manutenção de confiança no celular tornam a opção menos conveniente para uma sessão curta, mas justificável quando a aplicação não pode ficar publicamente acessível.

# ALTERNATIVA D — PREVIEW/STAGING

Tecnicamente viável com frontend Next em runtime compatível e backend Node, origem única por proxy ou duas origens HTTPS. Não foi encontrada configuração de deploy/preview pronta nos arquivos consultados. Conta, plataforma, custos e isolamento precisam ser definidos. O Supabase remoto configurado não é automaticamente um banco isolado de staging; duplicar o backend pode duplicar schedulers e efeitos reais. Não copiar secrets para NEXT_PUBLIC, build público ou repositório. Melhor para testes repetidos, com maior esforço que a sessão temporária proposta.

# OUTRAS ALTERNATIVAS

Localtunnel já instalado evita download de um cliente de túnel. O serviço fornece URL pública HTTPS, cujo subdomínio solicitado não é garantido. Disponibilidade e eventuais telas intermediárias do serviço hospedado não foram testadas, pois isso exigiria abrir túnel. Não é a opção preferida para um ciclo PWA que precisa manter a mesma origem. [Projeto Localtunnel](https://github.com/localtunnel/localtunnel).

VS Code possui Port Forwarding embutido via Microsoft dev tunnels, sem extensão adicional. O modo privado requer autenticação; o público remove essa barreira e volta a exigir filtro de rotas. A autenticação intermediária precisa ser testada na abertura standalone e no carregamento do SW. Não foi aberto o painel nem criada conexão. [VS Code](https://code.visualstudio.com/docs/debugtest/port-forwarding).

A arquitetura aceita um rewrite Next `/api/:path*` para `http://127.0.0.1:3001/api/:path*`, pois a API já suporta o prefixo. NEXT_PUBLIC_API_URL passaria a `<origem HTTPS>/api`. Seria pequena alteração em next.config.ts, sem mudança de negócio, mas o rewrite sozinho não bloqueia `/admin` nem APIs fora do escopo. [Rewrites](https://nextjs.org/docs/app/api-reference/config/next-config-js/rewrites).

Um proxy Caddy externo ao código permite o mesmo roteamento e filtro sem mudar Next/Express. Exige adquirir um executável adicional após aprovação, compensado pela configuração descartável e ausência de código novo no produto. [Proxy Caddy](https://caddyserver.com/docs/caddyfile/directives/reverse_proxy), [matchers](https://caddyserver.com/docs/caddyfile/matchers).

# MATRIZ COMPARATIVA

| Alternativa | Segurança | Complexidade | HTTPS real | Mobile | PWA | Conta externa | Alteração código | Recomendação |
|---|---|---|---|---|---|---|---|---|
| Cloudflare Quick + proxy restrito | Média; rotas públicas controladas | Média | Sim, certificado público | Wi-Fi ou móvel | Sim; manter URL | Não | Não | Preferida |
| Cloudflare em dois túneis diretos | Menor; superfície ampla | Média | Sim | Sim | Possível; duas URLs | Não no quick | CORS restritivo exigiria código ou gateway | Não preferir |
| ngrok + proxy | Média; intersticial/conta | Média | Sim | Sim | Validar intersticial | Sim | Não com proxy | Viável |
| HTTPS local/mkcert + proxy | Boa; limitado à LAN | Média/alta | Sim, CA confiada | Mesma LAN | Sim; testar confiança | Não | Não com proxy | Fallback |
| Preview/staging isolado | Boa se protegido e isolado | Alta | Sim | Sim | Boa fidelidade | Em geral sim | Configuração de deploy | Para uso recorrente |
| Localtunnel + proxy | Média; serviço público | Média | Sim | Sim | Validar estabilidade | Não no uso básico | Não | Já instalado, secundário |
| VS Code forwarding + proxy | Privado com login; público precisa filtro | Baixa/média | Sim | Sim | Validar autenticação | Sim | Não | Alternativa disponível |

HTTPS é transporte, não garantia de aplicação segura. Todas as opções públicas dependem dos controles descritos, mesmo sem mudança de código.

# ALTERNATIVA RECOMENDADA

Um Cloudflare Quick Tunnel apontando exclusivamente para Caddy local em loopback, com frontend em build de produção e API de Booking na mesma origem. Caddy deve publicar só os caminhos/métodos necessários e negar o restante. Não publicar diretamente 3000 ou 3001.

# JUSTIFICATIVA

Uma origem elimina CORS no fluxo e mixed content; o certificado público dispensa CA no celular. O proxy externo preserva código/arquitetura e permite excluir administração. Cloudflared e Caddy precisam ser instalados/adquiridos, mas não são dependências npm do projeto. O modo build + start reduz overlay/debug e se aproxima da execução real da PWA; production não significa deploy de produção.

Requer internet no notebook/celular e DNS externo para a URL fornecida. Não exige mesmo Wi-Fi, conta Cloudflare, alteração DNS própria ou port forwarding no roteador. Depende de saída de rede permitida para o serviço; se bloqueada, parar e avaliar fallback, sem alterar firewall automaticamente.

# ALTERNATIVA DE FALLBACK

HTTPS local com mkcert e Caddy na LAN, usando build de produção e o mesmo filtro de rotas. Indicada se a exposição pública residual não for aceitável ou o túnel não puder ser utilizado. Exige consentimento para instalar/remover CA no celular; não aceitar apenas ignorar alerta de certificado.

# TOPOLOGIA HTTPS PROPOSTA

```text
Celular Chrome/Safari
  -> HTTPS https://<temporario>.trycloudflare.com
  -> Cloudflare -> canal criptografado -> cloudflared no notebook
  -> HTTP loopback 127.0.0.1:3080 (Caddy, porta ilustrativa)
       -> rotas web permitidas -> HTTP 127.0.0.1:3000 (next start)
       -> /api/public/booking/<slug-teste>/... -> HTTP 127.0.0.1:3001
       -> /api/public/health -> HTTP 127.0.0.1:3001
       -> demais rotas: negar
```

Preservar `/api` ao encaminhar: Express já o monta. O navegador nunca recebe localhost ou IP HTTP como destino da API. O gateway não serve arquivos do workspace e não funciona como proxy aberto.

Allowlist futura inicial: GET/HEAD `/acesso`, `/agendar/<slug-teste>`, `/offline`, `/sw.js`, `/manifest.webmanifest`, favicon, ícones e assets necessários de `/_next/static/`; eventuais imagens apenas se usadas. API: health; catálogo e disponibilidade do slug de teste; identity; client/me; upcoming; appointments somente com métodos definidos no router. Operações com efeito dependem do roteiro de dados de teste autorizado. Não liberar todo `/api/public/*`.

Negar `/admin`, `/api/admin`, `/auth`, `/api/auth`, `/login`, `/cadastro`, webhooks, tenants não aprovados, arquivos de configuração e endpoints internos de Next. Revisar redirects e assets para que nenhum escape do filtro. Como `scope=/`, o service worker controla a origem toda, mas isso não autoriza novas rotas no gateway. Cachear só o que o SW atual já define.

# VARIÁVEIS QUE SERIAM TEMPORARIAMENTE ALTERADAS

Definições conceituais: F = origem HTTPS frontend; A = origem HTTPS da API em opção de duas origens; L = origem HTTPS LAN confiável; S = origem HTTPS de staging. Nenhum desses placeholders é configuração executável aplicada.

| Variável | Atual LAN | Recomendação, origem única | Dois túneis | Local / staging |
|---|---|---|---|---|
| NEXT_PUBLIC_APP_URL | http://192.168.68.54:3000 | F | F | L / S |
| NEXT_PUBLIC_API_URL | http://192.168.68.54:3001 | F/api | A | L/api / S/api |
| APP_URL | http://192.168.68.54:3001 | F | F, por ser origem de links | L / S |
| PUBLIC_APP_URL | http://192.168.68.54:3000 | F | F | L / S |
| BOOKING_BASE_URL | http://192.168.68.54:3000/agendar | F/agendar | F/agendar | L/agendar / S/agendar |
| NEXT_PUBLIC_DEV_MODE | true | false | false | false |
| NODE_ENV, frontend/backend | development | production | production | production |
| HOST backend | 0.0.0.0 | 127.0.0.1 | 127.0.0.1 | 127.0.0.1 com proxy local |
| PORT backend | 3001 | 3001 | 3001 | Conforme runtime; local 3001 |

Se presentes, alinhar NEXT_PUBLIC_PLATFORM_WEBSITE e PLATFORM_WEBSITE, pois têm precedência; FRONTEND_URL é fallback de PUBLIC_APP_URL. NEXT_PUBLIC_APP_DOMAIN/APP_DOMAIN só se necessário para textos/links coerentes; não alterar nome da marca. Logos externos precisam ser HTTPS, se configurados. Nenhuma chave Supabase precisa mudar para fornecer HTTPS; escolher isolamento/dados antes da execução.

Para a sessão futura, desativar REMINDER_SCHEDULER_ENABLED, WHATSAPP_QUEUE_ENABLED, CAMPAIGN_SCHEDULER_ENABLED e BIRTHDAY_GREETING_SCHEDULER_ENABLED; preservar WHATSAPP_DRY_RUN=true. `NODE_ENV=production` deve ser explícito no ambiente de build/start para não herdar development do `.env`. O binding frontend é opção de start (`-H 127.0.0.1`), não a variável HOST do backend.

Preferir overrides temporários apenas nos processos dedicados, evitando editar `.env` LAN. Caso se escolha arquivo `.env` ignorado, fazer backup privado e restauração exata. Obter a URL antes do build mantendo o proxy em resposta bloqueada/manutenção até a validação local terminar; um Quick Tunnel reiniciado muda a origem e exige repetir build/preparação.

# CORS NECESSÁRIO

Com origem única, não há necessidade de habilitar CORS no browser. O gateway pode remover os headers CORS wildcard herdados nas respostas públicas e recusar Origin divergente em requisições de escrita, sem mudar o backend; isso complementa, mas não substitui, autenticação e limites de exposição. Não ampliar permissões para viabilizar o teste.

Em duas origens, permitir somente F, métodos necessários e headers realmente usados, incluindo Content-Type/Authorization quando aplicáveis. Como não há allowlist configurável no Express, seria necessária mudança futura no middleware ou política de gateway. credentials=true continua desnecessário nos fluxos auditados.

# IMPACTO EM CÓDIGO

Recomendação com Caddy: nenhum código Next/Express alterado. Configuração descartável do proxy fora do código do produto. Um rewrite Next seria alternativa tecnicamente simples, mas afetaria next.config.ts e ainda precisaria de barreira para páginas administrativas. Não introduzir dependência npm, nome hardcoded ou alteração tenant-first/identidade.

# IMPACTO EM GIT

Nesta execução, somente este relatório novo. Na configuração futura preferida, executáveis e Caddyfile temporário fora do repositório, overrides de ambiente por processo e build local ignorado. `.env` de frontend/backend já são ignorados pelo Git. Nenhum script versionado é necessário. Preservar todas as mudanças preexistentes; não usar reset/checkout para a reversão.

# RISCOS

- Alto se um túnel apontar diretamente para a instância dev ou backend inteiro. Mitigação proposta: build production, DEV_MODE=false, gateway deny-by-default, testes negativos antes de liberar acesso.
- Médio residual: qualquer pessoa com a URL alcança as rotas públicas liberadas. Uma URL aleatória não é controle de acesso. Limitar tenant/dados/janela de teste; interromper em caso de tráfego indevido. Se for preciso confidencialidade contra acesso público, usar o fallback LAN.
- Alto se dados reais, tokens ou credenciais aparecerem em logs/diagnósticos. O gateway não deve registrar bodies, Authorization nem queries com tokens; não compartilhar logs brutos. Cloudflare termina TLS e participa do transporte; não é criptografia ponta a ponta entre celular e backend.
- Alto de efeitos de negócio se os testes escreverem no Supabase usado pelo projeto ou jobs enviarem comunicações. Tenant de teste e schedulers desativados precisam ser confirmados antes de executar.
- Médio de perda de continuidade PWA por troca de domínio do túnel, suspensão do notebook ou interrupção de internet. Não considerar a instalação temporária como instalação definitiva.
- Android/Chrome é principal; iOS/Safari usa fluxo manual da Tela de Início e deve ser validado separadamente. Origem, dados locais e modo standalone precisam ser observados em cada plataforma.

# PLANO DE EXECUÇÃO FUTURO

1. Após autorização, confirmar dispositivo, tenant de teste, dados permitidos e aceitação da exposição residual; registrar baseline privado dos envs/processos, sem copiar secrets ao relatório.
2. Obter cloudflared e Caddy de fontes oficiais e verificar os artefatos. Não instalar como serviços permanentes.
3. Preparar configuração descartável do proxy: loopback, caminhos/métodos explícitos, demais rotas negadas, remoção de CORS wildcard público e política de logs sem tokens/PII. Manter inicialmente todas as rotas bloqueadas.
4. Criar um Quick Tunnel apenas para esse proxy bloqueado; obter F e manter o processo. Não apontá-lo diretamente a 3000/3001.
5. Aplicar overrides temporários das URLs e flags listadas. Manter secrets apenas no backend; desativar os jobs e confirmar dry run.
6. Em janela combinada, substituir as instâncias locais por backend HTTP loopback e frontend `npm run build` seguido de `npm start` em production/loopback. Não executar simultaneamente next dev e build sobre o mesmo `.next`.
7. Validar localmente o proxy e então liberar apenas a allowlist. Verificar `/admin`, APIs administrativas, webhooks, outros slugs e métodos indevidos negados; ausência de DEV PANEL/overlay e de segredos nos assets.
8. Verificar health HTTPS, chamadas API same-origin e ausência de mixed content; conferir manifest absoluto, ícones, `/offline` e `/sw.js` com MIME correto, sem intersticial ou redirect de autenticação. Não habilitar CORS amplo.
9. No Chrome Android físico, abrir `/agendar/<slug-teste>`, preparar identidade apenas com dados de teste, verificar known/preferred tenants e `/acesso`. Não esperar migração da origem LAN.
10. Confirmar isSecureContext, registro/ativação/controle do SW e escopo `/`. Verificar start_url=/acesso, scope=/ e display=standalone no manifest efetivamente carregado.
11. Validar CTA, ícone, instalação, fechamento/reabertura pelo ícone, standalone e acesso ao tenant com um toque. Conferir comportamento de dispensa e fallback offline. No iOS repetir pelo menu de compartilhamento/Tela de Início.
12. Registrar resultados por navegador/origem, falhas e evidências sem tokens. Só então avaliar a Fase 0.6B; a auditoria atual não a aprova.
13. Encerrar exposição e executar a reversão. Não criar produção, conta permanente, domínio definitivo, DNS ou port forwarding.

# PLANO DE REVERSÃO

Parar primeiro o túnel, depois o proxy e apenas os processos de teste identificados. Remover overrides temporários; restaurar exatamente os `.env` LAN se tiverem sido editados. Voltar a frontend dev 3000 e backend 0.0.0.0:3001 com os parâmetros anteriores. Se voltar a usar start em vez de dev, recompilar com URLs LAN, pois o bundle HTTPS mantém valores de build.

No celular, remover somente a PWA/origem temporária e seus dados/SW se desejado; preservar a origem LAN. No fallback, remover especificamente a CA de teste instalada, sem tocar nos certificados pessoais. Não desfazer dados do banco por reset/seed: eventuais operações autorizadas precisam de tratamento separado. Confirmar health/LAN e que a URL pública deixou de atender.

# DOCUMENTAÇÃO CRIADA

`docs/audits/20260908-fase-0-6b-auditoria-https-mobile-pwa.md`. Nenhuma documentação histórica alterada. Fontes oficiais estão vinculadas nos tópicos correspondentes; fatos locais vêm dos arquivos e das consultas descritas.

# BANCO

Nenhuma alteração. Sem migration, DB push, seed ou reset. Nenhuma operação de cadastro, booking, identidade, webhook ou envio foi disparada pela auditoria.

# GIT

Sem commit; sem push. Alterações anteriores preservadas. O único arquivo criado nesta execução é o relatório.

FASE 0.6B — AMBIENTE HTTPS MOBILE AUDITADO — ALTERNATIVA RECOMENDADA — AGUARDANDO AUTORIZAÇÃO PARA CONFIGURAÇÃO
