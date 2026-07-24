# Roteiro De Validacao - Arquitetura Multi-Tenant, RBAC E Agenda

## Objetivo

Validar o Bellory apos os ajustes de:

- multi-tenant;
- `tenant_memberships`;
- separacao Plataforma x Tenant;
- RBAC;
- MasterAdmin;
- Autonomo;
- Funcionario;
- Terceiro;
- agenda inteligente;
- horarios opcionais;
- equipe/cargos/especialidades.

## Premissas

Banco limpo, mantendo apenas dados estruturais:

- `planos`;
- `roles`;
- `permissions`;
- `role_permissions`;
- `cargos`;
- `especialidades`.

Servidores esperados:

- Frontend: `http://127.0.0.1:3001`
- Backend: `http://127.0.0.1:3000`

---

## 1. Cadastro Inicial Do Tenant

Criar um novo salao pelo fluxo de cadastro.

Dados simulados:

- Nome: `Bellory Test Studio`
- Responsavel: `Marina Lopes`
- Email: `marina.admin@belloryteste.com`
- Senha: `Teste@123456`
- Telefone: `(11) 99999-1111`
- Plano: qualquer plano disponivel

Validar:

- tenant criado;
- usuario criado;
- `tenant_memberships` criado com:
  - `role = Administrador`;
  - `vinculo_tipo = owner`;
  - `is_owner = true`;
  - `is_primary = true`;
- redirecionamento para onboarding ou dashboard conforme fluxo atual;
- dashboard operacional exibe nome do salao.

Resultado esperado:

Administrador ve operacao completa do salao, nao dashboard SaaS.

---

## 2. Onboarding / Estrutura Inicial

Validar criacao automatica de:

- configuracoes do tenant;
- profissional padrao;
- servicos iniciais;
- vinculo profissional-servico;
- link de agendamento;
- etapas de onboarding.

Dados esperados:

- Profissional padrao: `Marina Lopes`;
- Cargo: Administrador ou equivalente;
- Agenda online: sim.

Servicos iniciais esperados:

- Corte;
- Escova;
- Hidratacao;
- Manicure.

Resultado esperado:

O tenant fica utilizavel sem configuracao manual pesada.

---

## 3. Login Administrador Do Salao

Acessar:

```text
http://127.0.0.1:3001/login
```

Credenciais:

- `marina.admin@belloryteste.com`
- `Teste@123456`

Validar:

- redireciona para `/dashboard`, nao `/admin`;
- sidebar mostra modulos operacionais;
- nao exibe painel SaaS global;
- `roleConfig.role = administrador`.

Resultado esperado:

Administrador do salao atua apenas no proprio tenant.

---

## 4. Cadastro De Equipe Com Cargos E Especialidades

Acessar:

```text
/equipe
```

Criar profissionais:

### Profissional Interno

- Nome: `Ana Souza`
- Cargo: Cabeleireiro
- Especialidades: Corte, Escova
- Comissao: `40%`
- Agenda online: sim

### Funcionario

- Nome: `Carlos Lima`
- Cargo: Recepcionista ou Atendimento
- Comissao: `0%`
- Agenda online: nao

### Terceiro

- Nome: `Bianca Prado`
- Cargo: Manicure
- Especialidades: Manicure, Pedicure
- Comissao: `60%`
- Agenda online: sim

Validar:

- cargos vem da tabela normalizada;
- especialidades filtram conforme cargo;
- profissionais sao listados na equipe;
- nao ha erro em cargo/especialidade;
- botao `Configurar horarios` aparece para profissionais aplicaveis.

---

## 5. Horarios Semanais Com Periodos Opcionais

Acessar:

```text
/configuracoes/equipe/{profissionalId}/agenda
```

Testar em `Ana Souza`.

### Cenario A - Horario Padrao

Manter:

- Manha: `09:00 - 12:00`
- Tarde: `13:00 - 18:00`
- Intervalo: `12:00 - 13:00`

Salvar.

Esperado:

- salva com sucesso;
- slots respeitam manha, tarde e intervalo.

### Cenario B - Apenas Tarde

Limpar:

- inicio manha;
- fim manha.

Manter:

- Tarde: `13:00 - 18:00`
- Intervalo vazio

Salvar.

Esperado:

- salva com sucesso;
- agenda gera slots apenas a tarde;
- nenhum slot aparece de manha.

### Cenario C - Horario Continuo

Preencher:

- Manha: `09:00 - 18:00`
- Tarde vazia
- Intervalo vazio

Salvar.

Esperado:

- salva com sucesso;
- slots continuos;
- nenhum bloqueio de intervalo.

### Cenario D - Invalido

Preencher:

