-- Team role/specialty normalization.
-- Replaces free-text cargo/especialidade inputs with relational catalogs while
-- keeping legacy text columns available for backward-compatible reads.

create table if not exists public.cargos (
  id uuid primary key default gen_random_uuid(),
  nome varchar(100) not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

create table if not exists public.especialidades (
  id uuid primary key default gen_random_uuid(),
  cargo_id uuid not null references public.cargos(id) on delete restrict,
  nome varchar(120) not null,
  descricao text,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz
);

alter table public.profissionais
  add column if not exists cargo_id uuid references public.cargos(id) on delete restrict;

create table if not exists public.profissional_especialidades (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  profissional_id uuid not null references public.profissionais(id) on delete cascade,
  especialidade_id uuid not null references public.especialidades(id) on delete restrict,
  ativo boolean not null default true,
  created_at timestamptz not null default now(),
  deleted_at timestamptz
);

create unique index if not exists idx_cargos_nome_unique
  on public.cargos (lower(nome))
  where deleted_at is null;

create index if not exists idx_cargos_nome
  on public.cargos (nome);

create unique index if not exists idx_especialidades_cargo_nome_unique
  on public.especialidades (cargo_id, lower(nome))
  where deleted_at is null;

create index if not exists idx_especialidades_cargo
  on public.especialidades (cargo_id);

create index if not exists idx_profissionais_cargo
  on public.profissionais (cargo_id);

create index if not exists idx_profissional_especialidades_profissional
  on public.profissional_especialidades (profissional_id);

create index if not exists idx_profissional_especialidades_tenant
  on public.profissional_especialidades (tenant_id);

create unique index if not exists idx_profissional_especialidades_unique
  on public.profissional_especialidades (profissional_id, especialidade_id)
  where deleted_at is null;

drop trigger if exists set_updated_at on public.cargos;
create trigger set_updated_at
before update on public.cargos
for each row
execute function public.set_updated_at();

drop trigger if exists set_updated_at on public.especialidades;
create trigger set_updated_at
before update on public.especialidades
for each row
execute function public.set_updated_at();

alter table public.cargos enable row level security;
alter table public.especialidades enable row level security;
alter table public.profissional_especialidades enable row level security;

drop policy if exists cargos_select_authenticated on public.cargos;
create policy cargos_select_authenticated
on public.cargos
for select
to authenticated
using (deleted_at is null and ativo = true);

drop policy if exists cargos_insert_master on public.cargos;
create policy cargos_insert_master
on public.cargos
for insert
to authenticated
with check (public.is_master_admin());

drop policy if exists cargos_update_master on public.cargos;
create policy cargos_update_master
on public.cargos
for update
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists especialidades_select_authenticated on public.especialidades;
create policy especialidades_select_authenticated
on public.especialidades
for select
to authenticated
using (deleted_at is null and ativo = true);

drop policy if exists especialidades_insert_master on public.especialidades;
create policy especialidades_insert_master
on public.especialidades
for insert
to authenticated
with check (public.is_master_admin());

drop policy if exists especialidades_update_master on public.especialidades;
create policy especialidades_update_master
on public.especialidades
for update
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists profissional_especialidades_select_by_tenant on public.profissional_especialidades;
create policy profissional_especialidades_select_by_tenant
on public.profissional_especialidades
for select
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id));

drop policy if exists profissional_especialidades_insert_by_tenant on public.profissional_especialidades;
create policy profissional_especialidades_insert_by_tenant
on public.profissional_especialidades
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

drop policy if exists profissional_especialidades_update_by_tenant on public.profissional_especialidades;
create policy profissional_especialidades_update_by_tenant
on public.profissional_especialidades
for update
to authenticated
using (deleted_at is null and public.has_tenant_access(tenant_id))
with check (public.has_tenant_access(tenant_id));

with seed_cargos(nome, descricao) as (
  values
    ('Cabeleireira/o', 'Profissional de cabelos e tratamentos capilares.'),
    ('Manicure', 'Profissional de unhas, maos e pes.'),
    ('Maquiador/a', 'Profissional de maquiagem social, eventos e producoes.'),
    ('Esteticista', 'Profissional de estetica facial e corporal.'),
    ('Barbeiro', 'Profissional de barba, cabelo masculino e acabamento.'),
    ('Massoterapeuta', 'Profissional de massagens e bem-estar.'),
    ('Recepcionista', 'Profissional de atendimento e apoio operacional.')
)
insert into public.cargos (nome, descricao)
select nome, descricao
from seed_cargos
on conflict do nothing;

with seed_especialidades(cargo_nome, nome, descricao) as (
  values
    ('Cabeleireira/o', 'Corte Feminino', 'Cortes femininos e finalizacao.'),
    ('Cabeleireira/o', 'Escova', 'Escova, modelagem e finalizacao.'),
    ('Cabeleireira/o', 'Progressiva', 'Alisamentos e tratamentos progressivos.'),
    ('Cabeleireira/o', 'Luzes', 'Mechas, luzes e clareamento.'),
    ('Cabeleireira/o', 'Colorimetria', 'Coloracao, tonalizacao e correcao de cor.'),
    ('Manicure', 'Fibra', 'Alongamento em fibra.'),
    ('Manicure', 'Gel', 'Alongamento ou banho em gel.'),
    ('Manicure', 'Blindagem', 'Blindagem e fortalecimento de unhas.'),
    ('Manicure', 'Nail Art', 'Decoracao e arte em unhas.'),
    ('Maquiador/a', 'Maquiagem Social', 'Maquiagem para eventos sociais.'),
    ('Maquiador/a', 'Maquiagem Noiva', 'Maquiagem para noivas.'),
    ('Esteticista', 'Limpeza de Pele', 'Limpeza de pele e cuidados faciais.'),
    ('Esteticista', 'Drenagem', 'Drenagem linfatica e cuidados corporais.'),
    ('Barbeiro', 'Corte Masculino', 'Corte masculino e acabamento.'),
    ('Barbeiro', 'Barba', 'Barba, desenho e acabamento.'),
    ('Massoterapeuta', 'Relaxante', 'Massagem relaxante.'),
    ('Massoterapeuta', 'Terapeutica', 'Massagem terapeutica.'),
    ('Recepcionista', 'Atendimento', 'Recepcao e suporte ao cliente.'),
    ('Recepcionista', 'Agendamento', 'Organizacao de agenda e confirmacoes.')
)
insert into public.especialidades (cargo_id, nome, descricao)
select c.id, se.nome, se.descricao
from seed_especialidades se
join public.cargos c on lower(c.nome) = lower(se.cargo_nome)
on conflict do nothing;

update public.profissionais p
set cargo_id = c.id
from public.cargos c
where p.cargo_id is null
  and p.cargo is not null
  and lower(trim(p.cargo)) = lower(trim(c.nome));
