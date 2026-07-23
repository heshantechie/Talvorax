-- Analytics event log (Tier 1, item 3).
-- Run this once in the Supabase SQL editor.

create table if not exists public.analytics_events (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  user_id uuid references auth.users (id) on delete set null,
  properties jsonb not null default '{}'::jsonb,
  page_path text,
  created_at timestamptz not null default now()
);

create index if not exists analytics_events_name_created_idx
  on public.analytics_events (event_name, created_at desc);
create index if not exists analytics_events_user_idx
  on public.analytics_events (user_id);

alter table public.analytics_events enable row level security;

-- Anyone (including anonymous visitors) may write events; nobody may read
-- them from the client. Read via the Supabase dashboard / service role only.
drop policy if exists "analytics insert for all" on public.analytics_events;
create policy "analytics insert for all"
  on public.analytics_events for insert
  to anon, authenticated
  with check (true);
