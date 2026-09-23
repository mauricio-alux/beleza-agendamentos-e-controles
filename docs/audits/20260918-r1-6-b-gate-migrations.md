# R1.6-B — Gate de revisão das duas migrations

> Revisão histórica anterior à correção de atribuição. O estado final e o rollback da assinatura atual da v2 estão em [Correção dos achados do gate](20260918-r1-6-b-correcao-gate-migrations.md). Não aplicar o SQL/rollback histórico da v2 como se fosse a versão atual.

Data: 2026-09-18. Escopo: revisão estática e SELECTs de metadados no Supabase vinculado. Nenhuma alteração de código ou migration. Nenhuma RPC de negócio executada. Nenhum db push, DDL/DML de aplicação, seed, deploy, commit ou push.

## Veredito

**AJUSTE NECESSÁRIO ANTES DA APLICAÇÃO REMOTA.**

As duas migrations são necessárias e complementares. A primeira corrige uma exposição real confirmada no remoto. A segunda atende a identificação transacional nova, mas sua integração substitui efeitos de campanha da RPC antiga sem equivalente no novo caminho: eventos de identificação/retorno e metadados de atribuição deixam de ser gravados nessa chamada. Esse efeito deve ser corrigido ou ter sua retirada explicitamente aprovada antes de liberar a troca. Não foi corrigido nesta revisão.

Separadamente, restringir EXECUTE dessas RPCs não significa que toda emissão/revogação remota passou a depender do novo backend: permanecem o serviço privilegiado, a RPC antiga para service_role e o DML direto de usuários authenticated com acesso ao tenant via RLS. Estes últimos são caminhos administrativos existentes, não acesso anônimo; sua permanência deve constar expressamente do perímetro aprovado. Não recomendo removê-los às cegas.

## Evidência remota atual

Consultas novas realizadas nesta revisão, não apenas reprodução da auditoria de 17/09:

- Uma sobrecarga de `identify_public_booking_client`; proprietário postgres; SECURITY DEFINER = true; search_path = public.
- Assinatura: `public.identify_public_booking_client(uuid, varchar, varchar, varchar, text, timestamptz, varchar, varchar, uuid, varchar, jsonb)`, retorno uuid.
- ACL exata: `{postgres=X/postgres,anon=X/postgres,authenticated=X/postgres,service_role=X/postgres}`.
- EXECUTE efetivo confirmado para anon, authenticated, service_role, postgres e supabase_admin. Os dois últimos são papéis administrativos/proprietário; não é correto prometer literalmente “somente service_role” incluindo superusuários.
- Não há grant para PUBLIC nessa ACL. Não há heranças de roles para anon/authenticated/service_role na consulta a pg_auth_members.
- Defaults de funções em public para postgres e supabase_admin concedem explicitamente a anon, authenticated e service_role. Isso explica por que o REVOKE de PUBLIC na migration inicial não removeu grants diretos. Não atribuir a divergência automaticamente a CREATE OR REPLACE: esse comando conserva ACL de função existente.
- `identify_public_booking_client_v2` ausente.
- Histórico remoto contém 20260611100000, 20260611110000 e 20260613100000; não contém 20260917100000 nem 20260917101000.
- Busca textual das definições de funções não sistêmicas por tokens_cliente ou identify_public_booking_client encontrou apenas a RPC antiga. Não foram encontradas views públicas referenciando tokens_cliente. Isso não prova ausência de SQL dinâmico ou de consumidores externos.
- A definição antiga escolhe primeiro cliente por telefone, não verifica nascimento, altera cadastro, revoga tokens ativos e insere outro com hash recebido do chamador. Logo **há atualmente um caminho remoto anônimo que ignora a política nova**. Não foi chamado para comprovar isso.

A CLI exibiu “Initialising login role...” como parte da autenticação gerenciada. Foram enviados somente SELECTs de catálogo/definição; não foi solicitado SQL de mudança de aplicação, nem chamada de função de negócio. Nenhum dado pessoal ou secret foi incluído neste relatório.

### Compatibilidade do schema

Conferidos information_schema.columns, pg_constraint, pg_indexes, pg_trigger e pg_policies:

