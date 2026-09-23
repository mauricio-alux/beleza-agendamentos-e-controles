# Fase 0.6B — R1.6 — Acesso PWA tenant-first simplificado

Data: 17/09/2026. Fonte de escopo: versão atual de `Aplicar via CODEX.txt`. Trabalho exclusivamente de auditoria e especificação. Nenhuma implementação autorizada nesta etapa.

## 1. Resumo executivo

**SIM COM AJUSTES.** É possível reutilizar `/acesso`, `/agendar/[slug]`, armazenamento por tenant e emissão de token adicional. Não é necessário bootstrap, pairing, OTP ou conta global para implementar a experiência proposta.

Entretanto, **telefone + nascimento não identifica deterministicamente todos os registros atuais**. A massa fictícia tem 120 clientes, 112 com nascimento, 8 sem e 2 grupos ambíguos dentro do mesmo tenant. Há cadastros distintos com a mesma combinação em tenants diferentes. Correspondência desses dados é um critério de localização, não prova de que os cadastros pertencem à mesma pessoa.

Bloqueadores antes da implementação aprovada:

1. A emissão pública atual aceita telefone sem nascimento, inclusive via `lookup_only`. Acrescentar nascimento apenas no formulário novo não fecha esses caminhos.
2. A RPC remota `identify_public_booking_client`, SECURITY DEFINER, tem EXECUTE para `anon` e `authenticated`, recebe o hash escolhido pelo chamador e emite/revoga tokens sem conferir nascimento. A ACL remota diverge da restrição prevista na migration inicial. Não foi executada nem explorada.
3. Próximos horários expandem o cliente autenticado para outros IDs com o mesmo telefone dentro do tenant, sem comparar nascimento. Isso conflita com a exigência de não associar clientes indevidamente.
4. É preciso aprovar o risco de emitir a credencial atual: ela permite consultar dados, editar cadastro e obter tokens operacionais para confirmar, cancelar e reagendar horários. Esse risco não foi considerado aceito apenas por solicitar a auditoria.

Esses pontos não inviabilizam a simplificação; impedem tratá-la como uma simples alteração de tela. Ajustes devem ser pequenos e coerentes em todos os caminhos públicos envolvidos. Este relatório não autoriza executá-los.

## 2. Modelo clientes × tenants

Evidências: `supabase/migrations/20260514170000_create_global_schema.sql:256`, migrations `20260611100000_public_booking_client_identity.sql`, `20260611110000_protect_blocked_public_booking_clients.sql`, `20260613100000_serialize_public_client_identification.sql`; metadados remotos consultados em 17/09; repositories de clients, agenda e client-identity.

| Objeto | Estrutura/garantia real |
|---|---|
| `clientes` | PK `id`; nome/telefone obrigatórios; email/nascimento opcionais; `ativo` e `deleted_at`; sem `tenant_id` |
| `cliente_tenants` | FK cliente + FK tenant; PK própria; UNIQUE `(tenant_id,cliente_id)`; status `ativo/inativo/bloqueado`; `ativo`, `deleted_at`; nome e informações de relacionamento |
| Telefone | `idx_clientes_telefone` é índice B-tree comum, não UNIQUE; não há unicidade global nem por tenant nem parcial para ativos |
| Relacionamento | Cardinalidade estrutural N:N. A unicidade do par não inclui soft delete; um vínculo excluído logicamente continua ocupando o par |
| Token | Hash único entre registros não excluídos; índice comum tenant/cliente/expiração para ativos; não há unicidade de token ativo por cliente/tenant |

**Q1: ambos os modelos são possíveis.** Modelo A (mesmo `clientes.id` ligado a dois tenants) é permitido pelo schema. Modelo B (IDs diferentes para o mesmo telefone em tenants diferentes) é produzido pelos fluxos que procuram telefone apenas dentro do tenant e criam novo cliente quando não o encontram. A RPC faz lock por tenant/telefone; não procura/reutiliza pessoa globalmente.

`clients.repository.findClientByPhone` e `agenda.repository.findClientByPhone` usam `maybeSingle()` sem limite: duplicidade pode gerar erro em vez de resolução. `client-identity.repository.findClientByPhone` usa `limit(1)` sem critério de desempate. A RPC ordena por criação do vínculo e usa `limit 1`. Nenhum deles resolve ambiguidade por nascimento.

### Contagens remotas, sem PII

| Métrica | Resultado |
|---|---:|
| Clientes totais / não excluídos / ativos | 120 / 120 / 120 |
| Relacionamentos não excluídos | 120 |
| Clientes com mais de um tenant por mesmo ID | 0 |
| Grupos de telefone com mais de um ID | 33 |
| Grupos de telefone com IDs distintos em mais de um tenant | 33 |
| Grupos telefone+nascimento não nulo com IDs distintos | 32 |
| Grupos tenant+telefone com mais de um cliente | 2 |
| Grupos elegíveis tenant+telefone+nascimento com mais de um cliente | 2 |
| Combinações elegíveis telefone+nascimento relacionadas a mais de um tenant | 32 |
| Mesmo tenant/telefone com datas não nulas diferentes | 0 |

São contagens de grupos, não de pessoas. Não foi inferido que os registros correspondem ao mesmo indivíduo. O modelo A é permitido, mas não aparece nesta massa; o modelo B aparece. Não criar merge global por esses dois dados.

