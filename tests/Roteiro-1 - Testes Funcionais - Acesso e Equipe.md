# Roteiro-1 - Testes Funcionais - Acesso e Equipe

## 1. Objetivo

Validar os fluxos principais de acesso, cadastro ja realizado, manutencao de perfil e gestao de equipe no Bellory SaaS para:

- usuario Administrador;
- usuario Autonomo;
- usuario Autonomo que adiciona um funcionario e passa automaticamente a Administrador.

## 2. Escopo

Este roteiro cobre:

- acesso ao SaaS;
- validacao dos cadastros ja efetuados;
- acesso ao dashboard;
- acesso a `/equipe`;
- cadastro e manutencao de equipe;
- tipo profissional;
- cargos;
- especialidades;
- servicos autorizados;
- horarios;
- permissoes;
- conversao automatica de Autonomo para Administrador.

## 3. Premissas

- Ambiente: DEV/HML/local.
- Backend ativo em `http://localhost:3000` ou `http://127.0.0.1:3000`.
- Frontend ativo em `http://127.0.0.1:3001`.
- Migrations recentes aplicadas, incluindo taxonomia, cargos, especialidades e `servico_especialidades`.
- Dados estruturais globais preservados: cargos, especialidades, roles, permissoes e taxonomia Bellory.
- Testes devem ser executados em tenant de teste.

## 4. Massa de Dados Minima

### Administrador

| Campo | Valor sugerido |
| --- | --- |
| Nome | Marina Admin |
| Email | marina.admin@belloryteste.com |
| Telefone | +55 11 90000-0001 |
| Tenant/Salao | Bellory Test Studio |
| Perfil esperado | Administrador |

### Autonomo

| Campo | Valor sugerido |
| --- | --- |
| Nome | Ana Autonoma |
| Email | ana.autonoma@belloryteste.com |
| Telefone | +55 11 90000-0002 |
| Tenant/Salao | Bellory Solo Studio |
| Perfil esperado | Autonomo |

### Equipe do Administrador

| Nome | Tipo profissional | Cargo | Especialidades | Servicos autorizados | Acesso |
| --- | --- | --- | --- | --- | --- |
| Funcionaria 1 | Funcionario | Cabeleireira | Corte Feminino, Escova Simples | Corte de Cabelo, Escova | Sim |
| Funcionario 2 | Funcionario | Manicure | Nail Art, Blindagem | Manicure | Sim |
| Terceiro 1 | Terceiro | Barbeiro | Barba Tradicional | Barba | Sim |
| Profissional Adm 1 | Profissional Adm | Recepcionista | N/A | N/A | Opcional |

### Novo Funcionario Para Conversao do Autonomo

| Campo | Valor sugerido |
| --- | --- |
| Nome | Funcionario Conversao |
| Tipo profissional | Funcionario |
| Cargo | Cabeleireira |
| Especialidades | Corte Feminino |
| Servicos autorizados | Corte de Cabelo |
| Email | funcionario.conversao@belloryteste.com |
| Senha temporaria | Bellory@123 |

## 5. Regras Funcionais a Validar

- Funcionario e Terceiro possuem acesso padrao ao SaaS quando cadastrados com email/senha.
- Funcionario e Terceiro podem possuir cargo operacional.
- Funcionario e Terceiro podem possuir especialidades e servicos autorizados.
- Funcionario e Terceiro podem aparecer na agenda quando aceitam agendamento online.
- Profissional Adm pode ter acesso ao sistema, mas nao executa servicos.
- Profissional Adm nao deve aparecer como atendente na agenda.
- Profissional Adm nao deve receber agendamento.
- Profissional Adm deve exibir permissoes administrativas sugeridas.
- Autonomo inicia sem equipe e sem conversao.
- Autonomo visualiza a opcao Equipe.
- Ao cadastrar o primeiro profissional adicional, Autonomo deve ser promovido para Administrador.

## 6. Cenario A - Usuario Administrador

