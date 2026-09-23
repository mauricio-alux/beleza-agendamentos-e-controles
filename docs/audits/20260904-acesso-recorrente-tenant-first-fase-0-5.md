# Fase 0.5 - Acesso recorrente tenant-first

Data: 2026-09-04
Projeto: Esthya
Escopo: auditoria tecnica e especificacao arquitetural. Nenhuma implementacao, migration, seed, alteracao de banco, commit ou push foi realizada.

## 1. Resumo executivo

A arquitetura atual ja possui um booking publico solido em `/agendar/[slug]`, identidade progressiva por tenant, token tenant-scoped, persistencia local por slug, "Meus dados", "Seus horarios", reagendamento e cancelamento por token operacional.

A Fase 0.5 deve seguir o modelo tenant-first:

```text
Icone Esthya
  -> rota fixa de acesso
  -> tenant preferencial local
  -> token tenant-scoped existente
  -> home recorrente daquele tenant
  -> /agendar/[slug], Meus horarios, Meus dados
```

Essa abordagem evita conta global de cliente e preserva isolamento multi-tenant. O tenant preferencial e os tenants conhecidos devem existir apenas como contexto local de navegacao; autorizacao continua dependendo do token tenant-scoped validado pelo backend.

## 2. AS-IS

### Frontend

- Booking publico: `frontend/src/app/agendar/[slug]/page.tsx`.
- Experiencia principal: `frontend/src/components/public-booking/PublicBookingPage.tsx`.
- Acoes por token operacional: `frontend/src/app/reagendar/page.tsx`, `frontend/src/components/public-booking/AppointmentReschedulePage.tsx` e `AppointmentActionPage.tsx`.
- Cliente reconhecido ve "Meus dados" e "Seus horarios" dentro do booking publico.
- Nao ha rota dedicada atual para `/acesso`, `/meu-esthya` ou home recorrente tenant-first.

### Backend

- Rotas publicas em `backend/src/routes/public.routes.js`:
  - `GET /public/booking/:slug`
  - `GET /public/booking/:slug/availability`
  - `POST /public/booking/:slug/identity`
  - `GET /public/booking/:slug/client/me`
  - `PATCH /public/booking/:slug/client/me`
  - `GET /public/booking/:slug/client/appointments/upcoming`
  - `POST /public/booking/:slug/appointments`
  - rotas operacionais por token para confirmar, cancelar e reagendar.
- Servico principal: `backend/src/modules/public-booking/public-booking.service.js`.
- Identidade: `backend/src/modules/public-booking/client-identity.service.js`.

### Banco

- `clientes`: identidade de pessoa.
- `cliente_tenants`: relacionamento cliente x tenant, status, preferencias e dados de relacionamento.
- `tokens_cliente`: token de cliente com `tenant_id`, `cliente_id`, hash, tipo, expiracao e uso.
- `links_agendamento`: slug publico de booking por tenant.
- `agendamentos`: vinculo de agendamento com `tenant_id` e `cliente_id`.

O slug de `tenants` e de `links_agendamento` possui indice unico por `lower(slug)` quando `deleted_at is null`.

### Storage do navegador

- `localStorage`: `esthya:booking-identity:{slug}` guarda o token tenant-scoped daquele slug.
- `sessionStorage`: `esthya:booking-session:{slug}` guarda um identificador de sessao do acesso.
- Nao foram encontrados cookies ou IndexedDB para identidade publica do cliente.

### Token

- Criado com 32 bytes aleatorios em `client-identity.service.js`.
- Persistido como hash SHA-256 em `tokens_cliente`.
- Validado por hash, tipo `agendamento_publico`, `ativo`, `deleted_at`, expiracao e igualdade de `tenant_id`.
- TTL configuravel por `CLIENT_TOKEN_TTL_DAYS`, padrao 180 dias.
- Reemissao por link individual revoga tokens ativos anteriores do mesmo tenant/cliente.

### Booking

Fluxo atual:

```text
Cliente
  -> /agendar/[slug]
  -> frontend carrega catalogo
  -> backend resolve link e tenant
  -> cliente e identificado por tk/localStorage/nome+WhatsApp
  -> token tenant-scoped e emitido ou validado
  -> cliente agenda horario
  -> token pode ser salvo localmente para retorno
```

### Meus dados

Existe dentro de `/agendar/[slug]` para cliente identificado. Usa:

