# Servicos

## Objetivo

Expor o catalogo de servicos, as ofertas do tenant e a configuracao operacional
por especialidade usando o novo MER de Servicos.

## Fontes oficiais

- `servicos_catalogo`: conceito global do servico.
- `servico_tenants`: oferta ativa ou inativa do tenant.
- `servico_catalogo_especialidades`: compatibilidade tecnica entre servico e
  especialidade.
- `servico_tenant_especialidades`: preco, duracao, retorno recomendado, status
  da combinacao e aceite de agendamento online.

`servicos` e `servico_especialidades` nao sao fonte definitiva para o modulo de
Servicos a partir da Fase 3.

## Endpoints

```http
GET /services/catalog
GET /services
GET /services/:id
GET /services/compatible-specialties
POST /services
PATCH /services/:id
DELETE /services/:id
```

## Contrato operacional

- `id` e `servico_tenant_id` identificam a oferta do tenant.
- `servico_catalogo_id` e `codigo_canonico` identificam o conceito global.
- `categoria` e `natureza` saem do catalogo, sem inferencia por nome.
- `preco`, `duracao_minutos`, `dias_retorno_recomendado` e
  `permite_online` saem da primeira configuracao ativa da oferta.
- `especialidades_config` contem a configuracao completa por especialidade.
- `preco` pode ser `null` quando nao ha valor confiavel.
- combinacoes disponiveis para agendamento online exigem
  `duracao_minutos > 0`.

## Regras

- Criar servico ativa ou cria registro em `servico_tenants`.
- Configuracoes por especialidade sao gravadas somente em
  `servico_tenant_especialidades`.
- Especialidades informadas precisam existir em
  `servico_catalogo_especialidades` para o servico do catalogo.
- PATCH de oferta nao altera conceito global do catalogo.
- DELETE desativa a oferta do tenant e suas configuracoes, sem remover dados.
- Servicos customizados usam `codigo_canonico` com prefixo `CUSTOM_`, categoria,
  nome normalizado e hash de tenant/categoria/nome.

## Frontend de Configuracoes

A partir da Fase 4, `/configuracoes/servicos` usa o contrato do novo MER:

- carrega o catalogo global por `GET /services/catalog`;
- lista ofertas do tenant por `GET /services`;
- carrega especialidades compativeis por `GET /services/compatible-specialties`
  usando `servico_catalogo_id`;
- atualiza oferta e configuracoes por `PATCH /services/:id`;
- desativa oferta por `PATCH /services/:id` com `ativo = false`.

A tela nao edita nome, categoria ou natureza do conceito global. Esses campos
aparecem como informacao de catalogo.

Desde 2026-08-05, a tela nao exibe mais o bloco manual "Adicionar oferta do
catalogo". Como `servico_tenants` materializa todos os servicos permitidos pelos
tipos ativos do tenant, a gestao operacional acontece somente na lista de
servicos disponibilizados ao tenant. O tenant ativa, desativa e configura
ofertas existentes; nao cria servico canonico, nao cria associacao global e nao
altera a matriz MasterAdmin.

Na lista de ofertas, a tela evita apresentar preco unico quando existem
configuracoes por especialidade. Cada combinacao exibe seu proprio preco,
duracao, retorno recomendado, status de agendamento online e status ativo. A
lista deve permanecer em ordem alfabetica pelo nome oficial de
`servicos_catalogo`, com ordenacao `pt-BR` estavel.

O icone de edicao de cada oferta abre o bloco de edicao com titulo
`Editando oferta: <nome do servico>`, rolagem suave, foco acessivel e destaque
temporario. O formulario mostra servico, categoria, natureza, tipos de negocio
que disponibilizam o servico, status da oferta e a grade de especialidades
configuraveis.

