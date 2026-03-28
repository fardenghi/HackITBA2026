alter table public.profiles enable row level security;
alter table public.invoices enable row level security;
alter table public.fractions enable row level security;
alter table public.transactions enable row level security;
alter table public.events enable row level security;
alter table public.bcra_cache enable row level security;

revoke all on public.profiles from anon, authenticated;
revoke all on public.invoices from anon, authenticated;
revoke all on public.fractions from anon, authenticated;
revoke all on public.transactions from anon, authenticated;
revoke all on public.events from anon, authenticated;
revoke all on public.bcra_cache from anon, authenticated;

grant select, update on public.profiles to authenticated;
grant select, insert, update on public.invoices to authenticated;
grant select on public.fractions to authenticated;
grant select on public.transactions to authenticated;
grant select on public.events to authenticated;

create policy "profiles_self_select"
on public.profiles
for select
to authenticated
using ((select auth.uid()) = id);

create policy "profiles_self_update"
on public.profiles
for update
to authenticated
using ((select auth.uid()) = id)
with check ((select auth.uid()) = id);

create policy "invoices_cedente_select"
on public.invoices
for select
to authenticated
using ((select auth.uid()) = cedente_id);

create policy "invoices_cedente_insert"
on public.invoices
for insert
to authenticated
with check ((select auth.uid()) = cedente_id and (select public.user_role()) = 'cedente');

create policy "invoices_cedente_update"
on public.invoices
for update
to authenticated
using ((select auth.uid()) = cedente_id)
with check ((select auth.uid()) = cedente_id);

create policy "invoices_investor_marketplace"
on public.invoices
for select
to authenticated
using (
  (select public.user_role()) = 'inversor'
  and status in ('funding', 'funded', 'settling', 'settled')
);

create policy "fractions_investor_visible"
on public.fractions
for select
to authenticated
using (
  (
    (select public.user_role()) = 'inversor'
    and (
      status = 'available'
      or investor_id = (select auth.uid())
    )
  )
  or exists (
    select 1
    from public.invoices
    where invoices.id = fractions.invoice_id
      and invoices.cedente_id = (select auth.uid())
  )
);

create policy "transactions_own"
on public.transactions
for select
to authenticated
using ((select auth.uid()) in (from_user_id, to_user_id));

create policy "events_visible_for_accessible_invoices"
on public.events
for select
to authenticated
using (
  actor_id = (select auth.uid())
  or (
    entity_type = 'invoice'
    and exists (
      select 1
      from public.invoices
      where invoices.id = events.entity_id
    )
  )
  or (
    entity_type = 'fraction'
    and exists (
      select 1
      from public.fractions
      where fractions.id = events.entity_id
    )
  )
);

create index if not exists idx_events_invoice_entity on public.events(entity_id) where entity_type = 'invoice';
create index if not exists idx_events_fraction_entity on public.events(entity_id) where entity_type = 'fraction';
