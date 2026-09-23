# STATUS

HTTPS temporário ativo após autorização explícita do usuário. Este registro substitui o estado bloqueado do relatório de preparação `20260908-fase-0-6bh-https-temporario.md`. A Fase 0.6B permanece aguardando teste manual. O ambiente fica ativo; reversão não executada.

# SOLUÇÃO HTTPS ESCOLHIDA

Localtunnel 2.0.2 já instalado e proxy temporário Node.js com bibliotecas nativas.

# POR QUE FOI A MAIS SIMPLES

Uma origem HTTPS, nenhuma instalação/dependência nova, nenhum rewrite Next ou alteração no código do produto.

# TOPOLOGIA UTILIZADA

```text
Celular -> https://calm-worlds-travel.loca.lt
  -> Localtunnel -> proxy HTTP 127.0.0.1:3080
       páginas permitidas -> 127.0.0.1:3000
       /api público permitido -> 127.0.0.1:3001
```

O proxy reconhece formatos de rotas e métodos, não nomes de tenants. `/agendar/[slug]` e APIs correspondentes são dinâmicos; a resolução/autorização continua no SaaS. O arquivo de escopo fixo `test-scope.json` foi removido. Os dois slugs do roteiro aparecem apenas em testes e documentação.

Permitidos: página inicial, acesso recorrente, offline, agendamento dinâmico, ações/reagendamento público, manifest, SW, assets e APIs públicas de health/plans/landing/Booking. Administração, login administrativo, webhooks e outras rotas internas permanecem bloqueados.

# FERRAMENTAS UTILIZADAS

Node.js, Localtunnel, PowerShell, npm, TypeScript, Git e verificações HTTP. Não havia navegador conectado disponível na ferramenta para inspecionar execução da PWA.

# FERRAMENTAS INSTALADAS, SE HOUVER

Nenhuma. Não foram necessários Caddy ou cloudflared.

# FRONTEND

TypeScript e `npm run build` aprovados; 44 páginas geradas. Frontend em `next start -p 3000 -H 127.0.0.1`. NODE_ENV=production serve apenas à fidelidade do teste, sem deploy PROD.

# BACKEND

Código existente em `node src/server.js`, binding 127.0.0.1:3001. URLs sobrescritas apenas no processo. Schedulers desativados nesse processo para evitar operações automáticas. Supabase e CORS existentes preservados.

# URL HTTPS TEMPORÁRIA

- https://calm-worlds-travel.loca.lt
- https://calm-worlds-travel.loca.lt/acesso
- https://calm-worlds-travel.loca.lt/agendar/bellory-test-studio
- https://calm-worlds-travel.loca.lt/agendar/espaco-vivian-beauty

Localtunnel apresentou confirmação HTTP 511 para User-Agent de navegador: digitar o IP mostrado na própria tela e tocar Continue. O serviço informa lembrança por IP público durante sete dias; trocar de rede pode exigir confirmação novamente. É uma página do serviço, não um alerta de certificado do navegador.

Os testes HTTP usaram o cabeçalho `bypass-tunnel-reminder`, documentado pelo serviço. Isso não comprova a confirmação no celular. Manter notebook, internet e processos ativos. Uma URL nova exige rebuild e preparação da PWA na nova origem.

# VARIÁVEIS/OVERRIDES TEMPORÁRIOS

| Nome | Valor no processo de teste |
|---|---|
| NEXT_PUBLIC_APP_URL | https://calm-worlds-travel.loca.lt |
| NEXT_PUBLIC_PLATFORM_WEBSITE | https://calm-worlds-travel.loca.lt |
| NEXT_PUBLIC_API_URL | /api |
| NEXT_PUBLIC_DEV_MODE | false |
| NODE_ENV | production |
| APP_URL | https://calm-worlds-travel.loca.lt |
| PLATFORM_WEBSITE | https://calm-worlds-travel.loca.lt |
| PUBLIC_APP_URL | https://calm-worlds-travel.loca.lt |
| BOOKING_BASE_URL | https://calm-worlds-travel.loca.lt/agendar |
| HOST backend | 127.0.0.1 |
| PORT backend / frontend | 3001 / 3000 |
| REMINDER_SCHEDULER_ENABLED | false |
| WHATSAPP_QUEUE_ENABLED | false |
| CAMPAIGN_SCHEDULER_ENABLED | false |
| BIRTHDAY_GREETING_SCHEDULER_ENABLED | false |
| WHATSAPP_DRY_RUN | true |

Os `.env` LAN não foram editados: hashes SHA256 antes/depois coincidiram. Nenhum segredo foi colocado em frontend/scripts/relatório.

# API / MIXED CONTENT

API relativa `/api`, com health e catálogos respondendo 200 na origem HTTPS. Os dez scripts de `/acesso` responderam 200. Os bundles têm HTTPS e `/api` como valores efetivos; literais localhost restantes são fallbacks preexistentes não selecionados. Nenhum recurso href/src HTTP foi encontrado no HTML de `/acesso`.

O Next serve o link de manifest como `/manifest.webmanifest`, resolvido na origem HTTPS. A verificação foi HTTP e inspeção do build, não captura de tráfego de navegador; confirmar no celular.

