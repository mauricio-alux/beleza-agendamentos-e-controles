# R1.6-B — Correção dos achados do gate de migrations

Data: 2026-09-18. Este relatório sucede o gate `20260918-r1-6-b-gate-migrations.md`; o SQL/rollback da v2 naquele documento é histórico. A assinatura final está abaixo e no arquivo de migration atual.

**R1.6-B — GATE DE MIGRATIONS APTO PARA APLICAÇÃO REMOTA.**

Este é o resultado da preparação/revisão local, não autorização nem comprovação de funcionamento implantado. As duas migrations permanecem não aplicadas; o risco remoto da RPC antiga permanece até sua restrição autorizada.

## A. Correção da migration 2

### Rastreabilidade antes da alteração

Fontes: `20260613100000_serialize_public_client_identification.sql` (definição histórica também confirmada no gate remoto), `20260611100000_public_booking_client_identity.sql` (tabela/constraints), `client-identity.service.js`, `client-identity.repository.js`, `public-booking.service.js`, documentação de campanhas/booking/WhatsApp. A documentação de WhatsApp descreve idempotência própria da fila de mensagens; ela não foi reutilizada ou alterada para identidade.

| Comportamento antigo | Momento/condição | Lacuna no início desta etapa | Correção local |
| --- | --- | --- | --- |
| INSERT clientes.metadata.origem_identificacao | Novo cliente, dentro da RPC | Não gravado pela v2 | Restaurado apenas na criação; perfil existente não é sobrescrito |
| INSERT cliente_tenants.origem e metadata.campanha_primeiro_acesso | Novo vínculo | Origem fixa e metadata ausente | Usa contexto recebido e preserva chave histórica |
| UPDATE cliente_tenants.metadata.campanha_ultimo_acesso | Cliente existente | Ausente | Atualizado após validação; demais metadados preservados |
| tokens_cliente.origem e metadata | Emissão | Origem fixa e metadata omitida | Contexto histórico preservado, com objeto interno adicional de replay |
| Busca de campanha ativa/não excluída no tenant | Quando p_campaign_key não é NULL | Ausente | Busca por slug ou nome com hífens convertidos em espaços, como anteriormente |
| INSERT campanha_acessos | Toda identificação bem-sucedida, mesmo sem campanha | Ausente no novo identifyByPair | Exatamente um evento por operação de identificação, na mesma transação |

Parâmetros históricos rastreados: p_campaign_key, p_origin, p_link_agendamento_id, p_session_id e p_metadata. Na v2 o link já se chama p_link_id. Os demais foram acrescentados usando a semântica existente; nenhum campaign_id informado pelo cliente é aceito como vínculo confiável.

O evento histórico é `identificacao` para cliente novo e `retorno` para existente. Campos restaurados: tenant_id, link_agendamento_id, campanha_id, cliente_id, campanha_chave, evento, origem, sessao_id e metadata. O INSERT é obrigatório dentro da transação; apenas a resolução de campanha_id é condicional. Chave inexistente mantém campanha_id NULL, sem impedir identificação válida, como no caminho antigo. A busca agora usa ordem por id quando houver mais de uma campanha compatível, sem alterar a política de identidade.

Não era best-effort: a RPC antiga não capturava falha do INSERT de atribuição para continuar. Por isso a correção mantém atomicidade, em vez de adicionar recordAccess separado após a emissão.

Antes desta etapa, os testes de identidade/SQL não representavam campanhas/campanha_acessos e não detectaram a perda. A suíte de campanhas existente cobre suas regras próprias, mas não substituía esse teste de integração SQL. Foram adicionadas fixtures e verificações específicas, sem mudar segmentação, envio, geração de campanhas ou WhatsApp.

### Transação corrigida

1. Validar tenant/link/telefone/nascimento e obter locks existentes.
2. Contar clientes elegíveis pelo telefone; rejeitar ambiguidade, nascimento incorreto/NULL e demais inelegibilidades.
3. Criar cliente/vínculo somente se permitido, ou reutilizar o cliente validado sem atualizar seu perfil.
4. Verificar replay da mesma operação, ainda sob lock. Só depois da revalidação pode retornar o resultado original.
5. Resolver contexto de campanha dentro do tenant, inserir TC aditivo, atualizar metadados/timestamps do vínculo e inserir o evento.
6. Confirmar tudo junto. Erro na atribuição desfaz também novo cliente/vínculo/TC e atualizações dessa chamada.

