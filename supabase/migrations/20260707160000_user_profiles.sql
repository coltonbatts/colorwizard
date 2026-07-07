-- User profiles for tier / Stripe state (replaces Firebase Firestore users collection)

create table if not exists public.user_profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  tier text not null default 'free' check (tier in ('free', 'pro', 'pro_lifetime')),
  email text,
  stripe_customer_id text,
  pro_unlocked_at timestamptz,
  created_at timestamptz not null default now(),
  stripe_last_checkout_session_id text
);

alter table public.user_profiles enable row level security;

create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using (auth.uid() = id);

-- Inserts/updates for tier changes are performed with the service role (webhooks/admin).

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.user_profiles (id, email, tier)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;

create trigger on_auth_user_created
  after insert on auth.users
  for each row
  execute function public.handle_new_user();
