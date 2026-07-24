-- Makes professional cargos dependent on the operational professional type:
-- Funcionario/Terceiro use operational cargos; Profissional Adm uses administrative cargos.

alter table public.cargos
  add column if not exists categoria_profissional varchar(30) not null default 'operacional';

alter table public.cargos
  drop constraint if exists cargos_categoria_profissional_check;

alter table public.cargos
  add constraint cargos_categoria_profissional_check check (
    categoria_profissional in ('operacional', 'administrativo')
  );

update public.cargos
set categoria_profissional = 'administrativo'
where lower(trim(nome)) in (
  'recepcionista',
  'secretaria',
  'secretária',
  'caixa',
  'auxiliar administrativo',
  'assistente operacional',
  'supervisor(a)',
  'gerente',
  'coordenador(a)',
  'financeiro',
  'rh',
  'marketing',
  'faxineira(o)',
  'zelador(a)',
  'estoquista',
  'auxiliar de limpeza',
  'seguranca',
  'segurança',
  'atendente',
  'concierge'
);

with seed_cargos(nome, descricao, categoria_profissional) as (
  values
    ('Cabeleireiro', 'Profissional de cabelos e tratamentos capilares.', 'operacional'),
    ('Manicure/Pedicure', 'Profissional de unhas, maos e pes.', 'operacional'),
    ('Esteticista', 'Profissional de estetica facial e corporal.', 'operacional'),
    ('Maquiador', 'Profissional de maquiagem social, eventos e producoes.', 'operacional'),
    ('Barbeiro', 'Profissional de barba, cabelo masculino e acabamento.', 'operacional'),
    ('Podologo', 'Profissional de cuidados especializados com os pes.', 'operacional'),
    ('Massagista', 'Profissional de massagens e bem-estar.', 'operacional'),
    ('Fisioterapeuta', 'Profissional de fisioterapia e terapias corporais.', 'operacional'),
    ('Designer de sobrancelhas', 'Profissional de design e manutencao de sobrancelhas.', 'operacional'),
    ('Lash designer', 'Profissional de extensao e manutencao de cilios.', 'operacional'),
    ('Colorista', 'Profissional de coloracao, tonalizacao e correcao de cor.', 'operacional'),
    ('Trancista', 'Profissional de trancas e penteados afro.', 'operacional'),
    ('Micropigmentador', 'Profissional de micropigmentacao estetica.', 'operacional'),
    ('Terapeuta capilar', 'Profissional de tratamentos do couro cabeludo e fios.', 'operacional'),
    ('Nail designer', 'Profissional de alongamento, decoracao e design de unhas.', 'operacional'),
    ('Depilador(a)', 'Profissional de depilacao e cuidados corporais.', 'operacional'),
    ('Biomedico esteta', 'Profissional de procedimentos esteticos biomedicos.', 'operacional'),
    ('Harmonizacao facial', 'Profissional de procedimentos de harmonizacao facial.', 'operacional'),
    ('Instrutor(a) de beleza', 'Profissional de treinamento tecnico de beleza.', 'operacional'),
    ('Consultor(a) de imagem', 'Profissional de consultoria de imagem e estilo.', 'operacional'),
    ('Recepcionista', 'Profissional de recepcao e atendimento.', 'administrativo'),
    ('Secretaria', 'Profissional de suporte administrativo e agenda.', 'administrativo'),
    ('Caixa', 'Profissional de caixa e fechamento financeiro.', 'administrativo'),
    ('Auxiliar administrativo', 'Profissional de apoio administrativo.', 'administrativo'),
    ('Assistente operacional', 'Profissional de apoio a rotinas operacionais.', 'administrativo'),
    ('Supervisor(a)', 'Profissional de supervisao de equipe.', 'administrativo'),
    ('Gerente', 'Profissional de gestao da unidade.', 'administrativo'),
    ('Coordenador(a)', 'Profissional de coordenacao operacional.', 'administrativo'),
    ('Financeiro', 'Profissional de rotinas financeiras.', 'administrativo'),
    ('RH', 'Profissional de recursos humanos.', 'administrativo'),
    ('Marketing', 'Profissional de marketing e comunicacao.', 'administrativo'),
    ('Faxineira(o)', 'Profissional de limpeza e conservacao.', 'administrativo'),
    ('Zelador(a)', 'Profissional de zeladoria.', 'administrativo'),
    ('Estoquista', 'Profissional de estoque e insumos.', 'administrativo'),
    ('Auxiliar de limpeza', 'Profissional de apoio a limpeza.', 'administrativo'),
    ('Seguranca', 'Profissional de seguranca patrimonial.', 'administrativo'),
    ('Atendente', 'Profissional de atendimento ao cliente.', 'administrativo'),
    ('Concierge', 'Profissional de recepcao premium e experiencia do cliente.', 'administrativo')
)
insert into public.cargos (nome, descricao, categoria_profissional)
select nome, descricao, categoria_profissional
from seed_cargos
on conflict do nothing;

update public.cargos c
set categoria_profissional = sc.categoria_profissional,
    descricao = coalesce(c.descricao, sc.descricao)
from (
  values
    ('Cabeleireiro', 'operacional', 'Profissional de cabelos e tratamentos capilares.'),
    ('Manicure/Pedicure', 'operacional', 'Profissional de unhas, maos e pes.'),
    ('Esteticista', 'operacional', 'Profissional de estetica facial e corporal.'),
    ('Maquiador', 'operacional', 'Profissional de maquiagem social, eventos e producoes.'),
    ('Barbeiro', 'operacional', 'Profissional de barba, cabelo masculino e acabamento.'),
    ('Recepcionista', 'administrativo', 'Profissional de recepcao e atendimento.'),
    ('Secretaria', 'administrativo', 'Profissional de suporte administrativo e agenda.'),
    ('Caixa', 'administrativo', 'Profissional de caixa e fechamento financeiro.'),
    ('Auxiliar administrativo', 'administrativo', 'Profissional de apoio administrativo.'),
    ('Gerente', 'administrativo', 'Profissional de gestao da unidade.'),
    ('Financeiro', 'administrativo', 'Profissional de rotinas financeiras.'),
    ('Atendente', 'administrativo', 'Profissional de atendimento ao cliente.')
) as sc(nome, categoria_profissional, descricao)
where lower(trim(c.nome)) = lower(trim(sc.nome));

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.codigo in ('agenda.read', 'clientes.read')
where r.nome = 'Profissional Adm'
  and r.escopo = 'tenant'
on conflict do nothing;