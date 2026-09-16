-- =============================================================================
-- Parrainage : un client amène un ami, les deux sont récompensés.
-- =============================================================================

-- Code de parrainage, distinct du card_token.
-- Le card_token donne accès à la carte : le partager reviendrait à donner ses
-- points. Le code de parrainage, lui, est fait pour circuler.
alter table public.customers
  add column if not exists referral_code text,
  add column if not exists referred_by uuid references public.customers (id) on delete set null;

-- Rempli ligne par ligne : un DEFAULT volatile serait évalué une seule fois
-- pour les lignes existantes, et violerait l'unicité.
update public.customers
   set referral_code = encode(gen_random_bytes(4), 'hex')
 where referral_code is null;

alter table public.customers
  alter column referral_code set default encode(gen_random_bytes(4), 'hex'),
  alter column referral_code set not null;

create unique index if not exists customers_referral_code_idx
  on public.customers (referral_code);
create index if not exists customers_referred_by_idx
  on public.customers (referred_by);

-- Points offerts au parrain et au filleul. Zéro = parrainage désactivé.
alter table public.loyalty_programs
  add column if not exists referral_points int not null default 0
    check (referral_points between 0 and 10000);

-- ---------------------------------------------------------------------------
-- Ajout de points et création des récompenses correspondantes.
-- Extrait de add_visit pour être réutilisé par le bonus de parrainage.
-- ---------------------------------------------------------------------------
create or replace function public.apply_points(
  p_customer_id uuid,
  p_business_id uuid,
  p_program_id  uuid,
  p_threshold   int,
  p_reward_name text,
  p_points      int
)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points  int;
  v_rewards int := 0;
begin
  if p_points <= 0 then
    return 0;
  end if;

  update public.customers
     set current_points = current_points + p_points
   where id = p_customer_id
  returning current_points into v_points;

  while v_points >= p_threshold loop
    insert into public.rewards (business_id, customer_id, loyalty_program_id, reward_name)
    values (p_business_id, p_customer_id, p_program_id, p_reward_name);

    update public.customers
       set current_points = current_points - p_threshold
     where id = p_customer_id
    returning current_points into v_points;

    v_rewards := v_rewards + 1;
  end loop;

  return v_rewards;
end;
$$;

revoke all on function public.apply_points(uuid, uuid, uuid, int, text, int) from public;

-- ---------------------------------------------------------------------------
-- add_visit : récompense le parrainage à la PREMIÈRE visite du filleul.
-- Récompenser à l'inscription se prêterait trop facilement aux faux comptes ;
-- une visite réelle en boutique, non.
-- ---------------------------------------------------------------------------
create or replace function public.add_visit(
  p_customer_id      uuid,
  p_business_id      uuid,
  p_amount_cents     int default null,
  p_dedupe_seconds   int default 10
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer     public.customers%rowtype;
  v_program      public.loyalty_programs%rowtype;
  v_recent       timestamptz;
  v_points       int;
  v_rewards      int := 0;
  v_first_visit  boolean;
  v_referrer     uuid;
  v_referral_ok  boolean := false;
begin
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

  if v_program.mode = 'amount' then
    if p_amount_cents is null or p_amount_cents <= 0 then
      raise exception 'amount_required' using errcode = '22023';
    end if;
    v_points := (p_amount_cents / 100) * v_program.points_per_euro;
    if v_points <= 0 then
      raise exception 'amount_too_small' using errcode = '22023';
    end if;
  else
    v_points := v_program.points_per_visit;
  end if;

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
      'points_added', 0,
      'rewards_created', 0,
      'referral_rewarded', false
    );
  end if;

  v_first_visit := v_customer.total_visits = 0;
  v_referrer := v_customer.referred_by;

  insert into public.visits (business_id, customer_id, points_added, amount_cents, created_by)
  values (
    p_business_id,
    p_customer_id,
    v_points,
    case when v_program.mode = 'amount' then p_amount_cents else null end,
    auth.uid()
  );

  update public.customers
     set total_visits  = total_visits + 1,
         last_visit_at = now()
   where id = p_customer_id;

  v_rewards := public.apply_points(
    p_customer_id, p_business_id, v_program.id,
    v_program.reward_threshold, v_program.reward_name, v_points
  );

  -- Bonus de parrainage, une seule fois, à la première visite du filleul.
  if v_first_visit and v_referrer is not null and v_program.referral_points > 0 then
    v_rewards := v_rewards + public.apply_points(
      p_customer_id, p_business_id, v_program.id,
      v_program.reward_threshold, v_program.reward_name, v_program.referral_points
    );

    -- Le parrain n'est récompensé que s'il appartient toujours au commerce.
    perform public.apply_points(
      c.id, p_business_id, v_program.id,
      v_program.reward_threshold, v_program.reward_name, v_program.referral_points
    )
    from public.customers c
    where c.id = v_referrer and c.business_id = p_business_id;

    v_referral_ok := true;
  end if;

  select * into v_customer from public.customers where id = p_customer_id;

  return jsonb_build_object(
    'duplicate', false,
    'customer_id', v_customer.id,
    'first_name', v_customer.first_name,
    'current_points', v_customer.current_points,
    'total_visits', v_customer.total_visits,
    'reward_threshold', v_program.reward_threshold,
    'points_added', v_points,
    'rewards_created', v_rewards,
    'referral_rewarded', v_referral_ok
  );
end;
$$;

revoke all on function public.add_visit(uuid, uuid, int, int) from public;
grant execute on function public.add_visit(uuid, uuid, int, int) to authenticated, service_role;
