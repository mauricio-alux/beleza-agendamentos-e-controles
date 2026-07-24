-- Adds explicit audit fields for the centralized Bellory WhatsApp
-- operational communication layer.

alter table public.mensagens_whatsapp
  add column if not exists profissional_id uuid references public.profissionais(id) on delete set null,
  add column if not exists tipo_evento varchar(100),
  add column if not exists provider varchar(80) not null default 'whatsapp_mysaas';

create index if not exists idx_mensagens_whatsapp_tipo_evento
  on public.mensagens_whatsapp (tipo_evento, created_at);

create index if not exists idx_mensagens_whatsapp_profissional
  on public.mensagens_whatsapp (profissional_id)
  where profissional_id is not null;

create index if not exists idx_mensagens_whatsapp_provider_status
  on public.mensagens_whatsapp (provider, status_envio, created_at);