A tela aceita deep link `?servico=<servico_tenant_id>` para abrir diretamente o
editor de uma oferta do tenant ja carregada e validada contra a lista tenant-
scoped. Esse link e usado por visoes somente leitura, como
`/configuracoes/especialidades`, quando o usuario consulta os servicos
vinculados a uma especialidade.

Na grade de especialidades:

- `Ativa` controla se a combinacao servico + especialidade esta operacional
  para o tenant.
- `Agendamento online` mapeia
  `servico_tenant_especialidades.aceita_agendamento_online` e define se a
  combinacao podera ser escolhida pelo cliente no agendamento publico.
- quando `Ativa = false`, `Agendamento online` deve ficar desligado ou
  inoperante. O backend normaliza esse caso gravando/enviando
  `aceita_agendamento_online = false` para combinacoes inativas.

## Consumidores operacionais

A partir da Fase 5, Agenda interna, Booking publico, Agendamento e Historico
tambem consomem o novo MER:

- a escolha operacional usa `servico_tenants.id` como identificador do servico
  ofertado;
- especialidade, preco, duracao, retorno e aceite online saem de
  `servico_tenant_especialidades`;
- Booking publico lista apenas combinacoes ativas, online e com duracao
  positiva;
- Agenda e Booking exigem especialidade explicita quando houver mais de uma
  combinacao compativel;
- snapshots de agendamento e historico preservam as referencias do novo MER.

Continuam fora deste modulo: CRM e WhatsApp. Campanhas, Cupons,
`campaign-test:*` e Equipe ja consomem o novo MER nas fases posteriores.

## Profissional x combinacao

A partir da Fase 8.1, a relacao operacional final entre profissional e servico
e `profissional_servico_especialidades`, apontando para
`servico_tenant_especialidades`.

O sistema responde se um profissional pode executar uma combinacao verificando:

- a oferta do tenant em `servico_tenants`;
- a combinacao servico + especialidade em `servico_tenant_especialidades`;
- o vinculo ativo do profissional em `profissional_servico_especialidades`.

Historico: durante a Fase 8.1, as tabelas legadas ainda estavam fisicamente
presentes e nao deveriam receber novos consumidores operacionais. Essa
condicao foi superada pela Fase 8.3; o estado vigente e legado removido.

## Validacao operacional da Fase 5.1

Em 2026-07-29, a migration `20260729120000` foi aplicada no remoto
`djbuzarzbpcpixudpnmg` sem `supabase db push` generico.

O contrato operacional foi validado com:

- `servico_tenants.id` como identificador do servico ofertado;
- `servico_tenant_especialidades.preco` como fonte de preco;
- `servico_tenant_especialidades.duracao_minutos` como fonte de duracao;
- `profissional_especialidades` como fonte de compatibilidade profissional;
- snapshot e historico preservando referencias do novo MER.

## Fase 8.2 - FKs legadas

Em 2026-07-29, a migration `20260729180000` removeu as FKs remanescentes que
apontavam para `servicos`, `servico_especialidades` e
`profissional_servicos`. As tabelas e colunas legadas foram preservadas
fisicamente para transicao, auditoria e eventual backup antes da fase destrutiva
final.

A remocao fisica do MER legado fica tecnicamente liberada apos backup/export e
execucao explicita de uma fase propria de DROP. Nenhum DROP final das tabelas
legadas foi executado na Fase 8.2.

## Fase 8.3 - MER legado removido

Em 2026-07-29, a Fase 8.3 removeu fisicamente `servicos`,
`servico_especialidades` e `profissional_servicos` do schema `public`, apos
backup remoto validado em `backup_phase8_3_20260729_pre_drop`.

Este modulo deve considerar como fonte unica:

- `servicos_catalogo` para o conceito global/canonico;
- `servico_tenants` para a oferta do tenant;
- `servico_catalogo_especialidades` para compatibilidade tecnica;
- `servico_tenant_especialidades` para preco, duracao, retorno, aceite online e
  status operacional;
- `profissional_servico_especialidades` para autorizacao profissional por
  combinacao.

