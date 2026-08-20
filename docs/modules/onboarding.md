# Modulo Onboarding

Este documento descreve como o modulo de onboarding funciona tecnicamente no Bellory. A visao funcional passo a passo fica em `docs/flows/onboarding.md`.

## Responsabilidade

O modulo de onboarding e responsavel por transformar um cadastro inicial em um tenant operacional minimo.

Ele cria e conecta:

- tenant;
- usuario administrador;
- membership;
- assinatura trial;
- configuracoes iniciais;
- profissional padrao;
- servicos iniciais;
- vinculos `servico_tenant_especialidades`;
- vinculos `profissional_servico_especialidades`;
- escala semanal;
- link publico;
- progresso em `onboarding_steps`.

## Services Envolvidos

### Backend

Arquivo principal:

`backend/src/modules/onboarding/onboarding.service.js`

Responsabilidades principais:

- `createTenant`: orquestra a criacao completa do tenant a partir do cadastro inicial.
- `createTenantStructure`: cria a estrutura operacional inicial do tenant.
- `createInitialSettings`: cria configuracoes iniciais do tenant.
- `createDefaultProfessional`: cria o profissional padrao vinculado ao admin.
- `createDefaultServices`: cria/reutiliza catalogo e ofertas iniciais do tenant.
- `createDefaultServiceSpecialtyLinks`: cria configuracoes em `servico_tenant_especialidades`.
- `createProfessionalServiceLinks`: cria vinculos entre profissional padrao e combinacoes.
- `createDefaultSchedule`: cria escala semanal inicial.
- `createBookingLink`: cria link publico de agendamento.
- `updateOnboardingStatus`: registra status das etapas.
- `syncOnboardingServices`: sincroniza servicos alterados durante o onboarding.
- `completeOnboarding`: marca onboarding como concluido.
- `getStatus`: retorna progresso do onboarding.
- `updateStep`: atualiza etapa especifica.

Services externos usados:

- `planosService`: valida o plano escolhido.
- `subscriptionService`: cria assinatura trial.
- `tenantsRepository`: cria e atualiza tenant.
- `usuariosRepository`: cria usuario administrador.
- `membershipsRepository`: cria vinculo do usuario com o tenant.
- `eventLogsService`: registra eventos operacionais.
- `slug.service`: gera slug unico do tenant.

### Frontend

Principais arquivos:

- `frontend/src/app/onboarding/page.tsx`
- `frontend/src/components/onboarding/OnboardingFlow.tsx`
- `frontend/src/context/OnboardingProvider.tsx`
- `frontend/src/services/onboarding.service.ts`

Responsabilidades:

- carregar configuracoes do tenant;
- exibir fluxo de ativacao;
- salvar etapas;
- sincronizar servicos;
- concluir onboarding;
- redirecionar para o dashboard apos conclusao.
- exibir, na conclusao, a mensagem de primeiro convite com link publico e
  acoes de copiar, compartilhar e abrir WhatsApp.

## Repositories

Arquivo principal:

`backend/src/modules/onboarding/onboarding.repository.js`

Principais funcoes:

- `createConfiguracaoTenant`
- `findConfiguracaoTenant`
- `updateConfiguracaoTenant`
- `createProfissional`
- `findProfessionalByUser`
- `findServicesByTenant`
- `findCatalogByNameAndCategory`
- `createCatalog`
- `upsertCatalogCompatibilities`
- `upsertServiceOffer`
- `listSpecialties`
- `replaceServiceOfferConfigurations`
- `createProfissionalServiceSpecialtyLinks`
- `findProfessionalServices`
- `deactivateProfessionalServiceSpecialtyLinks`
- `createScales`
- `findScalesByProfessional`
- `createLinkAgendamento`
- `findBookingLinkByTenant`
- `upsertSteps`
- `listSteps`
- `updateStep`

Outros repositories envolvidos:

- `tenants.repository`
- `usuarios.repository`
- `memberships.repository`
- `settings.repository`, indiretamente via configuracoes posteriores;
- repositories de subscription/plano, conforme fluxo de assinatura.

## Endpoints

Rotas do modulo:

`backend/src/routes/onboarding.routes.js`

Endpoints principais:

| Metodo | Rota | Finalidade |
| --- | --- | --- |
| `GET` | `/onboarding/status` | Retorna progresso do onboarding do tenant atual. |
| `PATCH` | `/onboarding/steps/:step` | Atualiza uma etapa especifica do onboarding. |
| `POST` | `/onboarding/complete` | Marca o onboarding como concluido. |

Endpoints relacionados usados durante o fluxo:

| Metodo | Rota | Finalidade |
| --- | --- | --- |
| `POST` | `/auth/register` ou fluxo equivalente de cadastro | Inicia cadastro e provisionamento. |
| `GET` | `/tenant/settings` | Carrega configuracoes do tenant no frontend. |
| `PATCH` | `/tenant/settings` | Atualiza configuracoes durante o fluxo. |
| `GET` | `/services` | Lista servicos do tenant. |
| `PATCH` | `/services/:id` | Atualiza servico e vinculos com especialidades. |
| `GET` | `/tipos-negocio/ativos` | Lista tipos de negocio globais ativos para cadastro/onboarding. |
| `GET` | `/tipos-negocio/tenant/servicos-catalogo-disponiveis` | Retorna catalogo segmentado por tipos do tenant. |