Para as contagens de elegibilidade foi usada a política proposta: cliente ativo e não excluído; vínculo ativo, status ativo e não excluído; tenant ativo, não excluído, status `ativo` ou `trial`; existência de link público ativo/não excluído/não expirado. Há 120 vínculos elegíveis nessa política e 112 com nascimento. Essa política é proposta, mais explícita que algumas verificações atuais.

## 3. Telefone

Armazenamento: `clientes.telefone varchar(20) NOT NULL`, sem constraint de formato ou unicidade. Comparações atuais usam igualdade da string persistida. RPC faz `trim`, não normalização internacional; depende do chamador.

Backend: `backend/src/utils/normalize.js`, `normalizePhoneToE164(value,country='BR')`:

- Remove todo caractere não numérico, incluindo `+`, espaços, hífen e parênteses.
- Se os dígitos começam pelo código do país selecionado, remove esse prefixo; depois valida comprimento nacional.
- BR: 10 ou 11 dígitos, DDD numericamente entre 11 e 99; devolve `+55` + nacional. Não valida lista real de DDDs nem comprova celular/WhatsApp ou propriedade do número; também aceita tamanho de fixo.
- Não há remoção deliberada de zero de operadora/tronco ou tratamento de `00` internacional. Zeros/prefixos extras normalmente falham; não devem ser silenciosamente corrigidos na nova busca.
- Países configurados: BR, US e PT. Os services auditados chamam sem país e, portanto, usam BR. A UI oferece países; isso não significa que o backend já trata corretamente todos eles.

Frontend: `frontend/src/utils/phone.ts`. Remove não dígitos, retira prefixo se presente e **trunca** nacional ao tamanho máximo. Validação posterior pode não perceber dígitos excedentes truncados. Há também ambiguidade entre prefixo 55 e DDD 55 em entrada nacional: o código retira 55 sem verificar se era código de país. Não corrigido nesta etapa.

Resultados da massa: 8 strings não seguem a forma `+55` + DDD não iniciado por zero + comprimento BR esperado. Esse teste é sintático, não prova telefone inválido ou não normalizável. Nenhum grupo de strings distintas com exatamente os mesmos dígitos foi encontrado; isso não descarta equivalência entre formato nacional e internacional com dígitos diferentes.

Recomendação necessária: definir explicitamente suporte BR inicial ou propagar país de ponta a ponta; usar uma regra única e testada no backend antes de buscar. Não usar correspondência por últimos dígitos, `LIKE`, remoção arbitrária de zeros ou primeira ocorrência. A nova implementação deverá tratar DDD 55, excesso de dígitos e internacionais sem mudança silenciosa de identidade.

## 4. Data de nascimento

`clientes.data_nascimento` existe como SQL `date`, nullable, sem obrigatoriedade nos cadastros auditados. Remoto: **112 preenchidos (93,33%), 8 NULL (6,67%), 0 futuros**. Não foram exibidas datas individuais. A presença do valor não comprova verificação nem qualidade histórica; a massa foi declarada fictícia pelo usuário.

`PublicBookingPage`, `ClientsManager`, `agenda.validators.clienteSchema`, `clients.validators.clientSchema` e os schemas públicos de identidade/perfil não coletam/validam/persistem nascimento para esse fluxo. A RPC de identificação tampouco tem parâmetro de nascimento. O perfil público não retorna essa coluna.

Há uso atual no backend para segmentação de campanhas por mês (`campaigns.service.js`) e aniversário diário (`automations/birthday-greeting.service.js`). Essas comparações de mês/dia **não podem ser reutilizadas como reidentificação**, que exige igualdade integral ano-mês-dia.

Necessário para implementação futura: campo de data civil `YYYY-MM-DD`, validar existência da data, anos bissextos e não futura; comparar por igualdade SQL `date`, sem conversão de fuso. NULL nunca corresponde. Não permitir preencher/alterar nascimento de um cadastro existente sem identidade apenas para satisfazer a tentativa. A coleta inicial e manutenção autorizada precisam ser definidas para novos cadastros; não existe necessidade de criar coluna nova.

## 5. Fluxo `/agendar/[slug]`

Arquivos principais: `frontend/src/app/agendar/[slug]/page.tsx`, `frontend/src/components/public-booking/PublicBookingPage.tsx`, `frontend/src/services/public-booking.service.ts`; `backend/src/routes/public.routes.js`, `public-booking.controller.js`, `public-booking.validators.js`, `public-booking.service.js`, `client-identity.service.js`, `client-identity.repository.js`; `agenda.service.js` e `agenda.repository.js` para criação/operações.

**Com token:** `linkToken` tem precedência sobre `localStorage['esthya:booking-identity:'+slug]`. O frontend envia `token` no corpo do POST identity. Backend resolve slug pelo link público, verifica expiração, resolve tenant; busca hash SHA-256 de token ativo, tipo agendamento_publico, não excluído; exige tenant correspondente e expiração futura. Busca vínculo ativo/não excluído e rejeita status bloqueado. Retorna o mesmo token, cliente sanitizado e histórico; a UI preenche dados e oculta o bloco “Seus dados” quando reconhecida. Não há rotação nesse caminho.

