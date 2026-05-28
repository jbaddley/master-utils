-- User profiles (plan tier + Stripe IDs)
create table if not exists public.user_profiles (
  id uuid references auth.users(id) on delete cascade primary key,
  email text,
  plan text not null default 'free' check (plan in ('free', 'pro')),
  stripe_customer_id text unique,
  stripe_subscription_id text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
alter table public.user_profiles enable row level security;
create policy "Users read own profile" on public.user_profiles
  for select using (auth.uid() = id);
create policy "Users update own profile" on public.user_profiles
  for update using (auth.uid() = id);

-- Auto-create profile on sign-up
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.user_profiles(id, email)
  values (new.id, new.email)
  on conflict (id) do nothing;
  return new;
end;
$$;
create or replace trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- File history
create table if not exists public.file_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete cascade not null,
  tool text not null,
  original_name text,
  output_name text,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default (now() + interval '30 days')
);
alter table public.file_history enable row level security;
create policy "Users read own history" on public.file_history
  for select using (auth.uid() = user_id);
create policy "Users insert own history" on public.file_history
  for insert with check (auth.uid() = user_id);
create policy "Users delete own history" on public.file_history
  for delete using (auth.uid() = user_id);