Nao devem ser criados novos fallbacks para as tabelas removidas.

## Tipos de negocio e catalogo por segmento

Em 2026-07-30, a evolucao `3.1.3` adicionou segmentacao global do catalogo por
tipo de negocio, sem alterar a fonte oficial do MER de Servicos.

Novas fontes:

- `tipos_negocio`: catalogo global SaaS de segmentos/modelos de negocio.
- `tipo_negocio_servicos_catalogo`: relacao N:N entre tipo de negocio e
  `servicos_catalogo`, em que associacao ativa significa servico aplicavel ao
  tipo de negocio. O campo `recomendado` desta tabela e legado/deprecated e nao
  deve orientar recomendacao funcional.
- `tenant_tipos_negocio`: relacao N:N entre tenant e tipo de negocio, com no
  maximo um tipo principal ativo por tenant.

Tipo de negocio nao e categoria de servico, cargo, profissao, especialidade,
oferta comercial nem catalogo por tenant. Ele define quais servicos sao
aplicaveis ao contexto do estabelecimento, mas nao define recomendacao
operacional, nao cria `servico_tenants` automaticamente e nao remove ofertas,
profissionais, agenda ou historico quando alterado.

Desde a simplificacao da Taxonomia V2, a fonte funcional de servicos
recomendados e exclusivamente `perfil_operacional_servicos.recomendado = true`.
Defaults operacionais continuam em `perfil_operacional_defaults` e sugerem
preco, duracao, retorno e online para inicializacao; nao definem
aplicabilidade nem oferta real permanente do tenant.

Desde 2026-08-05, a cadeia oficial do Bellory e:

```text
MasterAdmin
-> tipos_negocio
-> tipo_negocio_servicos_catalogo
-> tenant_tipos_negocio
-> servico_tenants
-> servico_tenant_especialidades
-> profissional_servico_especialidades
-> Agenda / Campanhas / CRM / Cupons / Booking Publico
```

`servico_tenants` materializa todos os servicos disponibilizados ao tenant em
funcao dos tipos ativos. A ausencia do registro nao deve ser usada como regra
de indisponibilidade. O campo `ativo` significa somente que o tenant oferece o
servico; quando `ativo = false`, o servico esta disponivel para ativacao, mas
nao deve aparecer em Agenda, Booking, Campanhas, CRM ou Cupons.

A sincronizacao oficial fica centralizada em
`backend/src/modules/services/tenant-service-catalog-sync.service.js`. Ela e
idempotente, cria apenas registros ausentes em `servico_tenants` com
`ativo = false` e preserva registros existentes, configuracoes, precos,
duracao, especialidades, profissionais, historico e snapshots.

Em `/configuracoes/salao`, a manutencao dos tipos do tenant usa dois contextos
distintos:

- tipo principal: obrigatorio, unico e gravado com `principal = true`;
- tipos complementares: opcionais, sem duplicidade e sem o tipo principal.

O payload do frontend deve enviar `principal_tipo_negocio_id` separado de
`tipo_negocio_ids`. `tipo_negocio_ids` representa somente a lista final de
complementares; lista vazia e valida quando o tenant deve ficar apenas com o
tipo principal.

Antes de remover complementares, o backend recalcula o catalogo permitido pelos
tipos restantes. Se houver ofertas ativas em `servico_tenants` dependentes
exclusivamente dos tipos removidos, a alteracao e bloqueada com
`TENANT_BUSINESS_TYPE_REMOVAL_IMPACT` e a resposta informa os servicos
afetados. Nenhum servico, configuracao, profissional, agenda ou historico e
apagado automaticamente.

`/configuracoes/servicos` deve apresentar os servicos disponibilizados ao
tenant em ordem alfabetica pelo nome oficial do catalogo e diferenciar:

- Servico disponivel: existe em `servico_tenants`, mas `ativo = false`;
- Servico ativo: existe em `servico_tenants` e `ativo = true`.

