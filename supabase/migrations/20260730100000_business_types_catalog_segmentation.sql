-- Bellory - Evolucao do MER: tipos de negocio e catalogo orientado por segmento.
-- Complementa o novo MER de Servicos sem reintroduzir tabelas legadas.

create table if not exists public.tipos_negocio (
  id uuid primary key default gen_random_uuid(),
  nome varchar(120) not null,
  slug varchar(120) not null,
  descricao text,
  icone varchar(80),
  ativo boolean not null default true,
  ordem_exibicao integer not null default 0,
  criado_por uuid references public.usuarios(id) on delete set null,
  atualizado_por uuid references public.usuarios(id) on delete set null,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint tipos_negocio_nome_check check (length(trim(nome)) >= 2),
  constraint tipos_negocio_slug_check check (slug ~ '^[a-z0-9]+(?:-[a-z0-9]+)*$'),
  constraint tipos_negocio_slug_unique unique (slug)
);

create index if not exists idx_tipos_negocio_ativo_ordem
  on public.tipos_negocio (ativo, ordem_exibicao, nome);

drop trigger if exists set_updated_at on public.tipos_negocio;
create trigger set_updated_at
before update on public.tipos_negocio
for each row
execute function public.set_updated_at();

create table if not exists public.tipo_negocio_servicos_catalogo (
  id uuid primary key default gen_random_uuid(),
  tipo_negocio_id uuid not null references public.tipos_negocio(id) on delete cascade,
  servico_catalogo_id uuid not null references public.servicos_catalogo(id) on delete cascade,
  recomendado boolean not null default false,
  ativo boolean not null default true,
  ordem_exibicao integer not null default 0,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint tipo_negocio_servicos_catalogo_unique unique (tipo_negocio_id, servico_catalogo_id)
);

create index if not exists idx_tipo_negocio_servicos_tipo_ativo
  on public.tipo_negocio_servicos_catalogo (tipo_negocio_id, ativo, recomendado, ordem_exibicao);

create index if not exists idx_tipo_negocio_servicos_catalogo_ativo
  on public.tipo_negocio_servicos_catalogo (servico_catalogo_id, ativo);

drop trigger if exists set_updated_at on public.tipo_negocio_servicos_catalogo;
create trigger set_updated_at
before update on public.tipo_negocio_servicos_catalogo
for each row
execute function public.set_updated_at();

create table if not exists public.tenant_tipos_negocio (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  tipo_negocio_id uuid not null references public.tipos_negocio(id) on delete restrict,
  principal boolean not null default false,
  ativo boolean not null default true,
  descricao_tipo_negocio text,
  criado_em timestamptz not null default now(),
  atualizado_em timestamptz not null default now(),
  constraint tenant_tipos_negocio_unique unique (tenant_id, tipo_negocio_id)
);

create unique index if not exists tenant_tipos_negocio_principal_unique
  on public.tenant_tipos_negocio (tenant_id)
  where principal = true and ativo = true;

create index if not exists idx_tenant_tipos_negocio_tenant_ativo
  on public.tenant_tipos_negocio (tenant_id, ativo, principal);

create index if not exists idx_tenant_tipos_negocio_tipo_ativo
  on public.tenant_tipos_negocio (tipo_negocio_id, ativo);

drop trigger if exists set_updated_at on public.tenant_tipos_negocio;
create trigger set_updated_at
before update on public.tenant_tipos_negocio
for each row
execute function public.set_updated_at();

alter table public.tipos_negocio enable row level security;
alter table public.tipo_negocio_servicos_catalogo enable row level security;
alter table public.tenant_tipos_negocio enable row level security;

drop policy if exists tipos_negocio_select_authenticated on public.tipos_negocio;
create policy tipos_negocio_select_authenticated
on public.tipos_negocio
for select
to authenticated
using (ativo = true or public.is_master_admin());