- `GET /public/booking/:slug/client/me?token=...`
- `PATCH /public/booking/:slug/client/me`

O backend resolve `slug -> tenant`, valida o token e atualiza somente campos permitidos.

### Agendamentos

Existe bloco "Seus horarios" dentro de `/agendar/[slug]`, alimentado por:

- `GET /public/booking/:slug/client/appointments/upcoming?token=...`

Reagendamento e cancelamento usam token operacional do agendamento, nao o token de identidade.

### Manifest/PWA

Existe `frontend/src/app/manifest.ts` com:

- `start_url: "/"`
- `display: "standalone"`
- `background_color`
- `theme_color`
- icone `favicon.ico`

Nao foi encontrado service worker, Workbox, Serwist, `next-pwa`, `beforeinstallprompt`, `appinstalled` ou estrategia offline.

### Onboarding

O onboarding ja coleta dados do estabelecimento, telefone, WhatsApp, agenda, servicos, profissional e configuracoes. A etapa operacional ja possui pergunta sobre uso de WhatsApp:

- `business_app`
- `messenger`
- `cloud_api`
- `not_used`

Esses dados sao gravados em `tenant.configuracoes.campaign_whatsapp`.

### WhatsApp/configuracao do tenant

Ha infraestrutura parcial:

- `whatsapp_contas`
- `templates_mensagem`
- `mensagens_whatsapp`
- provider e dry-run
- webhook publico `/public/webhooks/whatsapp`
- campanhas assistidas com copiar/compartilhar/abrir WhatsApp documentadas.

## 3. Componentes reutilizaveis

- `PublicBookingPage`: pode fornecer blocos de identificacao, proximos horarios e "Meus dados".
- `public-booking.service.ts`: chamadas ja prontas para catalogo, identidade, perfil, horarios futuros e criacao de agendamento.
- `client-identity.service.js`: emissao/validacao tenant-scoped.
- `public-booking.service.js`: resolve slug, tenant, catalogo, disponibilidade e agendamento.
- `AppointmentActionPage` e `AppointmentReschedulePage`: acoes publicas por token operacional.
- `CompletionCard` do onboarding: copiar link, compartilhar e abrir WhatsApp.
- Configuracao centralizada de URLs em `app-brand`.

## 4. Gaps

- Nao existe rota fixa de acesso recorrente (`/acesso`).
- Nao existe home recorrente tenant-first.
- Nao existe indice local de tenants conhecidos.
- Nao existe tenant preferencial local.
- Nao existe logout publico "sair deste dispositivo".
- Nao existe tratamento dedicado de tenant preferencial com token expirado.
- Nao existe alias/redirecionamento de slug antigo.
- PWA esta parcial: manifest existe, mas sem service worker, instalabilidade madura, prompt ou offline.
- QR Code proprio do link publico nao foi encontrado como implementado.

## 5. Arquitetura TO-BE

```text
                 +----------------+
                 |  Icone Esthya  |
                 +--------+-------+
                          |
                          v
                 /acesso (rota fixa)
                          |
                          v
             tenant preferencial local
                          |
                          v
             token tenant-scoped do slug
                          |
                          v
             home recorrente tenant-first
              |            |           |
              v            v           v
          Agendar     Meus horarios  Meus dados
              |
              v
        /agendar/[slug]
```

Fluxo de troca:

```text
Trocar estabelecimento
  -> tenants conhecidos localmente
  -> cliente seleciona tenant
  -> app carrega token daquele slug
  -> backend valida somente naquele tenant
  -> tenant selecionado vira preferencial no MVP
```

## 6. Modelo de persistencia local

### Tenant preferencial

Recomendado:

```text
localStorage["esthya:preferred-tenant"] = {
  "slug": "vivian",
  "updated_at": "2026-09-04T00:00:00.000Z",
  "source": "booking" | "switcher" | "access"
}
```

Motivo: o valor nao autoriza acesso; apenas aponta contexto. `localStorage` tem comportamento adequado para PWA e browser, sobrevive ao fechamento do app e ja e usado pela identidade atual.

### Tenants conhecidos

Recomendado:

```text
localStorage["esthya:known-tenants"] = [
  {
    "slug": "vivian",
    "name": "Vivian Beauty",
    "last_seen_at": "2026-09-04T00:00:00.000Z",
    "has_identity_hint": true
  }
]
```

