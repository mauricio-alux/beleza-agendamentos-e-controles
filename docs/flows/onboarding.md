# Fluxo de Onboarding

Este documento descreve o que acontece no onboarding do Bellory, do ponto de vista funcional. O objetivo e deixar claro quais dados iniciais sao criados para um novo salao/tenant e quais resultados devem ser verificados nos testes.

## Objetivo

O onboarding prepara o tenant para operar o SaaS logo apos o cadastro inicial. Ao final do fluxo, o salao deve ter:

- tenant criado;
- usuario administrador vinculado;
- assinatura trial criada;
- configuracoes iniciais;
- profissional padrao;
- servicos iniciais;
- vinculos entre servicos e especialidades;
- vinculos entre profissional e servicos;
- escala semanal inicial;
- link publico de agendamento;
- etapas do onboarding registradas.

## Inicio do Onboarding

O fluxo inicia quando um usuario conclui o cadastro inicial do salao. A entrada esperada inclui dados do tenant, dados do administrador, plano escolhido e, quando informado, uma lista de servicos iniciais.

Se o usuario ja possuir um tenant ativo vinculado, o fluxo deve ser bloqueado para evitar duplicidade operacional.

## Criacao do Tenant

O sistema cria o tenant do salao com dados comerciais e operacionais iniciais.

Sao definidos, entre outros:

- nome fantasia;
- razao social, quando informada;
- CPF/CNPJ, quando informado;
- email e telefone;
- tipo de negocio;
- slug publico;
- timezone;
- status inicial `trial`;
- configuracoes iniciais de agenda e onboarding.

O slug sera usado como base para o link publico de agendamento.

## Criacao do Admin

Apos criar o tenant, o sistema cria o usuario administrador do salao.

Esse usuario fica vinculado ao tenant por uma membership ativa. O papel operacional vem do cadastro/onboarding e normalmente representa o dono ou administrador inicial do salao.

O usuario tambem pode ser usado como origem do profissional padrao criado no onboarding.

## Criacao da Assinatura Trial

O onboarding cria a assinatura inicial em modo trial, vinculada ao plano escolhido.

Essa etapa garante que o tenant ja nasca com contexto de plano, limites e validade comercial basica para uso do SaaS.

## Configuracoes Iniciais

O sistema cria configuracoes operacionais iniciais para o tenant.

Exemplos:

- intervalo padrao da agenda;
- agenda online ativa;
- idioma `pt-BR`;
- moeda `BRL`;
- formato de agenda;
- horario inicial e final padrao;
- configuracoes iniciais de WhatsApp;
- configuracoes iniciais de IA;
- status do onboarding como em andamento.

Essas configuracoes podem ser ajustadas depois nas telas de configuracao.

## Criacao dos Servicos Iniciais

O onboarding cria os servicos iniciais do tenant.

Quando o cadastro informa servicos, o sistema usa essa lista. Quando nao informa, usa a lista padrao da taxonomia oficial Bellory:

- Corte de Cabelo;
- Escova;
- Coloracao;
- Hidratacao;
- Barba;
- Manicure.
- Pedicure;
- Maquiagem;
- Limpeza de Pele;
- Massagem;
- Design de Sobrancelhas;
- Extensao de Cilios.

Cada servico nasce com:

- tenant;
- nome;
- descricao, quando houver;
- duracao;
- preco;
- categoria;
- ordem de exibicao;
- metadata de origem;
- metadata de taxonomia, incluindo categoria oficial, acao operacional e especialidades oficiais sugeridas.

Os servicos sao dados operacionais do tenant. Portanto, cada salao pode manter seu proprio catalogo depois do onboarding.

## Criacao das Compatibilidades do Novo MER

Apos criar/reutilizar os servicos iniciais, o onboarding cria as
compatibilidades e configuracoes iniciais nas tabelas do novo MER:

- `servicos_catalogo`;
- `servico_tenants`;
- `servico_catalogo_especialidades`;
- `servico_tenant_especialidades`.

Essas configuracoes indicam quais especialidades podem executar cada servico e
quais preco, duracao, retorno e aceite online valem para o tenant.

Exemplos conceituais:

- Corte de Cabelo -> Corte Feminino ou Corte Masculino;
- Escova -> Escova;
- Hidratacao -> Hidratacao;
- Manicure -> Manicure, Nail Art ou outras especialidades compativeis conforme seed inicial.

Importante:

- `servicos_catalogo` representa o conceito global/canonico;
- `servico_tenants` representa a oferta por tenant;
- `especialidades` continuam sendo catalogo estrutural;
- `servico_tenant_especialidades` e a configuracao operacional por tenant;
- depois do onboarding, o admin pode ajustar os vinculos em Configuracoes > Servicos e especialidades.

## Criacao do Profissional Padrao

O sistema cria um profissional padrao vinculado ao usuario administrador.

Esse profissional serve para permitir que a agenda e os servicos iniciais ja tenham uma referencia operacional.

Dados esperados:

- tenant;
- usuario administrador;
- nome publico do admin;
- cargo inicial;
- aceite de agendamento online;
- ordem de exibicao;
- metadata indicando origem `onboarding`.

## Criacao dos Vinculos Profissional x Combinacoes

Depois de criar os servicos e o profissional padrao, o onboarding cria os vinculos em:

`profissional_servico_especialidades`

Isso autoriza o profissional inicial a executar as combinacoes de servico e
especialidade criadas no onboarding.

Cada vinculo pode conter:

- tenant;
- profissional;
- combinacao `servico_tenant_especialidade_id`;
- percentual de comissao, quando informado;
- status ativo.

## Criacao da Escala

O onboarding cria uma escala semanal inicial para o profissional padrao.

Padrao atual:

- segunda a sexta;
- inicio as 09:00;
- fim as 18:00;
- intervalo das 12:00 as 13:00;
- nao atende feriado;
- status ativo.

Essa escala serve como ponto de partida e pode ser alterada depois na manutencao de horarios da equipe.

## Criacao do Link Publico

O sistema cria um link publico de agendamento para o tenant.

Esse link usa o slug do salao e fica associado ao tenant. Quando houver profissional padrao, o link tambem pode referenciar esse profissional.

Resultado esperado:

- link ativo;
- origem `onboarding`;
- acesso publico habilitado;
- URL publica baseada no slug.

## Status e Etapas do Onboarding

O progresso do onboarding e registrado em `onboarding_steps`.

Etapas esperadas:

- `tenant_created`;
- `admin_created`;
- `services_created`;
- `professional_created`;
- `scale_created`;
- `booking_link_created`;
- `onboarding_completed`.

Durante a criacao inicial, as etapas principais ficam marcadas como concluidas e a etapa final pode permanecer pendente ate a conclusao formal do onboarding.

Quando o usuario conclui o onboarding, o tenant deve receber status de onboarding concluido nas configuracoes.

## Sincronizacao de Servicos Durante o Onboarding

Se o usuario altera a etapa de servicos no onboarding, o sistema sincroniza os servicos selecionados.

Comportamento esperado:

- cria servicos novos quando ainda nao existem;
- atualiza servicos existentes pelo nome;
- inativa servicos removidos da selecao;
- atualiza ofertas e combinacoes do novo MER;
- atualiza vinculos finais com o profissional padrao em
  `profissional_servico_especialidades`.

## Regras de Retrocompatibilidade

O onboarding deve continuar funcionando para tenants existentes e novos.

Regras importantes:

- nao duplicar tenant ativo para o mesmo usuario;
- nao duplicar servicos ja existentes;
- nao duplicar vinculos profissional x servico;
- criar compatibilidades em `servico_catalogo_especialidades` e configuracoes
  em `servico_tenant_especialidades` a partir das especialidades oficiais
  quando possivel;
- usar fallback por compatibilidade textual apenas quando o servico nao tiver metadata oficial suficiente;
- permitir ajuste manual posterior nas telas operacionais.

## Cenarios de Teste

### Cenario 1: Onboarding com servicos padrao

1. Criar um novo salao sem informar servicos customizados.
2. Concluir o cadastro inicial.
3. Verificar que foram criados os servicos padrao da taxonomia oficial Bellory.
4. Verificar que o profissional padrao foi criado.
5. Verificar que o profissional possui vinculos com os servicos iniciais.
6. Verificar que existem compatibilidades/configuracoes no novo MER priorizando as especialidades oficiais do catalogo.
7. Verificar que a escala padrao foi criada.
8. Verificar que o link publico foi criado.

Resultado esperado: tenant pronto para acessar dashboard, equipe, servicos e agenda inicial.

### Cenario 2: Onboarding com servicos informados

1. Criar um novo salao informando servicos personalizados.
2. Concluir o onboarding.
3. Verificar que os servicos informados foram criados com duracao, preco e categoria.
4. Verificar que as configuracoes `servico_tenant_especialidades` foram criadas quando houver compatibilidade inicial.
5. Verificar que o profissional padrao recebeu os servicos criados.

Resultado esperado: catalogo inicial reflete a escolha feita no onboarding.

### Cenario 3: Sincronizacao da etapa de servicos

1. Abrir etapa de servicos no onboarding.
2. Remover um servico existente.
3. Adicionar um novo servico.
4. Concluir a etapa.
5. Verificar que o servico removido foi inativado.
6. Verificar que o novo servico foi criado.
7. Verificar que os vinculos profissional x servico foram atualizados.
8. Verificar que as configuracoes do novo MER foram atualizadas para o novo servico.

Resultado esperado: catalogo do tenant sincronizado sem quebrar dados antigos.

### Cenario 4: Link publico

1. Criar um novo tenant.
2. Validar o slug gerado.
3. Verificar o registro de link de agendamento.
4. Acessar a URL publica baseada no slug.

Resultado esperado: link publico disponivel para agendamento.

### Cenario 5: Bloqueio de duplicidade

1. Usar um usuario que ja possui tenant ativo.
2. Tentar iniciar novo onboarding.

Resultado esperado: o sistema bloqueia a criacao duplicada de tenant ativo.

### Cenario 6: Ajuste posterior dos vinculos

1. Concluir onboarding.
2. Acessar Configuracoes > Servicos x Especialidades.
3. Alterar as especialidades autorizadas de um servico.
4. Acessar manutencao de equipe.
5. Selecionar cargo e especialidades do profissional.

Resultado esperado: a lista de servicos autorizados reflete os vinculos operacionais mantidos pelo admin.