### RF-A-001 - Login do Administrador

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar acesso do usuario Administrador ao SaaS. |
| Pre-condicoes | Usuario Administrador ja cadastrado e ativo. |
| Massa de dados | `marina.admin@belloryteste.com`. |
| Passos | 1. Acessar `/login`. 2. Informar email e senha. 3. Clicar em Entrar. |
| Resultado esperado | Login realizado, sessao criada e redirecionamento ao dashboard/onboarding conforme status do tenant. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print da tela inicial apos login. |
| Severidade em caso de erro | Critica. |

### RF-A-002 - Acesso ao Dashboard

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar acesso ao dashboard do tenant correto. |
| Pre-condicoes | Login de Administrador realizado. |
| Massa de dados | Tenant Bellory Test Studio. |
| Passos | 1. Acessar `/dashboard`. 2. Conferir cabecalho, menu e tenant exibido. |
| Resultado esperado | Dashboard carregado com tenant correto e opcoes administrativas. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print do dashboard. |
| Severidade em caso de erro | Alta. |

### RF-A-003 - Acesso a Tela de Equipe

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar acesso a `/equipe`. |
| Pre-condicoes | Login de Administrador realizado. |
| Massa de dados | Equipe previamente cadastrada. |
| Passos | 1. Clicar no menu Equipe. 2. Validar URL `/equipe`. |
| Resultado esperado | Tela de profissionais do salao carregada sem erro. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print da tela `/equipe`. |
| Severidade em caso de erro | Alta. |

### RF-A-004 - Listagem Correta da Equipe

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar listagem dos 4 membros esperados. |
| Pre-condicoes | Equipe cadastrada no tenant. |
| Massa de dados | Funcionario 1, Funcionario 2, Terceiro, Profissional Adm. |
| Passos | 1. Acessar `/equipe`. 2. Conferir nomes, tipo profissional, comissao, acesso e servicos. |
| Resultado esperado | Todos os membros aparecem vinculados ao salao correto. Profissional Adm nao exibe servicos de atendimento. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print da lista de equipe. |
| Severidade em caso de erro | Alta. |

### RF-A-005 - Cadastro de Novo Funcionario

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar cadastro de Funcionario operacional. |
| Pre-condicoes | Cargos, especialidades e servicos compativeis existentes. |
| Massa de dados | Nome: Teste Funcionario; Cargo: Cabeleireira; Especialidade: Corte Feminino; Servico: Corte de Cabelo. |
| Passos | 1. Em `/equipe`, preencher Novo profissional. 2. Selecionar `Funcionario`. 3. Selecionar cargo operacional. 4. Selecionar especialidade. 5. Selecionar servico autorizado. 6. Informar email e senha. 7. Salvar. |
| Resultado esperado | Profissional criado, com acesso ao sistema, especialidade e servico autorizado compativel. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print do novo membro na lista. |
| Severidade em caso de erro | Alta. |

### RF-A-006 - Cadastro de Novo Terceiro

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar cadastro de Terceiro operacional. |
| Pre-condicoes | Cargo e servico compativeis existentes. |
| Massa de dados | Nome: Teste Terceiro; Cargo: Barbeiro; Especialidade: Barba Tradicional; Servico: Barba. |
| Passos | 1. Acessar `/equipe`. 2. Selecionar tipo `Terceiro`. 3. Preencher cargo, especialidade, servico, email e senha. 4. Salvar. |
| Resultado esperado | Terceiro criado com acesso e vinculos operacionais compativeis. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print da lista e detalhe do membro. |
| Severidade em caso de erro | Alta. |

### RF-A-007 - Cadastro de Novo Profissional Adm

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar cadastro de Profissional Adm. |
| Pre-condicoes | Cargo administrativo existente. |
| Massa de dados | Nome: Teste Adm; Cargo: Recepcionista. |
| Passos | 1. Acessar `/equipe`. 2. Selecionar tipo `Profissional Adm`. 3. Selecionar cargo administrativo. 4. Verificar checkbox Criar acesso ao sistema. 5. Salvar com ou sem acesso. |
| Resultado esperado | Profissional Adm criado sem especialidades e sem servicos de atendimento. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print do cadastro. |
| Severidade em caso de erro | Alta. |