Nao armazenar nome, telefone, email ou IDs internos de cliente. A lista deve nascer somente de contextos acessados legitimamente no dispositivo, especialmente `/agendar/[slug]` apos catalogo valido e/ou identidade valida.

### Relacao com token existente

O token continua separado:

```text
esthya:booking-identity:vivian = token A
esthya:booking-identity:silvia-helena = token B
```

`known-tenants.slug` apenas aponta qual chave deve ser lida. Nunca reutilizar token de um slug em outro.

## 7. Fluxo de primeiro acesso

```text
WhatsApp/Instagram/Site/QR
  -> /agendar/vivian
  -> catalogo valido
  -> usuario informa nome e WhatsApp ou chega com tk valido
  -> backend emite/valida token tenant-scoped
  -> frontend salva esthya:booking-identity:vivian se permitido
  -> frontend registra vivian em known-tenants
  -> frontend pode definir vivian como preferred-tenant
```

Sem tenant preferencial, `/acesso` deve exibir uma tela minima orientando o cliente a abrir um link do estabelecimento, sem busca publica indiscriminada de tenants.

## 8. Fluxo de acesso recorrente

```text
Cliente toca no icone Esthya
  -> /acesso
  -> le esthya:preferred-tenant
  -> encontra slug vivian
  -> le esthya:booking-identity:vivian
  -> valida contexto em /public/booking/vivian/identity ou endpoints atuais
  -> mostra home tenant-first
```

Se houver token valido, mostrar nome, proximo horario, "Agendar novo horario", "Meus horarios" e "Meus dados".

## 9. Fluxo de troca de estabelecimento

O switcher deve listar apenas `known-tenants` locais:

```text
Estabelecimentos lembrados neste dispositivo
(*) Vivian Beauty
( ) Silvia Helena
```

Ao selecionar Silvia Helena:

- carregar contexto Silvia;
- ler somente `esthya:booking-identity:silvia-helena`;
- validar somente em endpoints de Silvia;
- atualizar `esthya:preferred-tenant` para Silvia no MVP.

Recomendacao MVP: opcao A, o ultimo tenant escolhido vira preferencial automaticamente. E mais simples, reduz atrito e atende ao requisito "um toque -> estabelecimento preferencial".

## 10. Token expirado

Se `tenantPreferencial = vivian`, mas o token de Vivian expirou:

- manter Vivian como contexto;
- nao apagar automaticamente o tenant preferencial;
- ocultar dados pessoais e horarios ate reidentificacao;
- exibir estado de sessao expirada daquele estabelecimento;
- permitir recuperar por nome + WhatsApp via mecanismo `lookup_only` existente;
- se reconhecido, emitir novo token tenant-scoped;
- nao criar novo `cliente_tenant` indevido quando o WhatsApp ja existir no tenant.

## 11. Troca de dispositivo

Sem identidade global, os dados locais nao acompanham outro dispositivo. No celular B:

- `/acesso` sem storage local nao conhece Vivian/Silvia;
- o usuario deve acessar novamente um link `/agendar/[slug]` ou magic link;
- apos reidentificacao, o novo dispositivo passa a conhecer aquele tenant.

Esse comportamento e esperado no MVP tenant-first e deve ser documentado. Pode ser gatilho futuro para identidade global se metricas indicarem uso multi-tenant/dispositivo relevante.

## 12. PWA/manifest

| Item | Status | Observacao |
|---|---|---|
| Manifest | IMPLEMENTADO | `frontend/src/app/manifest.ts` |
| Icons | PARCIAL | apenas favicon como `any` |
| Display standalone | IMPLEMENTADO | `display: "standalone"` |
| Start URL | PARCIAL | existe `/`, recomendado `/acesso` |
| Scope | AUSENTE | nao definido explicitamente |
| Theme/background | IMPLEMENTADO | cores no manifest |
| Service worker | AUSENTE | nao encontrado |
| Installability Android | PARCIAL | depende de icones adequados e criterios do browser |
| iOS adicionar a tela inicial | PARCIAL | manifest ajuda, mas falta refinamento de icones/metas |
| Desktop install prompt | AUSENTE | nao encontrado `beforeinstallprompt` |
| Offline | AUSENTE | sem service worker |

## 13. WhatsApp comum

