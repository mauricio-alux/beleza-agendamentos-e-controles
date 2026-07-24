# Primeiro Convite para Agendamento via WhatsApp

## Decisao funcional

O primeiro convite para agendamento nao depende de importacao obrigatoria de
contatos do celular, VCF, CSV, Google Contacts ou Contact Picker.

Esse fluxo usa o WhatsApp App ou WhatsApp Business App do proprio tenant como
canal assistido de ativacao inicial. O Bellory prepara a mensagem e o link
publico de agendamento, mas o envio da primeira mensagem e uma acao manual do
tenant dentro do WhatsApp.

Mesmo quando o tenant possui WhatsApp Business Platform/Cloud API e usa
coexistencia App + API no mesmo numero, a primeira ativacao pode continuar pelo
modo assistido. Coexistencia nao concede ao Bellory acesso automatico a agenda,
contatos, conversas ou Listas de Transmissao do aplicativo.

## Objetivo

Trazer para o Bellory clientes e contatos que o salao ou profissional ja possui
fora do SaaS.

```text
Tenant
  -> Bellory prepara mensagem de convite
  -> Bellory exibe link publico /agendar/{tenant_slug}
  -> Tenant copia, compartilha ou abre WhatsApp
  -> Tenant envia manualmente para contatos ou Lista de Transmissao
  -> Contato acessa o link publico
  -> Bellory identifica ou solicita nome e WhatsApp
  -> Contato realiza o primeiro agendamento
  -> Cliente passa a integrar a base do tenant no Bellory
```

## Momento A - Ativacao inicial

Destinatarios:

- contatos existentes no WhatsApp ou agenda do tenant;
- clientes reais do salao ainda nao cadastrados no Bellory;
- pessoas que ainda nao participam de segmentacao interna do SaaS.

Canal preferencial:

- WhatsApp App;
- WhatsApp Business App;
- Lista de Transmissao, quando fizer sentido para o tenant.

Responsabilidade do Bellory:

- gerar mensagem pronta;
- inserir nome do salao/profissional quando aplicavel;
- inserir link publico de agendamento;
- permitir copiar mensagem;
- permitir copiar link;
- permitir compartilhar;
- abrir WhatsApp quando tecnicamente possivel;
- explicar que o envio acontece no aplicativo do tenant.

O Bellory nao deve:

- ler contatos do celular;
- importar contatos automaticamente;
- criar clientes antecipadamente;
- criar ou gerenciar Lista de Transmissao;
- confirmar entrega, leitura ou falha individual;
- obrigar uso da Cloud API para esse primeiro convite.

## Momento B - Relacionamento continuo

Depois do primeiro acesso/agendamento, o Bellory passa a possuir cliente,
telefone, vinculo com tenant, historico e contexto operacional aplicavel.

A partir desse momento, o cliente pode participar de:

- lembretes;
- confirmacoes;
- reagendamentos;
- pos-atendimento;
- campanhas;
- recuperacao de inativos;
- aniversarios;
- fidelizacao.

Quando houver WhatsApp Business API configurada e regras atendidas, essas
comunicacoes podem usar o fluxo automatico com `templates_mensagem`,
`campanha_envios`, `mensagens_whatsapp`, `CommunicationService`, templates
aprovados, consentimento e opt-out.

## Lista de Transmissao

Lista de Transmissao e recurso nativo do WhatsApp App/Business App. O Bellory
pode recomendar seu uso como uma opcao simples para o primeiro convite, mas nao
controla a lista nem seus integrantes.

Limitacao importante: Listas de Transmissao tendem a entregar apenas para
contatos que salvaram o numero do salao/profissional na agenda do celular.
Portanto, sao mais adequadas para clientes recorrentes e nao substituem Cloud
API ou midia paga para prospeccao ampla.

## Primeiro acesso pelo link

Ao acessar `/agendar/{tenant_slug}`, o fluxo publico deve:

1. Validar link, tenant e contexto publico.
2. Verificar token/identidade existente quando aplicavel.
3. Se nao houver identificacao valida, solicitar nome e WhatsApp; email e
   opcional.
4. Procurar cliente dentro do tenant atual pelo telefone normalizado.
5. Reutilizar ou criar cliente/vinculo sem duplicar cadastro.
6. Permitir prosseguir para escolha de servico, profissional, data e horario.

Esse fluxo preserva a regra de que clientes nascem no Bellory por identificacao
ou agendamento, nao por pertencerem aos contatos do celular do tenant.
