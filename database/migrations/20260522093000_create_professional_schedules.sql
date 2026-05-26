create table if not exists public.professional_schedules (
  id uuid primary key default gen_random_uuid(),
  tenant_id uuid not null references public.tenants(id) on delete cascade,
  professional_id uuid references public.profissionais(id) on delete cascade,
  user_id uuid references public.usuarios(id) on delete set null,
  weekday integer not null,
  work_start_morning time,
  work_end_morning time,
  work_start_afternoon time,
  work_end_afternoon time,
  break_start time,
  break_end time,
  is_working boolean not null default true,
  is_exception boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  deleted_at timestamptz,
  constraint professional_schedules_weekday_check check (weekday between 0 and 6),
  constraint professional_schedules_morning_check check (
    (work_start_morning is null and work_end_morning is null)
    or (work_start_morning is not null and work_end_morning is not null and work_start_morning < work_end_morning)
  ),
  constraint professional_schedules_afternoon_check check (
    (work_start_afternoon is null and work_end_afternoon is null)
    or (work_start_afternoon is not null and work_end_afternoon is not null and work_start_afternoon < work_end_afternoon)
  ),
  constraint professional_schedules_break_check check (
    (break_start is null and break_end is null)
    or (break_start is not null and break_end is not null and break_start < break_end)
  )
);

create index if not exists idx_professional_schedules_tenant_professional_weekday
  on public.professional_schedules (tenant_id, professional_id, weekday)
  where deleted_at is null;

create index if not exists idx_professional_schedules_tenant_user_weekday
  on public.professional_schedules (tenant_id, user_id, weekday)
  where deleted_at is null;