**Sem token:** primeira chamada sem cliente apenas registra acesso e devolve `recognized:false`. A tela mostra Nome obrigatório, Email opcional, Celular/WhatsApp e observações. Após nome com dois caracteres e telefone considerado válido, um debounce de 800 ms chama `lookup_only:true`. O backend usa **somente telefone** para localizar e pode emitir token adicional, retornar nome/email/histórico e carregar horários; nome enviado não é comparado como segredo.

Na submissão, se já identificado, envia token e não pede novamente `cliente`; caso contrário, envia nome/telefone/email para `identify`, que chama a RPC. A RPC procura dentro do tenant, cria cliente/vínculo se ausente ou atualiza nome/email/reativa vínculo não bloqueado se existente, revoga tokens anteriores e emite novo token. Em seguida o frontend cria o agendamento com `client_context.client_token`.

`POST appointments` também admite cliente sem token. `agenda.service.resolveClient` procura por telefone no tenant e reutiliza cliente existente; caso contrário cria. Esse caminho alternativo também precisa respeitar a separação entre novo agendamento e acesso ao cadastro existente na implementação futura.

Persistência: token em localStorage; sessão de atribuição `esthya:booking-session:{slug}` em sessionStorage. Não é token de autenticação. Após reconhecimento, registra tenant conhecido e preferência quando ainda vazia. Na submissão, “lembrar” controla armazenamento; a carga por link e o lookup automático atuais também gravam token. Não tratar o checkbox como garantia de que nunca houve armazenamento anterior.

**Lacunas de elegibilidade existentes:** `resolveLink` rejeita `inativo/cancelado`, mas enum remoto tem `trial/ativo/suspenso/cancelado/inadimplente`; `findTenant` não seleciona/confere `ativo`. `findClientContext` filtra vínculo `ativo/deleted_at`, mas não filtra explicitamente `clientes.ativo/deleted_at`; `resolveToken` rejeita bloqueado, não exige textualmente status ativo. `findClientByPhone` não exige `ativo` em cliente/vínculo. Documentar essas diferenças impede presumir que o filtro proposto já exista.

## 6. Poder da credencial atual

Prefixo abaixo: `/api/public`; backend também monta alias `/public`. TC = token de cliente (`tokens_cliente`); TO = token operacional (`agendamentos.token_confirmacao`). Não são intercambiáveis. CORS atual é aberto e não substitui autorização; não foi alterado.

| Ação | Endpoint e método | Token? / validação | Tenant-scoped? | Leitura/escrita | Risco concreto |
|---|---|---|---|---|---|
| Reconhecer cliente | POST `/booking/:slug/identity` | TC: hash/tipo/ativo/expiração/tenant/vínculo; sem TC há emissão por telefone/dados | Sim pelo link e TC | L + uso/acesso; com cliente pode alterar nome/email | Exposição de identidade e emissão indevida se lookup não exigir nascimento |
| Consultar perfil | GET `/booking/:slug/client/me?token=...` | TC obrigatório | Sim; campos de `clientes` são compartilháveis entre vínculos | L + touch de uso/último acesso | Perfil pessoal, endereço e preferências |
| Consultar nome | Identity e GET client/me | TC, ou lookup atual sem TC | Sim na autorização | L + efeitos acima | Nome revelado |
| Consultar email | Mesmos | Idem | Idem | Idem | Email revelado |
| Consultar telefone | Mesmos | Idem | Idem | Idem | Telefone revelado |
| Consultar nascimento | Nenhum endpoint público auditado o serializa | Não disponível por TC hoje | — | — | Não afirmar que token já permite ler nascimento |
| Próximos agendamentos | GET `/booking/:slug/client/appointments/upcoming?token=...` | TC válido; expande IDs por mesmo telefone | Sim no tenant; pode abranger outros clientes | L + touch; pode criar TO ausente e atualizar agendamento | Horários, serviço/preço, profissional, dados cliente, links de ação de registros relacionados |
| Histórico | POST identity | TC ou lookup emissor atual | Tenant + cliente exato | L + registros de acesso | Retorna até 5 registros de resumo a partir de até 10 mais recentes, serviços e profissional favorito; não é histórico completo paginado |
| Criar agendamento | POST `/booking/:slug/appointments` | TC em `client_context`, OU dados cliente sem TC; seleção/slot validados | Sim | E: cliente/identidade auxiliar, agenda, atribuição/eventos | Reserva em nome de outro; retorno inclui TO |
| Consultar detalhe operacional | GET `/booking/appointments/token/:token` ou GET `/booking/appointments/action?tk=...` | TO; busca não excluído; TC não é aceito diretamente | Tenant derivado do agendamento | L | Detalhes pessoais e links; sem validação da política do slug nesse caminho |
| Confirmar | POST `/booking/appointments/action`, `cmd=confirmar` | TO; horário futuro/status permitido | Tenant do agendamento | E + efeitos de domínio | Confirmação indevida; TC pode obter TO via upcoming |
| Cancelar | Mesmo, `cmd=cancelar` | TO; futuro, não terminal e regras de domínio | Tenant do agendamento | E + efeitos de domínio | Cancelamento indevido |
| Reagendar | POST `/booking/appointments/reschedule` | TO; futuro/não terminal e validações de reagendamento/slot | Tenant do agendamento | E + efeitos de domínio | Alteração indevida de horário |
| Alterar cadastro | PATCH `/booking/:slug/client/me` | TC no corpo; campos permitidos, telefone normalizado e colisão no tenant | Autorização tenant; escrita também na linha compartilhada de `clientes` | E: nome/email/telefone/endereço; nome local e consentimento no vínculo | Mudança de contato; se modelo A existir, dados base afetam outros tenants |
| Ver serviços | GET `/booking/:slug` | Não; link público válido | Sim | L | Catálogo público, não poder pessoal do TC |
| Ver profissionais | Mesmo catálogo | Não | Sim | L | Dados públicos do catálogo |
| Ver disponibilidade | GET `/booking/:slug/availability` | Não; schema/seleção válidos | Sim | L | Slots públicos, não histórico pessoal |
| Gestão interna de clientes | `/api/clients` e `/:id`, booking-token | TC público não basta; auth + tenant + plano + permissão | Sim | Conforme endpoint | Não concede dashboard nem gestão global |

