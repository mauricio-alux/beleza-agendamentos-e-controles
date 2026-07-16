# ADR-004 - Arquitetura Multi-Tenant

## Status

Aceito.

## Contexto

O Bellory e uma plataforma SaaS para o nicho de beleza. A arquitetura precisa suportar:

- multiplos saloes e operacoes independentes;
- usuarios que podem participar de mais de um tenant;
- administracao global da plataforma Bellory;
- profissionais, autonomos, terceiros e clientes finais;
- franquias, marketplace, campanhas globais e IA tenant-aware no futuro.

O objetivo central e garantir isolamento operacional completo sem tornar a experiencia do usuario complexa. Internamente, o Bellory deve operar com arquitetura robusta de plataforma, memberships e RBAC. Externamente, o usuario do salao deve perceber apenas perfis simples e fluxos automaticos.

## Decisao

O Bellory utiliza banco PostgreSQL compartilhado, com isolamento logico por `tenant_id` nas entidades operacionais.

A identidade do usuario e global. O vinculo operacional com um salao nao fica mais conceitualmente preso a `usuarios.tenant_id`. O acesso operacional e representado por `tenant_memberships`.

Em termos praticos:

- `usuarios` representa identidade global;
- `tenants` representa saloes ou operacoes independentes;
- `tenant_memberships` representa o vinculo de um usuario com um tenant;
- `roles`, `permissions` e `role_permissions` representam RBAC interno;
- o tenant ativo da sessao define o contexto operacional;
- MasterAdmin atua no contexto da plataforma, nao como administrador padrao de salao.

## Camadas Arquiteturais

### Plataforma Bellory

A plataforma Bellory e o nivel SaaS global.

Responsavel por:

- tenants;
- planos e assinaturas;
- metricas SaaS;
- campanhas globais;
- templates reutilizaveis;
- suporte operacional;
- auditoria;
- saude da plataforma.

O perfil principal dessa camada e `MasterAdmin`.

O `MasterAdmin` nao deve operar agenda, equipe, servicos ou clientes de um tenant por padrao. Quando precisar acessar dados operacionais de um tenant, deve faze-lo em modo suporte/auditoria, com motivo explicito e log obrigatorio.

### Tenant / Salao

Cada tenant representa uma operacao independente, normalmente um salao, studio, clinica estetica ou profissional autonomo com operacao propria.

Um tenant possui:

- configuracoes proprias;
- agenda propria;
- equipe propria;
- servicos proprios;
- clientes vinculados;
- campanhas proprias;
- metricas proprias;
- assinatura/plano SaaS.

Toda entidade operacional deve ser tenant-aware.

### Cliente Final

O cliente final nao deve ser tratado como administrador operacional.

Clientes podem existir como cadastro global em `clientes`, com relacionamento por tenant em `cliente_tenants`.

Essa modelagem permite que a mesma pessoa seja cliente de mais de um salao sem misturar historico, recorrencia, campanhas ou contexto operacional.

Fluxos futuros de cliente final podem usar:

- magic link;
- WhatsApp;
- token de acesso;
- area `/cliente` ou `/minha-conta`.

## Identidade, Memberships E Tenant Ativo

### usuarios

`usuarios` representa a identidade global do usuario Bellory.

Um usuario pode:

- ser `MasterAdmin` da plataforma;
- pertencer a um ou mais tenants;
- atuar com roles diferentes em tenants diferentes;
- ser autonomo dono de uma operacao;
- atuar como autonomo parceiro em tenant de terceiros;
- futuramente participar de marketplace ou franquias.

`usuarios.tenant_id` nao deve ser tratado como dependencia estrutural obrigatoria. Qualquer uso remanescente deve ser considerado legado ou compatibilidade temporaria.

### tenant_memberships

`tenant_memberships` e a entidade central de acesso operacional.

Campos conceituais:

- `usuario_id`;
- `tenant_id`;
- `role`;
- `status`;
- `profissional_id`;
- `is_primary`;
- `vinculo_tipo`;
- `is_owner`;
- `marketplace_enabled`;
- `marketplace_profile`;
- `metadata`.