## Payloads Principais

### Criacao de Tenant

Entrada conceitual:

```json
{
  "tenant": {
    "nome_fantasia": "Bellory Test Studio",
    "razao_social": "Bellory LTDA",
    "cpf_cnpj": "00000000000000",
    "email": "contato@bellory.com",
    "telefone": "+5511999999999",
    "tipo_negocio_id": "uuid-do-tipo-principal",
    "descricao_tipo_negocio": null,
    "timezone": "America/Sao_Paulo"
  },
  "admin": {
    "nome": "Marina Admin",
    "telefone": "+5511999999999",
    "tipo_usuario_operacional": "Administrador"
  },
  "plano_id": "uuid-do-plano",
  "servicos_iniciais": [
    {
      "nome": "Corte de Cabelo",
      "duracao_minutos": 45,
      "preco": 80,
      "categoria": "cabelo"
    }
  ]
}
```

Desde 2026-07-30, `tipo_negocio_id` e a referencia oficial do cadastro inicial.
O texto legado `tipo_negocio` pode existir por compatibilidade historica, mas
nao deve orientar catalogo, seed ou recomendacao. Ao criar tenant, o backend
grava o tipo principal em `tenant_tipos_negocio`. A selecao de tipo recomenda
servicos do catalogo oficial, mas nao cria ofertas automaticamente sem
confirmacao do tenant.

Desde a governanca 3.1.3.1, o cadastro inicial nao envia mais servicos padrao
para criacao automatica. Quando o onboarding sincronizar servicos escolhidos
explicitamente, o backend deve aceitar apenas catalogo canonico existente e
permitido pelos tipos ativos do tenant. O onboarding nao pode criar
`servicos_catalogo` nem `servico_catalogo_especialidades`.

### Atualizacao de Etapa

```json
{
  "status": "concluido",
  "metadata": {
    "services": [
      {
        "nome": "Escova",
        "duracao_minutos": 45,
        "preco": 70,
        "categoria": "cabelo"
      }
    ]
  }
}
```

### Resposta de Status

```json
{
  "steps": [],
  "total": 7,
  "completed": 6,
  "progress": 86
}
```

## Tabelas Utilizadas

### Identidade e Tenant

- `tenants`
- `usuarios`
- `tenant_memberships`

### Plano e Assinatura

- `planos`
- `assinaturas`

### Configuracoes

- `configuracoes_tenant`

### Operacao Inicial

- `profissionais`
- `servicos_catalogo`
- `servico_tenants`
- `servico_tenant_especialidades`
- `profissional_servico_especialidades`
- `especialidades`
- `cargos`
- `escalas_semanais`
- `links_agendamento`

### Progresso e Auditoria

- `onboarding_steps`
- `event_logs`

## Regras de Validacao

### Tenant

- Nao permitir criar novo tenant ativo para usuario que ja possui membership ativa.
- Normalizar email.
- Normalizar telefone para formato E.164 quando informado.
- Gerar slug unico a partir do nome fantasia.
- Criar tenant em status inicial `trial`.

### Plano e Assinatura

- Validar se o plano informado existe e esta disponivel.
- Criar assinatura trial vinculada ao tenant.

### Usuario Admin

- Criar usuario vinculado ao auth user.
- Definir papel operacional inicial.
- Criar membership ativa, primaria e owner.

### Servicos

- Criar/reutilizar ofertas informadas no onboarding ou usar lista padrao.
- A lista padrao vem da taxonomia oficial Bellory em `backend/src/constants/bellory-taxonomy.js`.
- Nao duplicar ofertas quando ja existem para o tenant.
- Atualizar metadata da oferta durante sincronizacao.
- Gravar metadata de taxonomia nas ofertas padrao, incluindo categoria oficial,
  acao operacional e especialidades oficiais sugeridas.

### Vinculos `servico_tenant_especialidades`

- Criar configuracoes iniciais priorizando as especialidades oficiais informadas na metadata do servico.
- Usar `servico_catalogo_especialidades` como compatibilidade tecnica.
- Respeitar a oferta do tenant em `servico_tenants`.
- Nao duplicar combinacao `servico_tenant_id + especialidade_id`.
- Permitir manutencao posterior pela area operacional de configuracoes.

### Profissional Padrao

- Criar profissional padrao somente se ainda nao existir para o usuario.
- Vincular o profissional ao usuario administrador.
- Marcar origem em metadata.

### Profissional x Servicos

- Criar vinculos iniciais entre profissional padrao e combinacoes
  `servico_tenant_especialidades`.
- Nao duplicar vinculos existentes.
- Desativar vinculos finais que deixaram de fazer parte da selecao refeita.