Campanha não se torna fator de identidade. Rejeitar nascimento/ambiguidade continua precedendo atribuição. Nenhuma emissão revoga tokens de outros contextos.

### Idempotência e contrato de retry

O caminho antigo tinha lock para impedir clientes duplicados, mas não deduplicava tokens/eventos em chamadas repetidas. A revisão anterior também não implementava replay. Agora:

- O serviço frontend atribui um UUID `request_id` à tentativa de emissão, reutiliza-o após falha de transporte/resposta e compartilha a promessa quando a mesma submissão ainda está em andamento. A mudança está no serviço HTTP, sem redesenhar telas.
- A tentativa fica apenas em memória, não em URL, localStorage ou sessionStorage. São mantidas até 32 tentativas falhadas, sem remover chamadas ainda em andamento. Sucesso encerra a tentativa; uma nova operação recebe outro UUID.
- O Node deriva um TC de 256 bits com HMAC-SHA-256, prefixo de domínio próprio, tenant, link e UUID, usando a chave de serviço já existente e exclusivamente no servidor. Isso permite reproduzir o mesmo TC após perda de resposta/reinício do Node, sem armazenar o token bruto no banco. O banco continua recebendo somente seu SHA-256; tipo e TTL permanecem os existentes.
- O fingerprint do payload normalizado vincula telefone/nascimento, modo lookup, dados cadastrais e contexto à tentativa. A RPC armazena fingerprint e recognized original no objeto interno `tokens_cliente.metadata._identity`; não renomeia campos históricos nem usa esse objeto em dados públicos.
- Mesmo hash em retry válido retorna cliente/recognized/expiração originais, sem novo INSERT ou UPDATE de atribuição. Alteração de payload, token revogado/expirado ou perda de elegibilidade é rejeitada; não reativa token.
- `request_id` não autentica ninguém: mesmo conhecido, a política inteira de telefone+nascimento continua obrigatória. A chave de serviço não é enviada ao cliente nem logada.

Limite explícito: a garantia é para a **mesma operação com o mesmo request_id e a chave de servidor estável**. Cliente de API externo deve reenviar a chave; chamadas legadas sem request_id são operações independentes. Fechar/recarregar a página, remover a tentativa da memória ou trocar a chave do servidor não constitui continuidade automática de uma tentativa. Não foi criado storage de recuperação para estender essa garantia. Novas operações legítimas/contextos distintos continuam gerando TC e evento próprios. A idempotência aqui é da identificação e sua atribuição, não uma reformulação da criação de agendamentos ou da fila WhatsApp.

Fluxo com TC válido não passa por essa derivação nem requer novo request_id. O caminho público appointments sem TC agora repassa campanha/origem/sessão/request_id à identificação em vez de descartar esse contexto. O modo PWA vazio aceita somente telefone/nascimento/slug/request_id: não inventa campanha, sessão ou origem de campanha.

## B. Migration 1 — estado final

Arquivo: `supabase/migrations/20260917100000_restrict_public_booking_identity_rpc.sql`.

Preservada sem alteração. O DO revoga PUBLIC, anon e authenticated de todas as sobrecargas da RPC antiga e concede EXECUTE a service_role. Owner/administração do banco continuam com poderes inerentes; não é correto prometer exclusividade literal frente ao proprietário/superusuário.

Remoto reconfirmado por SELECT nesta etapa: somente a RPC antiga existe, SECURITY DEFINER, owner postgres, search_path public, ACL `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`. A restrição ainda não está ativa.

## C. Migration 2 — estado final e nova revisão

Arquivo: `supabase/migrations/20260917101000_public_booking_identity_birth.sql`.

Assinatura final:

```sql
public.identify_public_booking_client_v2(
  uuid, uuid, text, date, text, text, text, timestamptz,
  boolean, text, text, text, jsonb, text
)
```

Acrescentados p_campaign_key, p_origin, p_session_id, p_metadata e p_request_fingerprint. Retorno inclui expires_at para replay fiel, além de client_id e recognized. Trata-se da edição de migration ainda não aplicada, não da criação de migration adicional. A v2 antiga de nove argumentos não existe no remoto consultado. Se algum ambiente já a tiver instalado manualmente, parar e revisar antes de aplicar: alterar assinatura cria outra sobrecarga, não substitui a de nove argumentos.