drop policy if exists tipos_negocio_insert_master_admin on public.tipos_negocio;
create policy tipos_negocio_insert_master_admin
on public.tipos_negocio
for insert
to authenticated
with check (public.is_master_admin());

drop policy if exists tipos_negocio_update_master_admin on public.tipos_negocio;
create policy tipos_negocio_update_master_admin
on public.tipos_negocio
for update
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists tipo_negocio_servicos_select_authenticated on public.tipo_negocio_servicos_catalogo;
create policy tipo_negocio_servicos_select_authenticated
on public.tipo_negocio_servicos_catalogo
for select
to authenticated
using (
  ativo = true
  or public.is_master_admin()
);

drop policy if exists tipo_negocio_servicos_insert_master_admin on public.tipo_negocio_servicos_catalogo;
create policy tipo_negocio_servicos_insert_master_admin
on public.tipo_negocio_servicos_catalogo
for insert
to authenticated
with check (public.is_master_admin());

drop policy if exists tipo_negocio_servicos_update_master_admin on public.tipo_negocio_servicos_catalogo;
create policy tipo_negocio_servicos_update_master_admin
on public.tipo_negocio_servicos_catalogo
for update
to authenticated
using (public.is_master_admin())
with check (public.is_master_admin());

drop policy if exists tenant_tipos_negocio_select_by_tenant on public.tenant_tipos_negocio;
create policy tenant_tipos_negocio_select_by_tenant
on public.tenant_tipos_negocio
for select
to authenticated
using (public.has_tenant_access(tenant_id));

drop policy if exists tenant_tipos_negocio_insert_by_tenant on public.tenant_tipos_negocio;
create policy tenant_tipos_negocio_insert_by_tenant
on public.tenant_tipos_negocio
for insert
to authenticated
with check (public.has_tenant_access(tenant_id));

drop policy if exists tenant_tipos_negocio_update_by_tenant on public.tenant_tipos_negocio;
create policy tenant_tipos_negocio_update_by_tenant
on public.tenant_tipos_negocio
for update
to authenticated
using (public.has_tenant_access(tenant_id))
with check (public.has_tenant_access(tenant_id));

insert into public.permissions (codigo, recurso, acao, escopo, descricao)
values
  ('platform.business_types.manage', 'platform.business_types', 'manage', 'platform', 'Gerenciar tipos de negocio globais e sua aplicabilidade ao catalogo'),
  ('platform.service_catalog.manage', 'platform.service_catalog', 'manage', 'platform', 'Gerenciar catalogo global de servicos e associacoes globais')
on conflict (codigo) do update
set descricao = excluded.descricao;

insert into public.role_permissions (role_id, permission_id)
select r.id, p.id
from public.roles r
join public.permissions p on p.codigo in (
  'platform.business_types.manage',
  'platform.service_catalog.manage'
)
where r.nome = 'MasterAdmin'
on conflict do nothing;

