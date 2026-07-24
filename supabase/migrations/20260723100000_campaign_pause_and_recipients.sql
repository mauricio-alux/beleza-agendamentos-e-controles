-- Campaign pause/resume support for queued WhatsApp campaign messages.
-- Paused records are not claimed by the WhatsApp queue worker.

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
      'pausado',
      'cancelado',
      'ignorado'
    )
  );

alter table public.mensagens_whatsapp
  drop constraint if exists mensagens_whatsapp_status_check;

alter table public.mensagens_whatsapp
  add constraint mensagens_whatsapp_status_check
  check (status_envio in (
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
    'pausado',
    'cancelado',
    'recebido'
  ));

create index if not exists idx_campanha_envios_campaign_recipient
  on public.campanha_envios (tenant_id, campanha_id, cliente_id, status)
  where deleted_at is null;