Dependências verificadas por metadados: tabelas clientes, cliente_tenants, tokens_cliente, tenants, links_agendamento, campanhas e campanha_acessos; campos de metadata/origem/sessão já existem. Nenhuma coluna, tabela, índice, constraint ou policy foi criada/alterada. A chave interna usa JSONB existente.

| Item revisado | Resultado |
| --- | --- |
| Ordem | Migration 1 primeiro; migration 2 depois; publicação do consumidor novo somente em etapa posterior autorizada |
| Atomicidade da instalação | BEGIN/COMMIT explícitos ao redor do CREATE e REVOKE/GRANT, evitando janela com ACL padrão |
| Atomicidade da emissão | TC, cliente/vínculo e atribuição na mesma chamada/transação |
| SECURITY DEFINER | Mantida na v2; execução restrita ao backend |
| search_path | public; referências a tabelas explicitamente qualificadas com public |
| Owner | Será o papel autorizado que criar a função; não houve ALTER OWNER remoto |
| Permissões | PUBLIC/anon/authenticated revogados para a assinatura final, service_role concedido |
| Idempotência de migration | Ambas reaplicadas duas vezes na instância SQL local dos testes; sem duplicar função/ACL |
| Replay de operação | Retorna resultado original após revalidação; não grava outro token/evento |
| Bypass por RPC antiga | Fechado para anon/authenticated após migration 1; não fechado ainda no remoto |
| Escrita administrativa | Continua possível nos canais privilegiados documentados; RLS não foi modificada |
| Concorrência | Lock por tenant/telefone existente preservado; não é UNIQUE global nem coordena escritores externos que ignorem esse lock |

Os testes de concorrência usam chamadas enfileiradas numa conexão PGlite; não simulam integralmente concorrência multi-conexão do Supabase. Nenhuma RPC foi chamada no remoto.

### Rollback proposto — não executado

Reverter/suspender primeiro o consumidor da v2. Como a função está ausente no snapshot remoto anterior à aplicação, o rollback estrutural é:

```sql
BEGIN;
DROP FUNCTION IF EXISTS public.identify_public_booking_client_v2(
  uuid, uuid, text, date, text, text, text, timestamptz,
  boolean, text, text, text, jsonb, text
) RESTRICT;
COMMIT;
```

Não desfaz clientes, tokens ou eventos já confirmados por chamadas futuras. Não usar CASCADE. Se houver definição anterior da mesma assinatura, capturar/restaurar definição e ACL em vez de remover. Histórico de migrations deve ser reconciliado pelo procedimento autorizado, nunca por alteração improvisada nesta execução.

Preferir manter a restrição da RPC antiga durante rollback do aplicativo. O rollback literal da migration 1, já documentado no gate anterior, seria restaurar EXECUTE a anon/authenticated/service_role para a assinatura histórica, mantendo PUBLIC revogado. Isso reabre o risco conhecido e exige decisão específica; não foi executado nem recomendado como medida automática.

## D. Atribuição de campanhas

| Pergunta | Resultado |
| --- | --- |
| Atribuição existente foi preservada | SIM |
| Eventos podem duplicar em retry da mesma operação identificada | NÃO |
| Fluxo sem campanha continua funcionando | SIM |
| Campanha virou fator de identidade | NÃO |

Sem campanha ainda existe o evento histórico de identificação/retorno com campanha_id NULL. Isso é tracking de acesso, não atribuição inventada a uma campanha. Chave adulterada não concede identidade; campanha de outro tenant nunca é vinculada; campaign_id extra é rejeitado pelo schema público estrito.

## E. tokens_cliente / RLS — análise dirigida, sem alteração

SELECTs novos a pg_policies, pg_proc, information_schema e privilégios efetivos confirmaram:

| Policy | Comando | Role | USING | WITH CHECK | Uso encontrado | Classe | Risco |
| --- | --- | --- | --- | --- | --- | --- | --- |
| tokens_cliente_select_by_tenant | SELECT | authenticated | deleted_at IS NULL AND has_tenant_access(tenant_id) | — | Nenhum consumidor direto com JWT do usuário; repositories usam supabaseAdmin | C | Expõe hash e metadados a membros do tenant mesmo sem permissão RBAC de clientes |
| tokens_cliente_insert_by_tenant | INSERT | authenticated | — | has_tenant_access(tenant_id) | Nenhum consumidor direto encontrado | C | Membro autorizado pela expressão pode inserir token/hash/expiração sem política de nascimento |
| tokens_cliente_update_by_tenant | UPDATE | authenticated | deleted_at IS NULL AND has_tenant_access(tenant_id) | has_tenant_access(tenant_id) | Nenhum consumidor direto encontrado | C | Não restringe colunas sensíveis; permite alterar tokens não excluídos |
| Nenhuma policy | DELETE | — | — | — | Nenhum DELETE encontrado no repository de tokens | Não aplicável | Grant de tabela não supera ausência de policy para anon/authenticated |