### RF-A-008 - Regra do Checkbox Criar Acesso ao Sistema

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar exibicao e obrigatoriedade de acesso conforme tipo profissional. |
| Pre-condicoes | Tela `/equipe` aberta. |
| Massa de dados | Funcionario, Terceiro e Profissional Adm. |
| Passos | 1. Alternar tipo profissional. 2. Observar campos email/senha e checkbox. |
| Resultado esperado | Funcionario e Terceiro recebem acesso padrao. Profissional Adm exibe opcao Criar acesso ao sistema e so exige email/senha quando marcado. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Prints de cada tipo profissional. |
| Severidade em caso de erro | Media. |

### RF-A-009 - Manutencao de Dados do Profissional

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar edicao de dados profissionais. |
| Pre-condicoes | Profissional operacional existente. |
| Massa de dados | Alterar nome, cargo, comissao, agenda online, especialidades e servicos. |
| Passos | 1. Abrir `/equipe/manutencao/[id]`. 2. Alterar campos. 3. Salvar. 4. Reabrir o registro. |
| Resultado esperado | Alteracoes persistem e respeitam compatibilidade cargo/especialidade/servico. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print antes/depois. |
| Severidade em caso de erro | Alta. |

### RF-A-010 - Manutencao de Horarios

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar configuracao de horarios da equipe. |
| Pre-condicoes | Profissional operacional ativo. |
| Massa de dados | Segunda a sexta, 09:00-18:00, intervalo 12:00-13:00. |
| Passos | 1. Acessar manutencao do profissional. 2. Clicar Configurar horarios. 3. Alterar escala. 4. Salvar. |
| Resultado esperado | Horarios salvos e usados pela agenda/disponibilidade. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print da tela de horarios. |
| Severidade em caso de erro | Alta. |

### RF-A-011 - Regras de Permissao do Profissional Adm

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Validar permissoes administrativas sugeridas. |
| Pre-condicoes | Profissional Adm cadastrado. |
| Massa de dados | Cargo Recepcionista ou Gerente. |
| Passos | 1. Abrir manutencao do Profissional Adm. 2. Verificar bloco de permissoes sugeridas. 3. Acessar Configurar permissoes. |
| Resultado esperado | Bloco e acao de permissoes aparecem apenas para Profissional Adm. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print do bloco de permissoes. |
| Severidade em caso de erro | Media. |

### RF-A-012 - Profissional Adm Nao Executa Servicos

| Campo | Descricao |
| --- | --- |
| Cenario | Administrador |
| Objetivo | Garantir que Profissional Adm nao recebe servicos nem agenda. |
| Pre-condicoes | Profissional Adm ativo. |
| Massa de dados | Profissional Adm com ou sem acesso ao sistema. |
| Passos | 1. Abrir manutencao do Profissional Adm. 2. Verificar ausencia de servicos autorizados. 3. Tentar localizar o Profissional Adm como atendente na agenda. |
| Resultado esperado | Nao deve haver servicos vinculados, agenda online ou selecao como atendente. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print manutencao e agenda. |
| Severidade em caso de erro | Alta. |

## 7. Cenario B - Usuario Autonomo

### RF-B-001 - Login do Autonomo

| Campo | Descricao |
| --- | --- |
| Cenario | Autonomo |
| Objetivo | Validar acesso do usuario Autonomo ao SaaS. |
| Pre-condicoes | Usuario Autonomo ativo e sem equipe adicional. |
| Massa de dados | `ana.autonoma@belloryteste.com`. |
| Passos | 1. Acessar `/login`. 2. Informar credenciais. 3. Entrar. |
| Resultado esperado | Login realizado e usuario permanece como Autonomo. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print apos login. |
| Severidade em caso de erro | Critica. |

### RF-B-002 - Dashboard do Autonomo

| Campo | Descricao |
| --- | --- |
| Cenario | Autonomo |
| Objetivo | Validar exibicao correta do perfil Autonomo. |
| Pre-condicoes | Login Autonomo realizado. |
| Massa de dados | Tenant Bellory Solo Studio. |
| Passos | 1. Acessar `/dashboard`. 2. Conferir dados do tenant e perfil. |
| Resultado esperado | Dashboard exibe tenant correto e perfil sem conversao para Administrador. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print do dashboard. |
| Severidade em caso de erro | Alta. |

### RF-B-003 - Acesso a Equipe pelo Autonomo