O Esthya deve continuar permitindo divulgar `/agendar/[slug]` para envio manual. O onboarding/completion ja possui copiar mensagem, copiar link, compartilhar e abrir WhatsApp. QR Code proprio nao foi encontrado como implementado.

## 14. WhatsApp Business

O dado ja existe no onboarding por `whatsapp_usage_type = business_app`, separado de `messenger` e `cloud_api`. Futuramente, a implementacao pode orientar configuracao do link publico em recursos do WhatsApp/Meta, sem exigir integracao Meta nesta fase.

## 15. Seguranca multi-tenant

| Risco | Classificacao | Tratamento |
|---|---|---|
| Token de Tenant A acessar Tenant B | CRITICO | backend ja compara `storedToken.tenant_id !== tenantId`; manter obrigatorio |
| `preferred-tenant` usado como autorizacao | ALTO | nunca autorizar por storage local |
| `known-tenants` expor dados pessoais | MEDIO | armazenar slug/nome publico apenas |
| localStorage alterado manualmente | MEDIO | backend sempre valida slug, tenant, token e relacionamento |
| Tenant desativado ainda preferencial | MEDIO | resolver catalogo/tenant no backend e exibir estado indisponivel |
| Slug alterado sem alias | MEDIO | MVP deve tratar como nao encontrado; futuro alias se necessario |
| Dispositivo compartilhado | MEDIO | adicionar "Sair deste dispositivo" e evitar PII em known-tenants |
| Enumeracao de tenants/clientes | ALTO | nao criar busca global publica; listar apenas storage local |

## 16. Casos funcionais

| Caso | Entrada | Estado local | Identidade | Processamento | Resultado esperado | Risco | Tratamento |
|---|---|---|---|---|---|---|---|
| 1 | `/agendar/vivian` via WhatsApp | vazio | nenhuma | booking identifica por dados/tk | Vivian conhecida e possivelmente preferencial | baixo | salvar contexto apos catalogo valido |
| 2 | icone Esthya | preferred vivian | token vivian | `/acesso` resolve vivian | entra em Vivian com um toque | medio | validar token antes de dados |
| 3 | icone com token valido | preferred vivian | token valido | endpoints atuais | home com dados e horarios | baixo | reutilizar APIs |
| 4 | token expirado | preferred vivian | expirado | backend retorna expirado | contexto Vivian sem PII e reidentificacao | medio | manter tenant, limpar/renovar token |
| 5 | `/agendar/silvia-helena` | vivian conhecida | talvez token novo | booking Silvia | adiciona Silvia localmente | baixo | chave por slug |
| 6 | mesmo dispositivo conhece dois tenants | known vivian/silvia | tokens separados | switcher local | lista ambos | medio | sem PII |
| 7 | troca Vivian -> Silvia | known ambos | token Silvia | valida Silvia | contexto Silvia | medio | nunca usar token Vivian |
| 8 | Silvia torna preferencial | selected Silvia | token Silvia | atualiza localStorage | preferred Silvia | baixo | opcao A MVP |
| 9 | reabre PWA | preferred Silvia | token Silvia | `/acesso` | entra em Silvia | baixo | validacao backend |
| 10 | localStorage alterado | slug falso | token ausente/invalido | backend resolve | sem dados expostos | alto | tratar 404/401 |
| 11 | tenant preferencial desativado | preferred antigo | token talvez valido | resolveLink bloqueia | tela de indisponivel/trocar | medio | manter/remover por escolha |
| 12 | slug mudou | preferred antigo | token antigo | slug 404 | orientar abrir novo link | medio | futuro alias opcional |
| 13 | dados locais apagados | vazio | nenhuma | `/acesso` sem contexto | pedir link do estabelecimento | baixo | sem busca global |
| 14 | troca dispositivo | vazio no B | nenhuma | sem storage | precisa novo link/tk | medio | documentar limite |
| 15 | dono usa WhatsApp comum | onboarding comum | n/a | copia link | envia `/agendar/slug` manual | baixo | reaproveitar CompletionCard |
| 16 | dono usa WhatsApp Business | business_app | n/a | configura orientacao | link em recursos WhatsApp | baixo | documentar |
| 17 | booking sem PWA | `/agendar/slug` | normal | token local browser | funciona igual | baixo | PWA e acelerador |
| 18 | um tenant conhecido | known 1 | token do tenant | `/acesso` | entrar direto | baixo | sem tela intermediaria |
| 19 | multiplos tenants | known n | tokens separados | preferred decide | entra no preferencial | medio | switcher explicito |
| 20 | sem preferred no start | vazio ou known sem preferred | nenhuma | `/acesso` | tela minima com orientacao | baixo | nao enumerar publicamente |