**Classificação C = aparentemente desnecessária para os consumidores encontrados no repositório**, não autorização para removê-la. Dependências externas ao repositório não foram presumidas inexistentes. As três policies permanecem intactas.

### O que has_tenant_access autoriza

Retorna is_master_admin() OU target_tenant_id = current_tenant_id() não nulo. current_tenant_id seleciona membership ativa de usuário ativo/não excluído identificado por auth.uid(), priorizando is_primary e depois created_at. is_master_admin utiliza current_tipo_usuario = MasterAdmin.

Não há teste de clientes.write, de função profissional, de permissão granular ou de assinatura nessa expressão. Portanto MasterAdmin e qualquer perfil com usuário/membership que satisfaça a condição podem passar: Administrador, Autonomo, Funcionario, Terceiro, Profissional Adm e roles legadas/customizadas sob as mesmas condições. O nome do cargo não é o filtro dessa policy.

### Dependências reais e diferença para o backend

Busca de tokens_cliente em frontend/src e backend/src encontrou uso funcional somente em client-identity.repository.js, importando supabaseAdmin. Nenhum acesso direto frontend → Supabase a tokens_cliente foi encontrado.

Usos legítimos encontrados: findToken (resolver TC), touchIdentity (último uso), createToken e revokeActiveTokens (emissão administrativa). O endpoint POST /clients/:id/booking-token usa authMiddleware, tenantMiddleware, assinatura válida e requirePermission('clientes.write'); clientsService.issueBookingToken chama issueClientLink. Rotas públicas de identidade/perfil/upcoming também usam o repository de serviço após suas validações próprias. Nenhum desses caminhos depende de policies authenticated para funcionar, pois usam service_role.

O backend cria req.supabase com JWT do usuário no middleware de autenticação, mas nenhum uso encontrado desse cliente acessa tokens_cliente. service_role é suficiente para todas as escritas de tokens encontradas. Remover as policies não deveria quebrar esses consumidores específicos; afirmar isso para integrações externas exigiria inventário separado. Nenhuma remoção foi feita.

### Capacidade efetiva de escrita

- **Criar TC arbitrariamente:** INSERT permite hash escolhido, tipo permitido e cliente_id existente, desde que tenant_id passe pela policy e constraints sejam respeitadas. As FKs de tenant/cliente são separadas; a policy não exige vínculo composto.
- **Alterar hash/cliente_id/expiração/tipo:** UPDATE não limita essas colunas; sujeitas às FKs, índice de hash e check de tipo existentes.
- **Alterar tenant_id:** USING valida a linha antiga e WITH CHECK a nova. Usuário comum fica limitado ao tenant atual retornado pelo helper; MasterAdmin pode satisfazer ambos em tenants distintos.
- **Reativar token:** ativo pode ser alterado se deleted_at da linha original for NULL. Linha já soft-deleted não satisfaz USING, portanto não é reativável por essa policy de UPDATE.
- **DELETE:** grant existe para anon/authenticated, mas nenhuma policy permite a operação. service_role tem BYPASSRLS e mantém seus poderes.
- **anon:** grants SELECT/INSERT/UPDATE/DELETE existem, mas nenhuma policy se aplica à role; RLS bloqueia acesso direto à tabela.

Risco elevado para credenciais authenticated de membros sem RBAC administrativo; não é novo bypass anônimo demonstrado nesta execução. O bypass anônimo **já conhecido** continua sendo a RPC antiga SECURITY DEFINER ainda exposta até a migration 1 autorizada. Não houve tentativa de exploração, emissão ou escrita remota. Não foi descoberta nova vulnerabilidade crítica pelo fluxo público que exigisse interromper a correção local autorizada.

## F. Testes e arquivos

**242 testes aprovados, zero falhas, seis suítes.** Incluem a suíte anterior R1.6-B, campanhas e os novos testes de atribuição/retry.

