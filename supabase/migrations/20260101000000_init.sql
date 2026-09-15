-- =============================================================================
-- Fidelia — schema initial
-- Multi-tenant : chaque ligne metier porte un business_id, isole par RLS.
-- =============================================================================

create extension if not exists pgcrypto;

-- ---------------------------------------------------------------- businesses
create table public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text        not null check (length(trim(name)) between 1 and 80),
  slug        text        not null unique check (slug ~ '^[a-z0-9]([a-z0-9-]{0,48}[a-z0-9])?$'),
  logo_url    text,
  phone       text,
  email       text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ------------------------------------------------------------------ profiles
-- Un utilisateur Supabase Auth appartient a un commerce.
-- La table permet d'ajouter plus tard plusieurs utilisateurs par commerce.
create table public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  business_id uuid        not null references public.businesses (id) on delete cascade,
  role        text        not null default 'merchant' check (role in ('merchant', 'staff')),
  created_at  timestamptz not null default now()
);
create index profiles_business_id_idx on public.profiles (business_id);

-- ---------------------------------------------------------- loyalty_programs
create table public.loyalty_programs (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid        not null references public.businesses (id) on delete cascade,
  name               text        not null default 'Ma fidélité' check (length(trim(name)) between 1 and 80),
  points_per_visit   int         not null default 1 check (points_per_visit between 1 and 100),
  reward_threshold   int         not null default 10 check (reward_threshold between 1 and 1000),
  reward_name        text        not null check (length(trim(reward_name)) between 1 and 80),
  reward_description text,
  active             boolean     not null default true,
  created_at         timestamptz not null default now(),
  updated_at         timestamptz not null default now()
);
create index loyalty_programs_business_id_idx on public.loyalty_programs (business_id);
-- Un seul programme actif par commerce (MVP).
create unique index loyalty_programs_one_active_per_business
  on public.loyalty_programs (business_id) where active;

-- ----------------------------------------------------------------- customers
create table public.customers (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid        not null references public.businesses (id) on delete cascade,
  first_name     text        not null check (length(trim(first_name)) between 1 and 60),
  phone          text        not null check (length(trim(phone)) between 5 and 30),
  email          text,
  -- Token public non devinable (16 octets aleatoires = 32 hex).
  card_token     text        not null unique default encode(gen_random_bytes(16), 'hex'),
  total_visits   int         not null default 0 check (total_visits >= 0),
  current_points int         not null default 0 check (current_points >= 0),
  last_visit_at  timestamptz,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now()
);
create index customers_business_id_idx on public.customers (business_id);
create index customers_business_last_visit_idx on public.customers (business_id, last_visit_at);
create unique index customers_business_phone_idx on public.customers (business_id, phone);

-- -------------------------------------------------------------------- visits
create table public.visits (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid        not null references public.businesses (id) on delete cascade,
  customer_id uuid        not null references public.customers (id) on delete cascade,
  points_added int        not null check (points_added > 0),
  created_at  timestamptz not null default now(),
  created_by  uuid references auth.users (id) on delete set null
);
create index visits_business_created_idx on public.visits (business_id, created_at desc);
create index visits_customer_created_idx on public.visits (customer_id, created_at desc);

-- ------------------------------------------------------------------- rewards
create table public.rewards (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid        not null references public.businesses (id) on delete cascade,
  customer_id        uuid        not null references public.customers (id) on delete cascade,
  loyalty_program_id uuid        not null references public.loyalty_programs (id) on delete cascade,
  status             text        not null default 'available' check (status in ('available', 'redeemed', 'expired')),
  reward_name        text        not null,
  earned_at          timestamptz not null default now(),
  redeemed_at        timestamptz,
  expires_at         timestamptz
);
create index rewards_business_status_idx on public.rewards (business_id, status);
create index rewards_customer_idx on public.rewards (customer_id, earned_at desc);