`sanitizeClientProfile` retorna nome, telefone, email, endereço, aceita_campanhas e status. PATCH não admite nascimento, observações internas ou IDs arbitrários. `sanitizeClient` também retorna datas de acesso, preferências e resumo de histórico. Operações de GET de perfil/upcoming **não são totalmente read-only**, por isso não foram chamadas no remoto nesta auditoria.

A expansão por telefone (`listRelatedClientIdsForAppointment`) retorna todos os IDs não excluídos com vínculo não excluído e não bloqueado; não compara nascimento nem exige explicitamente todos os flags ativos. Mesmo que emissão nova rejeite ambiguidade, manter essa expansão pode ampliar o alcance para outro cadastro. Recomendação necessária: usar o cliente exato identificado para operações pessoais, salvo vínculo de equivalência explícito que não existe hoje.

## 7. Emissão e revogação

| Caminho | Emissão | Revoga anteriores? | Consequência |
|---|---|---|---|
| `identify` com token → `resolveToken` | Não; devolve mesmo TC | Não | Preserva Safari; registra uso e pode atualizar dados se cliente informado |
| `identify` sem token e sem cliente | Não | Não | Apenas acesso anônimo |
| `identify` com cliente, sem token → repository/RPC `identifyClient` | TC novo, hash SHA-256, aleatório de 32 bytes | **Sim**, todos os agendamento_publico ativos daquele tenant/cliente | Pode invalidar Safari/outro contexto; também altera cadastro/vínculo |
| `lookupExistingClient` sem token | `createToken` aditivo | Não | Primitiva reaproveitável após substituir lookup por validação completa e não ambígua |
| `lookupExistingClient` com token | `resolveToken` | Não | Mesmo token |
| `createToken` repository | Insert tenant/cliente/hash/tipo/expiração | Não | Não autoriza sozinho; chamador deve validar elegibilidade |
| `clients.service.issueBookingToken` → `issueClientLink` | TC + URL `?tk=` | **Sim**, chama `revokeActiveTokens` antes de inserir | Não usar para recuperação que preserve contextos |
| `revokeActiveTokens` | Não | Marca ativo=false e deleted_at por tenant/cliente/tipo | Revogação coletiva daquele escopo |
| Agenda `refreshClientIdentity` | Token auxiliar legado `client_token`, distinto de TC | Não revoga `tokens_cliente` | Código tenta persistir colunas de segurança ausentes no schema remoto e possui fallback; não usar como TC |
| `generateUniqueOperationalToken` / `ensureOperationalContext` | TO por agendamento, inclusive em upcoming quando ausente | Não revoga TC | TO autoriza operações naquele agendamento |

TTL configurável de TC: `CLIENT_TOKEN_TTL_DAYS`, padrão 180 dias; a auditoria leu o padrão do código, não presumiu valor efetivo de staging. `tokens_cliente` aceita múltiplos tokens ativos do mesmo par. A emissão por RPC é transacional, com lock por tenant/telefone; o caminho de link revoga e insere em chamadas distintas.

**Podemos restabelecer identidade sem invalidar Safari/outro contexto? SIM**, pela inserção adicional de TC após telefone+nascimento+tenant e filtros completos, sem chamar RPC de identificação nem `issueClientLink`. Esse serviço de reidentificação ainda não existe. `lookupExistingClient` fornece emissão aditiva, mas não pode ser reutilizado sem corrigir a busca, elegibilidade e ambiguidade. A alteração no novo caminho não impede futuras revogações feitas pelos outros emissores; eles precisam ser considerados na política final.

Remoto: `identify_public_booking_client` é SECURITY DEFINER com ACL `{postgres,anon,authenticated,service_role}` EXECUTE. A migration `20260611100000...` prevê revogar acesso público e conceder ao service_role; metadados reais prevalecem sobre intenção do arquivo. A RPC recebendo hash arbitrário, sem nascimento, é um caminho de emissão que contorna validação só no Node. Antes de confiar na nova política, deverá ser restringida por alteração remota explicitamente autorizada. Não executada nesta R1.6.

RLS observado: tabelas têm políticas para authenticated e relacionamento/`has_tenant_access`; tokens têm INSERT/UPDATE por tenant. Isso não transforma TC público em sessão Supabase nem protege automaticamente uma função SECURITY DEFINER. A auditoria não tentou obter credencial por essa via.

