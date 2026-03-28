create or replace function public.fund_invoice(
  p_invoice_id uuid,
  p_fraction_count integer
)
returns table (
  purchased_count integer,
  checkout_total numeric(15,2),
  funded_fractions integer,
  funding_percentage integer,
  invoice_status public.invoice_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_invoice public.invoices;
  v_fraction_ids uuid[] := '{}';
  v_checkout_total numeric(15,2) := 0;
  v_purchased_count integer := 0;
begin
  if v_actor_id is null then
    raise exception 'Authentication required to purchase invoice fractions';
  end if;

  if public.user_role() <> 'inversor' then
    raise exception 'Only inversor users can fund invoices';
  end if;

  if p_fraction_count is null or p_fraction_count <= 0 then
    raise exception 'Fraction count must be a positive integer';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  if v_invoice.status <> 'funding' then
    raise exception 'Invoice % is not open for funding', p_invoice_id;
  end if;

  if coalesce(v_invoice.total_fractions, 0) <= 0 then
    raise exception 'Invoice % has no purchasable fractions', p_invoice_id;
  end if;

  select
    coalesce(array_agg(locked.id order by locked.fraction_index), '{}'),
    coalesce(sum(locked.net_amount), 0)::numeric(15,2),
    count(*)
  into
    v_fraction_ids,
    v_checkout_total,
    v_purchased_count
  from (
    select id, net_amount, fraction_index
    from public.fractions
    where invoice_id = p_invoice_id
      and status = 'available'
    order by fraction_index
    limit p_fraction_count
    for update skip locked
  ) as locked;

  if v_purchased_count <> p_fraction_count then
    raise exception 'Only % fractions remain available for invoice %', v_purchased_count, p_invoice_id;
  end if;

  update public.fractions
  set
    status = 'sold',
    investor_id = v_actor_id,
    purchased_at = timezone('utc', now())
  where id = any(v_fraction_ids);

  insert into public.transactions (
    type,
    invoice_id,
    fraction_id,
    from_user_id,
    to_user_id,
    amount,
    description,
    metadata
  )
  select
    'fraction_purchase',
    f.invoice_id,
    f.id,
    v_actor_id,
    v_invoice.cedente_id,
    f.net_amount,
    format('Purchase of fraction %s for invoice %s', f.fraction_index, v_invoice.invoice_number),
    jsonb_build_object(
      'invoice_id', f.invoice_id,
      'fraction_index', f.fraction_index,
      'investor_id', v_actor_id
    )
  from public.fractions as f
  where f.id = any(v_fraction_ids);

  update public.invoices as invoices
  set
    funded_fractions = invoices.funded_fractions + v_purchased_count,
    updated_at = timezone('utc', now())
  where invoices.id = p_invoice_id
  returning * into v_invoice;

  if v_invoice.funded_fractions > v_invoice.total_fractions then
    raise exception 'Invoice % became over-funded', p_invoice_id;
  end if;

  if v_invoice.funded_fractions = v_invoice.total_fractions then
    perform public.transition_invoice(p_invoice_id, 'funded', v_actor_id);

    insert into public.transactions (
      type,
      invoice_id,
      from_user_id,
      to_user_id,
      amount,
      description,
      metadata
    )
    select
      'disbursement_to_cedente',
      v_invoice.id,
      null,
      v_invoice.cedente_id,
      v_invoice.net_amount,
      format('Disbursement for invoice %s after funding completed', v_invoice.invoice_number),
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'source', 'fund_invoice',
        'simulated', false
      )
    where not exists (
      select 1
      from public.transactions as transactions
      where transactions.invoice_id = v_invoice.id
        and transactions.type = 'disbursement_to_cedente'
    );

    select *
    into v_invoice
    from public.invoices
    where id = p_invoice_id;
  end if;

  return query
  select
    v_purchased_count,
    v_checkout_total,
    v_invoice.funded_fractions,
    case
      when coalesce(v_invoice.total_fractions, 0) <= 0 then 0
      else round((v_invoice.funded_fractions::numeric / v_invoice.total_fractions::numeric) * 100)::integer
    end,
    v_invoice.status;
end;
$$;

revoke all on function public.fund_invoice(uuid, integer) from public;
grant execute on function public.fund_invoice(uuid, integer) to authenticated, service_role;