```powershell
$env:SUPABASE_URL='http://127.0.0.1:1'
$env:SUPABASE_ANON_KEY='local-test-anon'
$env:SUPABASE_SERVICE_ROLE_KEY='local-test-service'
$tests = @(Get-ChildItem backend/src/modules/public-booking,backend/src/modules/clients,backend/src/modules/agenda,backend/src/modules/agenda/domain,backend/src/modules/campaigns,frontend/src/components/recurring-access,frontend/src/components/pwa -Filter '*.test.js' | ForEach-Object { $_.FullName })
node --test @tests frontend/src/lib/recurring-access.storage.test.js frontend/src/lib/pwa-manifest.test.js frontend/src/lib/session-id.test.js frontend/src/services/public-booking.retry.test.js
```

| Verificação | Resultado |
| --- | --- |
| SQL: novo/existente com campanha, sem campanha, chave inválida/tenant diferente, fallback por nome | Aprovado |
| SQL: nascimento errado/ausente e ambiguidade não atribuem | Aprovado |
| SQL: replay simples/concorrente, payload alterado, token revogado, expiração original | Aprovado |
| SQL: falha na atribuição desfaz cliente/TC/metadados | Aprovado |
| Node: contexto repassado, fingerprint, TC estável por operação e distinto entre operações/tenants | Aprovado |
| Frontend: perda de resposta, submissões simultâneas, retry PWA vazio, TC válido sem nova identificação | Aprovado |
| Regressões anteriores: TC aditivo, token anterior, upcoming exato, telefone sozinho bloqueado, Android/storage | Aprovado |
| TypeScript: tsc --noEmit --incremental false -p frontend/tsconfig.json | Aprovado |
| Frontend npm.cmd run build | Aprovado, 44 páginas |
| frontend/scripts/pwa-access-local-check.cjs | 8/8 Chrome aprovados; APIs simuladas, rede externa bloqueada |

PGlite local em memória; nenhuma RPC remota executada. Chrome headless não é teste físico e não prova integração implantada. Servidor local encerrado após os testes.

Arquivos funcionais alterados nesta etapa: migration 2; backend client-identity.repository.js, client-identity.service.js, public-booking.validators.js, public-booking.service.js; frontend public-booking.service.ts. Testes: identity-migration.test.js atualizado; identity-attribution.test.js e public-booking.retry.test.js criados. Relatório atual e referências nos dois relatórios anteriores. Não foram alterados módulos de segmentação, envio ou WhatsApp, nem migration 1.

## G. Não regressão Android

| Pergunta | Resultado |
| --- | --- |
| Manifest alterado | NÃO |
| Service Worker alterado | NÃO |
| start_url alterado | NÃO |
| Storage incompatível alterado | NÃO |
| TC válido exige reidentificação | NÃO |

A alteração frontend fica no transporte das tentativas sem TC; chamadas com TC continuam no caminho anterior. Não há branch Android/iOS, nova chave de storage, nova tela ou mudança de instalação/recurring access. A memória transitória de retry não substitui o storage PWA existente.

## H. Remoto

Migration aplicada: **NÃO**. DML remoto: **NÃO**. DDL de aplicação remoto: **NÃO**. Deploy: **NÃO**. Seed/cleanup: **NÃO**. Policies alteradas: **NÃO**.

A CLI utiliza inicialização de login role para acesso; foram enviados exclusivamente SELECTs de metadados. Nenhuma credencial ou dado pessoal foi impresso no relatório. Aplicação futura deve limitar-se às migrations aprovadas e ao ambiente aprovado; não executar db push indiscriminadamente com outras migrations pendentes.

## I. Git e encerramento

Commit: **NÃO**. Push: **NÃO**. Alterações preexistentes preservadas; git status --short apresentado ao final. O diff completo contra HEAD contém trabalho anterior e não representa somente esta etapa.

O impedimento de atribuição foi corrigido. A análise RLS foi concluída como solicitado, sem alteração das policies e sem torná-la uma expansão automática de escopo. Não há bloqueador restante para o próximo gate/aplicação autorizada das duas migrations no perímetro público definido. Testes de integração em staging, disputa multi-conexão e teste físico continuam etapas posteriores.

**R1.6-B — GATE DE MIGRATIONS APTO PARA APLICAÇÃO REMOTA.** Nenhuma aplicação será feita sem autorização específica.
