-- =============================================================================
-- Garde-fous du parrainage : montant minimum d'achat et plafond mensuel.
-- =============================================================================

alter table public.loyalty_programs
  -- Montant minimum de l'achat du filleul pour que le parrainage compte.
  -- Zéro = aucune condition. N'a de sens qu'en mode « points selon le montant ».
  add column if not exists referral_min_amount_cents int not null default 0
    check (referral_min_amount_cents between 0 and 100000000),
  -- Parrainages récompensés par client sur 30 jours glissants. Zéro = illimité.
  add column if not exists referral_monthly_limit int not null default 0
    check (referral_monthly_limit between 0 and 1000);

-- Date à laquelle le parrainage de ce filleul a été récompensé.
-- Sert de trace et de base de comptage pour le plafond.
alter table public.customers
  add column if not exists referral_rewarded_at timestamptz;

create index if not exists customers_referral_rewarded_idx
  on public.customers (referred_by, referral_rewarded_at);

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
  v_rewards       int := 0;
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
    return jsonb_build_object(
      'duplicate', true,
      'customer_id', v_customer.id,
      'first_name', v_customer.first_name,
      'current_points', v_customer.current_points,
      'total_visits', v_customer.total_visits,
      'reward_threshold', v_program.reward_threshold,
      'points_added', 0,
      'rewards_created', 0,
      'referral_rewarded', false,
      'referral_note', null
    );
  end if;

  -- Le bonus reste dû tant qu'il n'a pas été versé : si la première visite
  -- n'atteint pas le montant minimum, le filleul peut encore le déclencher
  -- lors d'un passage ultérieur. Versé une seule fois, jamais deux.
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

  v_rewards := public.apply_points(
    p_customer_id, p_business_id, v_program.id,
    v_program.reward_threshold, v_program.reward_name, v_points
  );

  -- ---------------------------------------------------------------------
  -- Parrainage : premier passage en boutique qui remplit les conditions.
  -- ---------------------------------------------------------------------
  if v_referral_due and v_referrer is not null and v_program.referral_points > 0 then
    -- Condition 1 : achat suffisant. Sans elle, un passage sans rien acheter
    -- suffirait à déclencher le bonus.
    if v_program.mode = 'amount'
       and v_program.referral_min_amount_cents > 0
       and coalesce(p_amount_cents, 0) < v_program.referral_min_amount_cents then
      v_referral_note := 'min_amount';
    else
      -- Condition 2 : plafond par parrain sur 30 jours glissants. Rend la
      -- creation de faux comptes non rentable sans gener un vrai client.
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
        v_rewards := v_rewards + public.apply_points(
          p_customer_id, p_business_id, v_program.id,
          v_program.reward_threshold, v_program.reward_name, v_program.referral_points
        );

        perform public.apply_points(
          c.id, p_business_id, v_program.id,
          v_program.reward_threshold, v_program.reward_name, v_program.referral_points
        )
        from public.customers c
        where c.id = v_referrer and c.business_id = p_business_id;

        update public.customers
           set referral_rewarded_at = now()
         where id = p_customer_id;

        v_referral_ok := true;
      end if;
    end if;
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
    'referral_rewarded', v_referral_ok,
    'referral_note', v_referral_note
  );
end;
$$;

revoke all on function public.add_visit(uuid, uuid, int, int) from public;
grant execute on function public.add_visit(uuid, uuid, int, int) to authenticated, service_role;
