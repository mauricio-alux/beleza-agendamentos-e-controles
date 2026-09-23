# R1.6-B — Aplicação remota controlada das migrations

Data: 2026-09-18. Autorização: TXT “Aplicar via CODEX”, aplicação exclusiva das duas migrations aprovadas, após pré-check. Base: relatórios de implementação, gate inicial e correção do gate.

## Projeto, pré-check e escopo

Projeto remoto confirmado: **Bellory**, ref **djbuzarzbpcpixudpnmg**, região us-east-2, ACTIVE_HEALTHY. O ref de supabase/.temp/project-ref corresponde ao projeto listado pela CLI e ao SUPABASE_URL configurado no backend deste workspace de desenvolvimento. Nenhuma credencial foi registrada.

`supabase migration list --linked` mostrou 82 versões aplicadas, até 20260901100000, e somente estas pendentes:

1. `20260917100000_restrict_public_booking_identity_rpc.sql`.
2. `20260917101000_public_booking_identity_birth.sql`.

As migrations locais anteriores, inclusive 20260824190000 e 20260826120000, já constavam aplicadas. Não houve pendência adicional a exigir interrupção.

`supabase db push --linked --dry-run` confirmou exclusivamente esses dois arquivos. Nenhuma edição de migration, inclusão de terceira migration ou alteração de RLS foi feita.

## Conferência dos arquivos aprovados

Migration 1: hash conferido com o snapshot do gate anterior. Migration 2: conteúdo conferido com a correção aprovada nesta sessão: 14 argumentos, contexto histórico de campanhas, replay por hash/fingerprint, BEGIN/COMMIT e ACL da assinatura final. O relatório anterior não continha hash independente da versão corrigida; os hashes abaixo foram registrados antes e reconfirmados depois da aplicação, e o corpo instalado foi comparado integralmente ao arquivo local.

| Arquivo | SHA-256 antes e depois |
| --- | --- |
| 20260917100000_restrict_public_booking_identity_rpc.sql | aaa90124b4380541358eff51dfa23c1965567390399cbf2bff1ef7a269c7e7a6 |
| 20260917101000_public_booking_identity_birth.sql | 394a3dabe8cf6568609b929aeabbea6029d62b4539b2bf576d658b82e771f137 |

Os arquivos não foram modificados nesta etapa.

## Backup dirigido e aplicação

Evidências sem PII, dump de dados ou secrets:

- [Snapshot anterior](20260918-r1-6-b-remoto-antes.json): definição completa da RPC antiga, ACL, owner, SECURITY DEFINER, search_path, policies, fingerprints de colunas/constraints/índices públicos e histórico completo de migrations.
- [Snapshot posterior](20260918-r1-6-b-remoto-depois.json): os mesmos metadados após a aplicação, incluindo a v2.

Snapshot anterior: **2026-09-18T12:43:04.26493+00:00**. Snapshot posterior: **2026-09-18T16:54:34.763137+00:00** (13:54:34, America/Sao_Paulo). Houve intervalo de retomada da sessão; esses horários são das consultas, não timestamps individuais fornecidos pelo histórico de migrations.

Comando executado após o pré-check:

```powershell
& 'C:\Users\Lenovo\AppData\Roaming\npm\supabase.cmd' db push --linked --yes
```

Resultado: exit code 0, ambas aplicadas na ordem aprovada, “Finished supabase db push”. A confirmação automática respondeu somente à lista de duas migrations já verificada/autorizada. Nenhum outro arquivo foi aplicado.

O histórico passou de **82 para 84 versões**, adicionando exatamente:

- 20260917100000 — restrict_public_booking_identity_rpc.
- 20260917101000 — public_booking_identity_birth.

## Comparação antes/depois

| Item | Antes | Depois |
| --- | --- | --- |
| RPC antiga | Existente | Existente, mesma definição integral |
| ACL antiga | postgres, anon, authenticated, service_role | postgres, service_role |
| anon EXECUTE antiga | SIM | NÃO |
| authenticated EXECUTE antiga | SIM | NÃO |
| service_role EXECUTE antiga | SIM | SIM |
| v2 | Ausente | Instalada, assinatura final |
| ACL v2 | Não aplicável | postgres, service_role |
| anon/authenticated EXECUTE v2 | Não aplicável | NÃO / NÃO |
| SECURITY DEFINER | Antiga: SIM | Antiga e v2: SIM |
| Owner | Antiga: postgres | Ambas: postgres |
| search_path | Antiga: public | Ambas: public |
| Policies tokens_cliente | Três policies | Idênticas ao snapshot anterior |
| Colunas, constraints e índices públicos | Fingerprints registrados | Todos iguais |

