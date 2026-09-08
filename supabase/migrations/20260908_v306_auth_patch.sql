-- King_TCG V306 — auth/profile patch
-- Idempotent: safe to run even if the previous account migration already created profiles.

create extension if not exists pgcrypto;

create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text,
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles add column if not exists email text;
alter table public.profiles add column if not exists display_name text;
alter table public.profiles add column if not exists created_at timestamptz not null default now();
alter table public.profiles add column if not exists updated_at timestamptz not null default now();

create or replace function public.handle_king_tcg_new_user()
returns trigger
language plpgsql
security definer set search_path = public
as $$
begin
  insert into public.profiles (id, email, display_name)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', split_part(coalesce(new.email, ''), '@', 1))
  )
  on conflict (id) do update set
    email = excluded.email,
    display_name = coalesce(excluded.display_name, public.profiles.display_name),
    updated_at = now();
  return new;
end;
$$;

drop trigger if exists on_auth_user_created_king_tcg on auth.users;
create trigger on_auth_user_created_king_tcg
after insert on auth.users
for each row execute function public.handle_king_tcg_new_user();

alter table public.profiles enable row level security;

drop policy if exists "King_TCG users can read own profile" on public.profiles;
create policy "King_TCG users can read own profile"
on public.profiles for select
to authenticated
using (auth.uid() = id);

