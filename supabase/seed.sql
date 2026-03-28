-- Demo-safe baseline data for Phase 1 and Phase 2 preparation.
-- Auth users are created through the app's signup flow; this seed focuses on
-- deterministic public-side data that later phases depend on.

insert into public.bcra_cache (cuit, deudores_data, historicas_data, cheques_data, fetched_at, expires_at)
values
  (
    '30712345678',
    '{"empresa":"Techint SA","situacion":1,"monto_total":125000000.00,"dias_atraso":0}'::jsonb,
    '{"periodos":[{"mes":"2025-12","situacion":1},{"mes":"2026-01","situacion":1},{"mes":"2026-02","situacion":1}]}'::jsonb,
    '{"rechazados":0,"monto":0}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()) + interval '7 days'
  ),
  (
    '30798765432',
    '{"empresa":"YPF SA","situacion":2,"monto_total":98000000.00,"dias_atraso":7}'::jsonb,
    '{"periodos":[{"mes":"2025-12","situacion":1},{"mes":"2026-01","situacion":2},{"mes":"2026-02","situacion":2}]}'::jsonb,
    '{"rechazados":1,"monto":185000.00}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()) + interval '7 days'
  ),
  (
    '30654321987',
    '{"empresa":"Arcor SAIC","situacion":1,"monto_total":64000000.00,"dias_atraso":0}'::jsonb,
    '{"periodos":[{"mes":"2025-12","situacion":1},{"mes":"2026-01","situacion":1},{"mes":"2026-02","situacion":1}]}'::jsonb,
    '{"rechazados":0,"monto":0}'::jsonb,
    timezone('utc', now()),
    timezone('utc', now()) + interval '7 days'
  )
on conflict (cuit) do update
set
  deudores_data = excluded.deudores_data,
  historicas_data = excluded.historicas_data,
  cheques_data = excluded.cheques_data,
  fetched_at = excluded.fetched_at,
  expires_at = excluded.expires_at;
