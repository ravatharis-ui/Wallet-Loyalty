-- =============================================================================
-- Paliers de récompense : le client dépense ses points quand il le décide.
--
-- Jusqu'ici le programme n'avait qu'un seuil unique, et les points étaient
-- consommés automatiquement dès qu'il était franchi. Le commerçant ne pouvait
-- donc pas proposer d'échelle (un café à 50 points, un menu à 300), et le
-- client n'arbitrait rien.
--
-- Nouveau modèle : les points s'accumulent sans jamais être consommés d'office.
-- Le commerce publie un catalogue de paliers, et l'échange est un acte explicite
-- au comptoir (RPC `redeem_reward`), qui débite le coût du palier choisi.
-- =============================================================================

-- ------------------------------------------------------------- reward_tiers
create table if not exists public.reward_tiers (
  id          uuid primary key default gen_random_uuid(),
  business_id uuid        not null references public.businesses (id) on delete cascade,
  name        text        not null check (length(trim(name)) between 1 and 80),
  points_cost int         not null check (points_cost between 1 and 100000),
  position    int         not null default 0,
  active      boolean     not null default true,
  created_at  timestamptz not null default now()
);

create index if not exists reward_tiers_business_idx
  on public.reward_tiers (business_id, position, points_cost);

alter table public.reward_tiers enable row level security;

drop policy if exists reward_tiers_all on public.reward_tiers;
create policy reward_tiers_all on public.reward_tiers
  for all
  using (business_id = public.current_business_id())
  with check (business_id = public.current_business_id());

-- Traçabilité de l'échange : quel palier, et combien de points ont été débités.
alter table public.rewards
  add column if not exists reward_tier_id uuid references public.reward_tiers (id) on delete set null,
  add column if not exists points_spent int not null default 0;

-- Les deux colonnes du modèle à seuil unique deviennent facultatives : plus
-- personne ne les renseigne, mais on ne les supprime pas pour ne pas perdre
-- l'historique des programmes déjà configurés.
alter table public.loyalty_programs
  alter column reward_name set default 'Récompense',
  alter column reward_threshold set default 10;

-- Sert à ne pas prévenir deux fois le même client qu'il a de quoi échanger.
-- Remis à zéro à chaque échange, pour que la prochaine fois compte de nouveau.
alter table public.customers
  add column if not exists reward_notified_at timestamptz;

-- ---------------------------------------------------------------------------
-- Reprise de l'existant : le seuil unique de chaque programme devient le
-- premier palier du commerce. Personne ne perd sa récompense en cours de route.
-- ---------------------------------------------------------------------------
insert into public.reward_tiers (business_id, name, points_cost, position)
select lp.business_id, lp.reward_name, lp.reward_threshold, 0
from public.loyalty_programs lp
where lp.active
  and not exists (
    select 1 from public.reward_tiers rt where rt.business_id = lp.business_id
  );

-- ---------------------------------------------------------------------------
-- Les points ne se consomment plus tout seuls : `apply_points` n'a plus lieu
-- d'être. On la remplace par une addition simple.
-- ---------------------------------------------------------------------------
drop function if exists public.apply_points(uuid, uuid, uuid, int, text, int);

create or replace function public.add_points(p_customer_id uuid, p_points int)
returns int
language plpgsql
security definer
set search_path = public
as $$
declare
  v_points int;
begin
  if p_points <= 0 then
    select current_points into v_points from public.customers where id = p_customer_id;
    return coalesce(v_points, 0);
  end if;

  update public.customers
     set current_points = current_points + p_points
   where id = p_customer_id
  returning current_points into v_points;

  return coalesce(v_points, 0);
end;
$$;

revoke all on function public.add_points(uuid, int) from public;

