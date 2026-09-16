-- =============================================================================
-- Deux modes de fidélité : carte à tamponner, ou points selon le montant.
-- =============================================================================

alter table public.loyalty_programs
  add column if not exists mode text not null default 'stamp'
    check (mode in ('stamp', 'amount')),
  -- Barème du mode « points » : combien de points rapporte un euro dépensé.
  add column if not exists points_per_euro int not null default 1
    check (points_per_euro between 1 and 100);

-- Montant de l'achat, renseigné par le commerçant au moment du scan.
-- Nul en mode tampon, où le montant n'est ni demandé ni utile.
alter table public.visits
  add column if not exists amount_cents int
    check (amount_cents is null or amount_cents between 0 and 100000000);

-- La signature change : l'ancienne version est remplacée, pas surchargée, pour
-- qu'aucun appel ne puisse viser l'ancienne par mégarde.
drop function if exists public.add_visit(uuid, uuid, int);

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
  v_customer   public.customers%rowtype;
  v_program    public.loyalty_programs%rowtype;
  v_recent     timestamptz;
  v_points     int;
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

  -- Points gagnés selon le mode du programme.
  if v_program.mode = 'amount' then
    if p_amount_cents is null or p_amount_cents <= 0 then
      raise exception 'amount_required' using errcode = '22023';
    end if;
    -- Les centimes ne comptent pas : seuls les euros entiers rapportent.
    v_points := (p_amount_cents / 100) * v_program.points_per_euro;
    if v_points <= 0 then
      raise exception 'amount_too_small' using errcode = '22023';
    end if;
  else
    v_points := v_program.points_per_visit;
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
      'points_added', 0,
      'rewards_created', 0,
      'reward_ids', '[]'::jsonb
    );
  end if;

  insert into public.visits (business_id, customer_id, points_added, amount_cents, created_by)
  values (
    p_business_id,
    p_customer_id,
    v_points,
    case when v_program.mode = 'amount' then p_amount_cents else null end,
    auth.uid()
  );

  update public.customers
     set current_points = current_points + v_points,
         total_visits   = total_visits + 1,
         last_visit_at  = now()
   where id = p_customer_id
  returning * into v_customer;

  -- Chaque palier atteint consomme reward_threshold points.
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
    'points_added', v_points,
    'rewards_created', v_rewards,
    'reward_ids', to_jsonb(v_reward_ids)
  );
end;
$$;

revoke all on function public.add_visit(uuid, uuid, int, int) from public;
grant execute on function public.add_visit(uuid, uuid, int, int) to authenticated, service_role;