O membership define:

- a qual tenant o usuario pertence;
- qual perfil ele exerce naquele tenant;
- se ele e dono da operacao;
- se atua como membro interno;
- se atua como parceiro/autonomo/terceiro;
- qual profissional operacional esta vinculado a ele;
- qual contexto deve orientar dashboard e permissoes.

### Tenant Ativo Da Sessao

Toda operacao tenant-aware deve possuir um tenant ativo.

O tenant ativo pode vir de:

- membership primario;
- cabecalho futuro de troca de tenant;
- selecao futura de contexto;
- modo suporte/auditoria para `MasterAdmin`.

O backend deve anexar ao request:

- `usuario`;
- `tenantId`;
- `tenant`;
- `membership`;
- `tipoUsuario` contextual;
- `permissionContext`.

## Perfis Operacionais

O Bellory utiliza perfis pre-definidos para manter a UX simples.

Perfis principais:

- `MasterAdmin`: administrador da plataforma Bellory;
- `Administrador`: administrador operacional do tenant;
- `Gerente`: gestao operacional do salao;
- `Autonomo`: profissional independente, dono ou parceiro;
- `Profissional`: profissional interno com agenda propria;
- `Recepcionista`: agenda, clientes e confirmacoes;
- `Financeiro`: faturamento e relatorios financeiros;
- `Funcionario`: acesso operacional limitado;
- `Terceiro`: prestador externo com acesso restrito;
- `Cliente`: cliente final.

O usuario final nao deve configurar permissoes tecnicas. O sistema atribui permissoes automaticamente com base no perfil e no membership.

## Autonomo

`Autonomo` nao e um simples funcionario.

Ele pode:

- possuir tenant proprio;
- administrar sua operacao individual;
- atender em casa, studio ou local proprio;
- atuar dentro de saloes de terceiros;
- ter agenda propria;
- ter clientes proprios;
- participar de multiplos tenants no futuro;
- ser preparado para marketplace.

O contexto do autonomo depende do membership:

- `vinculo_tipo = owner`: dono da propria operacao;
- `vinculo_tipo = partner`: atua em tenant de terceiro;
- `marketplace_enabled = true`: preparado para exposicao futura em marketplace.

Quando dono, o autonomo pode ter permissoes amplas sobre seu proprio tenant. Quando parceiro em tenant de terceiros, suas permissoes devem ser limitadas ao proprio contexto profissional.

## MasterAdmin Nao E Administrador Do Salao

Essa separacao e obrigatoria.

`MasterAdmin`:

- administra a plataforma Bellory;
- acessa `/admin`;
- visualiza metricas SaaS;
- gerencia tenants, assinaturas, campanhas globais e auditoria;
- nao opera tenants por padrao.

`Administrador`:

- administra um tenant especifico;
- acessa dashboard operacional;
- gerencia agenda, clientes, equipe, servicos, campanhas e configuracoes do salao;
- nao acessa metricas globais da plataforma.

Se `MasterAdmin` precisar acessar um tenant, deve usar modo suporte/auditoria.

Modo suporte deve exigir:

- tenant alvo;
- motivo explicito;
- log em `event_logs`;
- contexto operacional temporario;
- rastreabilidade.

## RBAC

O Bellory utiliza RBAC granular internamente, com UX simples externamente.

Entidades:

- `permissions`;
- `roles`;
- `role_permissions`;
- `tenant_user_permissions` para customizacao futura.

Permissoes seguem o padrao:

```text
recurso.acao
```

Exemplos:

- `agenda.read`;
- `agenda.write`;
- `clientes.read`;
- `clientes.write`;
- `campanhas.manage`;
- `financeiro.read`;
- `equipe.manage`;
- `platform.dashboard.read`;
- `platform.support.access`;
- `platform.audit.read`.

O usuario do SaaS nao deve ver:

- ACL tecnica;
- matriz de permissoes;
- checkboxes complexos;
- regras internas do RBAC.

O sistema controla automaticamente:

- menus;
- widgets;
- dashboards;
- rotas;
- acoes permitidas;
- visibilidade de modulos.

## Dashboards Contextuais

Dashboards dependem de:

- role contextual;
- membership;
- tenant ativo;
- permissoes;
- vinculo profissional;
- contexto de plataforma ou tenant.

### Dashboard Da Plataforma

Rota conceitual:

```text
/admin
```

Exibe:

- MRR;
- churn;
- crescimento;
- tenants ativos;
- tenants em trial;
- campanhas globais;
- uso da plataforma;
- saude operacional;
- auditoria.

### Dashboard Do Tenant

Rota conceitual:

```text
/dashboard
/tenant/dashboard
```

Exibe dados apenas do tenant ativo.

### Dashboard Do Profissional, Funcionario E Terceiro

Perfis limitados nao devem receber widgets administrativos.

`Funcionario` visualiza:

- agenda propria;
- clientes proprios;
- atendimentos;
- comissao;
- horarios.

`Terceiro` visualiza:

- agenda vinculada;
- servicos autorizados;
- ganhos proprios limitados.

Se nao houver `profissional_id` no membership, o dashboard deve permanecer limitado e nao cair em metricas globais do tenant.

### Dashboard Do Autonomo

O dashboard do autonomo e hibrido:

- agenda propria;
- ganhos proprios;
- campanhas proprias;
- clientes proprios;
- metricas pessoais;
- contexto de owner ou partner;
- preparacao para marketplace.

## Middlewares

### Auth Middleware

Responsavel por:

- validar token;
- carregar usuario global;
- carregar memberships;
- selecionar tenant ativo;
- montar role contextual;
- montar `permissionContext`.

### Tenant Middleware

Responsavel por:

- exigir tenant ativo para rotas operacionais;
- validar membership ativo;
- anexar tenant e membership ao request;
- impedir acesso sem contexto operacional.

### Platform Middleware

Responsavel por:

- permitir apenas `MasterAdmin`;
- criar contexto de plataforma;
- separar rotas `/admin` de rotas operacionais.

### Permission Middleware

Responsavel por:

- aplicar `requirePermission()`;
- validar permissoes granulares;
- respeitar role, membership e tenant ativo.

`requireRole()` pode continuar existindo para casos simples, mas autorizacao operacional deve preferir permissoes.

## Banco De Dados

Tecnologia:

- PostgreSQL;
- Supabase;
- tabelas compartilhadas;
- isolamento logico por tenant;
- RLS como camada adicional;
- service role no backend com filtros obrigatorios.

Tabelas principais:

- `usuarios`;
- `tenants`;
- `tenant_memberships`;
- `permissions`;
- `roles`;
- `role_permissions`;
- `tenant_user_permissions`;
- `clientes`;
- `cliente_tenants`;
- `profissionais`;
- `servicos`;
- `agendamentos`;
- `campanhas`;
- `platform_campaigns`;
- `event_logs`.

Entidades operacionais devem possuir `tenant_id`.

Entidades globais de plataforma podem nao possuir `tenant_id`, mas devem ser restritas por permissoes de plataforma.

## RLS E Backend

RLS no Supabase deve reforcar isolamento, mas o Bellory nao deve depender apenas de RLS.

O backend deve:

- filtrar por `tenant_id`;
- validar ownership;
- validar membership;
- validar permissoes;
- impedir consultas globais indevidas;
- registrar operacoes sensiveis.

Como o backend pode usar service role, qualquer repository operacional deve ser tenant-aware por padrao.

## Repositories Tenant-Aware

Todo repository operacional deve receber `tenantId` explicitamente.

Padrao esperado:

```text
repository.operation(tenantId, ...)
```

Toda query operacional deve iniciar pelo escopo:

```text
.eq('tenant_id', tenantId)
```

Excecoes globais devem ser explicitas e restritas a contexto de plataforma.

## Campanhas

Existem dois contextos:

### Campanhas Do Tenant

Pertencem ao salao.

Devem sempre possuir `tenant_id`.

### Campanhas Globais Da Plataforma

