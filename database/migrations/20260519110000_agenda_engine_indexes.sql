-- Índices operacionais para o motor de agendamento Bellory.

create index if not exists idx_agendamentos_tenant_profissional_periodo
on public.agendamentos (tenant_id, profissional_id, data_inicio, data_fim)
where deleted_at is null and status in ('pendente', 'confirmado');

create index if not exists idx_bloqueios_agenda_tenant_profissional_periodo
on public.bloqueios_agenda (tenant_id, profissional_id, data_inicio, data_fim)
where deleted_at is null and ativo = true;

create index if not exists idx_escalas_semanais_tenant_profissional_dia
on public.escalas_semanais (tenant_id, profissional_id, dia_semana)
where deleted_at is null and ativo = true;

create index if not exists idx_servicos_tenant_ativo_ordem
on public.servicos (tenant_id, ativo, ordem_exibicao)
where deleted_at is null;

create index if not exists idx_profissionais_tenant_ativo_ordem
on public.profissionais (tenant_id, ativo, ordem_exibicao)
where deleted_at is null;