ACL final exata de ambas: `{postgres=X/postgres,service_role=X/postgres}`. Entre os papéis de aplicação, somente service_role possui EXECUTE; proprietário e superusuários administrativos conservam seus poderes inerentes. Nenhum grant PUBLIC permanece nessas ACLs.

Assinatura instalada:

```sql
public.identify_public_booking_client_v2(
  uuid, uuid, text, date, text, text, text, timestamptz,
  boolean, text, text, text, jsonb, text
)
```

O corpo remoto é textualmente igual ao corpo do arquivo aprovado. Não apareceu a sobrecarga anterior de nove argumentos. Confirmados no corpo instalado: contagem por telefone antes de nascimento, elegibilidade, token aditivo, evento identificacao/retorno, metadados históricos e caminho de replay.

**Idempotência request_id:** presente no mecanismo completo aprovado. O Node transforma request_id em TC estável por operação; a RPC recebe hash e fingerprint e retorna resultado/expiração originais. Não há parâmetro SQL literal chamado request_id. A presença na definição instalada foi verificada por inspeção; o Node novo ainda não foi implantado nesta etapa. A garantia mantém os limites do relatório de correção: mesma operação/chave, sem prometer deduplicação entre operações independentes.

## RLS preservada deliberadamente

| Policy | Comando | Role | USING | WITH CHECK |
| --- | --- | --- | --- | --- |
| tokens_cliente_select_by_tenant | SELECT | authenticated | deleted_at IS NULL AND has_tenant_access(tenant_id) | — |
| tokens_cliente_insert_by_tenant | INSERT | authenticated | — | has_tenant_access(tenant_id) |
| tokens_cliente_update_by_tenant | UPDATE | authenticated | deleted_at IS NULL AND has_tenant_access(tenant_id) | has_tenant_access(tenant_id) |

Preservadas deliberadamente para análise de hardening posterior. A classificação C anterior não foi tratada como autorização para remoção. Pendência separada: **HARDENING — revisar/remover/restringir policies aparentemente desnecessárias de tokens_cliente.**

As escritas administrativas de service_role e as permissões diretas authenticated descritas no gate permanecem. Não confundir restrição de EXECUTE das RPCs com eliminação dessas permissões de tabela.

## Validação funcional e limites

Não foi chamada a RPC antiga nem a nova para emitir tokens no remoto. Não foram feitos testes de integração com DML, seed, cleanup, alteração da massa ou cadastro fictício. A validação remota desta etapa é estrutural/read-only após o DDL expressamente autorizado.

Não foi necessário criar fixtures remotas: definição integral, ACL, histórico e preservação do schema foram suficientes para este gate. Funcionamento integrado do Node implantado e testes físicos permanecem para a etapa de staging autorizada.

Os arquivos de migration contêm DML dentro da definição da v2, mas instalar a função não executa seu corpo. As alterações remotas efetivas foram ACL, criação da função e registro do histórico pelo procedimento de migration.

## Testes locais após aplicação

Suíte R1.6-B ampliada com campanhas e retries: **242 testes, 242 aprovados, zero falhas**, seis suítes. Executada com credenciais fictícias e repositories simulados/PGlite em memória, sem RPC remota, Supabase local, Docker ou supabase start.

```powershell
$env:SUPABASE_URL='http://127.0.0.1:1'
$env:SUPABASE_ANON_KEY='local-test-anon'
$env:SUPABASE_SERVICE_ROLE_KEY='local-test-service'
$tests = @(Get-ChildItem backend/src/modules/public-booking,backend/src/modules/clients,backend/src/modules/agenda,backend/src/modules/agenda/domain,backend/src/modules/campaigns,frontend/src/components/recurring-access,frontend/src/components/pwa -Filter '*.test.js' | ForEach-Object { $_.FullName })
node --test @tests frontend/src/lib/recurring-access.storage.test.js frontend/src/lib/pwa-manifest.test.js frontend/src/lib/session-id.test.js frontend/src/services/public-booking.retry.test.js
```

TypeScript: `tsc --noEmit --incremental false -p frontend/tsconfig.json`, aprovado. Build: `npm.cmd run build` no frontend, aprovado (44 páginas). Chrome: `frontend/scripts/pwa-access-local-check.cjs`, 8/8 cenários aprovados; APIs simuladas e rede externa bloqueada. Servidor local encerrado ao final.

## Erros e warnings

- Primeira tentativa de SELECT de snapshot falhou com SQLSTATE 42601 pela passagem do argumento multilinha. Corrigida somente a forma do comando para uma linha; o SELECT passou. Isso ocorreu antes de qualquer aplicação, sem alteração remota de aplicação.
- Nenhuma migration falhou. Nenhum rollback emergencial foi necessário.
- CLI avisou sobre versão nova disponível. Não foi atualizada nem houve correção fora do escopo.
- CLI inicializa login role para acesso gerenciado; nenhum SQL de alteração de roles fora das migrations foi solicitado.
- Não foram editados testes para obter aprovação.