- clientes.data_nascimento já é date nullable; nome/telefone obrigatórios.
- Colunas utilizadas nas cinco tabelas existem; defaults de UUID, ativo e demais obrigatórios omitidos atendem aos INSERTs da v2.
- cliente_tenants tem UNIQUE(tenant_id, cliente_id), status ativo permitido e defaults compatíveis.
- tokens_cliente aceita tipo agendamento_publico; índice único do hash é parcial, para deleted_at IS NULL; não limita a um token ativo por cliente.
- Índices de telefone e tenant/cliente existem. Não há UNIQUE global de telefone.
- Triggers nas três tabelas escritas chamam set_updated_at(), cuja definição apenas atribui now() a new.updated_at.
- A v2 não depende de coluna nova nem requer alteração de tabelas/índices/triggers.
- O teste PGlite anterior usou schema mínimo e índice de hash simplificado. A compatibilidade acima foi revisada por metadados; não houve teste de emissão no remoto.

### Caminhos de DML direto

tokens_cliente tem RLS habilitada, não forçada. anon, authenticated e service_role têm privilégios de tabela INSERT/UPDATE/SELECT. A existência do grant não basta para anon: não há policy aplicável a anon, portanto o acesso direto permanece bloqueado por RLS.

Para authenticated, as policies permitem INSERT e UPDATE quando has_tenant_access(tenant_id). Esse helper aceita MasterAdmin ou tenant atual obtido de usuário ativo e membership ativa; não testa nascimento nem exige cargo administrativo específico nessa expressão. Portanto usuários autenticados com esse acesso podem criar/desativar tokens por DML sem passar pela v2. A policy INSERT também não verifica por si só a associação composta tenant/cliente (as FKs são separadas). As migrations em revisão não alteram isso. service_role tem BYPASSRLS e mantém poder de escrita direta.

A conclusão correta após as migrations será “anon/authenticated sem EXECUTE nessas RPCs”, não “nenhuma outra escrita possível em tokens_cliente”. O caminho administrativo Node issueClientLink também permanece revogador por projeto.

## Comparação

| Objeto/comportamento | Repositório | Remoto atual | Desejado após R1.6-B |
| --- | --- | --- | --- |
| RPC antiga | Definição histórica + nova restrição ACL | Ativa, SECURITY DEFINER, anon/authenticated executam | Mesma definição, execução de aplicação restrita a service_role |
| RPC v2 | Preparada, telefone antes de nascimento, aditiva | Ausente | Instalada, ACL restrita, backend novo utiliza |
| Coluna nascimento | Existente, sem nova migration de coluna | date nullable | Preservada |
| Tokens anteriores | Nova recuperação não revoga | RPC antiga revoga | Nova recuperação aditiva |
| Backend público local | Usa v2, não chama helper antigo | Versão de binário implantado não consultada neste gate | Publicar somente depois da v2 aprovada/aplicada |
| Escrita administrativa de tokens | Existente | RLS por tenant + service_role | Perímetro a documentar; não muda com estas migrations |
| Eventos de identificação/campanha | Ausentes no novo identifyByPair/v2 | RPC antiga os grava | Preservar equivalente ou aprovar retirada explícita |

## MIGRATION 1

1. **Nome:** `supabase/migrations/20260917100000_restrict_public_booking_identity_rpc.sql`.
2. **Objetivo:** retirar o EXECUTE anônimo/autenticado da RPC antiga, incluindo eventuais sobrecargas.
3. **SQL completo:** abaixo, fiel ao arquivo.
4. **Objetos afetados:** ACL de todas as funções em public cujo proname seja identify_public_booking_client. Hoje há uma. O DO consulta catálogo e executa REVOKE/GRANT.
5. **Permissões atuais:** ACL e privilégios efetivos descritos acima.
6. **Depois:** sem EXECUTE para PUBLIC, anon e authenticated; service_role mantém EXECUTE; owner e administração do banco mantêm seus poderes.
7. **Necessária:** **SIM**. A restrição anterior de PUBLIC não retirou grants diretos. Não é redundante com 20260611100000.
8. **Tipo:** apenas permissões de função; sem mudar tabelas, dados de negócio, definição ou SECURITY DEFINER.
9. **INSERT/UPDATE/DELETE:** não contém.
10. **DROP:** não contém.
11. **CREATE OR REPLACE FUNCTION:** não contém.
12. **GRANT/REVOKE:** sim, dinâmicos, para todas as sobrecargas desse nome.
13. **RPC antiga:** continua existindo e continua revogadora; muda apenas quem pode executá-la.
14. **anon:** perde EXECUTE, inclusive concessão via PUBLIC.
15. **authenticated:** perde EXECUTE dessa RPC; privilégios/policies da tabela não são alterados.
16. **service_role:** mantém/recebe EXECUTE.
17. **Node atual:** cliente supabaseAdmin usa service_role; chamada legada que use essa role continua permitida. Código local R1.6-B usa v2; não depende da antiga para recuperação.
18. **/agendar/[slug]:** não modifica TC existente ou dados. Consumidor que chamasse diretamente a RPC antiga com anon/authenticated passa a falhar, intencionalmente.
19. **/acesso:** caminho local de TC válido permanece; recuperação nova depende da migration 2.
20. **Risco:** baixo para Node com service_role; quebra intencional de chamadas públicas diretas. A enumeração de sobrecargas tem escopo por nome; não toca outras funções.
21. **Rollback:** tecnicamente possível, restaura a exposição antiga; não é a opção recomendada para rollback do aplicativo.
22. **SQL de rollback:** fornecido abaixo, específico à assinatura e ACL observadas.