with seed (nome, slug, descricao, icone, ordem_exibicao) as (
  values
    ('Salao de Beleza', 'salao-de-beleza', 'Estabelecimentos completos com cabelo, unhas, maquiagem e estetica leve.', 'sparkles', 10),
    ('Barbearia', 'barbearia', 'Negocios focados em corte masculino, barba e acabamento.', 'scissors', 20),
    ('Esmalteria / Nail Studio', 'nail-studio', 'Negocios especializados em unhas, alongamentos e nail art.', 'hand', 30),
    ('Studio de Sobrancelhas', 'studio-de-sobrancelhas', 'Negocios especializados em design, henna e micropigmentacao de sobrancelhas.', 'eye', 40),
    ('Studio de Cilios', 'studio-de-cilios', 'Negocios especializados em extensao, manutencao e cuidados com cilios.', 'eye', 50),
    ('Maquiagem e Penteados', 'maquiagem-e-penteados', 'Atendimento voltado a maquiagem, eventos e penteados.', 'palette', 60),
    ('Clinica de Estetica', 'clinica-de-estetica', 'Clinicas com estetica facial, corporal e procedimentos recorrentes.', 'heart-pulse', 70),
    ('Estetica Facial', 'estetica-facial', 'Negocios focados em tratamentos faciais.', 'smile', 80),
    ('Estetica Corporal', 'estetica-corporal', 'Negocios focados em tratamentos corporais.', 'activity', 90),
    ('Massoterapia', 'massoterapia', 'Atendimentos de massagem, terapias manuais e relaxamento.', 'waves', 100),
    ('Spa / Day Spa', 'spa-day-spa', 'Experiencias de relaxamento, beleza e bem-estar.', 'flower', 110),
    ('Podologia', 'podologia', 'Cuidados especializados com pes e unhas dos pes.', 'footprints', 120),
    ('Depilacao', 'depilacao', 'Negocios focados em depilacao e remocao de pelos.', 'zap', 130),
    ('Bronzeamento', 'bronzeamento', 'Servicos de bronzeamento estetico.', 'sun', 140),
    ('Micropigmentacao', 'micropigmentacao', 'Procedimentos de micropigmentacao estetica.', 'pen-tool', 150),
    ('Tatuagem', 'tatuagem', 'Studio de tatuagem.', 'paintbrush', 160),
    ('Body Piercing', 'body-piercing', 'Studio de body piercing.', 'circle-dot', 170),
    ('Clinica Capilar / Tricologia', 'clinica-capilar-tricologia', 'Tratamentos capilares e cuidados do couro cabeludo.', 'scan-search', 180),
    ('Fisioterapia', 'fisioterapia', 'Atendimentos de fisioterapia.', 'stethoscope', 190),
    ('Pilates', 'pilates', 'Studio ou atendimento de Pilates.', 'stretch-horizontal', 200),
    ('Terapias Integrativas', 'terapias-integrativas', 'Praticas integrativas e terapias complementares.', 'leaf', 210),
    ('Centro de Bem-estar', 'centro-de-bem-estar', 'Negocios hibridos de saude, beleza e bem-estar.', 'heart', 220),
    ('Profissional Autonomo Multisservicos', 'profissional-autonomo-multisservicos', 'Profissional independente com carteira variada de servicos.', 'user-round', 230),
    ('Outro', 'outro', 'Segmento ainda nao catalogado globalmente.', 'ellipsis', 999)
)
insert into public.tipos_negocio (nome, slug, descricao, icone, ordem_exibicao)
select nome, slug, descricao, icone, ordem_exibicao
from seed
on conflict (slug) do update
set
  nome = excluded.nome,
  descricao = excluded.descricao,
  icone = excluded.icone,
  ordem_exibicao = excluded.ordem_exibicao,
  ativo = true;