Pertencem ao Bellory.

Podem existir em `platform_campaigns` para:

- campanhas institucionais;
- templates reutilizaveis;
- campanhas globais opcionais;
- comunicacoes da plataforma.

Campanhas globais nao devem ser misturadas com campanhas operacionais do salao.

## IA Tenant-Aware

Toda IA futura deve receber contexto explicito:

- tenant ativo;
- usuario;
- membership;
- permissao;
- recurso;
- finalidade;
- origem dos dados.

Nunca permitir:

- mistura de dados entre tenants;
- aprendizado cruzado indevido;
- recomendacoes com dados de outro salao;
- campanhas geradas com contexto externo sem autorizacao.

Dados globais para IA so podem ser usados quando anonimizados, agregados e autorizados.

## Observabilidade E Auditoria

Logs devem incluir, quando aplicavel:

- `tenant_id`;
- `usuario_id`;
- `event_type`;
- origem;
- ip;
- user agent;
- payload contextual;
- motivo em modo suporte.

Eventos sensiveis:

- acesso suporte;
- alteracao de permissoes;
- mudanca de assinatura;
- criacao de campanhas globais;
- publicacao de templates;
- operacoes administrativas de plataforma.

## Rotas Conceituais

Separacao recomendada:

```text
/admin/*   -> plataforma Bellory
/tenant/*  -> operacao tenant-aware
/cliente/* -> cliente final
```

Rotas legadas podem continuar existindo durante transicao, mas devem respeitar os mesmos middlewares e permissoes.

## Compatibilidade Futura

A arquitetura fica preparada para:

- multiplos tenants por usuario;
- franquias;
- grupos economicos;
- multiplas unidades;
- marketplace de profissionais;
- autonomos parceiros;
- suporte operacional auditado;
- campanhas globais;
- templates reutilizaveis;
- IA tenant-aware;
- dashboards dinamicos;
- permissoes customizadas futuras;
- storage tenant-aware;
- cache com namespace por tenant;
- filas tenant-aware;
- realtime por canal de tenant.

## Cache, Filas, Realtime E Storage

Padroes futuros:

```text
cache: tenant:{tenant_id}:dashboard
storage: /tenants/{tenant_id}/...
realtime: tenant:{tenant_id}:agenda
queue: tenant_id no payload de cada job
```

Eventos globais de plataforma devem usar namespace proprio:

```text
platform:admin
platform:campaigns
platform:audit
```

## Riscos

Riscos principais:

- query operacional sem `tenant_id`;
- MasterAdmin atuando como admin de salao por engano;
- usuario multi-tenant usando tenant errado;
- dashboard exibindo metricas agregadas indevidas;
- RBAC exposto de forma complexa ao usuario final;
- IA misturando contexto de tenants;
- campanhas globais confundidas com campanhas do tenant;
- suporte sem auditoria.

Mitigacoes:

- tenant middleware obrigatorio;
- platform middleware separado;
- RBAC granular;
- memberships contextuais;
- logs de suporte;
- repositories tenant-aware;
- testes de cross-tenant;
- dashboards por role e membership;
- UX com perfis prontos.

## Diretriz Final

Todo modulo Bellory deve ser tenant-aware por padrao.

Excecoes globais devem ser explicitamente platform-aware.

O Bellory deve combinar:

- arquitetura enterprise internamente;
- operacao simples externamente;
- seguranca contextual;
- isolamento por tenant;
- memberships como fonte de acesso operacional;
- RBAC automatico por perfis prontos;
- preparacao para marketplace, franquias, IA e campanhas globais.

## Decisao Final

O Bellory adota:

- banco compartilhado PostgreSQL/Supabase;
- isolamento logico por `tenant_id`;
- usuarios globais;
- acesso operacional via `tenant_memberships`;
- separacao entre plataforma, tenant e cliente final;
- RBAC interno robusto;
- UX simples baseada em perfis prontos;
- dashboards contextuais por role, membership e tenant ativo;
- suporte/auditoria para acesso operacional de plataforma;
- arquitetura preparada para escala SaaS real.