| Campo | Descricao |
| --- | --- |
| Cenario | Autonomo |
| Objetivo | Validar existencia da opcao Equipe. |
| Pre-condicoes | Login Autonomo realizado. |
| Massa de dados | Autonomo sem equipe. |
| Passos | 1. Verificar menu lateral/dashboard. 2. Clicar em Equipe. |
| Resultado esperado | Menu Equipe existe e `/equipe` abre para manutencao/inicio da equipe. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print do menu e tela. |
| Severidade em caso de erro | Alta. |

### RF-B-004 - Validacao de Trabalho Solo

| Campo | Descricao |
| --- | --- |
| Cenario | Autonomo |
| Objetivo | Confirmar que inicialmente o Autonomo trabalha sozinho. |
| Pre-condicoes | Autonomo sem profissionais adicionais. |
| Massa de dados | Profissional padrao do proprio usuario. |
| Passos | 1. Acessar `/equipe`. 2. Conferir listagem. 3. Acessar manutencao propria. |
| Resultado esperado | Apenas o profissional do proprio Autonomo esta vinculado ao tenant. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print da equipe. |
| Severidade em caso de erro | Alta. |

### RF-B-005 - Servicos, Especialidades e Horarios Proprios

| Campo | Descricao |
| --- | --- |
| Cenario | Autonomo |
| Objetivo | Validar manutencao operacional propria. |
| Pre-condicoes | Autonomo com servicos do onboarding. |
| Massa de dados | Servicos padrao, especialidades e escala. |
| Passos | 1. Acessar manutencao propria. 2. Validar servicos vinculados. 3. Validar especialidades. 4. Validar horarios. |
| Resultado esperado | Autonomo possui servicos/especialidades/horarios proprios e segue como Autonomo. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Prints das telas. |
| Severidade em caso de erro | Media. |

## 8. Cenario C - Conversao Autonomo para Administrador

### RF-C-001 - Cadastro do Primeiro Funcionario pelo Autonomo

| Campo | Descricao |
| --- | --- |
| Cenario | Conversao Autonomo para Administrador |
| Objetivo | Validar cadastro do primeiro profissional adicional. |
| Pre-condicoes | Autonomo sem equipe adicional. |
| Massa de dados | Funcionario Conversao. |
| Passos | 1. Logar como Autonomo. 2. Acessar `/equipe`. 3. Cadastrar um Funcionario com cargo, especialidade, servico, email e senha. 4. Salvar. |
| Resultado esperado | Novo funcionario salvo e vinculado ao tenant correto. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print da lista apos cadastro. |
| Severidade em caso de erro | Critica. |

### RF-C-002 - Conversao Automatica de Perfil

| Campo | Descricao |
| --- | --- |
| Cenario | Conversao Autonomo para Administrador |
| Objetivo | Validar promocao automatica `Autonomo -> Administrador`. |
| Pre-condicoes | RF-C-001 executado com sucesso. |
| Massa de dados | Usuario Autonomo original. |
| Passos | 1. Apos salvar funcionario, atualizar sessao/tela. 2. Verificar perfil exibido. 3. Fazer logout/login, se necessario. |
| Resultado esperado | Usuario original passa a Administrador no backend e na interface. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print antes/depois. |
| Severidade em caso de erro | Critica. |

### RF-C-003 - Opcoes Administrativas Apos Conversao

| Campo | Descricao |
| --- | --- |
| Cenario | Conversao Autonomo para Administrador |
| Objetivo | Validar liberacao de opcoes administrativas. |
| Pre-condicoes | Conversao concluida. |
| Massa de dados | Usuario convertido. |
| Passos | 1. Acessar dashboard. 2. Verificar menu e permissoes. 3. Acessar `/equipe` e configuracoes administrativas. |
| Resultado esperado | Interface exibe opcoes administrativas adequadas ao Administrador. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print do menu pos-conversao. |
| Severidade em caso de erro | Alta. |

### RF-C-004 - Integridade do Tenant e Vinculo do Funcionario