## 8. Cenário tenant conhecido

Comportamento atual de `/acesso`: lê preferred; se ausente e há um known tenant, escolhe-o; se há vários, oferece escolha; sem referência, estado empty. Carrega catálogo, lembra tenant, lê TC e valida via POST identity. Após validação, carrega próximos horários.

Token ausente → recover com “Continuar” para `/agendar/[slug]`. Erro de identidade remove só `booking-identity:{slug}`, mantém known tenant com `hasLocalIdentity=false`; preferência permanece. Classificação de erro atual usa regex de mensagem `token|identidade|cliente`; falha de rede não deve ser tratada como confirmação de token inválido na especificação futura.

`upsertKnownTenant` atualiza nome exibido, último acesso e indicador local; preferência é preenchida quando vazia em booking/acesso e substituída em escolha explícita. Lista deduplicada por slug, limite 12. “Sair deste dispositivo” remove token e referência do tenant atual, promove próximo preferido se necessário; **não revoga token remoto, não limpa outro contexto e não remove sessionStorage de atribuição**. O rótulo não implica logout global.

Fluxo proposto B:

1. Tenant conhecido e utilizável → abrir o mesmo `/agendar/[slug]`; sem busca global automática.
2. Oferecer “Já tenho cadastro” com telefone+nascimento, sem exigir nome/email como prova.
3. Servidor resolve link→tenant e aplica igualdade normalizada de telefone e data completa somente nesse tenant, com filtros de elegibilidade.
4. Zero, NULL, bloqueado/inativo ou múltiplos clientes → resposta genérica, sem token e sem mudar cadastro.
5. Exatamente um cliente elegível → emitir TC adicional, preencher dados existentes, guardar identidade por slug, lembrar tenant, seguir fluxo normal sem recriar cliente nem pedir campos já existentes.
6. Identidade local válida continua no caminho atual, especialmente o Android já validado. Não forçar reidentificação por sistema operacional.

Se há vários tenants locais sem preferência, escolher entre eles primeiro. Se o tenant conhecido está indisponível, explicar indisponibilidade e permitir outra referência local; não converter automaticamente em busca global por falha de catálogo.

## 9. Cenário PWA completamente vazia

“Localizar meu acesso” deve aparecer somente quando não há referência local utilizável. Antes de classificar como vazio, tratar chaves `booking-identity:*` órfãs de preferred/known como referências candidatas de slug, sem considerá-las válidas até o backend verificar. O `/acesso` atual não reconstrói essa lista a partir das chaves órfãs. Storage ilegível ou erro de rede não é prova de vazio.

Especificação mínima, não implementada:

- Receber telefone+nascimento por POST, sem PII ou bearer em URL. Backend administrativo consulta relações; não publicar SELECT global direto no Supabase anônimo.
- Aplicar os mesmos filtros de elegibilidade e igualdade. Agrupar por **tenant** e, dentro dele, por **cliente_id**. Vários links públicos do mesmo tenant não contam como vários tenants.
- C0: mensagem uniforme “Não foi possível localizar um cadastro com os dados informados. Verifique os dados e tente novamente.” Sem indicar qual campo existe, sem token. Orientar abrir link/QR do estabelecimento ou pedir o link para novo agendamento; sem tenant não existe `/agendar/[slug]` determinístico. Não criar marketplace/diretório global.
- C1: um tenant com exatamente um cliente compatível → se política de risco aprovada, emitir TC desse par e retornar slug público válido; frontend armazena e navega internamente para `/agendar/[slug]`.
- CN: múltiplos tenants com um cliente compatível por tenant → retornar apenas nome público e slug/candidato de cada tenant. Não retornar nomes de clientes, nascimento, email, telefone, horários ou tokens para todos os tenants. Escolha emite TC somente para o tenant selecionado.
- Para CN, menor implementação sem sessão global: manter os dois campos apenas em memória da tela; ao escolher, reenviá-los por POST ao endpoint tenant-scoped, que refaz a validação completa. O slug/ID devolvido pela listagem não é autorização. Não precisa ticket, cookie X ou identidade global.
- AMBÍGUO: dois clientes candidatos dentro de algum tenant → não escolher primeiro nem emitir. Proposta conservadora para MVP: abortar toda a localização dessa tentativa com mensagem uniforme; não listar subconjunto cuja seleção disfarce inconsistência. Correção assistida da massa/cadastro fica fora do fluxo público.

IDs diferentes em tenants diferentes são compatíveis com o modelo B, mas telefone+data iguais **não provam a mesma pessoa**. Mostrar seus tenants após correspondência é precisamente o risco residual da proposta e requer decisão explícita. Não inventar comparação de nome como prova adicional. Se os vínculos estiverem ambíguos dentro de um tenant, a regra acima bloqueia.

Não é possível garantir no servidor que o navegador realmente está vazio: um chamador pode omitir/limpar storage. A restrição “somente no vazio” é de experiência; o endpoint de localização deve suportar abuso independentemente desse estado declarado.

## 10. Ambiguidades e exceções

