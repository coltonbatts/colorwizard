-- Harden the existing account/tier table without changing ColorWizard's local-first data model.

begin;

alter table public.user_profiles enable row level security;
alter table public.user_profiles force row level security;

drop policy if exists "Users can read own profile" on public.user_profiles;

create policy "Users can read own profile"
  on public.user_profiles
  for select
  to authenticated
  using ((select auth.uid()) = id);

-- The public client only needs authenticated, owner-scoped reads. Tier writes are
-- reserved for the new-user trigger and trusted server-side billing code.
revoke all on table public.user_profiles from anon, authenticated;
grant select on table public.user_profiles to authenticated;

-- These values are used as idempotency/identity keys by billing code.
create unique index if not exists user_profiles_stripe_customer_id_key
  on public.user_profiles (stripe_customer_id)
  where stripe_customer_id is not null;

create unique index if not exists user_profiles_checkout_session_id_key
  on public.user_profiles (stripe_last_checkout_session_id)
  where stripe_last_checkout_session_id is not null;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.user_profiles (id, email, tier)
  values (new.id, new.email, 'free')
  on conflict (id) do nothing;
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

commit;