## Rollback disponível — não executado

Snapshot anterior preserva a definição/ACL antiga. Reverter/suspender o consumidor da v2 antes de removê-la; hoje esta etapa não publicou o novo consumidor. SQL estrutural correspondente ao estado anterior:

```sql
BEGIN;
DROP FUNCTION IF EXISTS public.identify_public_booking_client_v2(
  uuid, uuid, text, date, text, text, text, timestamptz,
  boolean, text, text, text, jsonb, text
) RESTRICT;
COMMIT;
```

Não remove tokens/clientes/eventos já confirmados por chamadas futuras. Não usar CASCADE. Reconciliar o histórico de migrations pelo procedimento autorizado caso algum rollback seja futuramente decidido.

Manter a ACL antiga restrita é preferível no rollback operacional. O rollback literal da migration 1 restauraria a exposição conhecida:

```sql
BEGIN;
REVOKE ALL ON FUNCTION public.identify_public_booking_client(
  uuid,varchar,varchar,varchar,text,timestamptz,varchar,varchar,uuid,varchar,jsonb
) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.identify_public_booking_client(
  uuid,varchar,varchar,varchar,text,timestamptz,varchar,varchar,uuid,varchar,jsonb
) TO anon,authenticated,service_role;
COMMIT;
```

Não recomendado agora: a aplicação passou. Esse SQL é documentação de reversibilidade, não autorização para reabrir acesso.

## Checklist final

| Pergunta | Resultado |
| --- | --- |
| Projeto remoto correto confirmado | SIM |
| Somente migrations R1.6-B estavam pendentes para aplicação | SIM |
| Migration 1 aplicada | SIM |
| Migration 2 aplicada | SIM |
| Migration adicional aplicada | NÃO |
| anon ainda executa RPC antiga | NÃO |
| authenticated ainda executa RPC antiga | NÃO |
| Nova identificação transacional instalada | SIM |
| Atribuição de campanhas preservada na definição instalada | SIM |
| Idempotência request_id presente no mecanismo aprovado | SIM |
| RLS tokens_cliente alterada | NÃO |
| Dados da massa alterados por esta execução | NÃO |
| Seed executado | NÃO |
| Frontend alterado nesta etapa | NÃO |
| Manifest alterado | NÃO |
| Service Worker alterado | NÃO |
| start_url alterado | NÃO |
| Deploy Railway executado | NÃO |
| Commit executado | NÃO |
| Push executado | NÃO |

Nenhuma alteração de env Railway, domínio, instalação, storage ou recurring access. Nenhum teste físico Android.

## Pendências

Gate de deploy controlado em staging e sua autorização; validação integrada posterior; teste físico somente na etapa apropriada; hardening separado de tokens_cliente. Nenhum deploy será iniciado automaticamente.

## Git e arquivos desta etapa

Nenhum commit/push. Nenhum arquivo funcional ou migration editado. Criados somente este relatório e os dois snapshots JSON referenciados. As demais alterações abaixo são preexistentes e foram preservadas.

`git status --short` ao encerrar (incluindo este relatório):

