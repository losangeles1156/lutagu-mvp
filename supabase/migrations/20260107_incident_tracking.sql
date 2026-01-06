create table if not exists public.incident_tracking (
    id uuid primary key default gen_random_uuid(),
    issue_id text not null unique,
    title text not null,
    description text not null,
    environment text not null,
    occurred_at timestamptz,
    operation_steps text not null,
    error_messages text[] default '{}',
    temporary_solution text,
    root_cause_analysis text,
    preventive_measures text,
    status text not null default 'open' check (status in ('open', 'in_progress', 'resolved', 'closed')),
    resolved_at timestamptz,
    created_at timestamptz not null default now(),
    updated_at timestamptz not null default now()
);

create index if not exists idx_incident_tracking_status on public.incident_tracking(status);
create index if not exists idx_incident_tracking_created_at on public.incident_tracking(created_at desc);

alter table public.incident_tracking enable row level security;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'incident_tracking'
      AND policyname = 'Admins manage incident_tracking'
  ) THEN
    CREATE POLICY "Admins manage incident_tracking" ON public.incident_tracking
      FOR ALL
      USING (public.is_admin())
      WITH CHECK (public.is_admin());
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'incident_tracking'
      AND policyname = 'Service role write incident_tracking'
  ) THEN
    CREATE POLICY "Service role write incident_tracking" ON public.incident_tracking
      FOR ALL
      USING (auth.role() = 'service_role')
      WITH CHECK (auth.role() = 'service_role');
  END IF;
END $$;