-- ------------------------------------------------------------------ messages
create table public.messages (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid        not null references public.businesses (id) on delete cascade,
  customer_id uuid        not null references public.customers (id) on delete cascade,
  type        text        not null check (type in ('inactive_30_days', 'inactive_60_days', 'reward_available', 'campaign')),
  channel     text        not null default 'email' check (channel in ('email', 'sms')),
  status      text        not null default 'pending' check (status in ('pending', 'sent', 'failed', 'skipped')),
  subject     text,
  content     text        not null,
  sent_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index messages_customer_type_idx on public.messages (customer_id, type, created_at desc);
create index messages_business_created_idx on public.messages (business_id, created_at desc);

-- ----------------------------------------------------------------- campaigns
create table public.campaigns (
  id            uuid primary key default gen_random_uuid(),
  business_id   uuid        not null references public.businesses (id) on delete cascade,
  name          text        not null check (length(trim(name)) between 1 and 80),
  message       text        not null check (length(trim(message)) between 1 and 2000),
  audience_type text        not null check (audience_type in ('all', 'inactive_30_days', 'reward_available')),
  recipients    int         not null default 0,
  created_at    timestamptz not null default now(),
  sent_at       timestamptz
);
create index campaigns_business_idx on public.campaigns (business_id, created_at desc);

-- ------------------------------------------------------------- subscriptions
create table public.subscriptions (
  id                     uuid primary key default gen_random_uuid(),
  business_id            uuid        not null unique references public.businesses (id) on delete cascade,
  stripe_customer_id     text unique,
  stripe_subscription_id text unique,
  status                 text        not null default 'none'
                         check (status in ('none', 'trialing', 'active', 'past_due', 'canceled', 'incomplete', 'incomplete_expired', 'unpaid', 'paused')),
  current_period_end     timestamptz,
  created_at             timestamptz not null default now(),
  updated_at             timestamptz not null default now()
);

-- ------------------------------------------------------------ updated_at
create or replace function public.touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger businesses_touch        before update on public.businesses        for each row execute function public.touch_updated_at();
create trigger loyalty_programs_touch  before update on public.loyalty_programs  for each row execute function public.touch_updated_at();
create trigger customers_touch         before update on public.customers         for each row execute function public.touch_updated_at();
create trigger subscriptions_touch     before update on public.subscriptions     for each row execute function public.touch_updated_at();

-- =============================================================================
-- RLS
-- =============================================================================

-- Commerce de l'utilisateur connecte. SECURITY DEFINER pour eviter la recursion
-- de policy sur profiles.
create or replace function public.current_business_id()
returns uuid
language sql
stable
security definer
set search_path = public
as $$
  select business_id from public.profiles where id = auth.uid();
$$;
revoke all on function public.current_business_id() from public;
grant execute on function public.current_business_id() to authenticated;

alter table public.businesses       enable row level security;
alter table public.profiles         enable row level security;
alter table public.loyalty_programs enable row level security;
alter table public.customers        enable row level security;
alter table public.visits           enable row level security;
alter table public.rewards          enable row level security;
alter table public.messages         enable row level security;
alter table public.campaigns        enable row level security;
alter table public.subscriptions    enable row level security;

-- businesses : lecture / mise a jour de son propre commerce uniquement.
create policy businesses_select on public.businesses
  for select to authenticated using (id = public.current_business_id());
create policy businesses_update on public.businesses
  for update to authenticated using (id = public.current_business_id())
  with check (id = public.current_business_id());

-- profiles : uniquement sa propre ligne.
create policy profiles_select on public.profiles
  for select to authenticated using (id = auth.uid());

-- loyalty_programs
create policy loyalty_programs_all on public.loyalty_programs
  for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- customers
create policy customers_all on public.customers
  for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- visits : historique immuable (select + insert seulement).
create policy visits_select on public.visits
  for select to authenticated using (business_id = public.current_business_id());
create policy visits_insert on public.visits
  for insert to authenticated with check (business_id = public.current_business_id());

-- rewards
create policy rewards_all on public.rewards
  for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- messages
create policy messages_all on public.messages
  for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- campaigns
create policy campaigns_all on public.campaigns
  for all to authenticated
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- subscriptions : lecture seule cote application, seul le webhook Stripe ecrit
-- (via la service role key, qui contourne RLS).
create policy subscriptions_select on public.subscriptions
  for select to authenticated using (business_id = public.current_business_id());

-- Aucun acces anonyme : les pages publiques (/join, /card) passent par le
-- serveur avec la service role key et un filtre explicite.

-- =============================================================================
-- RPC : ajout de visite atomique
-- =============================================================================

-- Ajoute une visite, incremente les points et cree la recompense si le seuil
-- est atteint. Tout se passe dans une seule transaction, le client est verrouille
-- (FOR UPDATE) et une fenetre anti-doublon empeche les double-clics / double-scans.
create or replace function public.add_visit(
  p_customer_id      uuid,
  p_business_id      uuid,
  p_dedupe_seconds   int default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer   public.customers%rowtype;
  v_program    public.loyalty_programs%rowtype;
  v_recent     timestamptz;
  v_rewards    int := 0;
  v_reward_ids uuid[] := '{}';
  v_reward_id  uuid;
begin
  -- Autorisation : un utilisateur connecte ne peut agir que pour son commerce.
  if auth.uid() is not null and public.current_business_id() is distinct from p_business_id then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  select * into v_customer
  from public.customers
  where id = p_customer_id and business_id = p_business_id
  for update;

  if not found then
    raise exception 'customer_not_found' using errcode = 'P0002';
  end if;

  select * into v_program
  from public.loyalty_programs
  where business_id = p_business_id and active
  limit 1;

  if not found then
    raise exception 'no_active_program' using errcode = 'P0002';
  end if;

  -- Anti-doublon : une visite vient d'etre enregistree pour ce client.
  select max(created_at) into v_recent
  from public.visits
  where customer_id = p_customer_id
    and created_at > now() - make_interval(secs => greatest(p_dedupe_seconds, 0));

  if v_recent is not null then
    return jsonb_build_object(
      'duplicate', true,
      'customer_id', v_customer.id,
      'first_name', v_customer.first_name,
      'current_points', v_customer.current_points,
      'total_visits', v_customer.total_visits,
      'reward_threshold', v_program.reward_threshold,
      'rewards_created', 0,
      'reward_ids', '[]'::jsonb
    );
  end if;

  insert into public.visits (business_id, customer_id, points_added, created_by)
  values (p_business_id, p_customer_id, v_program.points_per_visit, auth.uid());

  update public.customers
     set current_points = current_points + v_program.points_per_visit,
         total_visits   = total_visits + 1,
         last_visit_at  = now()
   where id = p_customer_id
  returning * into v_customer;

  -- Carte a tamponner : chaque palier atteint consomme reward_threshold points.
  while v_customer.current_points >= v_program.reward_threshold loop
    insert into public.rewards (business_id, customer_id, loyalty_program_id, reward_name)
    values (p_business_id, p_customer_id, v_program.id, v_program.reward_name)
    returning id into v_reward_id;

    v_reward_ids := v_reward_ids || v_reward_id;
    v_rewards := v_rewards + 1;

    update public.customers
       set current_points = current_points - v_program.reward_threshold
     where id = p_customer_id
    returning * into v_customer;
  end loop;

  return jsonb_build_object(
    'duplicate', false,
    'customer_id', v_customer.id,
    'first_name', v_customer.first_name,
    'current_points', v_customer.current_points,
    'total_visits', v_customer.total_visits,
    'reward_threshold', v_program.reward_threshold,
    'rewards_created', v_rewards,
    'reward_ids', to_jsonb(v_reward_ids)
  );
end;
$$;

revoke all on function public.add_visit(uuid, uuid, int) from public;
grant execute on function public.add_visit(uuid, uuid, int) to authenticated, service_role;