## 17. Metricas futuras

Sem PII desnecessaria:

- percentual de dispositivos com 1 tenant conhecido;
- percentual com 2 tenants conhecidos;
- percentual com 3+ tenants conhecidos;
- frequencia de troca de tenant;
- acessos via `/acesso`;
- acessos via `/agendar/[slug]`;
- retornos com token valido;
- falhas por token expirado;
- tentativas com tenant inexistente/desativado;
- uso de "Sair deste dispositivo";
- instalacao/abertura PWA quando tecnicamente mensuravel.

## 18. Decisoes D1-D20

D1. Start URL: `/acesso`.

D2. Rota de resolucao: nova rota frontend `/acesso`, sem API nova obrigatoria no MVP se reutilizar endpoints publicos existentes.

D3. Tenant preferencial: `localStorage["esthya:preferred-tenant"]`.

D4. Known-tenants local: sim, pequeno indice local e sem PII.

D5. Relacao tenant-token: slug do known tenant aponta para `esthya:booking-identity:{slug}`.

D6. Preferencial automatico: sim, no MVP o ultimo tenant escolhido vira preferencial.

D7. Nova home recorrente: sim, pequena e tenant-first.

D8. Home como nova rota ou extensao do booking: nova rota/componente em `/acesso`; "Agendar" continua levando a `/agendar/[slug]`.

D9. Token expirado: manter tenant, esconder PII, pedir reidentificacao por fluxo existente.

D10. Tenant desativado: mostrar indisponibilidade e permitir trocar/remover contexto local.

D11. Slug alterado: MVP trata como indisponivel/novo link; futuro alias se necessario.

D12. Troca de dispositivo: sem sincronizacao local; reabrir por link/tk.

D13. PWA instalavel: ajustar icons, scope, start_url, service worker/estrategia offline opcional e prompt/UX de instalacao.

D14. Onboarding: nao precisa campo novo agora; revisar texto/orientacao para WhatsApp comum vs Business App vs Cloud API.

D15. Migration futura: nao obrigatoria para MVP local tenant-first; pode ser necessaria para metricas/auditoria de PWA ou alias de slug.

D16. Nova tabela: nao obrigatoria no MVP; futura `client_access_events` ou `tenant_slug_aliases` pode ser considerada.

D17. Nova API: nao obrigatoria no MVP; opcional endpoint agregado tenant-first para reduzir chamadas da home.

D18. Componentes reutilizaveis: PublicBookingPage, public-booking service, paginas de acao/reagendamento, CompletionCard, app-brand.

D19. Principais riscos: isolamento tenant, localStorage manipulado, dispositivo compartilhado, slug alterado/desativado.

D20. Evolucao para Meu Esthya: preservada, desde que tenant-first nao prometa descoberta global nem misture tokens.

## 19. Riscos

- O nome "Meu Esthya" pode sugerir conta global; no MVP usar linguagem tenant-first como "Acesso Esthya" ou "Meu acesso" reduz ambiguidade.
- Slug antigo sem alias pode quebrar acesso recorrente local.
- `localStorage` em dispositivo compartilhado exige botao claro de sair.
- Sem service worker, a PWA pode ser apenas parcialmente instalavel.

## 20. Dependencias

- Definir nome final da rota: recomendado `/acesso`.
- Definir copy de UX para sem tenant, token expirado e tenant indisponivel.
- Decidir se metricas futuras entram em banco ou somente analytics anonimo.
- Decidir se slug aliases entram em fase futura.

## 21. Proxima fase recomendada

Fase 1 deve implementar de forma incremental:

1. Rota `/acesso`.
2. Persistencia local de `preferred-tenant` e `known-tenants`.
3. Home recorrente tenant-first usando APIs existentes.
4. Sair deste dispositivo.
5. Ajuste de manifest para `start_url: "/acesso"`.
6. Testes de isolamento e cenarios de storage manipulado.

Banco: nenhuma alteracao realizada.

Git: nenhum commit e nenhum push realizados por esta fase.