| Caso | Tratamento proposto |
|---|---|
| Telefone repetido, datas diferentes, mesmo tenant | Exigir data exata; nunca unir horários por telefone |
| Telefone+data repetidos, dois clientes no mesmo tenant | Bloquear emissão, sem primeiro resultado; 2 grupos reais na massa fictícia |
| Mesma combinação em tenants distintos | CN, seleção explícita; preservar IDs distintos; risco de homônimos/dados coincidentes registrado |
| Nascimento NULL | Não corresponde; 8 registros necessitam massa preparada para teste futuro |
| Cliente ou vínculo inativo/bloqueado/excluído | Inelegível; não reativar em reidentificação |
| Tenant suspenso/cancelado/inadimplente/inativo por flag/excluído | Política proposta exclui; permitir apenas ativo/trial com flag ativo e link público utilizável |
| Link expirado ou vários links | Não usar link expirado; manter slug conhecido válido; descoberta escolhe link canônico determinístico, por criação/id, por tenant |
| Telefone malformado/internacional/DDD 55 | Validar regra acordada antes da busca; nunca aproximar |
| Telefone reciclado/compartilhado + nascimento conhecido | Pode haver correspondência indevida mesmo sem duplicidade no banco; risco não resolvido por índice |
| Data fictícia incorreta | Falha genérica, sem ensinar ao solicitante o valor correto |
| Identidade de cliente soft-deleted ainda ligada | Falhar explicitamente pelo cliente, não só pelo vínculo |
| Escolha CN adulterada ou estado alterado entre chamadas | Revalidar par completo e tenant na emissão, sem confiar na seleção do frontend |
| Falha de rede, storage bloqueado, token expirado | Estados distintos; não apagar todas as referências nem disparar emissão repetidamente |

## 11. Controles mínimos

### Obrigatório para MVP

- Igualdade de telefone normalizado e nascimento completo; exatamente um cliente por tenant; validação de flags/status/soft delete/link em busca e emissão.
- Uniformidade para falha de correspondência, sem distinguir telefone inexistente/data errada/inatividade/ambiguidade e sem retornar dados pessoais. Formato obviamente inválido pode ser validado antes da busca, sem consultar existência.
- Rate limit de baixo custo no servidor: proposta inicial 5 tentativas por par normalizado em 15 minutos + limite por IP e limite agregado do endpoint; calibrar com uso. Identificador do par nos contadores deve ser HMAC, sem dados crus em logs. IP é sinal auxiliar, nunca autenticação; NAT e troca de IP impedem usar só ele. Uma instância pode começar com memória limitada/TTL, registrando limitação de reinício; múltiplas instâncias exigem limite compartilhado antes de escalar.
- Não emitir token no debounce por telefone. Todos os caminhos públicos de reuso de cadastro existente devem cumprir a mesma política, incluindo identify, lookup, appointments sem TC e acesso à RPC. Não deixar bypass “novo cliente” dar acesso ao existente.
- Emissão aditiva com aleatoriedade/hash/TTL atuais; sem revogar coletivamente, sem ampliar o conjunto de clientes por telefone. Sem novo tipo especial de credential.
- POST com corpo para dados da nova busca, HTTPS, respostas pessoais `no-store`, não registrar token/telefone/nascimento/nome. Logs de sucesso/falha por código de resultado e correlação; timestamp de último acesso/reidentificação com identificador mínimo após sucesso. Reaproveitar campos/data de acesso; `usado_em` de token e metadata podem guardar a origem sem migration de coluna.
- Validar novamente vínculo e elegibilidade imediatamente antes de emitir. Bloqueio/revogação posterior precisa continuar sendo respeitado ao usar o TC; não manter acesso só porque a emissão foi válida.
- Resolver escopo de edição da linha `clientes` quando compartilhada: menor política conservadora é impedir alteração de campos base compartilhados via contexto público quando há outros vínculos, mantendo manutenção assistida; consentimento continua por tenant. Alternativa de aceitar propagação entre tenants exige decisão explícita, não presumir isolamento completo da escrita.

### Backlog

Limites distribuídos quando a topologia exigir, métricas de abuso e ajuste fino; redução do transporte legado de tokens em query/links, revisão de TTL/rotação e sessões; credencial de escopo reduzido caso não se aceite o poder atual; recuperação mais forte se motivada por risco observado. Nenhum device fingerprint. IP não identifica celular nem pessoa.

Palavra-chave permanece adiada: se futuramente escolhida, requer cadastro, hash, normalização, alteração, recuperação, limites e esquecimento; nunca texto puro nem perguntas sobre parentes. Não é requisito desta solução.

## 12. Alterações necessárias para implementação

Tudo abaixo é especificação, **não executado**.