```text
M backend/package-lock.json
 M backend/package.json
 M backend/scripts/campaign-test-data-v3.js
 M backend/src/modules/auth/auth.validators.js
 M backend/src/modules/public-booking/client-identity.repository.js
 M backend/src/modules/public-booking/client-identity.service.js
 M backend/src/modules/public-booking/client-identity.service.test.js
 M backend/src/modules/public-booking/public-booking.controller.js
 M backend/src/modules/public-booking/public-booking.repository.js
 M backend/src/modules/public-booking/public-booking.service.js
 M backend/src/modules/public-booking/public-booking.validators.js
 M backend/src/modules/services/service-specialty-update.test.js
 M backend/src/modules/services/services.service.js
 M backend/src/routes/public.routes.js
 M backend/src/utils/error-messages.js
 M backend/src/utils/normalize.js
 M docs/modules/booking-publico.md
 M frontend/src/app/layout.tsx
 D frontend/src/app/manifest.ts
 M frontend/src/components/cadastro/RegisterForm.tsx
 M frontend/src/components/cadastro/TermsCheckbox.tsx
 M frontend/src/components/clients/ClientsManager.tsx
 M frontend/src/components/dashboard/DashboardCard.tsx
 M frontend/src/components/dashboard/DashboardHome.tsx
 M frontend/src/components/dashboard/MobileBottomNav.tsx
 M frontend/src/components/public-booking/PublicBookingPage.tsx
 M frontend/src/components/recurring-access/RecurringAccessPage.tsx
 M frontend/src/components/services/ServicesMerManager.tsx
 M frontend/src/components/ui/phone-input.tsx
 M frontend/src/hooks/useRegister.ts
 M frontend/src/lib/messages.ts
 M frontend/src/lib/recurring-access.storage.ts
 M frontend/src/services/public-booking.service.ts
 M frontend/src/services/register.service.ts
 M frontend/src/services/services.service.ts
 M frontend/src/utils/phone.ts
?? backend/scripts/campaign-test-phone.js
?? backend/src/modules/auth/auth.validators.test.js
?? backend/src/modules/public-booking/access-discovery.test.js
?? backend/src/modules/public-booking/identity-attribution.test.js
?? backend/src/modules/public-booking/identity-migration.test.js
?? backend/src/modules/public-booking/identity-policy.js
?? backend/src/modules/public-booking/identity-policy.test.js
?? backend/src/modules/public-booking/identity-rate-limit.js
?? deploy/
?? docs/audits/20260824-auditoria-taxonomia-beleza-bem-estar-v2.md
?? docs/audits/20260825-especificacao-tecnica-taxonomia-beleza-bem-estar-v2.md
?? docs/audits/20260904-acesso-recorrente-tenant-first-fase-0-5.md
?? docs/audits/20260908-fase-0-6b-auditoria-https-mobile-pwa.md
?? docs/audits/20260908-fase-0-6bh-https-ativo.md
?? docs/audits/20260908-fase-0-6bh-https-temporario.md
?? docs/audits/20260908-public-booking-mobile-session-id.md
?? docs/audits/20260909-fase-0-6b-chunkloaderror-proxy.md
?? docs/audits/20260909-fase-0-6b-descoberta-instalacao-pwa.md
?? docs/audits/20260909-fase-0-6bh-cloudflare-quick-tunnel.md
?? docs/audits/20260910-fase-0-6b-diagnostico-installability.md
?? docs/audits/20260910-fase-0-6b-installability-corrigida.md
?? docs/audits/20260910-fase-0-6b-ngrok-development-domain.md
?? docs/audits/20260911-pwa-dev-panel.md
?? docs/audits/20260916-r1-5-bootstrap-pairing.md
?? docs/audits/20260917-r1-6-acesso-pwa-simplificado.md
?? docs/audits/20260917-r1-6-b-implementacao-acesso-pwa-simplificado.md
?? docs/audits/20260918-r1-6-b-correcao-gate-migrations.md
?? docs/audits/20260918-r1-6-b-gate-migrations.md
?? docs/audits/20260918-r1-6-b-remoto-antes.json
?? docs/audits/20260918-r1-6-b-remoto-depois.json
?? docs/roteiros/
?? frontend/public/icons/
?? frontend/public/sw.js
?? frontend/scripts/
?? frontend/src/app/manifest.webmanifest/
?? frontend/src/app/offline/
?? frontend/src/app/pwa-diagnostics/
?? frontend/src/components/cadastro/RegisterForm.validation.test.js
?? frontend/src/components/cadastro/register-validation.test.js
?? frontend/src/components/cadastro/register-validation.ts
?? frontend/src/components/pwa/
?? frontend/src/components/recurring-access/LocateAccess.tsx
?? frontend/src/components/recurring-access/RecurringAccessPage.access.test.js
?? frontend/src/components/recurring-access/RecurringAccessPage.diagnostics.test.js
?? frontend/src/components/services/ServicesMerManager.messages.test.js
?? frontend/src/lib/pwa-manifest.test.js
?? frontend/src/lib/pwa-manifest.ts
?? frontend/src/lib/session-id.test.js
?? frontend/src/lib/session-id.ts
?? frontend/src/services/public-booking.retry.test.js
?? frontend/src/services/register.service.test.js
?? supabase/migrations/20260824190000_reconcile_legacy_hairdresser_specialty_cargo.sql
?? supabase/migrations/20260826120000_fix_operational_profiles_updated_trigger.sql
?? supabase/migrations/20260917100000_restrict_public_booking_identity_rpc.sql
?? supabase/migrations/20260917101000_public_booking_identity_birth.sql
?? docs/audits/20260918-r1-6-b-aplicacao-remota-migrations.md
```

## Veredito

**R1.6-B — MIGRATIONS REMOTAS APLICADAS E VALIDADAS — APTO PARA GATE DE DEPLOY EM STAGING.**

Validação remota estrutural concluída; validação funcional com dados remotos não executada. Nenhum deploy iniciado.

