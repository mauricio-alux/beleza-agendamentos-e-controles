-- Transactional MasterAdmin trial extension.

create or replace function public.extend_subscription_trial_admin(
  p_assinatura_id uuid,
  p_dias integer default null,
  p_trial_ate date default null,
  p_usuario_id uuid default null,
  p_observacao text default null
)
returns public.assinaturas
language plpgsql
security definer
set search_path = public
as $$
declare
  current_assinatura public.assinaturas%rowtype;
  updated_assinatura public.assinaturas%rowtype;
  base_date date;
  new_trial_end date;
begin
  if p_observacao is null or length(trim(p_observacao)) < 3 then
    raise exception 'Observacao obrigatoria para estender trial.'
      using errcode = '22023';
  end if;

  if p_trial_ate is null and (p_dias is null or p_dias < 1) then
    raise exception 'Informe uma quantidade de dias maior que zero.'
      using errcode = '22023';
  end if;

  if p_dias is not null and p_dias > 365 then
    raise exception 'Quantidade maxima para extensao de trial excedida.'
      using errcode = '22023';
  end if;

  select *
    into current_assinatura
  from public.assinaturas
  where id = p_assinatura_id
    and deleted_at is null
  for update;

  if not found then
    raise exception 'Assinatura nao encontrada.'
      using errcode = 'P0002';
  end if;

  if current_assinatura.status not in (
    'trial',
    'ativo',
    'ativa',
    'expirada',
    'vencida',
    'suspensa',
    'inadimplente',
    'cancelada',
    'pendente_pagamento'
  ) then
    raise exception 'Status da assinatura nao permite extensao de trial: %', current_assinatura.status
      using errcode = '22023';
  end if;

  if p_trial_ate is not null then
    new_trial_end := p_trial_ate;
  else
    base_date := case
      when current_assinatura.trial_ate is not null
        and current_assinatura.trial_ate >= current_date
        then current_assinatura.trial_ate
      else current_date
    end;

    new_trial_end := base_date + p_dias;
  end if;

  if new_trial_end < current_date then
    raise exception 'A nova data final do trial nao pode ficar no passado.'
      using errcode = '22023';
  end if;

  update public.assinaturas
  set
    status = 'trial',
    trial_ate = new_trial_end,
    expira_em = new_trial_end,
    data_fim = new_trial_end,
    bloqueio_motivo = null,
    origem_ultima_alteracao = 'masteradmin',
    alterado_por_usuario_id = p_usuario_id,
    ultima_alteracao_observacao = trim(p_observacao),
    ativo = true,
    metadata = coalesce(metadata, '{}'::jsonb)
      || jsonb_build_object(
        'trial_extended_at', now(),
        'trial_extended_by', p_usuario_id,
        'trial_extended_days', p_dias,
        'trial_previous_end', current_assinatura.trial_ate,
        'trial_new_end', new_trial_end
      ),
    updated_at = now()
  where id = p_assinatura_id
  returning * into updated_assinatura;

  update public.tenants
  set
    status = 'trial',
    ativo = true,
    updated_at = now()
  where id = updated_assinatura.tenant_id;

  insert into public.assinatura_historico (
    assinatura_id,
    tenant_id,
    status_anterior,
    status_novo,
    plano_anterior,
    plano_novo,
    trial_ate_anterior,
    trial_ate_novo,
    data_fim_anterior,
    data_fim_novo,
    proxima_renovacao_anterior,
    proxima_renovacao_novo,
    expira_em_anterior,
    expira_em_novo,
    origem,
    tipo_alteracao,
    usuario_id,
    observacao,
    metadata
  )
  values (
    current_assinatura.id,
    current_assinatura.tenant_id,
    current_assinatura.status,
    updated_assinatura.status,
    current_assinatura.plano_id,
    updated_assinatura.plano_id,
    current_assinatura.trial_ate,
    updated_assinatura.trial_ate,
    current_assinatura.data_fim,
    updated_assinatura.data_fim,
    current_assinatura.proxima_renovacao,
    updated_assinatura.proxima_renovacao,
    current_assinatura.expira_em,
    updated_assinatura.expira_em,
    'masteradmin',
    'trial_extension',
    p_usuario_id,
    trim(p_observacao),
    jsonb_build_object(
      'dias_adicionados', p_dias,
      'base_calculo', base_date,
      'trial_ate_anterior', current_assinatura.trial_ate,
      'trial_ate_novo', updated_assinatura.trial_ate,
      'expira_em_anterior', current_assinatura.expira_em,
      'expira_em_novo', updated_assinatura.expira_em
    )
  );

  return updated_assinatura;
end;
$$;