| Área | Alteração | Classificação |
|---|---|---|
| Frontend `/acesso` | Estados vazio/known/orphan/unreadable, “Localizar meu acesso”, formulário telefone+data, lista de tenants e navegação interna | Necessária |
| Frontend `/agendar` | Reidentificação explícita por dois campos, retirar lookup automático sem nascimento, reutilizar campos preenchidos/fluxo reconhecido | Necessária |
| Frontend storage | Persistir só TC tenant-scoped e referência escolhida; preferido CN explícito; não persistir nascimento nem lista global de pessoa | Necessária |
| Frontend cadastro inicial/manutenção autorizada | Coletar data civil para que futuros clientes usem a função; não sobrescrever existente anonimamente | Necessária para operação contínua; massa sintética pode suprir ensaio inicial |
| Backend validators/services/repositories | Busca por par, filtros, ambiguidade, separação descoberta/emissão, emissão adicional e revalidação no consumo normal | Necessária |
| Backend emissão existente | Fechar bypass de telefone em lookup/identify/criação de agendamento para cliente existente; não usar RPC revogadora como recuperação | Necessária |
| Backend upcoming | Restringir ao ID autorizado; remover associação automática de históricos/horários por telefone | Necessária |
| Backend limites/logs | Rate limit e respostas uniformes, sanitização, data de acesso | Necessária |
| Backend normalização | Corrigir ambiguidades documentadas e alinhar país/formatos entre frontend/backend | Necessária |
| DB schema | Criar coluna nascimento/tabela global/pairing/bootstrap | **Desnecessária** |
| DB permissões | Restringir EXECUTE da RPC emissora ao papel servidor autorizado e verificar caminhos equivalentes | Necessária antes de garantir política; requer autorização futura de mudança remota |
| DB índices | Índice composto para telefone/data conforme volume/EXPLAIN | Opcional; índice de telefone já existe |
| DB unicidade global de telefone | Não introduzir: quebra modelo B e não prova identidade | Desnecessária/inadequada |
| DB transação específica de reidentificação | Avaliar somente se necessário para invariantes concorrentes de emissão; não reutilizar RPC que revoga | Opcional como mecanismo; correção de concorrência é necessária |
| Testes | Casos B/C0/C1/CN/ambíguo, bypass, preservação de tokens, escopo de dados, normalização, data, estados e limites | Necessária |
| Massa DEV | Preparar casos com nascimento, sem nascimento, duas pessoas ambíguas e multi-tenant; revisar 8 formatos e 2 grupos ambíguos | Necessária para validação representativa; não alterar agora |

Não migrar histórico, não marcar fictícios como verificados e não fazer backfill de confiança. Para teste feliz podem ser usados registros fictícios não ambíguos existentes; manter fixtures de ambiguidades para provar rejeição, em vez de apagá-las para fazer teste passar.

## 13. O que deixa o caminho crítico

Bootstrap automático Safari→standalone, autorização X, cookie X, pairing, Credential B especial, OTP, SMS e recuperação forte ficam em **BACKLOG / EVOLUÇÃO FUTURA**. Não são dependências da reidentificação proposta. A documentação R1/R1.5 foi preservada, especialmente `20260916-r1-5-bootstrap-pairing.md`.

Reavaliar somente por abuso/risco real, expansão de operações/dados, necessidade de recuperação mais forte ou outro requisito concretamente aplicável. Não impor SMS na primeira instalação nem `iOS = OTP`.

## 14. Riscos aceitos — proposta pendente de decisão

**Nenhum aceite de risco de implementação foi presumido nesta auditoria.** O risco a aprovar é utilizar dois dados pessoais frequentemente conhecidos por terceiros como reidentificação, sem comprovar posse do telefone. Isso não equivale a autenticação forte.

Quem souber telefone e nascimento corretos poderá, se a política emitir o TC atual: ver os estabelecimentos associados retornados na descoberta, nome/email/telefone/endereço, resumo de histórico, próximos serviços/profissionais/horários/preços; alterar contato e consentimento; criar reservas e obter TOs para confirmar, cancelar ou reagendar. Se as falhas de expansão por telefone e escrita compartilhada permanecerem, o alcance poderá exceder o cadastro pretendido. A credencial não concede administração do tenant nem conta global, mas tem poder pessoal substancial.

Mesmo após fechar bypass, normalizar e bloquear duplicidades, dados conhecidos, telefone compartilhado/reciclado e coincidências podem produzir acesso indevido. Rate limit reduz adivinhação automatizada; não impede alguém que já conhece os dois dados. Escolher tenant numa lista também não prova identidade. Esse é o risco residual a decidir, sem rotular a solução genericamente como segura ou obrigar mecanismos fora de escopo.

## 15. Recomendação para implementação

Menor desenho coerente:

1. Preservar entrada A com credencial local válida. B reaproveita `/agendar/[slug]`; C acrescenta apenas descoberta e seleção no `/acesso`.
2. Um serviço compartilhado de localização valida telefone/data/eligibilidade e retorna cardinalidade por tenant. Um POST tenant-scoped reidentifica e emite TC adicional; pode estender identity com modo explícito, evitando nome obrigatório nesse modo. Um POST de descoberta sem slug retorna somente candidatos; nenhum endpoint foi criado aqui.
3. CN reenvia os mesmos dados em corpo na seleção e valida outra vez, dispensando conta/sessão global ou bootstrap temporário. Limpar campos de memória ao concluir/sair; token apenas no storage já existente por slug.
4. Corrigir os emissores sem nascimento e a exposição da RPC, restringir upcoming ao ID exato, padronizar elegibilidade e resolver a escrita compartilhada. São parte da mesma política, não reforma geral do SaaS.
5. Preparar massa fictícia e testes. Depois de aprovação separada, implementar e validar localmente; staging/deploy e alterações remotas precisam de autorização correspondente. Nenhum teste físico é substituído pelos unitários desta auditoria.

