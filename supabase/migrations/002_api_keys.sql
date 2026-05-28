-- API keys table
create table if not exists public.api_keys (
  id            uuid     primary key default gen_random_uuid(),
  user_id       uuid     references auth.users(id) on delete cascade not null,
  key           text     not null unique,
  label         text,
  active        boolean  not null default true,
  daily_limit   integer  not null default 100,
  requests_today integer not null default 0,
  total_requests bigint  not null default 0,
  last_reset_at date     not null default current_date,
  created_at    timestamptz not null default now()
);

alter table public.api_keys enable row level security;

create policy "Users read own API keys"   on public.api_keys for select using (auth.uid() = user_id);
create policy "Users create own API keys" on public.api_keys for insert with check (auth.uid() = user_id);
create policy "Users update own API keys" on public.api_keys for update using (auth.uid() = user_id);
create policy "Users delete own API keys" on public.api_keys for delete using (auth.uid() = user_id);

-- Increment usage, resetting daily counter when the day rolls over
create or replace function public.increment_api_key_usage(p_key_id uuid)
returns void language plpgsql security definer as $$
begin
  update public.api_keys
  set
    requests_today = case
      when last_reset_at < current_date then 1
      else requests_today + 1
    end,
    total_requests = total_requests + 1,
    last_reset_at  = current_date
  where id = p_key_id;
end;
$$;