SHA-256 do arquivo: `aaa90124b4380541358eff51dfa23c1965567390399cbf2bff1ef7a269c7e7a6`.

```sql
-- Repository-only preparation. Do not apply remotely without separate authorization.
-- Revoke all overloads: PUBLIC grants are inherited even after a role-specific revoke.
do $$
declare fn record;
begin
  for fn in select p.oid::regprocedure as signature
    from pg_proc p join pg_namespace n on n.oid=p.pronamespace
    where n.nspname='public' and p.proname='identify_public_booking_client'
  loop
    execute format('revoke all on function %s from public, anon, authenticated', fn.signature);
    execute format('grant execute on function %s to service_role', fn.signature);
  end loop;
end $$;
```

### Rollback correspondente — migration 1

**Somente proposta, não executada.** Restaura os grants diretos observados e mantém PUBLIC sem acesso. Reabre a emissão/revogação anônima e exige autorização específica. Se surgirem outras sobrecargas ou a ACL mudar, recapturar o estado antes da aplicação; este rollback é do snapshot atual, não um restaurador genérico.

```sql
BEGIN;
REVOKE ALL ON FUNCTION public.identify_public_booking_client(uuid, varchar, varchar, varchar, text, timestamptz, varchar, varchar, uuid, varchar, jsonb)
  FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.identify_public_booking_client(uuid, varchar, varchar, varchar, text, timestamptz, varchar, varchar, uuid, varchar, jsonb)
  TO anon, authenticated, service_role;
COMMIT;
```

O owner postgres não foi removido pela migration nem pelo rollback. Alternativa operacional preferível: manter a ACL restrita e reverter somente aplicação/v2 quando necessário.

## MIGRATION 2