Respostas finais aos critérios: localizar por igualdade completa; restringir pelo tenant resolvido do link; descobrir vínculos via backend somente na UX vazia; selecionar tenant sem unir IDs; bloquear ambiguidade; emitir adicional por createToken autorizado; preservar TC anteriores; respeitar todo alcance da tabela da seção 6; aplicar controles da seção 11. A experiência desejada é viável com esses ajustes, não apenas reutilizando lookup atual sem alteração.

## 16. Testes e consultas executados

### Testes locais existentes

Na raiz, primeira execução do comando abaixo sem variáveis fictícias: 46 testes aprovados e 2 arquivos falharam ao carregar (`clients.service.test.js` e `client-identity.service.test.js`), por `Missing required environment variable: SUPABASE_URL`. Reexecução isolada confirmou a mesma causa. Falha de preparação do ambiente, não regressão de código ou asserção funcional. Nenhum teste foi alterado.

Execução final com configuração de processo fictícia, repositories mockados nos testes e sem credenciais remotas:

```powershell
$env:SUPABASE_URL='http://127.0.0.1:1'
$env:SUPABASE_ANON_KEY='r16-local-test-anon'
$env:SUPABASE_SERVICE_ROLE_KEY='r16-local-test-service'
node --test backend/src/modules/public-booking/client-identity.service.test.js backend/src/modules/public-booking/booking-catalog-policy.test.js backend/src/modules/clients/clients.service.test.js backend/src/modules/agenda/agenda.engine.test.js backend/src/modules/agenda/domain/appointment-status.test.js frontend/src/lib/recurring-access.storage.test.js frontend/src/components/recurring-access/RecurringAccessPage.diagnostics.test.js frontend/src/components/pwa/recurring-storage-snapshot.test.js
```

**63 testes, 63 aprovados, 0 falhas, 5 suites.** Cobrem identidade, token expirado/outro tenant, clientes, catálogo, agenda/status, storage e diagnóstico de acesso. Nenhum teste novo de telefone+nascimento foi inventado: a função não está implementada. Não é evidência física PWA nem validação de permissões reais do Supabase.

### Supabase somente leitura

CLI já instalada, projeto remoto já vinculado. Comando base:

```powershell
& 'C:\Users\Lenovo\AppData\Roaming\npm\supabase.cmd' db query --linked --output json '<SELECT de auditoria>'
```

Consultas executadas: `information_schema.columns` das quatro tabelas; `pg_indexes`, `pg_constraint`, `pg_get_functiondef` da RPC; `pg_policies`; `pg_proc.proacl/prosecdef`; agregações de clientes/vínculos e elegibilidade. A chamada inicial na sandbox falhou por EPERM ao ler o executável no perfil; a execução escalada autorizada completou as consultas. CLI informou inicialização de login role como parte do mecanismo de acesso; não foi solicitado SQL de mutação. Não foram executadas RPCs de negócio, GETs que atualizam uso, DDL, INSERT, UPDATE, DELETE, seed, migração ou cleanup.

SQL representativo reexecutável para as ambiguidades determinantes:

```sql
WITH eligible AS (
  SELECT c.id, c.telefone, c.data_nascimento, ct.tenant_id
  FROM public.clientes c
  JOIN public.cliente_tenants ct ON ct.cliente_id = c.id
  JOIN public.tenants t ON t.id = ct.tenant_id
  WHERE c.ativo AND c.deleted_at IS NULL
    AND ct.ativo AND ct.status = 'ativo' AND ct.deleted_at IS NULL
    AND t.ativo AND t.deleted_at IS NULL AND t.status IN ('ativo','trial')
    AND EXISTS (
      SELECT 1 FROM public.links_agendamento l
      WHERE l.tenant_id = t.id AND l.ativo AND l.acesso_publico
        AND l.deleted_at IS NULL
        AND (l.expira_em IS NULL OR l.expira_em > now())
    )
)
SELECT count(*) AS ambiguous_groups FROM (
  SELECT tenant_id, telefone, data_nascimento FROM eligible
  WHERE data_nascimento IS NOT NULL
  GROUP BY tenant_id, telefone, data_nascimento
  HAVING count(DISTINCT id) > 1
) groups;
```

Resultado confirmado: 2. Relatório não inclui nomes, telefones, datas ou identificadores pessoais da massa. Filtros adicionais normalizadores não foram aplicados ao banco; as contagens usam igualdade das strings existentes. Nenhuma infraestrutura, serviço pago ou provider foi usado/criado para teste.

## 17. Arquivos alterados

Somente este relatório foi criado nesta R1.6:

`docs/audits/20260917-r1-6-acesso-pwa-simplificado.md`

As modificações de frontend/backend e arquivos não rastreados já existentes foram preservados. Nenhuma alteração funcional, de teste, banco, migration, staging, Railway, manifest ou SW. Nenhum commit/push. As variáveis fictícias existiram apenas no processo de teste; não foram gravadas em `.env`.

## 18. Status final

**FASE 0.6B — R1.6 AUDITORIA CONCLUÍDA — BLOQUEADOR IDENTIFICADO ANTES DA IMPLEMENTAÇÃO.**

Arquitetura simplificada compatível com ajustes. Bloqueadores: caminhos emissores que contornam nascimento (incluindo ACL remota), ambiguidade não tratada e expansão de autorização por telefone. Decisão pendente sobre risco da credencial completa e plano mínimo de correções. Parar aqui; não iniciar implementação.