O catalogo adicional global nao deve aparecer para tenant. Tentativas diretas
via API de criar/ativar `servico_tenants` para servicos nao associados aos
tipos ativos do tenant devem ser rejeitadas pelo backend.

Em saneamentos de massa de teste, ofertas ja existentes tambem precisam ser
auditadas contra os tipos ativos do tenant antes de seed/validacao. Use
`npm run audit:tenant-service-catalog -- --tenant-id=<tenant_id> --only-invalid`
em `backend/`. O procedimento aplicado em 2026-08-03 esta documentado em
`docs/maintenance/saneamento-base-testes-novo-mer.md`.

Para a regra oficial de disponibilizacao, use a rotina central:

```bash
cd backend
npm run reconcile:tenant-service-catalog -- audit
npm run reconcile:tenant-service-catalog -- apply
npm run reconcile:tenant-service-catalog -- validate -- --tenant-id=<tenant_id>
```

`audit` consulta inconsistencias, `apply` cria somente `servico_tenants`
ausentes como `ativo = false`, e `validate` falha quando ainda houver faltantes,
duplicados ou incompatibilidades no escopo validado.

Governanca:

- `servicos_catalogo` e `servico_catalogo_especialidades` sao mantidos somente
  pelo MasterAdmin no Admin SaaS.
- `servico_tenants` e `servico_tenant_especialidades` sao tenant-scoped, mas
  sempre precisam respeitar o catalogo permitido e a compatibilidade global.
- O tenant nao pode criar servico canonico customizado nem alterar nome,
  codigo, categoria, natureza ou matriz global de especialidades.
- Cargos e especialidades profissionais nao autorizam servicos por inferencia.
  A autorizacao final de execucao profissional continua em
  `profissional_servico_especialidades`.

## Tela `/servicos`

Desde 2026-08-17, `/servicos` usa a implementacao aderente ao novo MER de
Servicos. A tela deixa de usar `nome + categoria` como chave operacional e
passa a editar ofertas por `servico_tenant_id`, carregando compatibilidades por
`servico_catalogo_id`.

O MasterAdmin mantem a taxonomia global:

- `servicos_catalogo.nome`;
- `servicos_catalogo.codigo_canonico`;
- `servicos_catalogo.categoria_key`;
- `servicos_catalogo.descricao`;
- `servicos_catalogo.natureza`;
- `servico_catalogo_especialidades`.

O estabelecimento mantem somente configuracao operacional:

- `servico_tenants.ativo`;
- especialidades selecionadas para sua oferta;
- `servico_tenant_especialidades.duracao_minutos`;
- `servico_tenant_especialidades.preco`;
- `servico_tenant_especialidades.dias_retorno_recomendado`;
- `servico_tenant_especialidades.aceita_agendamento_online`;
- `servico_tenant_especialidades.ativo`.

Na tela do estabelecimento, nome, categoria e natureza do servico sao exibidos
como informacao herdada do catalogo e nao sao enviados no `PATCH /services/:id`.
O payload de atualizacao deve conter apenas campos tenant-scoped, por exemplo:

```json
{
  "ativo": true,
  "especialidade_ids": ["<especialidade_id>"],
  "especialidades_config": [
    {
      "especialidade_id": "<especialidade_id>",
      "duracao_minutos": 60,
      "preco": 120,
      "dias_retorno_recomendado": 21,
      "aceita_agendamento_online": true,
      "ativo": true
    }
  ]
}
```

Especialidade customizada continua sendo tenant-scoped: e criada em
`especialidades` com `tenant_id` do estabelecimento, `is_official = false` e
`is_custom = true`. Ela pode ser usada na configuracao operacional do servico
quando pertencer ao proprio estabelecimento e a categoria oficial for
compativel com o servico de catalogo. Esse uso nao cria relacao global em
`servico_catalogo_especialidades`.
