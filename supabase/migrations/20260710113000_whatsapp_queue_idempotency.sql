-- Centralized WhatsApp queue controls.
-- Events create mensagens_whatsapp records; workers claim and dispatch them.

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
    'cancelado',
    'recebido'
  ));

alter table public.mensagens_whatsapp
  add column if not exists idempotency_key text,
  add column if not exists agendado_para timestamptz,
  add column if not exists processado_em timestamptz,
  add column if not exists tentativas integer not null default 0,
  add column if not exists proxima_tentativa_em timestamptz,
  add column if not exists ultimo_erro_codigo text,
  add column if not exists ultimo_erro_mensagem text,
  add column if not exists payload_provider jsonb not null default '{}'::jsonb;

create unique index if not exists idx_mensagens_whatsapp_idempotency_key
  on public.mensagens_whatsapp (idempotency_key)
  where idempotency_key is not null
    and deleted_at is null;

create index if not exists idx_mensagens_whatsapp_queue_claim
  on public.mensagens_whatsapp (
    status_envio,
    coalesce(agendado_para, created_at),
    coalesce(proxima_tentativa_em, created_at),
    created_at
  )
  where direcao = 'saida'
    and ativo = true
    and deleted_at is null;

create index if not exists idx_mensagens_whatsapp_provider_message
  on public.mensagens_whatsapp (provider, provider_message_id)
  where provider_message_id is not null
    and deleted_at is null;

create or replace function public.claim_pending_whatsapp_messages(batch_size integer default 25)
returns setof public.mensagens_whatsapp
language plpgsql
security definer
set search_path = public
as $$
begin
  return query
  with candidates as (
    select id
    from public.mensagens_whatsapp
    where direcao = 'saida'
      and ativo = true
      and deleted_at is null
      and status_envio in ('pendente', 'agendado', 'retry')
      and coalesce(agendado_para, created_at) <= now()
      and coalesce(proxima_tentativa_em, created_at) <= now()
    order by
      coalesce(agendado_para, created_at) asc,
      created_at asc
    limit greatest(1, least(coalesce(batch_size, 25), 100))
    for update skip locked
  )
  update public.mensagens_whatsapp message
  set
    status_envio = 'processando',
    tentativas = coalesce(message.tentativas, 0) + 1,
    processado_em = now(),
    updated_at = now()
  from candidates
  where message.id = candidates.id
  returning message.*;
end;
$$;