1. **Nome:** `supabase/migrations/20260917101000_public_booking_identity_birth.sql`.
2. **Objetivo:** criar a RPC de identificação atômica pela política nova, com token aditivo e bloqueio de duplicidade por telefone.
3. **SQL completo:** abaixo, fiel ao arquivo.
4. **Objetos afetados:** função public.identify_public_booking_client_v2 e sua ACL. Quando chamada futuramente, lê/locka tenants e links_agendamento; lê clientes/cliente_tenants; pode inserir clientes, cliente_tenants e tokens_cliente; atualiza timestamps de cliente_tenants.
5. **Permissões atuais:** função ausente. Defaults remotos concederiam acesso público/autenticado se a criação não fosse acompanhada dos REVOKEs.
6. **Depois:** nova SECURITY DEFINER, search_path public, EXECUTE de aplicação para service_role; sem PUBLIC/anon/authenticated. Owner é o papel que criar a função, não fixado no SQL; aplicar com papel de migrations aprovado.
7. **Necessária:** **SIM** para o Node local atual, que já chama esse nome e espera client_id/recognized. Não substitui a migration 1: a antiga continuaria exposta sem ela.
8. **Tipo:** DDL de função + permissões. Não altera schema de tabelas e não muta dados de negócio na aplicação do arquivo; o corpo contém DML para chamadas posteriores.
9. **INSERT/UPDATE/DELETE:** contém três INSERTs (cliente, vínculo, token) e um UPDATE (timestamps do vínculo), dentro da função; não contém DELETE.
10. **DROP:** não contém.
11. **CREATE OR REPLACE FUNCTION:** sim. Atualmente cria função ausente; em reaplicação substitui a mesma assinatura.
12. **GRANT/REVOKE:** sim, para assinatura específica.
13. **RPC antiga:** não muda definição nem remove a antiga; elas coexistem.
14. **anon:** sem EXECUTE da v2 após REVOKE.
15. **authenticated:** sem EXECUTE da v2 após REVOKE; DML de tabela preexistente fica intacto.
16. **service_role:** recebe EXECUTE; o Node gera token/hash/TTL e chama a função com suas credenciais.
17. **Node atual:** resolve a dependência local de identifyWithBirth. Sem v2 no remoto, o novo caminho não funciona. Não exige publicação conjunta da ACL antiga para o Node ter permissão, mas a ACL é necessária para fechar o bypass público.
18. **/agendar/[slug]:** viabiliza novo cliente/recuperação sem TC; TC já válido continua no caminho existente. Telefone duplicado bloqueia antes de comparar nascimento.
19. **/acesso:** C1 e escolha CN passam por revalidação/lookup_only da v2; não criam cadastro nessa recuperação. Descoberta inicial continua no Node.
20. **Riscos:** integração de campanhas descrita abaixo; concorrência entre escritores externos que não adotam advisory lock; concessões temporárias se CREATE e REVOKE fossem executados separadamente fora de transação; integração depende de implantação coordenada. Nenhum impacto direto em manifest/SW/start_url/storage.
21. **Rollback:** remover somente a v2 após suspender/reverter seus consumidores; não apaga tokens/clientes já criados. Não usar CASCADE.
22. **SQL de rollback:** abaixo, válido para o estado atual em que a v2 não existia.

SHA-256 do arquivo: `aea13c0a43ea7b4d99f95ac9a61f6da917c8331884fd16a2e8c3540e1036720b`.

```sql
-- Prepared locally only. Requires explicit approval before remote application.
-- A single transaction serializes public registration and additive token issuance.
create or replace function public.identify_public_booking_client_v2(
  p_tenant_id uuid, p_link_id uuid, p_telefone text, p_nascimento date,
  p_nome text, p_email text, p_token_hash text, p_expires_at timestamptz,
  p_lookup_only boolean default false
) returns jsonb
language plpgsql security definer set search_path = public
as $$
declare
  v_ids uuid[];
  v_client uuid;
  v_birth date;
  v_recognized boolean := true;
  v_now timestamptz := now();
begin
  if p_telefone is null or p_telefone !~ '^\+55[1-9][0-9]{9,10}$'
    or p_nascimento is null or p_nascimento > current_date
    or p_token_hash is null or p_token_hash !~ '^[a-f0-9]{64}$'
    or p_expires_at is null or p_expires_at <= v_now then
    raise exception 'CLIENT_MATCH_UNAVAILABLE';
  end if;
  perform pg_advisory_xact_lock(hashtext(p_tenant_id::text), hashtext(p_telefone));
  perform 1 from public.tenants where id=p_tenant_id and ativo and deleted_at is null
    and status in ('ativo','trial') for share;
  if not found then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;
  perform 1 from public.links_agendamento where id=p_link_id and tenant_id=p_tenant_id
    and ativo and acesso_publico and deleted_at is null
    and (expira_em is null or expira_em>v_now) for share;
  if not found then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;

  -- Lock all matching phone rows, including ineligible rows, before deciding.
  perform 1 from public.clientes c join public.cliente_tenants ct on ct.cliente_id=c.id
    where ct.tenant_id=p_tenant_id and c.telefone=p_telefone for update of c,ct;
  select array_agg(c.id) into v_ids
    from public.clientes c join public.cliente_tenants ct on ct.cliente_id=c.id
    where ct.tenant_id=p_tenant_id and c.telefone=p_telefone
      and c.ativo and c.deleted_at is null and ct.ativo and ct.status='ativo' and ct.deleted_at is null;
  if coalesce(cardinality(v_ids),0)>1 then raise exception 'AMBIGUOUS_CLIENT_MATCH'; end if;
  if coalesce(cardinality(v_ids),0)=1 then
    v_client := v_ids[1];
    select data_nascimento into v_birth from public.clientes where id=v_client;
    if v_birth is null then raise exception 'PHONE_EXISTS_BIRTHDATE_MISSING'; end if;
    if v_birth <> p_nascimento then raise exception 'PHONE_EXISTS_BIRTHDATE_MISMATCH'; end if;
  else
    -- Do not bypass an ineligible existing registration by creating a duplicate.
    if p_lookup_only or exists (
      select 1 from public.clientes c join public.cliente_tenants ct on ct.cliente_id=c.id
        where ct.tenant_id=p_tenant_id and c.telefone=p_telefone
    ) then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;
    if p_nome is null or length(trim(p_nome))<2 then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;
    insert into public.clientes(nome,telefone,email,data_nascimento)
      values(trim(p_nome),p_telefone,nullif(lower(trim(p_email)),''),p_nascimento) returning id into v_client;
    insert into public.cliente_tenants(tenant_id,cliente_id,nome_no_tenant,origem,status,ativo)
      values(p_tenant_id,v_client,trim(p_nome),'link_agendamento','ativo',true);
    v_recognized := false;
  end if;

  -- Recheck under the same transaction/row locks. Never reactivate or update base profile.
  perform 1 from public.clientes c join public.cliente_tenants ct on ct.cliente_id=c.id
    where c.id=v_client and ct.tenant_id=p_tenant_id and c.ativo and c.deleted_at is null
      and ct.ativo and ct.status='ativo' and ct.deleted_at is null;
  if not found then raise exception 'CLIENT_MATCH_UNAVAILABLE'; end if;
  insert into public.tokens_cliente(tenant_id,cliente_id,token_hash,tipo,expira_em,origem)
    values(p_tenant_id,v_client,p_token_hash,'agendamento_publico',p_expires_at,'public_birth_identity');
  update public.cliente_tenants set data_primeiro_acesso=coalesce(data_primeiro_acesso,v_now),
    data_ultimo_acesso=v_now,updated_at=v_now where tenant_id=p_tenant_id and cliente_id=v_client;
  return jsonb_build_object('client_id',v_client,'recognized',v_recognized);
end;
$$;
revoke all on function public.identify_public_booking_client_v2(uuid,uuid,text,date,text,text,text,timestamptz,boolean)
  from public, anon, authenticated;
grant execute on function public.identify_public_booking_client_v2(uuid,uuid,text,date,text,text,text,timestamptz,boolean)
  to service_role;
```

