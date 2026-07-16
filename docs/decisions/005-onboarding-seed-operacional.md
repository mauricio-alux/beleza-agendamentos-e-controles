# ADR-005 - Seed Operacional no Onboarding

## Status

Aceito.

## Contexto

O Bellory precisa ativar rapidamente um novo salao apos o cadastro inicial. Para isso, o onboarding nao pode apenas criar usuario e tenant; ele precisa montar uma estrutura operacional minima para que o salao consiga testar agenda, servicos e equipe imediatamente.

Ao mesmo tempo, o sistema precisa evitar que essa estrutura inicial fique engessada. O salao deve poder ajustar seus servicos, especialidades autorizadas e vinculos operacionais depois do onboarding.

Com a evolucao da modelagem, ficou clara a separacao entre:

- catalogo estrutural/global;
- dados operacionais por tenant.

## Decisao

O onboarding cria um seed operacional inicial para cada tenant.

Esse seed inclui:

- configuracoes iniciais do tenant;
- profissional padrao;
- servicos iniciais;
- vinculos `servico_especialidades`;
- vinculos `profissional_servicos`;
- escala semanal padrao;
- link publico de agendamento;
- etapas em `onboarding_steps`.

Ao mesmo tempo, a manutencao posterior desses dados deve ocorrer pelas telas operacionais do tenant, principalmente em Configuracoes.

## Separacao Estrutural e Operacional

### Estrutural

As entidades estruturais representam taxonomia do produto Bellory.

Exemplos:

- `cargos`;
- `especialidades`.

Essas entidades sao usadas para padronizar a operacao e orientar UX, filtros e regras.

### Operacional por Tenant

As entidades operacionais representam a realidade de cada salao.

Exemplos:

- `servicos`;
- `servico_especialidades`;
- `profissionais`;
- `profissional_servicos`;
- `tenant_especialidades`;
- `escalas_semanais`;
- `links_agendamento`.

Essas entidades devem respeitar `tenant_id` e podem ser ajustadas pelo administrador do salao.

## Racional

Criar seed operacional no onboarding reduz friccao e acelera a percepcao de valor.

Sem seed inicial, o usuario teria que configurar manualmente servicos, profissional, escala e link antes de ver o sistema funcionando. Isso deixaria o Bellory parecido com um ERP burocratico.

Com seed inicial, o usuario entra no dashboard com uma operacao minima pronta.

Ao manter os vinculos em tabelas operacionais por tenant, o sistema evita engessamento e permite que cada salao ajuste a propria realidade.

## Consequencias Positivas

- Novo tenant nasce operacional.
- Agenda, equipe e servicos ja possuem dados iniciais.
- Onboarding transmite valor rapidamente.
- `servico_especialidades` passa a ser fonte explicita para compatibilidade.
- Admin pode ajustar vinculos sem migration.
- Cargos e especialidades continuam padronizados.
- Servicos continuam customizaveis por tenant.

## Trade-offs

- O onboarding fica mais complexo porque provisiona varias entidades.
- E necessario manter retrocompatibilidade entre seed inicial e manutencao posterior.
- Fallbacks por compatibilidade inferida podem existir temporariamente.
- Inconsistencias antigas precisam ser tratadas com cuidado.

## Regras

- Toda entidade operacional criada no onboarding deve respeitar `tenant_id`.
- O onboarding nao deve alterar o catalogo global de cargos e especialidades para cada tenant.
- Vínculos entre servico e especialidade devem ser persistidos em `servico_especialidades`.
- Especialidades podem ter status operacional por tenant em `tenant_especialidades`.
- A manutencao posterior deve acontecer em telas administrativas, nao via migration.
- Profissionais nao devem receber servicos incompatíveis com suas especialidades.

## Impactos

### Onboarding

Passa a criar estrutura operacional minima, incluindo vinculos de servico e especialidade.

### Servicos

Servicos sao dados do tenant e podem ser criados/editados depois do onboarding.

### Especialidades

Especialidades continuam estruturais, mas o tenant pode ativar/inativar seu uso operacional.

### Equipe

A manutencao de profissionais deve consumir vinculos explicitos em `servico_especialidades`.

### Agenda

A agenda passa a depender de uma base mais consistente para saber quais profissionais podem executar quais servicos.

## Alternativas Consideradas

### Nao criar seed operacional

Rejeitada, pois aumentaria friccao inicial e retardaria a primeira experiencia de valor.

### Criar tudo como dado global

Rejeitada, pois misturaria a realidade de cada salao com a taxonomia estrutural do SaaS.

### Manter compatibilidade apenas por regras hardcoded

Rejeitada como solucao final, pois impede manutencao operacional pelo admin e dificulta expansao multi-tenant.

## Pontos de Evolucao

- Criar templates de seed por tipo de negocio.
- Reduzir e remover fallback textual quando a associacao explicita estiver consolidada.
- Adicionar testes automatizados de provisionamento.
- Criar auditoria detalhada do seed operacional.
- Permitir sugestoes inteligentes de servicos e especialidades por IA.

