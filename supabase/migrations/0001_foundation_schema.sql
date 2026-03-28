create extension if not exists pgcrypto;

create type public.user_role as enum ('cedente', 'inversor');

create type public.invoice_status as enum (
  'draft',
  'validating',
  'validated',
  'tokenized',
  'funding',
  'funded',
  'settling',
  'settled',
  'rejected',
  'defaulted'
);

create type public.fraction_status as enum ('available', 'reserved', 'sold', 'settled');

create type public.transaction_type as enum (
  'fraction_purchase',
  'disbursement_to_cedente',
  'settlement_payment',
  'interest_distribution',
  'refund'
);

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  role public.user_role not null,
  display_name text not null check (char_length(trim(display_name)) > 0),
  company_name text,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.invoices (
  id uuid primary key default gen_random_uuid(),
  cedente_id uuid not null references public.profiles(id) on delete cascade,
  status public.invoice_status not null default 'draft',
  pagador_cuit text not null,
  pagador_name text not null,
  invoice_number text not null,
  amount numeric(15,2) not null check (amount > 0),
  issue_date date not null,
  due_date date not null check (due_date >= issue_date),
  risk_tier text,
  discount_rate numeric(5,4),
  risk_explanation text,
  bcra_data jsonb,
  token_hash text unique,
  net_amount numeric(15,2),
  total_fractions integer check (total_fractions is null or total_fractions > 0),
  funded_fractions integer not null default 0 check (funded_fractions >= 0),
  validated_at timestamptz,
  tokenized_at timestamptz,
  funding_started_at timestamptz,
  funded_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  updated_at timestamptz not null default timezone('utc', now())
);

create table public.fractions (
  id uuid primary key default gen_random_uuid(),
  invoice_id uuid not null references public.invoices(id) on delete cascade,
  fraction_index integer not null check (fraction_index > 0),
  amount numeric(15,2) not null check (amount > 0),
  net_amount numeric(15,2) not null check (net_amount > 0),
  status public.fraction_status not null default 'available',
  investor_id uuid references public.profiles(id) on delete set null,
  purchased_at timestamptz,
  settled_at timestamptz,
  created_at timestamptz not null default timezone('utc', now()),
  unique (invoice_id, fraction_index)
);

create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  type public.transaction_type not null,
  invoice_id uuid references public.invoices(id) on delete set null,
  fraction_id uuid references public.fractions(id) on delete set null,
  from_user_id uuid references public.profiles(id) on delete set null,
  to_user_id uuid references public.profiles(id) on delete set null,
  amount numeric(15,2) not null check (amount > 0),
  description text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.events (
  id bigint generated always as identity primary key,
  entity_type text not null,
  entity_id uuid not null,
  event_type text not null,
  old_data jsonb not null default '{}'::jsonb,
  new_data jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles(id) on delete set null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default timezone('utc', now())
);

create table public.bcra_cache (
  cuit text primary key,
  deudores_data jsonb,
  historicas_data jsonb,
  cheques_data jsonb,
  fetched_at timestamptz not null default timezone('utc', now()),
  expires_at timestamptz not null default timezone('utc', now()) + interval '7 days'
);

create index idx_profiles_role on public.profiles(role);
create index idx_invoices_cedente_id on public.invoices(cedente_id);
create index idx_invoices_status on public.invoices(status);
create index idx_fractions_invoice_id on public.fractions(invoice_id);
create index idx_fractions_investor_id on public.fractions(investor_id);
create index idx_fractions_status on public.fractions(status);
create index idx_transactions_invoice_id on public.transactions(invoice_id);
create index idx_transactions_from_user_id on public.transactions(from_user_id);
create index idx_transactions_to_user_id on public.transactions(to_user_id);
create index idx_events_entity on public.events(entity_type, entity_id);
create index idx_events_actor_id on public.events(actor_id);
create index idx_events_created_at on public.events(created_at);
create index idx_bcra_cache_expires_at on public.bcra_cache(expires_at);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = timezone('utc', now());
  return new;
end;
$$;

create trigger trg_profiles_updated_at
before update on public.profiles
for each row
execute function public.set_updated_at();

create trigger trg_invoices_updated_at
before update on public.invoices
for each row
execute function public.set_updated_at();

create or replace function public.prevent_append_only_mutation()
returns trigger
language plpgsql
as $$
begin
  raise exception '% is append-only and cannot be changed', tg_table_name;
end;
$$;

create trigger trg_events_append_only
before update or delete on public.events
for each row
execute function public.prevent_append_only_mutation();

create trigger trg_transactions_append_only
before update or delete on public.transactions
for each row
execute function public.prevent_append_only_mutation();

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, role, display_name, company_name)
  values (
    new.id,
    coalesce((new.raw_user_meta_data ->> 'role')::public.user_role, 'cedente'::public.user_role),
    coalesce(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), split_part(new.email, '@', 1)),
    nullif(trim(new.raw_user_meta_data ->> 'company_name'), '')
  )
  on conflict (id) do nothing;

  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
after insert on auth.users
for each row
execute function public.handle_new_user();

create or replace function public.user_role()
returns public.user_role
language sql
stable
security invoker
set search_path = public
as $$
  select role from public.profiles where id = auth.uid()
$$;

create or replace function public.transition_invoice(
  p_invoice_id uuid,
  p_new_status public.invoice_status,
  p_actor_id uuid default null
)
returns public.invoices
language plpgsql
security definer
set search_path = public
as $$
declare
  v_invoice public.invoices;
  v_previous_status public.invoice_status;
  v_allowed boolean := false;
begin
  select *
  into v_invoice
  from public.invoices
  where id = p_invoice_id
  for update;

  if not found then
    raise exception 'Invoice not found: %', p_invoice_id;
  end if;

  v_previous_status := v_invoice.status;

  v_allowed := case
    when v_previous_status = 'draft' and p_new_status = 'validating' then true
    when v_previous_status = 'validating' and p_new_status in ('validated', 'rejected') then true
    when v_previous_status = 'validated' and p_new_status = 'tokenized' then true
    when v_previous_status = 'tokenized' and p_new_status = 'funding' then true
    when v_previous_status = 'funding' and p_new_status in ('funded', 'defaulted') then true
    when v_previous_status = 'funded' and p_new_status = 'settling' then true
    when v_previous_status = 'settling' and p_new_status = 'settled' then true
    else false
  end;

  if not v_allowed then
    raise exception 'Invalid transition: % -> %', v_previous_status, p_new_status;
  end if;

  update public.invoices
  set
    status = p_new_status,
    validated_at = case when p_new_status = 'validated' then timezone('utc', now()) else validated_at end,
    tokenized_at = case when p_new_status = 'tokenized' then timezone('utc', now()) else tokenized_at end,
    funding_started_at = case when p_new_status = 'funding' then timezone('utc', now()) else funding_started_at end,
    funded_at = case when p_new_status = 'funded' then timezone('utc', now()) else funded_at end,
    settled_at = case when p_new_status = 'settled' then timezone('utc', now()) else settled_at end,
    updated_at = timezone('utc', now())
  where id = p_invoice_id
  returning * into v_invoice;

  insert into public.events (entity_type, entity_id, event_type, old_data, new_data, actor_id)
  values (
    'invoice',
    p_invoice_id,
    'invoice.transitioned',
    jsonb_build_object('status', v_previous_status),
    jsonb_build_object('status', p_new_status),
    p_actor_id
  );

  return v_invoice;
end;
$$;

grant execute on function public.user_role() to authenticated, service_role;
grant execute on function public.transition_invoice(uuid, public.invoice_status, uuid) to authenticated, service_role;
