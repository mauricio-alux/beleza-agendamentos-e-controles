# 012 - Identidade progressiva em links publicos

## Status

Aceita.

## Contexto

Links de campanha precisam atribuir conversoes sem exigir login, enquanto links
individuais devem reconhecer clientes recorrentes sem expor dados pessoais.

## Decisao

- A identidade publica e tenant-scoped.
- O WhatsApp normalizado identifica o cliente dentro do tenant.
- O backend e a autoridade para criar, localizar e atualizar clientes.
- Tokens usam 32 bytes aleatorios e somente o hash SHA-256 e persistido.
- Tokens possuem expiracao configuravel e sao revogados na reemissao.
- O frontend reconhece por token da URL, armazenamento local autorizado ou
  identificacao manual.
- Quando nao houver token valido, nome e Celular/WhatsApp sao obrigatorios e
  email permanece opcional.
- A reidentificacao manual por `tenant_id + celular_normalizado` deve gerar um
  novo token, armazenar no navegador quando autorizado e disparar a mesma busca
  de agendamentos futuros usada no fluxo por token valido.
- Eventos de acesso, identificacao, retorno e agendamento registram a
  atribuicao de campanha.
- O backend resolve o `cliente_id`; IDs internos nao aparecem no link publico,
  mas o contrato de identidade pode devolver `clientId` para estado interno da
  aplicacao publica.

## Consequencias

- Links podem ser compartilhados sem PII.
- Um token de um tenant nao funciona em outro.
- O CRM registra primeiro e ultimo acesso publico.
- Campanhas futuras podem medir acesso e conversao pela mesma trilha.
- Exclusao, anonimizacao e opt-out continuam centralizados no CRM.
- Cliente reconhecido por telefone e cliente reconhecido por token devem ter a
  mesma experiencia: dados preenchidos, token vigente e agenda futura visivel
  sem novo acesso.