- Inicio manha: `09:00`
- Fim manha: vazio

Salvar.

Esperado:

- salvamento bloqueado;
- mensagem clara de validacao.

### Cenario E - Horario Invertido

Preencher:

- Inicio tarde: `18:00`
- Fim tarde: `13:00`

Salvar.

Esperado:

- salvamento bloqueado;
- mensagem clara.

---

## 6. Agenda E Motor De Disponibilidade

Criar servicos:

### Corte Feminino

- Duracao: 60 min
- Preco: R$ 120

### Escova

- Duracao: 45 min
- Preco: R$ 80

### Manicure

- Duracao: 60 min
- Preco: R$ 60

Criar cliente:

- Nome: `Juliana Martins`
- Telefone: `(11) 98888-2222`
- Email: `juliana.teste@cliente.com`

Criar agendamento:

- Cliente: Juliana Martins
- Profissional: Ana Souza
- Servico: Corte Feminino
- Data: proximo dia util
- Horario: dentro do expediente configurado

Validar:

- permite horario dentro da escala;
- bloqueia horarios fora da escala;
- bloqueia conflito no mesmo profissional;
- respeita duracao do servico;
- respeita intervalo quando houver;
- ignora periodos `NULL`.

---

## 7. RBAC Administrador

Com usuario administrador do salao, validar acesso a:

- Dashboard;
- Agenda;
- Clientes;
- Servicos;
- Equipe;
- Campanhas;
- Financeiro;
- Configuracoes.

Validar que consegue:

- criar servico;
- criar cliente;
- criar profissional;
- configurar horarios;
- criar agendamento.

Nao deve acessar:

- `/admin`;
- metricas SaaS globais;
- tenants de outros saloes.

Resultado esperado:

Acesso completo apenas dentro do proprio tenant.

---

## 8. Criar Usuarios Operacionais

Criar usuarios vinculados ao tenant.

### Funcionario

- Nome: `Felipe Costa`
- Email: `felipe.funcionario@belloryteste.com`
- Senha temporaria: `Teste@123456`
- Perfil: `Funcionario`
- Vincular a profissional, se disponivel.

### Terceiro

- Nome: `Bianca Prado`
- Email: `bianca.terceiro@belloryteste.com`
- Senha temporaria: `Teste@123456`
- Perfil: `Terceiro`
- Vincular ao profissional Bianca Prado.

### Autonomo Parceiro

- Nome: `Rafael Nunes`
- Email: `rafael.autonomo@belloryteste.com`
- Senha temporaria: `Teste@123456`
- Perfil: `Autonomo`
- Vincular a profissional proprio.
- Deve entrar como `vinculo_tipo = partner`, nao `owner`.

---

## 9. Dashboard Funcionario

Login:

- `felipe.funcionario@belloryteste.com`
- `Teste@123456`

Validar que o dashboard mostra apenas:

- agenda propria;
- clientes proprios;
- atendimentos;
- comissao;
- horarios.

Nao deve mostrar:

- faturamento global do salao;
- campanhas;
- equipe;
- financeiro global;
- configuracoes do tenant;
- metricas administrativas.

Resultado esperado:

Se nao houver `profissional_id`, dashboard fica limitado/vazio, sem fallback administrativo.

---

## 10. Dashboard Terceiro

Login:

- `bianca.terceiro@belloryteste.com`
- `Teste@123456`

Validar que o dashboard mostra apenas:

- agenda vinculada;
- servicos autorizados;
- ganhos proprios limitados.

Nao deve acessar:

- equipe;
- financeiro global;
- campanhas globais;
- configuracoes do tenant;
- metricas do salao.

Resultado esperado:

Terceiro ve somente o proprio contexto profissional.

---

## 11. Autonomo Parceiro

Login:

- `rafael.autonomo@belloryteste.com`
- `Teste@123456`

Validar dashboard hibrido:

- agenda propria;
- ganhos proprios;
- clientes proprios;
- metricas pessoais;
- campanhas proprias do contexto.

Nao deve ter:

- `tenant.manage`;
- `equipe.manage`;
- `financeiro.manage`;
- administracao total do salao de terceiro.

Resultado esperado:

Autonomo nao e tratado como funcionario, mas tambem nao vira administrador do salao alheio.

---

## 12. Autonomo Dono De Operacao

Criar novo cadastro independente:

- Nome salao/operacao: `Rafael Beauty Home`
- Responsavel: `Rafael Nunes Owner`
- Email: `rafael.owner@belloryteste.com`
- Senha: `Teste@123456`

Validar membership:

- `role = Administrador` ou `Autonomo`, conforme fluxo adotado;
- `vinculo_tipo = owner`;
- `is_owner = true`;
- `is_primary = true`.