create or replace function public.settle_invoice(
  p_invoice_id uuid
)
returns table (
  invoice_id uuid,
  invoice_status public.invoice_status,
  settled_fractions integer,
  principal_total numeric(15,2),
  interest_total numeric(15,2),
  cedente_disbursement_total numeric(15,2)
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor_id uuid := auth.uid();
  v_actor_role text := current_setting('request.jwt.claim.role', true);
  v_is_service_role boolean := coalesce(v_actor_role = 'service_role', false);
  v_invoice public.invoices;
  v_fraction record;
  v_now timestamptz := timezone('utc', now());
  v_interest_pool numeric(15,2) := 0;
  v_interest_allocated numeric(15,2) := 0;
  v_interest_amount numeric(15,2) := 0;
  v_principal_total numeric(15,2) := 0;
  v_interest_total numeric(15,2) := 0;
  v_settled_fractions integer := 0;
  v_cedente_disbursement_total numeric(15,2) := 0;
  v_fraction_count integer := 0;
  v_current_index integer := 0;
  v_simulated boolean := false;
begin
  if not v_is_service_role then
    if v_actor_id is null then
      raise exception 'Authentication required to settle invoices';
    end if;

    if public.user_role() <> 'cedente' then
      raise exception 'Only cedente users can settle invoices';
    end if;
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  if not v_is_service_role and v_invoice.cedente_id <> v_actor_id then
    raise exception 'Only the owning cedente can settle invoice %', p_invoice_id;
  end if;

  if v_invoice.status <> 'funded' then
    raise exception 'Invoice % is not funded and cannot be settled', p_invoice_id;
  end if;

  if coalesce(v_invoice.net_amount, 0) <= 0 or coalesce(v_invoice.amount, 0) <= 0 then
    raise exception 'Invoice % is missing settlement amounts', p_invoice_id;
  end if;

  select count(*)
  into v_fraction_count
  from public.fractions as fractions
  where fractions.invoice_id = p_invoice_id
    and fractions.status = 'sold';

  if v_fraction_count = 0 then
    raise exception 'Invoice % has no sold fractions to settle', p_invoice_id;
  end if;

  v_simulated := v_invoice.due_date > (v_now at time zone 'utc')::date;
  v_interest_pool := round(v_invoice.amount - v_invoice.net_amount, 2);

  perform public.transition_invoice(p_invoice_id, 'settling', v_actor_id);

  insert into public.transactions (
    type,
    invoice_id,
    from_user_id,
    to_user_id,
    amount,
    description,
    metadata
  )
  select
    'disbursement_to_cedente',
    v_invoice.id,
    null,
    v_invoice.cedente_id,
    v_invoice.net_amount,
    format('Disbursement for invoice %s', v_invoice.invoice_number),
    jsonb_build_object(
      'invoice_id', v_invoice.id,
      'source', 'settle_invoice',
      'simulated', v_simulated
    )
  where not exists (
    select 1
    from public.transactions as transactions
    where transactions.invoice_id = v_invoice.id
      and transactions.type = 'disbursement_to_cedente'
  );

  select coalesce(sum(transactions.amount), 0)::numeric(15,2)
  into v_cedente_disbursement_total
  from public.transactions as transactions
  where transactions.invoice_id = v_invoice.id
    and transactions.type = 'disbursement_to_cedente';

  for v_fraction in
    select id, fraction_index, investor_id, net_amount
    from public.fractions as fractions
    where fractions.invoice_id = p_invoice_id
      and fractions.status = 'sold'
    order by fraction_index
    for update
  loop
    v_current_index := v_current_index + 1;

    if v_current_index = v_fraction_count then
      v_interest_amount := round(v_interest_pool - v_interest_allocated, 2);
    else
      v_interest_amount := round((v_fraction.net_amount / v_invoice.net_amount) * v_interest_pool, 2);
      v_interest_allocated := round(v_interest_allocated + v_interest_amount, 2);
    end if;

    if v_current_index = v_fraction_count then
      v_interest_allocated := round(v_interest_allocated + v_interest_amount, 2);
    end if;

    insert into public.transactions (
      type,
      invoice_id,
      fraction_id,
      from_user_id,
      to_user_id,
      amount,
      description,
      metadata
    )
    values (
      'settlement_payment',
      v_invoice.id,
      v_fraction.id,
      null,
      v_fraction.investor_id,
      v_fraction.net_amount,
      format('Principal repayment for fraction %s of invoice %s', v_fraction.fraction_index, v_invoice.invoice_number),
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'fraction_index', v_fraction.fraction_index,
        'simulated', v_simulated
      )
    );

    insert into public.transactions (
      type,
      invoice_id,
      fraction_id,
      from_user_id,
      to_user_id,
      amount,
      description,
      metadata
    )
    values (
      'interest_distribution',
      v_invoice.id,
      v_fraction.id,
      null,
      v_fraction.investor_id,
      v_interest_amount,
      format('Interest distribution for fraction %s of invoice %s', v_fraction.fraction_index, v_invoice.invoice_number),
      jsonb_build_object(
        'invoice_id', v_invoice.id,
        'fraction_index', v_fraction.fraction_index,
        'simulated', v_simulated
      )
    );

    update public.fractions
    set
      status = 'settled',
      settled_at = v_now
    where id = v_fraction.id;

    v_settled_fractions := v_settled_fractions + 1;
    v_principal_total := round(v_principal_total + v_fraction.net_amount, 2);
    v_interest_total := round(v_interest_total + v_interest_amount, 2);
  end loop;

  perform public.transition_invoice(p_invoice_id, 'settled', v_actor_id);

  return query
  select
    v_invoice.id,
    'settled'::public.invoice_status,
    v_settled_fractions,
    v_principal_total,
    v_interest_total,
    v_cedente_disbursement_total;
end;
$$;

revoke all on function public.settle_invoice(uuid) from public;
grant execute on function public.settle_invoice(uuid) to authenticated, service_role;