### Rollback correspondente — migration 2

**Somente proposta, não executada.** Se a função vier a existir antes da aplicação, este rollback deixa de representar o estado anterior: deve-se guardar/repor sua definição e ACL, em vez de removê-la.

```sql
BEGIN;
DROP FUNCTION IF EXISTS public.identify_public_booking_client_v2(
  uuid, uuid, text, date, text, text, text, timestamptz, boolean
) RESTRICT;
COMMIT;
```

Antes disso, retirar o tráfego do Node que depende da v2. RESTRICT impede remoção com dependências catalogadas; não protege contra chamadas vindas do aplicativo. Não reverter clientes, vínculos ou tokens automaticamente: são dados de negócio e remover a função não os desfaz. Se houver registro em schema_migrations após aplicação futura, reconciliar o histórico pelo procedimento de migrations aprovado; não editar essa tabela ad hoc neste gate.

## Achados de revisão

### 1. Regressão de atribuição na troca para v2 — ajuste antes da liberação

A RPC remota antiga insere em campanha_acessos o evento identificacao/retorno, com cliente, tenant, link, campanha, origem, sessão e metadata. Também guarda origem_identificacao e campanha_primeiro_acesso/campanha_ultimo_acesso nos metadados de cliente/vínculo.

A v2 não recebe esses parâmetros e não realiza essas escritas. No repositório, identifyByPair chama identifyWithBirth, lê contexto/histórico e retorna a identidade, sem recordAccess. Há recordAccess em resolveToken e na visita sem cliente, mas isso não equivale a registrar a identificação que acabou de acontecer. Assim, não se trata de afirmar que todo tracking desapareceu: a lacuna é especificamente a identificação/recuperação por par e sua atribuição.

Referências: backend/src/modules/public-booking/client-identity.service.js, função identifyByPair; definição remota e supabase/migrations/20260613100000_serialize_public_client_identification.sql. Esta revisão não escolhe se a restauração deve ficar no Node ou na RPC; preservar o comportamento necessário sem voltar à revogação antiga será trabalho autorizado separado.

