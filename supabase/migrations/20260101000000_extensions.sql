-- M0: extensions required by PLAN § 7
create extension if not exists pg_trgm;
create extension if not exists unaccent;
create extension if not exists pgcrypto;
create extension if not exists citext;

-- immutable wrapper, required for generated columns and indexes (PLAN § 7.3)
create or replace function public.unaccent_immutable(input text)
returns text
language sql
immutable
parallel safe
strict
as $$ select public.unaccent('public.unaccent', input) $$;

-- shared updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