### Escala

- Criar escala semanal padrao somente se ainda nao existir para o profissional.
- Usar segunda a sexta, 09:00-18:00, intervalo 12:00-13:00.

### Link Publico

- Criar link publico baseado no slug do tenant.
- Reutilizar link existente quando ja houver link ativo de origem `onboarding`.

### Primeiro convite assistido

- Apos o link publico existir, o onboarding deve permitir que o tenant convide
  seus clientes atuais para agendar online.
- A experiencia deve apresentar mensagem pronta, link publico, copiar mensagem,
  copiar link, compartilhar e abrir WhatsApp quando tecnicamente possivel.
- O texto da interface deve evitar termos tecnicos como Cloud API, provider,
  template_id, endpoint, payload, lead ou audience.
- O envio da primeira mensagem acontece no WhatsApp App/Business App do tenant.
- O Bellory nao deve ler contatos, importar agenda, criar Lista de Transmissao
  ou confirmar entrega/leitura dessa primeira mensagem.
- Tenants com WhatsApp Business App + Cloud API em coexistencia tambem podem
  usar esse fluxo assistido; a API nao e obrigatoria para ativacao inicial.

### Preferencias de campanhas WhatsApp

Durante o onboarding, o tenant deve informar de forma simples:

- como usa WhatsApp no negocio: Business Platform/Cloud API, Business App,
  Messenger ou ainda nao usa;
- como prefere enviar campanhas: ele mesmo pelo WhatsApp, envio pela plataforma
  quando disponivel ou decidir a cada campanha;
- se escolher envio manual, qual distribuicao costuma usar: Lista de
  Transmissao, envio manual para contatos, outro metodo do WhatsApp ou decidir
  por campanha.

Essa configuracao inicial orienta o modo padrao de execucao, mas nao e
definitiva. Configuracoes operacionais devem permitir alteracao posterior por
Administrador ou Autonomo autorizado, respeitando RBAC e tenant isolation.

Usuarios internos cadastrados durante onboarding, equipe ou configuracoes nao
devem ser considerados destinatarios de campanhas do proprio tenant. A regra de
campanhas e exclusiva para clientes finais e deve ser aplicada no backend.

## Dependencias

### Auth

O onboarding depende de usuario autenticado e de `auth_user_id`.

O fluxo usa a identidade autenticada para:

- criar usuario interno;
- impedir duplicidade de tenant ativo;
- vincular membership;
- registrar eventos.

### Tenant

Todas as entidades operacionais criadas no onboarding devem receber `tenant_id`.

Isso inclui:

- configuracoes;
- profissional;
- servicos;
- vinculos;
- escala;
- link publico;
- etapas.

### Assinatura

O onboarding cria assinatura trial antes de liberar operacao completa.

Essa assinatura define o contexto comercial inicial do tenant e sera usada por middlewares de plano/assinatura.

### Servicos

Servicos sao ofertas por tenant em `servico_tenants`, derivadas de
`servicos_catalogo`.

O onboarding cria um catalogo minimo para permitir que agenda, equipe e dashboard tenham dados iniciais.

### Equipe

O profissional padrao permite que os servicos iniciais tenham executor operacional e escala.

Depois do onboarding, a equipe pode ser expandida na tela de equipe.

## Transacao e Rollback

O fluxo de criacao tenta executar o provisionamento de forma coordenada.

Se ocorrer erro depois da criacao do tenant, o sistema tenta executar rollback com exclusao definitiva do tenant criado.

Isso reduz risco de tenants incompletos durante falhas de provisionamento.

## Pontos de Manutencao Futura

- Tornar a criacao inicial totalmente transacional no banco, se a infraestrutura permitir.
- Extrair seed operacional para templates por tipo de negocio.
- Permitir templates diferentes para salao, barbearia, estetica e manicure.
- Reduzir dependencias documentais antigas depois da remocao fisica do legado.
- Normalizar dados legados criados antes da taxonomia oficial.
- Criar testes automatizados de provisionamento completo.
- Criar auditoria detalhada para cada entidade criada no onboarding.
- Permitir onboarding multi-unidade/franquia.
- Usar IA para sugerir servicos e especialidades com base no tipo de negocio.
- Melhorar tratamento de inconsistencias quando uma etapa e refeita parcialmente.
- Exibir no dashboard um resumo do que foi criado durante o onboarding.
- Evoluir o primeiro convite assistido para permitir registro explicito de
  campanha preparada/enviada manualmente, sem tratar isso como entrega tecnica.

## Atualizacao 2026-07-29 - Fase 8.3

O onboarding nao deve criar ou consultar `servicos`, `servico_especialidades`
ou `profissional_servicos`. Essas tabelas foram removidas fisicamente na Fase
8.3.

Provisionamento inicial deve criar/reutilizar somente o novo MER:
`servicos_catalogo`, `servico_tenants`, `servico_catalogo_especialidades`,
`servico_tenant_especialidades` e `profissional_servico_especialidades`.
