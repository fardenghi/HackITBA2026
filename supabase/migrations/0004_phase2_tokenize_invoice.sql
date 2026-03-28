create or replace function public.tokenize_invoice(
  p_invoice_id uuid,
  p_fraction_count integer,
  p_actor_id uuid default null,
  p_token_hash text default null,
  p_net_amount numeric(15,2) default null,
  p_fraction_amounts numeric[] default null
)
returns table (
  token_hash text,
  net_amount numeric(15,2),
  total_fractions integer,
  status public.invoice_status
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_sum numeric(15,2);
  v_amount numeric(15,2);
begin
  if p_fraction_count is null or p_fraction_count <= 0 then
    raise exception 'Fraction count must be a positive integer';
  end if;

  if p_token_hash is null or length(trim(p_token_hash)) = 0 then
    raise exception 'Token hash is required';
  end if;

  if p_net_amount is null or p_net_amount <= 0 then
    raise exception 'Net amount must be positive';
  end if;

  if p_fraction_amounts is null or array_length(p_fraction_amounts, 1) <> p_fraction_count then
    raise exception 'Fraction amounts must match fraction count';
  end if;

  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  if v_invoice.status <> 'validated' then
    raise exception 'Invoice % must be validated before tokenization', p_invoice_id;
  end if;

  if exists (select 1 from public.fractions where invoice_id = p_invoice_id) then
    raise exception 'Invoice % already has fractions', p_invoice_id;
  end if;

  select coalesce(sum(value), 0)::numeric(15,2)
  into v_sum
  from unnest(p_fraction_amounts) as value;

  v_amount := round(p_net_amount::numeric, 2);

  if round(v_sum, 2) <> v_amount then
    raise exception 'Fraction amounts (%) must sum to net amount (%)', v_sum, v_amount;
  end if;

  update public.invoices
  set token_hash = p_token_hash,
      net_amount = v_amount,
      total_fractions = p_fraction_count,
      updated_at = timezone('utc', now())
  where id = p_invoice_id;

  perform public.transition_invoice(p_invoice_id, 'tokenized', p_actor_id);

  insert into public.fractions (invoice_id, fraction_index, amount, net_amount)
  select
    p_invoice_id,
    idx,
    (p_fraction_amounts[idx])::numeric(15,2),
    (p_fraction_amounts[idx])::numeric(15,2)
  from generate_subscripts(p_fraction_amounts, 1) as idx;

  perform public.transition_invoice(p_invoice_id, 'funding', p_actor_id);

  return query
  select invoices.token_hash, invoices.net_amount, invoices.total_fractions, invoices.status
  from public.invoices
  where invoices.id = p_invoice_id;
end;
$$;

grant execute on function public.tokenize_invoice(uuid, integer, uuid, text, numeric, numeric[]) to authenticated, service_role;
