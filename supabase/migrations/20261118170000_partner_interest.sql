create table public.partner_interest (
  id uuid primary key,
  name text not null check (char_length(name) between 2 and 100),
  email text not null check (char_length(email) between 3 and 200),
  track text not null check (track in ('sst', 'development')),
  region text not null check (char_length(region) between 2 and 100),
  created_at timestamptz not null default now()
);

alter table public.partner_interest enable row level security;
revoke all on public.partner_interest from public, anon, authenticated, service_role;
grant select, insert on public.partner_interest to service_role;
create index partner_interest_recent on public.partner_interest (created_at desc, id);