| Campo | Descricao |
| --- | --- |
| Cenario | Conversao Autonomo para Administrador |
| Objetivo | Garantir que a conversao nao quebrou isolamento multi-tenant. |
| Pre-condicoes | Funcionario cadastrado e conversao realizada. |
| Massa de dados | Tenant Bellory Solo Studio. |
| Passos | 1. Validar listagem de equipe. 2. Validar que funcionario pertence ao mesmo tenant. 3. Validar servicos e especialidades. |
| Resultado esperado | Novo funcionario fica no tenant correto, com acesso e vinculos operacionais corretos. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Print e consulta SQL. |
| Severidade em caso de erro | Critica. |

### RF-C-005 - Log ou Auditoria da Conversao

| Campo | Descricao |
| --- | --- |
| Cenario | Conversao Autonomo para Administrador |
| Objetivo | Verificar registro de log/auditoria, quando existir. |
| Pre-condicoes | Conversao realizada. |
| Massa de dados | Usuario e tenant convertidos. |
| Passos | 1. Consultar `event_logs`. 2. Procurar evento de promocao automatica. |
| Resultado esperado | Evento `operational_role_auto_promoted` registrado, se auditoria estiver habilitada. |
| Resultado obtido | A preencher. |
| Status | A preencher. |
| Evidencia/observacao | Resultado da consulta. |
| Severidade em caso de erro | Baixa. |

## 9. Validacoes de Banco

> Ajustar emails e slugs conforme massa real usada no ambiente.

### Usuario, Tenant e Perfil

```sql
select
  u.id as usuario_id,
  u.nome,
  u.email,
  u.tipo_usuario,
  tm.tenant_id,
  tm.role,
  tm.status,
  tm.is_primary,
  tm.is_owner,
  t.nome_fantasia,
  t.slug
from public.usuarios u
left join public.tenant_memberships tm on tm.usuario_id = u.id
left join public.tenants t on t.id = tm.tenant_id
where lower(u.email) in (
  'marina.admin@belloryteste.com',
  'ana.autonoma@belloryteste.com'
)
order by u.email;
```

### Equipe Vinculada ao Tenant

```sql
select
  p.id,
  p.nome_publico,
  p.tenant_id,
  p.usuario_id,
  p.cargo_id,
  c.nome as cargo,
  p.aceita_agendamento_online,
  p.ativo,
  p.metadata
from public.profissionais p
left join public.cargos c on c.id = p.cargo_id
where p.tenant_id = '<tenant_id>'
  and p.deleted_at is null
order by p.created_at;
```

### Especialidades do Profissional

```sql
select
  p.nome_publico,
  c.nome as cargo,
  e.nome as especialidade,
  pe.ativo
from public.profissional_especialidades pe
join public.profissionais p on p.id = pe.profissional_id
join public.especialidades e on e.id = pe.especialidade_id
join public.cargos c on c.id = e.cargo_id
where pe.tenant_id = '<tenant_id>'
  and pe.deleted_at is null
order by p.nome_publico, e.nome;
```

### Servicos Autorizados

```sql
select
  p.nome_publico,
  s.nome as servico,
  s.categoria,
  ps.ativo
from public.profissional_servicos ps
join public.profissionais p on p.id = ps.profissional_id
join public.servicos s on s.id = ps.servico_id
where ps.tenant_id = '<tenant_id>'
  and ps.deleted_at is null
order by p.nome_publico, s.nome;
```

### Permissoes e Membership

```sql
select
  u.email,
  tm.role,
  tm.status,
  tm.profissional_id,
  tm.metadata,
  tup.permission_id,
  p.codigo as permissao
from public.tenant_memberships tm
join public.usuarios u on u.id = tm.usuario_id
left join public.tenant_user_permissions tup on tup.usuario_id = u.id and tup.tenant_id = tm.tenant_id
left join public.permissions p on p.id = tup.permission_id
where tm.tenant_id = '<tenant_id>'
order by u.email, p.codigo;
```

### Log de Conversao

```sql
select *
from public.event_logs
where tenant_id = '<tenant_id>'
  and event_type = 'operational_role_auto_promoted'
order by created_at desc;
```

## 10. Encerramento da Execucao

Ao finalizar, atualizar a planilha operacional:

- status de cada teste;
- resultado obtido;
- evidencias;
- bugs/inconsistencias;
- correcoes realizadas;
- status de reteste.
