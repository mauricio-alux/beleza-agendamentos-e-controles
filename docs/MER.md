Estrutura RECOMENDADA
Tabelas principais
tenants
usuarios
clientes
profissionais
servicos
agendas
campanhas
cupons
escalas
notificacoes
mensagens_whatsapp
crm_interacoes
________________________________________
PADRÃO GERAL OBRIGATÓRIO
Todas as tabelas devem conter:
id UUID PRIMARY KEY
created_at TIMESTAMP
updated_at TIMESTAMP
tenant_id UUID
ativo BOOLEAN
________________________________________
PADRONIZAÇÃO RECOMENDADA
Chaves
•	PK → UUID
•	FK → UUID
________________________________________
TIPOS RECOMENDADOS
Tipo	Uso
UUID	IDs
VARCHAR	textos curtos
TEXT	textos longos
BOOLEAN	flags
TIMESTAMP	data/hora
DATE	apenas data
TIME	apenas hora
INTEGER	números inteiros
NUMERIC(10,2)	financeiro
JSONB	IA/metadados
________________________________________
1. TABELA TENANTS
Representa:
•	salão
•	clínica
•	empresa
•	profissional autônomo
________________________________________
tenants
Campo	Tipo	Descrição
id	UUID PK	Identificador
nome_fantasia	VARCHAR(150)	Nome comercial
razao_social	VARCHAR(150)	Razão social
cpf_cnpj	VARCHAR(20)	Documento
email	VARCHAR(150)	Email principal
telefone	VARCHAR(20)	WhatsApp principal
plano	VARCHAR(30)	Plano SaaS
status	VARCHAR(20)	ativo/inativo
logo_url	TEXT	Logo
timezone	VARCHAR(50)	Timezone
created_at	TIMESTAMP	Criação
updated_at	TIMESTAMP	Atualização
ativo	BOOLEAN	Status lógico
________________________________________
Índices
INDEX idx_tenant_cpf_cnpj
INDEX idx_tenant_status
________________________________________
2. TABELA USUARIOS
Usuários autenticados do sistema.
________________________________________
usuarios
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
nome	VARCHAR(150)
email	VARCHAR(150)
senha_hash	TEXT
telefone	VARCHAR(20)
tipo_usuario	VARCHAR(30)
ultimo_login	TIMESTAMP
foto_url	TEXT
ativo	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
________________________________________
FK
tenant_id → tenants(id)
________________________________________
Índices
UNIQUE email
INDEX idx_usuario_tenant
INDEX idx_usuario_tipo
________________________________________
3. TABELA CLIENTES
Clientes finais.
________________________________________
clientes
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
nome	VARCHAR(150)
telefone	VARCHAR(20)
email	VARCHAR(150)
data_nascimento	DATE
sexo	VARCHAR(20)
observacoes	TEXT
token_acesso	TEXT
ultimo_atendimento	TIMESTAMP
total_gasto	NUMERIC(10,2)
qtd_atendimentos	INTEGER
ativo	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
________________________________________
Índices
INDEX idx_cliente_telefone
INDEX idx_cliente_nome
INDEX idx_cliente_tenant
________________________________________
4. TABELA PROFISSIONAIS
Profissionais operacionais.
________________________________________
profissionais
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
usuario_id	UUID FK
especialidade	VARCHAR(100)
percentual_comissao	NUMERIC(5,2)
valor_fixo	NUMERIC(10,2)
aceita_agendamento_online	BOOLEAN
bio	TEXT
instagram	VARCHAR(150)
foto_url	TEXT
ativo	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
________________________________________
FK
usuario_id → usuarios(id)
tenant_id → tenants(id)
________________________________________
5. TABELA SERVICOS
________________________________________
servicos
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
nome	VARCHAR(150)
descricao	TEXT
duracao_minutos	INTEGER
preco	NUMERIC(10,2)
cor_agenda	VARCHAR(20)
permite_online	BOOLEAN
categoria	VARCHAR(100)
ativo	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
________________________________________
Índices
INDEX idx_servico_tenant
INDEX idx_servico_categoria
________________________________________
6. TABELA AGENDAS
Essa é a tabela central do sistema.
________________________________________
agendas
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
cliente_id	UUID FK
profissional_id	UUID FK
servico_id	UUID FK
data_inicio	TIMESTAMP
data_fim	TIMESTAMP
status	VARCHAR(30)
origem	VARCHAR(30)
observacoes	TEXT
valor_servico	NUMERIC(10,2)
confirmado_em	TIMESTAMP
cancelado_em	TIMESTAMP
token_confirmacao	TEXT
ativo	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
________________________________________
Status recomendados
pendente
confirmado
cancelado
concluido
no_show
________________________________________
Índices IMPORTANTES
INDEX idx_agenda_data
INDEX idx_agenda_profissional
INDEX idx_agenda_cliente
INDEX idx_agenda_status
INDEX idx_agenda_tenant
________________________________________
7. TABELA CAMPANHAS
________________________________________
campanhas
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
nome	VARCHAR(150)
descricao	TEXT
tipo	VARCHAR(50)
imagem_url	TEXT
data_inicio	DATE
data_fim	DATE
status	VARCHAR(30)
publico_alvo	JSONB
ativo	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
________________________________________
8. TABELA CUPONS
________________________________________
cupons
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
codigo	VARCHAR(50)
descricao	TEXT
tipo_desconto	VARCHAR(30)
valor_desconto	NUMERIC(10,2)
percentual_desconto	NUMERIC(5,2)
data_inicio	DATE
data_fim	DATE
limite_uso	INTEGER
qtd_utilizada	INTEGER
ativo	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
________________________________________
Índices
UNIQUE codigo
INDEX idx_cupom_tenant
________________________________________
9. TABELA ESCALAS
________________________________________
escalas
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
profissional_id	UUID FK
dia_semana	INTEGER
hora_inicio	TIME
hora_fim	TIME
hora_intervalo_inicio	TIME
hora_intervalo_fim	TIME
atende_feriado	BOOLEAN
ativo	BOOLEAN
created_at	TIMESTAMP
updated_at	TIMESTAMP
________________________________________
10. TABELA NOTIFICACOES
________________________________________
notificacoes
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
usuario_id	UUID FK
titulo	VARCHAR(150)
mensagem	TEXT
tipo	VARCHAR(30)
lida	BOOLEAN
data_leitura	TIMESTAMP
created_at	TIMESTAMP
________________________________________
11. TABELA mensagens_whatsapp
Essa tabela será CRÍTICA futuramente.
________________________________________
mensagens_whatsapp
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
cliente_id	UUID FK
agenda_id	UUID FK
profissional_id	UUID FK
telefone_destino	VARCHAR(20)
template_nome	VARCHAR(100)
tipo_evento	VARCHAR(100)
provider	VARCHAR(80)
conteudo	TEXT
status_envio	VARCHAR(30)
provider_message_id	TEXT
enviado_em	TIMESTAMP
erro_envio	TEXT
payload	JSONB
created_at	TIMESTAMP
Observacao: `mensagens_whatsapp` tambem e o log de auditoria da camada
centralizada `CommunicationService`. O provider inicial e `whatsapp_mysaas`.
Falhas de envio devem ser registradas em `erro_envio` e `payload`, sem bloquear
o fluxo de negocio que originou o evento.
________________________________________
12. TABELA crm_interacoes
Essa tabela é extremamente estratégica.
________________________________________
crm_interacoes
Campo	Tipo
id	UUID PK
tenant_id	UUID FK
cliente_id	UUID FK
usuario_id	UUID FK
tipo_interacao	VARCHAR(50)
descricao	TEXT
origem	VARCHAR(50)
score_relacionamento	INTEGER
metadata	JSONB
created_at	TIMESTAMP
________________________________________
RELACIONAMENTOS PRINCIPAIS
tenants 1:N usuarios
tenants 1:N clientes
tenants 1:N profissionais
tenants 1:N agendas
tenants 1:N campanhas

usuarios 1:1 profissionais

clientes 1:N agendas
clientes 1:N crm_interacoes

profissionais 1:N agendas
profissionais 1:N escalas

servicos 1:N agendas
________________________________________
ÍNDICES MAIS IMPORTANTES DO SISTEMA
Performance crítica
agenda(data_inicio)
agenda(profissional_id, data_inicio)
agenda(cliente_id)
mensagens_whatsapp(status_envio)
crm_interacoes(cliente_id)