# MANIFEST

HTTP 200, application/manifest+json. Nome e short_name comparados à configuração e corretos; start_url=/acesso, scope=/, display=standalone preservados. Ícones 192, 512 e maskable: 200, image/png.

A referência adicional preexistente `/favicon.ico` retorna 404 porque não existe arquivo correspondente no projeto. Os ícones necessários à PWA estão disponíveis. Essa referência foi registrada sem alterar o manifest nesta tarefa.

# SERVICE WORKER

`/sw.js`: 200 em HTTPS com MIME JavaScript. Registro de `/sw.js` presente no bundle; raiz permite escopo `/`. Nenhum cache foi ampliado.

Transporte/MIME/origem permitem registro, mas registro efetivo, ativação, controle e standalone não foram observados automaticamente por falta de navegador conectado. Permanecem no teste físico. O código atual registra no evento load e trata erros silenciosamente; comportamento preservado.

# BRANDING PARAMETRIZADO

Nenhum nome fixo do SaaS introduzido. A configuração existente continua sendo a fonte; variáveis públicas exigem rebuild para refletir mudanças, como no comportamento atual do Next.

# VALIDAÇÕES AUTOMÁTICAS

| Verificação | Resultado |
|---|---|
| Inicial, /acesso, /agendar dos dois casos | 200 HTTPS |
| Manifest, SW, offline | 200 HTTPS |
| API health e catálogos dos dois tenants | 200 HTTPS |
| Ícones principais | 200 HTTPS |
| Scripts de /acesso | 10/10 com 200 |
| Admin, API admin, login, API auth, webhook | 404 pelo proxy |
| Slug inexistente arbitrário na API | 404 JSON do backend; encaminhamento dinâmico confirmado |
| Sintaxe dos scripts | Aprovada |
| TypeScript e build | Aprovados |
| git diff --check | Aprovado |
| .env LAN | Hashes preservados |

Duas requisições iniciais a páginas retornaram 408 do túnel e passaram na repetição. Se isso persistir no celular, reavaliar o transporte. Não foram enviados POSTs de identidade/agendamento durante a verificação; esses fluxos podem registrar acessos no banco e ficaram para o teste manual.

# TYPESCRIPT

`tsc --noEmit`: aprovado.

# BUILD

`npm run build`: aprovado; 44 páginas. `next start` ativo.

# BANCO

Nenhuma alteração efetuada pela configuração/verificação. Sem migration, DB push, seed, reset, reconcile ou cleanup. Mesmo Supabase preservado.

# GIT

Sem commit e sem push. Código do produto e alterações anteriores preservados. Artefatos em `.codex-logs/https-mobile-06bh/`, ignorados pelo Git: proxy, cliente Localtunnel, launchers de start/reversão, verificador, URL/PIDs/ready/logs. O arquivo de lista fixa de tenants foi removido.

Manter os artefatos durante os testes e removê-los somente depois de encerrar os processos. Este relatório é documentação nova.

# PENDÊNCIAS PARA PRODUÇÃO

CORS, DEV PANEL, NODE_ENV definitivo, domínio/TLS, secrets, headers, proteção de rotas, logging, rate limiting, observabilidade, cache/SW, deploy, revisão de endpoints e segurança Supabase continuam backlog. Não implementados como hardening PROD.

# PLANO DE REVERSÃO

Não executar automaticamente. Quando solicitado, em PowerShell novo na raiz:

```powershell
powershell.exe -NoProfile -File .\.codex-logs\https-mobile-06bh\restore-lan.ps1
```

Encerra processos temporários registrados e inicia dev 3000/backend 3001 com os `.env` LAN preservados. Conferir health/LAN. Não usar reset de Git/banco. Se reiniciar Localtunnel com URL diferente, recompilar usando `start-apps.ps1 -PublicUrl <nova-origem-https>` antes de testar; não reutilizar build com origem antiga.

# PRÓXIMO PASSO MANUAL

1. Abrir o link HTTPS do primeiro caso no Chrome Android e concluir a confirmação Localtunnel, se aparecer.
2. Preparar identidade e acessar `/acesso`; confirmar tenant preferencial.
3. Preparar também a identidade do segundo caso na MESMA origem HTTPS. Ambos precisam estar conhecidos para testar a troca. Selecionar explicitamente o primeiro tenant para iniciar o roteiro de instalação.
4. Instalar a PWA; fechar navegador/PWA; abrir pelo ícone; conferir `/acesso`, preferencial e standalone.
5. Trocar explicitamente para o segundo tenant; fechar; abrir pelo MESMO ícone; conferir novo preferencial e ausência de CTA em standalone.
6. Testar offline e ausência de dados pessoais antigos por cache. No iOS usar Compartilhar/Adicionar à Tela de Início.

Dados da origem HTTP LAN não migram para HTTPS. O CTA dispensado possui intervalo de ocultação de 14 dias na mesma origem. O teste físico é do usuário e ainda não foi concluído.

FASE 0.6B — AMBIENTE HTTPS TEMPORÁRIO PRONTO PARA TESTE MOBILE — AGUARDANDO VALIDAÇÃO MANUAL