Validar dashboard:

- pode administrar sua propria operacao;
- pode ver agenda, clientes, servicos e metricas proprias;
- nao acessa dados do tenant `Bellory Test Studio`.

---

## 13. MasterAdmin Plataforma

Criar ou usar um usuario `MasterAdmin`, se existir mecanismo administrativo/manual.

Validar login:

- redireciona para `/admin`;
- nao cai em `/dashboard`;
- nao inicia onboarding de salao.

Dashboard `/admin` deve mostrar:

- MRR;
- churn;
- crescimento;
- tenants ativos;
- tenants trial;
- campanhas globais;
- auditoria;
- saude operacional.

Nao deve operar tenant por padrao.

Tentar acessar sem modo suporte:

- `/dashboard`;
- `/agenda`;
- `/equipe`;
- `/servicos`.

Esperado:

- bloqueio de acesso operacional.

---

## 14. Modo Suporte / Auditoria

Usar API ou ferramenta HTTP com headers:

```text
Authorization: Bearer <token MasterAdmin>
x-support-mode: true
x-tenant-id: <tenantId alvo>
x-support-reason: Validacao operacional controlada
```

Testar rota operacional:

```text
GET /dashboard/summary
```

ou rota tenant equivalente.

Esperado:

- acesso permitido apenas com headers completos;
- evento `platform_support_access` criado em `event_logs`;
- sem `x-support-reason`, bloquear;
- sem `x-tenant-id`, bloquear;
- sem `x-support-mode`, bloquear.

---

## 15. Campanhas Globais

Como `MasterAdmin`, testar API `/admin/campaigns`.

Criar campanha:

- Nome: `Template Retorno Inteligente`
- Escopo: `template`
- Canal: `whatsapp`
- Tipo: `reativacao`
- Conteudo: mensagem generica

Esperado:

- campanha criada em `platform_campaigns`;
- nao aparece como campanha operacional do tenant;
- nao possui `tenant_id`;
- log de criacao em `event_logs`.

---

## 16. Isolamento Entre Tenants

Criar segundo tenant:

- `Studio Aurora`
- Admin: `admin.aurora@belloryteste.com`

Validar com admin do `Bellory Test Studio`:

- nao ve clientes do `Studio Aurora`;
- nao ve servicos do `Studio Aurora`;
- nao ve profissionais do `Studio Aurora`;
- nao agenda em profissional do outro tenant;
- nao acessa dashboard do outro tenant.

Resultado esperado:

Nenhuma consulta operacional vaza dados cross-tenant.

---

## 17. Menus Automaticos Por Permissao

Validar sidebar e menu mobile.

### Administrador

Ve menu amplo.

### Funcionario

Nao ve:

- Equipe;
- Financeiro;
- Configuracoes do salao;
- Campanhas, se nao tiver permissao.

### Terceiro

Ve apenas o que for compativel com agenda/servicos proprios.

### Autonomo Parceiro

Ve itens pessoais/operacionais, sem administracao do tenant terceiro.

Resultado esperado:

A UX continua simples. O usuario nao ve permissoes tecnicas, so menus coerentes.

---

## 18. Regressao De Agenda Apos RBAC

Com cada perfil abaixo, tentar acessar/criar agenda:

- Administrador: pode criar e gerenciar;
- Gerente: pode gerenciar;
- Recepcionista: pode criar/confirmar;
- Profissional: pode operar agenda propria;
- Funcionario: limitado ao proprio contexto;
- Terceiro: limitado ao proprio contexto;
- Cliente: nao acessa painel operacional.

Resultado esperado:

RBAC nao quebra o motor de agenda, mas limita corretamente o escopo.

---

## 19. Criterios De Aprovacao

Considerar a validacao aprovada se:

- cadastro inicial cria tenant funcional;
- memberships sao criados corretamente;
- dashboards mudam por role/membership;
- MasterAdmin fica separado da operacao;
- suporte exige auditoria;
- RBAC bloqueia rotas indevidas;
- horarios opcionais funcionam;
- motor de agenda respeita periodos `NULL`;
- nao ha vazamento entre tenants;
- menus sao filtrados automaticamente;
- usuarios limitados nao veem metricas administrativas.

## Sequencia Recomendada

1. Cadastro do primeiro tenant.
2. Onboarding.
3. Configuracao de equipe.
4. Configuracao de horarios.
5. Criacao de servicos/clientes.
6. Agendamento basico.
7. Teste RBAC por perfil.
8. Teste Autonomo owner/partner.
9. Teste MasterAdmin.
10. Teste suporte/auditoria.
11. Teste isolamento com segundo tenant.
