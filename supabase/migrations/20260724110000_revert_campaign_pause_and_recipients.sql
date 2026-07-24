-- Compensates 20260723100000_campaign_pause_and_recipients.
-- Reverts only the unintended pause/resume database effects.

do $$
begin
  if exists (
    select 1
    from public.campanha_envios
    where status not in (
      'pendente',
      'agendado',
      'processando',
      'enviado',
      'entregue',
      'lido',
      'erro',
      'cancelado',
      'ignorado'
    )
  ) then
    raise exception 'Cannot restore campanha_envios_status_check: incompatible status exists.';
  end if;

  if exists (
    select 1
    from public.mensagens_whatsapp
    where status_envio not in (
      'pendente',
      'agendado',
      'processando',
      'submetido',
      'enviado',
      'entregue',
      'lido',
      'retry',
      'erro',
      'falhou',
      'cancelado',
      'recebido'
    )
  ) then
    raise exception 'Cannot restore mensagens_whatsapp_status_check: incompatible status_envio exists.';
  end if;
end $$;

alter table public.campanha_envios
  drop constraint if exists campanha_envios_status_check;

alter table public.campanha_envios
  add constraint campanha_envios_status_check check (
    status in (
      'pendente',
      'agendado',
      'processando',
      'enviado',
      'entregue',
      'lido',
      'erro',
      'cancelado',
      'ignorado'
    )
  );

alter table public.mensagens_whatsapp
  drop constraint if exists mensagens_whatsapp_status_check;

alter table public.mensagens_whatsapp
  add constraint mensagens_whatsapp_status_check check (
    status_envio in (
      'pendente',
      'agendado',
      'processando',
      'submetido',
      'enviado',
      'entregue',
      'lido',
      'retry',
      'erro',
      'falhou',
      'cancelado',
      'recebido'
    )
  );

drop index if exists public.idx_campanha_envios_campaign_recipient;
