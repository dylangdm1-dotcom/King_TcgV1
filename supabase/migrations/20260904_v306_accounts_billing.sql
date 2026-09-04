-- King_TCG V306 — comptes, abonnements, quotas serveur et synchronisation Cloud.
create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text unique,
  display_name text,
  avatar_url text,
  role text not null default 'normal' check (role in ('normal','premium','pro','admin','tester')),
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  subscription_status text,
  subscription_current_period_end timestamptz,
  scan_count integer not null default 0 check (scan_count >= 0),
  scan_period_start date not null default date_trunc('month', now())::date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.scan_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  session_key text not null,
  mode text not null check (mode in ('mono','batch','quad','listing')),
  period_start date not null,
  created_at timestamptz not null default now(),
  unique(user_id, session_key, period_start)
);

create table if not exists public.cloud_state (
  user_id uuid not null references auth.users(id) on delete cascade,
  kind text not null check (kind in ('cards','items','sales','favorites','settings','scanner')),
  payload jsonb not null default '{}'::jsonb,
  version bigint not null default 1,
  updated_at timestamptz not null default now(),
  primary key(user_id, kind)
);

create table if not exists public.billing_events (
  id text primary key,
  event_type text not null,
  processed_at timestamptz not null default now()
);

create or replace function public.handle_new_user() returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles(id,email,display_name,avatar_url)
  values(new.id,new.email,coalesce(new.raw_user_meta_data->>'full_name',new.raw_user_meta_data->>'name',split_part(new.email,'@',1)),new.raw_user_meta_data->>'avatar_url')
  on conflict(id) do nothing;
  return new;
end; $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.consume_scan_session(p_user_id uuid, p_session_key text, p_mode text)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  p public.profiles%rowtype;
  v_limit integer;
  v_period date := date_trunc('month', now())::date;
  v_allowed_modes text[];
begin
  if p_session_key is null or length(p_session_key) < 8 or length(p_session_key) > 120 then
    return jsonb_build_object('allowed',false,'reason','invalid_session');
  end if;
  select * into p from public.profiles where id=p_user_id for update;
  if not found then return jsonb_build_object('allowed',false,'reason','profile_missing'); end if;
  if p.scan_period_start <> v_period then
    update public.profiles set scan_count=0,scan_period_start=v_period,updated_at=now() where id=p_user_id returning * into p;
  end if;
  v_limit := case p.role when 'normal' then 30 when 'premium' then 500 when 'pro' then 550 when 'tester' then 550 else null end;
  v_allowed_modes := case
    when p.role in ('admin','tester','pro') then array['mono','batch','quad','listing']
    when p.role='premium' then array['mono','batch','quad']
    else array['mono'] end;
  if not (p_mode = any(v_allowed_modes)) then return jsonb_build_object('allowed',false,'reason','upgrade_required','used',p.scan_count,'limit',v_limit); end if;
  if exists(select 1 from public.scan_sessions where user_id=p_user_id and session_key=p_session_key and period_start=v_period) then
    return jsonb_build_object('allowed',true,'duplicate',true,'used',p.scan_count,'limit',v_limit,'unlimited',v_limit is null);
  end if;
  if v_limit is not null and p.scan_count >= v_limit then return jsonb_build_object('allowed',false,'reason','quota_exceeded','used',p.scan_count,'limit',v_limit); end if;
  insert into public.scan_sessions(user_id,session_key,mode,period_start) values(p_user_id,p_session_key,p_mode,v_period);
  if v_limit is not null then update public.profiles set scan_count=scan_count+1,updated_at=now() where id=p_user_id returning * into p; end if;
  return jsonb_build_object('allowed',true,'used',case when v_limit is null then 0 else p.scan_count end,'limit',v_limit,'unlimited',v_limit is null);
end; $$;

alter table public.profiles enable row level security;
alter table public.scan_sessions enable row level security;
alter table public.cloud_state enable row level security;
alter table public.billing_events enable row level security;

drop policy if exists "profile read own" on public.profiles;
create policy "profile read own" on public.profiles for select using (auth.uid()=id);
drop policy if exists "cloud own select" on public.cloud_state;
create policy "cloud own select" on public.cloud_state for select using (auth.uid()=user_id);
drop policy if exists "cloud own insert" on public.cloud_state;
create policy "cloud own insert" on public.cloud_state for insert with check (auth.uid()=user_id);
drop policy if exists "cloud own update" on public.cloud_state;
create policy "cloud own update" on public.cloud_state for update using (auth.uid()=user_id) with check (auth.uid()=user_id);
drop policy if exists "cloud own delete" on public.cloud_state;
create policy "cloud own delete" on public.cloud_state for delete using (auth.uid()=user_id);

revoke all on function public.consume_scan_session(uuid,text,text) from public, anon, authenticated;
grant execute on function public.consume_scan_session(uuid,text,text) to service_role;
revoke all on public.billing_events from anon, authenticated;
create index if not exists profiles_stripe_customer_idx on public.profiles(stripe_customer_id);
create index if not exists scan_sessions_user_period_idx on public.scan_sessions(user_id,period_start);
