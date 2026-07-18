-- Run this in the Supabase SQL editor once you create your project.
create table if not exists deals (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  property_name text not null default 'New Deal',
  inputs jsonb not null,
  source_documents jsonb, -- [{name, type, extractedAt}]
  notes text
);

alter table deals enable row level security;

-- Single-user setup: allow all operations. Tighten with auth.uid() checks
-- once you add multi-user login.
create policy "allow all" on deals for all using (true) with check (true);
