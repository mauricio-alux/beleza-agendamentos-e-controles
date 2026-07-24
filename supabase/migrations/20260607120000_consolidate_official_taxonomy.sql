-- Consolidates Bellory official taxonomy as the canonical source for service
-- categories and operational compatibility.

create table if not exists public.taxonomia_categorias (
  key varchar(80) primary key,
  label varchar(120) not null,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taxonomia_servicos (
  key varchar(120) primary key,
  nome varchar(150) not null unique,
  acao varchar(150) not null,
  categoria_key varchar(80) not null references public.taxonomia_categorias(key) on delete restrict,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taxonomia_especialidades (
  key varchar(120) primary key,
  nome varchar(150) not null unique,
  cargo_nome varchar(120) not null,
  categoria_key varchar(80) not null references public.taxonomia_categorias(key) on delete restrict,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.taxonomia_servico_especialidades (
  servico_key varchar(120) not null references public.taxonomia_servicos(key) on delete cascade,
  especialidade_key varchar(120) not null references public.taxonomia_especialidades(key) on delete restrict,
  created_at timestamptz not null default now(),
  primary key (servico_key, especialidade_key)
);

alter table public.taxonomia_categorias enable row level security;
alter table public.taxonomia_servicos enable row level security;
alter table public.taxonomia_especialidades enable row level security;
alter table public.taxonomia_servico_especialidades enable row level security;

drop policy if exists taxonomia_categorias_select_authenticated on public.taxonomia_categorias;
create policy taxonomia_categorias_select_authenticated
on public.taxonomia_categorias
for select
to authenticated
using (ativo = true);

drop policy if exists taxonomia_servicos_select_authenticated on public.taxonomia_servicos;
create policy taxonomia_servicos_select_authenticated
on public.taxonomia_servicos
for select
to authenticated
using (ativo = true);

drop policy if exists taxonomia_especialidades_select_authenticated on public.taxonomia_especialidades;
create policy taxonomia_especialidades_select_authenticated
on public.taxonomia_especialidades
for select
to authenticated
using (ativo = true);

drop policy if exists taxonomia_servico_especialidades_select_authenticated on public.taxonomia_servico_especialidades;
create policy taxonomia_servico_especialidades_select_authenticated
on public.taxonomia_servico_especialidades
for select
to authenticated
using (true);

drop trigger if exists set_updated_at on public.taxonomia_categorias;
create trigger set_updated_at
before update on public.taxonomia_categorias
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.taxonomia_servicos;
create trigger set_updated_at
before update on public.taxonomia_servicos
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.taxonomia_especialidades;
create trigger set_updated_at
before update on public.taxonomia_especialidades
for each row
execute function public.set_updated_at();

with categorias(key, label) as (
  values
    ('cabelo', 'Cabelo'),
    ('barba', 'Barba'),
    ('unhas', 'Unhas'),
    ('maquiagem', 'Maquiagem'),
    ('estetica_facial', 'Estetica Facial'),
    ('estetica_corporal', 'Estetica Corporal'),
    ('podologia', 'Podologia'),
    ('massoterapia', 'Massoterapia'),
    ('terapia_capilar', 'Terapia Capilar'),
    ('sobrancelhas', 'Sobrancelhas'),
    ('cilios', 'Cilios')
)
insert into public.taxonomia_categorias (key, label)
select key, label from categorias
on conflict (key) do update
set label = excluded.label,
    ativo = true;

with servicos(key, nome, acao, categoria_key) as (
  values
    ('corte_de_cabelo', 'Corte de Cabelo', 'Cortar cabelo', 'cabelo'),
    ('escova', 'Escova', 'Fazer escova', 'cabelo'),
    ('coloracao', 'Coloracao', 'Colorir cabelo', 'cabelo'),
    ('hidratacao', 'Hidratacao', 'Hidratar cabelo', 'terapia_capilar'),
    ('barba', 'Barba', 'Fazer barba', 'barba'),
    ('manicure', 'Manicure', 'Fazer manicure', 'unhas'),
    ('pedicure', 'Pedicure', 'Fazer pedicure', 'unhas'),
    ('maquiagem', 'Maquiagem', 'Fazer maquiagem', 'maquiagem'),
    ('limpeza_de_pele', 'Limpeza de Pele', 'Fazer limpeza de pele', 'estetica_facial'),
    ('massagem', 'Massagem', 'Fazer massagem', 'massoterapia'),
    ('design_de_sobrancelhas', 'Design de Sobrancelhas', 'Fazer design de sobrancelhas', 'sobrancelhas'),
    ('extensao_de_cilios', 'Extensao de Cilios', 'Fazer extensao de cilios', 'cilios')
)
insert into public.taxonomia_servicos (key, nome, acao, categoria_key)
select key, nome, acao, categoria_key from servicos
on conflict (key) do update
set nome = excluded.nome,
    acao = excluded.acao,
    categoria_key = excluded.categoria_key,
    ativo = true;

with especialidades(key, nome, cargo_nome, categoria_key) as (
  values
    ('corte_feminino', 'Corte Feminino', 'Cabeleireira', 'cabelo'),
    ('corte_masculino', 'Corte Masculino', 'Cabeleireira', 'cabelo'),
    ('corte_infantil', 'Corte Infantil', 'Cabeleireira', 'cabelo'),
    ('corte_degrade', 'Corte Degrade', 'Cabeleireira', 'cabelo'),
    ('escova_simples', 'Escova Simples', 'Cabeleireira', 'cabelo'),
    ('escova_modelada', 'Escova Modelada', 'Cabeleireira', 'cabelo'),
    ('escova_progressiva', 'Escova Progressiva', 'Cabeleireira', 'cabelo'),
    ('coloracao_global', 'Coloracao Global', 'Cabeleireira', 'cabelo'),
    ('tonalizacao', 'Tonalizacao', 'Cabeleireira', 'cabelo'),
    ('mechas', 'Mechas', 'Cabeleireira', 'cabelo'),
    ('luzes', 'Luzes', 'Cabeleireira', 'cabelo'),
    ('hidratacao_capilar', 'Hidratacao Capilar', 'Terapeuta Capilar', 'terapia_capilar'),
    ('reconstrucao_capilar', 'Reconstrucao Capilar', 'Terapeuta Capilar', 'terapia_capilar'),
    ('tratamento_do_couro_cabeludo', 'Tratamento do Couro Cabeludo', 'Terapeuta Capilar', 'terapia_capilar'),
    ('barba_tradicional', 'Barba Tradicional', 'Barbeiro', 'barba'),
    ('barba_desenhada', 'Barba Desenhada', 'Barbeiro', 'barba'),
    ('nail_art', 'Nail Art', 'Manicure', 'unhas'),
    ('blindagem', 'Blindagem', 'Manicure', 'unhas'),
    ('fibra', 'Fibra', 'Manicure', 'unhas'),
    ('banho_em_gel', 'Banho em Gel', 'Manicure', 'unhas'),
    ('pedicure_tradicional', 'Pedicure Tradicional', 'Manicure', 'unhas'),
    ('spa_dos_pes', 'Spa dos Pes', 'Manicure', 'unhas'),
    ('maquiagem_social', 'Maquiagem Social', 'Maquiadora', 'maquiagem'),
    ('maquiagem_noiva', 'Maquiagem Noiva', 'Maquiadora', 'maquiagem'),
    ('limpeza_de_pele', 'Limpeza de Pele', 'Esteticista', 'estetica_facial'),
    ('hidratacao_facial', 'Hidratacao Facial', 'Esteticista', 'estetica_facial'),
    ('massagem_relaxante', 'Massagem Relaxante', 'Massoterapeuta', 'massoterapia'),
    ('massagem_terapeutica', 'Massagem Terapeutica', 'Massoterapeuta', 'massoterapia'),
    ('drenagem_linfatica', 'Drenagem Linfatica', 'Massoterapeuta', 'massoterapia'),
    ('design_de_sobrancelhas', 'Design de Sobrancelhas', 'Designer de Sobrancelhas', 'sobrancelhas'),
    ('henna', 'Henna', 'Designer de Sobrancelhas', 'sobrancelhas'),
    ('extensao_de_cilios', 'Extensao de Cilios', 'Lash Designer', 'cilios'),
    ('manutencao_de_cilios', 'Manutencao de Cilios', 'Lash Designer', 'cilios')
)
insert into public.taxonomia_especialidades (key, nome, cargo_nome, categoria_key)
select key, nome, cargo_nome, categoria_key from especialidades
on conflict (key) do update
set nome = excluded.nome,
    cargo_nome = excluded.cargo_nome,
    categoria_key = excluded.categoria_key,
    ativo = true;

with vinculos(servico_key, especialidade_key) as (
  values
    ('corte_de_cabelo', 'corte_feminino'),
    ('corte_de_cabelo', 'corte_masculino'),
    ('corte_de_cabelo', 'corte_infantil'),
    ('corte_de_cabelo', 'corte_degrade'),
    ('escova', 'escova_simples'),
    ('escova', 'escova_modelada'),
    ('escova', 'escova_progressiva'),
    ('coloracao', 'coloracao_global'),
    ('coloracao', 'tonalizacao'),
    ('coloracao', 'mechas'),
    ('coloracao', 'luzes'),
    ('hidratacao', 'hidratacao_capilar'),
    ('hidratacao', 'reconstrucao_capilar'),
    ('hidratacao', 'tratamento_do_couro_cabeludo'),
    ('barba', 'barba_tradicional'),
    ('barba', 'barba_desenhada'),
    ('manicure', 'nail_art'),
    ('manicure', 'blindagem'),
    ('manicure', 'fibra'),
    ('manicure', 'banho_em_gel'),
    ('pedicure', 'pedicure_tradicional'),
    ('pedicure', 'spa_dos_pes'),
    ('maquiagem', 'maquiagem_social'),
    ('maquiagem', 'maquiagem_noiva'),
    ('limpeza_de_pele', 'limpeza_de_pele'),
    ('limpeza_de_pele', 'hidratacao_facial'),
    ('massagem', 'massagem_relaxante'),
    ('massagem', 'massagem_terapeutica'),
    ('massagem', 'drenagem_linfatica'),
    ('design_de_sobrancelhas', 'design_de_sobrancelhas'),
    ('design_de_sobrancelhas', 'henna'),
    ('extensao_de_cilios', 'extensao_de_cilios'),
    ('extensao_de_cilios', 'manutencao_de_cilios')
)
insert into public.taxonomia_servico_especialidades (servico_key, especialidade_key)
select servico_key, especialidade_key from vinculos
on conflict do nothing;

update public.servicos
set categoria = case lower(trim(categoria))
  when 'manicure' then 'unhas'
  when 'pedicure' then 'unhas'
  when 'estetica' then 'estetica_facial'
  when 'massagem' then 'massoterapia'
  when 'sobrancelha' then 'sobrancelhas'
  when 'tratamento' then 'terapia_capilar'
  when 'tintura_coloracao' then 'cabelo'
  else categoria
end
where categoria is not null;

update public.servicos s
set nome = 'Corte de Cabelo'
where lower(trim(s.nome)) = 'corte';

alter table public.servicos
  drop constraint if exists servicos_categoria_taxonomia_check;

alter table public.servicos
  add constraint servicos_categoria_taxonomia_check check (
    categoria is null or categoria in (
      'cabelo',
      'barba',
      'unhas',
      'maquiagem',
      'estetica_facial',
      'estetica_corporal',
      'podologia',
      'massoterapia',
      'terapia_capilar',
      'sobrancelhas',
      'cilios'
    )
  );

with canonical_cargos(nome, descricao, categoria_profissional) as (
  values
    ('Cabeleireira', 'Profissional de cabelos, finalizacao e tratamentos capilares.', 'operacional'),
    ('Barbeiro', 'Profissional de barba, cabelo masculino e acabamento.', 'operacional'),
    ('Manicure', 'Profissional de cuidados, embelezamento e design de unhas.', 'operacional'),
    ('Esteticista', 'Profissional de estetica facial e corporal.', 'operacional'),
    ('Maquiadora', 'Profissional de maquiagem social, eventos e producoes.', 'operacional'),
    ('Podologa', 'Profissional de cuidados especializados com os pes.', 'operacional'),
    ('Massoterapeuta', 'Profissional de massagens e bem-estar.', 'operacional'),
    ('Lash Designer', 'Profissional de extensao e manutencao de cilios.', 'operacional'),
    ('Designer de Sobrancelhas', 'Profissional de design e manutencao de sobrancelhas.', 'operacional'),
    ('Terapeuta Capilar', 'Profissional de tratamentos do couro cabeludo e fios.', 'operacional'),
    ('Recepcionista', 'Profissional de recepcao e atendimento.', 'administrativo'),
    ('Secretaria', 'Profissional de suporte administrativo e agenda.', 'administrativo'),
    ('Caixa', 'Profissional de caixa e fechamento financeiro.', 'administrativo'),
    ('Auxiliar Administrativo', 'Profissional de apoio administrativo.', 'administrativo'),
    ('Assistente Operacional', 'Profissional de apoio a rotinas operacionais.', 'administrativo'),
    ('Gerente', 'Profissional de gestao da unidade.', 'administrativo'),
    ('Coordenadora', 'Profissional de coordenacao operacional.', 'administrativo'),
    ('Financeiro', 'Profissional de rotinas financeiras.', 'administrativo'),
    ('Marketing', 'Profissional de marketing e comunicacao.', 'administrativo'),
    ('Atendente', 'Profissional de atendimento ao cliente.', 'administrativo')
)
insert into public.cargos (nome, descricao, categoria_profissional, ativo, deleted_at)
select nome, descricao, categoria_profissional, true, null
from canonical_cargos
on conflict do nothing;

with canonical_cargos(nome, descricao, categoria_profissional) as (
  values
    ('Cabeleireira', 'Profissional de cabelos, finalizacao e tratamentos capilares.', 'operacional'),
    ('Barbeiro', 'Profissional de barba, cabelo masculino e acabamento.', 'operacional'),
    ('Manicure', 'Profissional de cuidados, embelezamento e design de unhas.', 'operacional'),
    ('Esteticista', 'Profissional de estetica facial e corporal.', 'operacional'),
    ('Maquiadora', 'Profissional de maquiagem social, eventos e producoes.', 'operacional'),
    ('Podologa', 'Profissional de cuidados especializados com os pes.', 'operacional'),
    ('Massoterapeuta', 'Profissional de massagens e bem-estar.', 'operacional'),
    ('Lash Designer', 'Profissional de extensao e manutencao de cilios.', 'operacional'),
    ('Designer de Sobrancelhas', 'Profissional de design e manutencao de sobrancelhas.', 'operacional'),
    ('Terapeuta Capilar', 'Profissional de tratamentos do couro cabeludo e fios.', 'operacional'),
    ('Recepcionista', 'Profissional de recepcao e atendimento.', 'administrativo'),
    ('Secretaria', 'Profissional de suporte administrativo e agenda.', 'administrativo'),
    ('Caixa', 'Profissional de caixa e fechamento financeiro.', 'administrativo'),
    ('Auxiliar Administrativo', 'Profissional de apoio administrativo.', 'administrativo'),
    ('Assistente Operacional', 'Profissional de apoio a rotinas operacionais.', 'administrativo'),
    ('Gerente', 'Profissional de gestao da unidade.', 'administrativo'),
    ('Coordenadora', 'Profissional de coordenacao operacional.', 'administrativo'),
    ('Financeiro', 'Profissional de rotinas financeiras.', 'administrativo'),
    ('Marketing', 'Profissional de marketing e comunicacao.', 'administrativo'),
    ('Atendente', 'Profissional de atendimento ao cliente.', 'administrativo')
)
update public.cargos c
set descricao = cc.descricao,
    categoria_profissional = cc.categoria_profissional,
    ativo = true,
    deleted_at = null
from canonical_cargos cc
where lower(trim(c.nome)) = lower(trim(cc.nome));

with cargo_alias(legacy, canonical) as (
  values
    ('cabeleireira/o', 'Cabeleireira'),
    ('cabeleireiro', 'Cabeleireira'),
    ('maquiador/a', 'Maquiadora'),
    ('maquiador', 'Maquiadora'),
    ('massagista', 'Massoterapeuta'),
    ('manicure/pedicure', 'Manicure'),
    ('nail designer', 'Manicure'),
    ('lash designer', 'Lash Designer'),
    ('designer de sobrancelhas', 'Designer de Sobrancelhas'),
    ('terapeuta capilar', 'Terapeuta Capilar'),
    ('podologo', 'Podologa'),
    ('auxiliar administrativo', 'Auxiliar Administrativo'),
    ('assistente operacional', 'Assistente Operacional'),
    ('coordenador(a)', 'Coordenadora')
),
canonical as (
  select ca.legacy, c.id as canonical_id, c.nome as canonical_nome
  from cargo_alias ca
  join public.cargos c on lower(trim(c.nome)) = lower(trim(ca.canonical))
  where c.deleted_at is null
),
legacy as (
  select c.id as legacy_id, c.nome as legacy_nome, cn.canonical_id, cn.canonical_nome
  from public.cargos c
  join canonical cn on lower(trim(c.nome)) = cn.legacy
  where c.deleted_at is null
)
update public.profissionais p
set cargo_id = l.canonical_id,
    cargo = l.canonical_nome
from legacy l
where p.cargo_id = l.legacy_id;

with canonical_especialidades as (
  select e.id, lower(trim(e.nome)) as nome_key
  from public.especialidades e
  join public.cargos c on c.id = e.cargo_id
  where e.deleted_at is null
    and lower(trim(c.nome)) in (
      'cabeleireira',
      'barbeiro',
      'manicure',
      'esteticista',
      'maquiadora',
      'podologa',
      'massoterapeuta',
      'lash designer',
      'designer de sobrancelhas',
      'terapeuta capilar'
    )
),
legacy_especialidades as (
  select e.id as legacy_id, ce.id as canonical_id
  from public.especialidades e
  join canonical_especialidades ce on ce.nome_key = lower(trim(e.nome))
  where e.id <> ce.id
    and e.deleted_at is null
)
update public.profissional_especialidades pe
set especialidade_id = le.canonical_id
from legacy_especialidades le
where pe.especialidade_id = le.legacy_id
  and not exists (
    select 1
    from public.profissional_especialidades existing
    where existing.profissional_id = pe.profissional_id
      and existing.especialidade_id = le.canonical_id
      and existing.deleted_at is null
  );

with canonical_especialidades as (
  select e.id, lower(trim(e.nome)) as nome_key
  from public.especialidades e
  join public.cargos c on c.id = e.cargo_id
  where e.deleted_at is null
    and lower(trim(c.nome)) in (
      'cabeleireira',
      'barbeiro',
      'manicure',
      'esteticista',
      'maquiadora',
      'podologa',
      'massoterapeuta',
      'lash designer',
      'designer de sobrancelhas',
      'terapeuta capilar'
    )
),
legacy_especialidades as (
  select e.id as legacy_id, ce.id as canonical_id
  from public.especialidades e
  join canonical_especialidades ce on ce.nome_key = lower(trim(e.nome))
  where e.id <> ce.id
    and e.deleted_at is null
)
update public.servico_especialidades se
set especialidade_id = le.canonical_id
from legacy_especialidades le
where se.especialidade_id = le.legacy_id
  and not exists (
    select 1
    from public.servico_especialidades existing
    where existing.tenant_id = se.tenant_id
      and existing.servico_id = se.servico_id
      and existing.especialidade_id = le.canonical_id
      and existing.deleted_at is null
  );

update public.especialidades e
set ativo = false,
    deleted_at = coalesce(e.deleted_at, now())
where e.deleted_at is null
  and lower(trim(e.nome)) not in (
    select lower(trim(nome)) from public.taxonomia_especialidades
  );

update public.cargos c
set ativo = false,
    deleted_at = coalesce(c.deleted_at, now())
where c.deleted_at is null
  and lower(trim(c.nome)) not in (
    'cabeleireira',
    'barbeiro',
    'manicure',
    'esteticista',
    'maquiadora',
    'podologa',
    'massoterapeuta',
    'lash designer',
    'designer de sobrancelhas',
    'terapeuta capilar',
    'recepcionista',
    'secretaria',
    'caixa',
    'auxiliar administrativo',
    'assistente operacional',
    'gerente',
    'coordenadora',
    'financeiro',
    'marketing',
    'atendente'
  );