with associations (tipo_slug, codigo_canonico, recomendado, ordem_exibicao) as (
  values
    ('salao-de-beleza', 'HAIR_CUT', true, 10),
    ('salao-de-beleza', 'HAIR_COLORING', true, 20),
    ('salao-de-beleza', 'HAIR_HYDRATION', true, 30),
    ('salao-de-beleza', 'MANICURE', true, 40),
    ('salao-de-beleza', 'PEDICURE', true, 50),
    ('salao-de-beleza', 'BROW_DESIGN', false, 60),
    ('salao-de-beleza', 'MAKEUP', false, 70),
    ('barbearia', 'MENS_HAIR_CUT', true, 10),
    ('barbearia', 'BEARD', true, 20),
    ('barbearia', 'HAIR_AND_BEARD', true, 30),
    ('barbearia', 'BEARD_PIGMENTATION_CAMOUFLAGE', false, 40),
    ('nail-studio', 'MANICURE', true, 10),
    ('nail-studio', 'PEDICURE', true, 20),
    ('nail-studio', 'NAIL_EXTENSION', true, 30),
    ('nail-studio', 'NAIL_EXTENSION_MAINTENANCE', true, 40),
    ('nail-studio', 'NAIL_ART', true, 50),
    ('studio-de-sobrancelhas', 'BROW_DESIGN', true, 10),
    ('studio-de-sobrancelhas', 'BROW_LAMINATION', true, 20),
    ('studio-de-sobrancelhas', 'BROW_MICROPIGMENTATION', false, 30),
    ('maquiagem-e-penteados', 'MAKEUP', true, 10),
    ('maquiagem-e-penteados', 'SOCIAL_MAKEUP', true, 20),
    ('maquiagem-e-penteados', 'BRIDAL_MAKEUP', true, 30),
    ('maquiagem-e-penteados', 'EVENT_HAIRSTYLE', true, 40),
    ('maquiagem-e-penteados', 'BRIDAL_HAIRSTYLE', true, 50),
    ('clinica-de-estetica', 'FACIAL_CLEANSING', true, 10),
    ('clinica-de-estetica', 'MICRONEEDLING', true, 20),
    ('clinica-de-estetica', 'BODY_DRAINAGE', false, 30),
    ('clinica-de-estetica', 'LASER_HAIR_REMOVAL', false, 40),
    ('estetica-facial', 'FACIAL_CLEANSING', true, 10),
    ('estetica-facial', 'MICRONEEDLING', true, 20),
    ('estetica-corporal', 'BODY_DRAINAGE', true, 10),
    ('estetica-corporal', 'SHAPING_MASSAGE', true, 20),
    ('massoterapia', 'RELAXING_MASSAGE', true, 10),
    ('massoterapia', 'SHAPING_MASSAGE', false, 20),
    ('spa-day-spa', 'RELAXING_MASSAGE', true, 10),
    ('spa-day-spa', 'FACIAL_CLEANSING', true, 20),
    ('spa-day-spa', 'MANICURE', false, 30),
    ('depilacao', 'LASER_HAIR_REMOVAL', true, 10),
    ('bronzeamento', 'TANNING', true, 10),
    ('micropigmentacao', 'BROW_MICROPIGMENTATION', true, 10),
    ('clinica-capilar-tricologia', 'HAIR_HYDRATION', true, 10),
    ('clinica-capilar-tricologia', 'HAIR_NUTRITION', true, 20),
    ('clinica-capilar-tricologia', 'HAIR_RECONSTRUCTION', true, 30),
    ('centro-de-bem-estar', 'RELAXING_MASSAGE', true, 10),
    ('centro-de-bem-estar', 'FACIAL_CLEANSING', false, 20),
    ('profissional-autonomo-multisservicos', 'HAIR_CUT', true, 10),
    ('profissional-autonomo-multisservicos', 'MANICURE', true, 20),
    ('profissional-autonomo-multisservicos', 'BROW_DESIGN', true, 30)
),
resolved as (
  select tn.id as tipo_negocio_id, sc.id as servico_catalogo_id, a.recomendado, a.ordem_exibicao
  from associations a
  join public.tipos_negocio tn on tn.slug = a.tipo_slug
  join public.servicos_catalogo sc on sc.codigo_canonico = a.codigo_canonico
)
insert into public.tipo_negocio_servicos_catalogo (
  tipo_negocio_id,
  servico_catalogo_id,
  recomendado,
  ativo,
  ordem_exibicao
)
select tipo_negocio_id, servico_catalogo_id, recomendado, true, ordem_exibicao
from resolved
on conflict (tipo_negocio_id, servico_catalogo_id) do update
set
  recomendado = excluded.recomendado,
  ativo = true,
  ordem_exibicao = excluded.ordem_exibicao;

comment on table public.tipos_negocio is
  'Catalogo global SaaS de segmentos/tipos de negocio. Nao e tenant-scoped.';

comment on table public.tipo_negocio_servicos_catalogo is
  'Associacao N:N entre tipo de negocio global e servicos_catalogo. Recomenda e organiza catalogo, nao cria oferta tenant.';

comment on table public.tenant_tipos_negocio is
  'Associacao N:N entre tenant e tipos de negocio, com no maximo um tipo principal ativo por tenant.';
