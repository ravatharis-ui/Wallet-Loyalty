-- =============================================================================
-- Notifications push sur la carte du client.
--
-- L'email reste le canal principal, mais il se perd dans une boîte encombrée.
-- Le push arrive sur l'écran verrouillé, et surtout il ne coûte rien à l'envoi,
-- contrairement au SMS. Il complète l'email, il ne le remplace pas : tout le
-- monde n'acceptera pas les notifications.
-- =============================================================================

alter table public.messages
  drop constraint if exists messages_channel_check;

alter table public.messages
  add constraint messages_channel_check check (channel in ('email', 'sms', 'push'));

-- --------------------------------------------------------- push_subscriptions
-- Un client peut s'abonner depuis plusieurs appareils : la clé d'unicité est
-- l'endpoint fourni par le navigateur, pas le client.
create table if not exists public.push_subscriptions (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid        not null references public.businesses (id) on delete cascade,
  customer_id  uuid        not null references public.customers (id) on delete cascade,
  endpoint     text        not null unique,
  p256dh       text        not null,
  auth         text        not null,
  created_at   timestamptz not null default now(),
  last_used_at timestamptz
);

create index if not exists push_subscriptions_customer_idx
  on public.push_subscriptions (customer_id);
create index if not exists push_subscriptions_business_idx
  on public.push_subscriptions (business_id);

alter table public.push_subscriptions enable row level security;

-- Le commerçant voit et peut révoquer les abonnements de ses propres clients.
-- L'inscription, elle, passe par le service role : le client n'est pas
-- authentifié, il ne détient que son card_token.
drop policy if exists push_subscriptions_all on public.push_subscriptions;
create policy push_subscriptions_all on public.push_subscriptions
  for all
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());