### 2. ACL de RPC não equivale a exclusividade total de emissão

Depois da migration 1, o bypass anônimo conhecido é fechado. A antiga ainda pode emitir/revogar via service_role; esse papel também escreve diretamente na tabela. authenticated com has_tenant_access pode fazer INSERT/UPDATE via RLS, sem nascimento e sem chamada Node. O backend administrativo tem emissão própria.

Não classificar automaticamente esses poderes administrativos como falha da identificação pública, nem prometer que deixam de existir. Se a exigência for impedir toda emissão fora da v2, as duas migrations são insuficientes e seria preciso revisar consumidores/policies em outra tarefa. Nenhuma mudança dessa natureza foi feita aqui.

### 3. Aplicação e concorrência

Aplicar CREATE FUNCTION e REVOKEs da migration 2 na mesma transação evita janela com grants padrão. A execução futura deve garantir isso pelo mecanismo escolhido; não copiar e executar só o CREATE no editor SQL. A orientação é consistente com a documentação oficial de [CREATE FUNCTION](https://www.postgresql.org/docs/current/sql-createfunction.html), que também distingue SECURITY DEFINER e preservação de ACL por CREATE OR REPLACE.

O advisory lock coordena chamadas que usam a mesma chave; não é UNIQUE de telefone e não impede escritor administrativo externo de inserir uma duplicata simultaneamente. Os locks e a contagem defensiva reduzem o risco no fluxo público, mas teste anterior de conexão única não comprova toda concorrência remota. Nenhum teste com mutação foi feito neste gate.

RLS filtra privilégios concedidos por tabela; owner/BYPASSRLS têm tratamento distinto. A interpretação de grants + policies acima segue a documentação de [Row Security Policies](https://www.postgresql.org/docs/current/ddl-rowsecurity.html).

## Ordem recomendada, após ajustes e autorização

1. 20260917100000_restrict_public_booking_identity_rpc.sql — fechar EXECUTE público da antiga e validar ACL por SELECT.
2. 20260917101000_public_booking_identity_birth.sql — instalar v2 com grants/revokes atômicos e validar metadados/ACL.

Depois, em etapa própria autorizada, publicar Node dependente da v2 e validar integração. Não usar db push indiscriminado: o repositório contém outras migrations pendentes fora deste gate. A aplicação exclusiva dessas duas deve ser planejada com o histórico remoto, sem incluir arquivos anteriores por acidente.

Rollback operacional: primeiro suspender/reverter consumidor novo, depois remover v2 se necessário, mantendo a restrição da antiga. Restaurar grants de anon/authenticated só se houver decisão expressa de aceitar novamente a exposição; o SQL correspondente foi documentado porque solicitado, não recomendado.

## Resumo final solicitado

**MIGRATION 1**  
Nome: 20260917100000_restrict_public_booking_identity_rpc.sql  
Necessária: **SIM**  
Tipo: ACL de função existente.  
Risco: baixo no Node com service_role; bloqueio intencional de clientes que invoquem RPC diretamente.  
Recomendação: manter; pronta tecnicamente para restringir a ACL, sem aplicar nesta etapa.

**MIGRATION 2**  
Nome: 20260917101000_public_booking_identity_birth.sql  
Necessária: **SIM**  
Tipo: nova função transacional + ACL; DML somente quando invocada.  
Risco: moderado na integração, especialmente perda da atribuição de identificação/campanha e dependência de implantação.  
Recomendação: ajustar/validar a preservação da atribuição antes de liberar o conjunto; não alterar nesta revisão.

**ESTADO REMOTO ATUAL:** RPC antiga pública para anon/authenticated, v2 ausente, duas migrations não aplicadas.

**ESTADO REMOTO DESEJADO:** ambas RPCs sem EXECUTE para anon/authenticated, v2 disponível ao backend, recuperação aditiva com política por tenant/telefone/nascimento; atribuição existente preservada ou retirada expressamente aprovada; poderes administrativos documentados.

**VEREDITO DO GATE: AJUSTE NECESSÁRIO ANTES DA APLICAÇÃO REMOTA.**

Somente este relatório foi criado nesta etapa. Nenhuma alteração de código/migration; nenhuma execução de RPC de emissão; nenhuma aplicação remota, deploy, commit ou push. Aguardando autorização para tratar os achados; esta revisão não autoriza aplicação.