-- ---------------------------------------------------------------------------
-- Construit la réponse renvoyée au scanner : solde, et ce qu'il permet.
-- Isolée pour que le chemin « doublon » et le chemin normal ne divergent pas.
-- ---------------------------------------------------------------------------
create or replace function public.visit_result(
  p_customer_id   uuid,
  p_business_id   uuid,
  p_duplicate     boolean,
  p_points_added  int,
  p_referral_ok   boolean,
  p_referral_note text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer   public.customers%rowtype;
  v_affordable int := 0;
  v_next_name  text := null;
  v_next_cost  int := null;
begin
  select * into v_customer from public.customers where id = p_customer_id;

  select count(*) into v_affordable
  from public.reward_tiers
  where business_id = p_business_id and active and points_cost <= v_customer.current_points;

  -- Le prochain palier hors de portée : c'est lui qui motive la visite suivante.
  select name, points_cost into v_next_name, v_next_cost
  from public.reward_tiers
  where business_id = p_business_id and active and points_cost > v_customer.current_points
  order by points_cost asc
  limit 1;

  return jsonb_build_object(
    'duplicate', p_duplicate,
    'customer_id', v_customer.id,
    'first_name', v_customer.first_name,
    'current_points', v_customer.current_points,
    'total_visits', v_customer.total_visits,
    'points_added', p_points_added,
    'affordable_rewards', v_affordable,
    'next_reward_name', v_next_name,
    'next_reward_cost', v_next_cost,
    'referral_rewarded', p_referral_ok,
    'referral_note', p_referral_note
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- add_visit : ajoute les points, applique le parrainage, et renseigne ce que
-- le client peut désormais s'offrir. Ne crée plus aucune récompense.
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
  v_customer      public.customers%rowtype;
  v_program       public.loyalty_programs%rowtype;
  v_recent        timestamptz;
  v_points        int;
  v_referral_due  boolean;
  v_referrer      uuid;
  v_recent_count  int;
  v_referral_ok   boolean := false;
  v_referral_note text := null;
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
    return public.visit_result(v_customer.id, p_business_id, true, 0, false, null);
  end if;

  v_referral_due := v_customer.referral_rewarded_at is null;
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

  perform public.add_points(p_customer_id, v_points);

  -- -------------------------------------------------------------------------
  -- Parrainage : premier passage en boutique qui remplit les conditions.
  -- -------------------------------------------------------------------------
  if v_referral_due and v_referrer is not null and v_program.referral_points > 0 then
    if v_program.mode = 'amount'
       and v_program.referral_min_amount_cents > 0
       and coalesce(p_amount_cents, 0) < v_program.referral_min_amount_cents then
      v_referral_note := 'min_amount';
    else
      if v_program.referral_monthly_limit > 0 then
        select count(*) into v_recent_count
        from public.customers
        where referred_by = v_referrer
          and referral_rewarded_at > now() - interval '30 days';
      else
        v_recent_count := 0;
      end if;

      if v_program.referral_monthly_limit > 0
         and v_recent_count >= v_program.referral_monthly_limit then
        v_referral_note := 'monthly_limit';
      else
        perform public.add_points(p_customer_id, v_program.referral_points);

        perform public.add_points(c.id, v_program.referral_points)
        from public.customers c
        where c.id = v_referrer and c.business_id = p_business_id;

        update public.customers
           set referral_rewarded_at = now()
         where id = p_customer_id;

        v_referral_ok := true;
      end if;
    end if;
  end if;

  return public.visit_result(p_customer_id, p_business_id, false, v_points, v_referral_ok, v_referral_note);
end;
$$;

revoke all on function public.visit_result(uuid, uuid, boolean, int, boolean, text) from public;
revoke all on function public.add_visit(uuid, uuid, int, int) from public;
grant execute on function public.add_visit(uuid, uuid, int, int) to authenticated, service_role;

-- ---------------------------------------------------------------------------
-- redeem_reward : l'échange au comptoir. Verrou sur la ligne client, contrôle
-- du solde dans la même transaction — deux scans simultanés ne peuvent pas
-- offrir deux fois la même récompense.
-- ---------------------------------------------------------------------------
create or replace function public.redeem_reward(
  p_customer_id uuid,
  p_business_id uuid,
  p_tier_id     uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_customer public.customers%rowtype;
  v_tier     public.reward_tiers%rowtype;
  v_program  public.loyalty_programs%rowtype;
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

  select * into v_tier
  from public.reward_tiers
  where id = p_tier_id and business_id = p_business_id and active;

  if not found then
    raise exception 'tier_not_found' using errcode = 'P0002';
  end if;

  if v_customer.current_points < v_tier.points_cost then
    return jsonb_build_object(
      'ok', false,
      'reason', 'insufficient_points',
      'current_points', v_customer.current_points,
      'points_cost', v_tier.points_cost
    );
  end if;

  select * into v_program
  from public.loyalty_programs
  where business_id = p_business_id and active
  limit 1;

  insert into public.rewards (
    business_id, customer_id, loyalty_program_id, reward_tier_id,
    status, reward_name, points_spent, redeemed_at
  )
  values (
    p_business_id, p_customer_id, v_program.id, v_tier.id,
    'redeemed', v_tier.name, v_tier.points_cost, now()
  );

  update public.customers
     set current_points     = current_points - v_tier.points_cost,
         -- Le client repart de zéro côté notification : la prochaine fois
         -- qu'il aura de quoi échanger, il sera prévenu de nouveau.
         reward_notified_at = null
   where id = p_customer_id
  returning current_points into v_customer.current_points;

  return jsonb_build_object(
    'ok', true,
    'reward_name', v_tier.name,
    'points_spent', v_tier.points_cost,
    'current_points', v_customer.current_points
  );
end;
$$;

revoke all on function public.redeem_reward(uuid, uuid, uuid) from public;
grant execute on function public.redeem_reward(uuid, uuid, uuid) to authenticated, service_role;
