# Fase 0.6A - Acesso recorrente tenant-first web

Data: 2026-09-04
Escopo: implementacao web, sem PWA completa, sem identidade global, sem migration, sem commit e sem push.

## Implementacao Fase 0.6A

Arquitetura implementada:

```text
/agendar/[slug]
  -> identidade tenant-scoped existente
  -> token salvo em esthya:booking-identity:{slug}
  -> tenant entra em esthya:known-tenants
  -> primeiro tenant legitimo vira esthya:preferred-tenant

/acesso
  -> le preferred tenant
  -> valida catalogo publico do tenant
  -> le token tenant-scoped daquele slug
  -> valida identidade no backend existente
  -> exibe home recorrente tenant-first
```

## Arquivos

- `frontend/src/lib/recurring-access.storage.ts`
- `frontend/src/lib/recurring-access.storage.test.js`
- `frontend/src/app/acesso/page.tsx`
- `frontend/src/components/recurring-access/RecurringAccessPage.tsx`
- `frontend/src/components/public-booking/PublicBookingPage.tsx`

## Storage

Chaves novas:

- `esthya:preferred-tenant`
- `esthya:known-tenants`

Chave existente preservada:

- `esthya:booking-identity:{slug}`

`known-tenants` armazena somente:

- `slug`
- `displayName`
- `lastAccessAt`
- `hasLocalIdentity`

Nao armazena nome do cliente, telefone, WhatsApp, email, token, hash, cliente_id, agendamentos ou dados pessoais.

## Integracao com booking

O tenant so entra em `known-tenants` quando ha identidade local legitimamente estabelecida:

- token valido recebido pela URL ou encontrado no storage;
- reidentificacao reconhecida pelo fluxo existente;
- identidade emitida antes da criacao de agendamento.

Visita casual a `/agendar/[slug]` nao troca o tenant preferencial. O primeiro tenant legitimo vira preferencial apenas se ainda nao existir preferencial.

## /acesso

Responsabilidades:

- resolver tenant preferencial local;
- validar catalogo publico pelo backend existente;
- verificar token local do slug atual;
- validar identidade pelo endpoint atual;
- exibir home recorrente se autorizado;
- preservar tenant conhecido quando token expira ou some;
- nao exibir dados pessoais sem token valido.

## Home recorrente

Exibe:

- nome publico do estabelecimento;
- saudacao do cliente quando validado;
- proximo horario do tenant atual;
- lista de horarios futuros do tenant atual;
- agendar novo horario via `/agendar/[slug]`;
- "Meus dados" via endpoint publico existente;
- troca de estabelecimento quando houver mais de um tenant conhecido;
- sair/remover deste dispositivo para o tenant atual.

## Token expirado ou ausente

O contexto local do tenant e preservado. Dados pessoais e horarios nao sao exibidos. A acao "Continuar" leva para `/agendar/[slug]`, reutilizando o mecanismo de reidentificacao ja autorizado pelo booking.

`lookup_only` nao foi alterado e nao recebeu poder novo em `/acesso`.

## Sair deste dispositivo

Remove apenas dados locais do tenant atual:

- entrada em `known-tenants`;
- token local `esthya:booking-identity:{slug}`;
- `preferred-tenant`, se apontava para o slug removido.

Nao remove cliente, relacionamento, agendamento ou historico no banco.

## Seguranca

- `preferred-tenant` nao concede autorizacao.
- `known-tenants` nao concede autorizacao.
- localStorage adulterado pode tentar carregar contexto, mas nao libera dados sem token tenant-scoped valido.
- token de um slug nunca e usado em outro slug.
- backend segue autoridade para tenant, token, vinculo e expiracao.

## PWA

Nao foram alterados manifest, service worker, install prompt, icones ou start_url. A rota `/acesso` esta pronta para ser usada como `start_url` em fase futura.

## Validacao manual pelo Product Owner

Cliente utilizado: Arlete Sales.

Tenants utilizados:

- `espaco-vivian-beauty`
- `bellory-test-studio`

Cenarios validados:

1. Identidade no Tenant A: PASSOU. Apos acesso/agendamento em `/agendar/espaco-vivian-beauty`, foi criada identidade local tenant-scoped em `esthya:booking-identity:espaco-vivian-beauty`; Vivian passou a constar em `esthya:known-tenants` e tornou-se `esthya:preferred-tenant`.
2. Identidade no Tenant B: PASSOU. Apos acesso/agendamento em `/agendar/bellory-test-studio`, foi criada identidade local independente em `esthya:booking-identity:bellory-test-studio`.
3. Known tenants: PASSOU. `esthya:known-tenants` passou a representar os dois estabelecimentos conhecidos localmente, sem PII desnecessaria.
4. Acesso pelo `/acesso`: PASSOU. Com Vivian como preferencial, `/acesso` abriu diretamente Espaco Vivian Beauty, exibindo Arlete Sales, proximo horario correspondente ao tenant Vivian e acoes recorrentes.
5. Troca explicita de estabelecimento: PASSOU. Ao trocar para Bellory Test Studio, o contexto passou para Bellory, os dados exibidos passaram a ser os de Bellory, a identidade Vivian nao foi usada como identidade Bellory e `esthya:preferred-tenant` passou para `bellory-test-studio`.
6. Persistencia do preferred tenant: PASSOU. Apos Bellory tornar-se preferencial, novo acesso a `/acesso` abriu diretamente Bellory Test Studio.
7. Isolamento tenant-scoped: PASSOU. As chaves `esthya:booking-identity:espaco-vivian-beauty` e `esthya:booking-identity:bellory-test-studio` coexistem separadamente; trocar tenant altera contexto de navegacao e preferred tenant, sem substituir identidades.

## Banco

Sem migration, sem db push, sem seed, sem reset, sem reconcile e sem cleanup.

## Git

Sem commit e sem push.

## Pendencias para Fase 0.6B

- alterar `start_url` do manifest para `/acesso`;
- revisar icones instalaveis;
- avaliar service worker/offline;
- implementar UX de instalacao;
- validar comportamento standalone Android/iOS/desktop.
