-- SUPABASE SCHEMA SYNC + FIRST PRODUCT SEED
-- Safe to run multiple times.
-- This script aligns your existing table definitions with the current website code.

begin;

-- 1) Ensure website-required columns exist
alter table if exists public.products
  add column if not exists name text,
  add column if not exists description text,
  add column if not exists image_url text,
  add column if not exists image text,
  add column if not exists category text,
  add column if not exists subcategory text,
  add column if not exists updated_at timestamp with time zone not null default now(),
  add column if not exists is_best_seller boolean not null default false,
  add column if not exists is_featured boolean not null default false;

alter table if exists public.inventory_taxonomy
  add column if not exists is_featured boolean not null default false;

-- Optional but recommended: user profile table used by signup flow.
create table if not exists public.user_profiles (
  id bigint generated always as identity primary key,
  user_id uuid not null unique references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  phone text,
  avatar_url text,
  address jsonb not null default '{}'::jsonb,
  created_at timestamp with time zone not null default now(),
  updated_at timestamp with time zone not null default now()
);

-- Keep existing rows valid for frontend rendering.
update public.products
set name = coalesce(nullif(name, ''), 'Untitled Product')
where name is null or name = '';

update public.products
set description = coalesce(description, '')
where description is null;

-- 2) Common updated_at trigger function
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_products_set_updated_at on public.products;
create trigger trg_products_set_updated_at
before update on public.products
for each row execute function public.set_updated_at();

drop trigger if exists trg_inventory_taxonomy_set_updated_at on public.inventory_taxonomy;
create trigger trg_inventory_taxonomy_set_updated_at
before update on public.inventory_taxonomy
for each row execute function public.set_updated_at();

drop trigger if exists trg_product_variants_set_updated_at on public.product_variants;
create trigger trg_product_variants_set_updated_at
before update on public.product_variants
for each row execute function public.set_updated_at();

drop trigger if exists trg_user_profiles_set_updated_at on public.user_profiles;
create trigger trg_user_profiles_set_updated_at
before update on public.user_profiles
for each row execute function public.set_updated_at();

-- 3) Keep products.category/subcategory auto-synced from taxonomy tree
create or replace function public.sync_products_taxonomy_fields()
returns trigger
language plpgsql
as $$
declare
  v_category text;
  v_subcategory text;
begin
  if new.taxonomy_id is null then
    new.category := null;
    new.subcategory := null;
    return new;
  end if;

  with recursive anc as (
    select id, name, parent_id, depth
    from public.inventory_taxonomy
    where id = new.taxonomy_id

    union all

    select p.id, p.name, p.parent_id, p.depth
    from public.inventory_taxonomy p
    join anc a on a.parent_id = p.id
  )
  select
    max(name) filter (where depth = 1),
    max(name) filter (where depth = 2)
  into v_category, v_subcategory
  from anc;

  new.category := coalesce(v_category, new.category);
  new.subcategory := coalesce(v_subcategory, new.subcategory);

  return new;
end;
$$;

drop trigger if exists trg_products_sync_taxonomy_fields on public.products;
create trigger trg_products_sync_taxonomy_fields
before insert or update of taxonomy_id on public.products
for each row execute function public.sync_products_taxonomy_fields();

-- Backfill existing rows by re-applying taxonomy_id through the trigger.
update public.products
set taxonomy_id = taxonomy_id
where taxonomy_id is not null;

-- 4) Compare-limit trigger function (max 4 products per user)
create or replace function public.enforce_compare_limit()
returns trigger
language plpgsql
as $$
declare
  current_count integer;
begin
  select count(*)
  into current_count
  from public.user_compare
  where user_id = new.user_id;

  if current_count >= 4 then
    raise exception 'compare limit reached (max 4 products)';
  end if;

  return new;
end;
$$;

drop trigger if exists trg_compare_limit on public.user_compare;
create trigger trg_compare_limit
before insert on public.user_compare
for each row execute function public.enforce_compare_limit();

-- 5) RLS policies for website sync
alter table public.inventory_taxonomy enable row level security;
alter table public.products enable row level security;
alter table public.product_variants enable row level security;
alter table public.user_wishlist enable row level security;
alter table public.user_compare enable row level security;
alter table public.user_profiles enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'inventory_taxonomy'
      and policyname = 'inventory_taxonomy_public_read_active'
  ) then
    create policy inventory_taxonomy_public_read_active
    on public.inventory_taxonomy
    for select
    to public
    using (active = true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_owner_select'
  ) then
    create policy user_profiles_owner_select
    on public.user_profiles
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_owner_insert'
  ) then
    create policy user_profiles_owner_insert
    on public.user_profiles
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_profiles'
      and policyname = 'user_profiles_owner_update'
  ) then
    create policy user_profiles_owner_update
    on public.user_profiles
    for update
    to authenticated
    using (auth.uid() = user_id)
    with check (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'products'
      and policyname = 'products_public_read_active'
  ) then
    create policy products_public_read_active
    on public.products
    for select
    to public
    using (active = true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'product_variants'
      and policyname = 'product_variants_public_read_active'
  ) then
    create policy product_variants_public_read_active
    on public.product_variants
    for select
    to public
    using (active = true);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_wishlist'
      and policyname = 'user_wishlist_owner_select'
  ) then
    create policy user_wishlist_owner_select
    on public.user_wishlist
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_wishlist'
      and policyname = 'user_wishlist_owner_insert'
  ) then
    create policy user_wishlist_owner_insert
    on public.user_wishlist
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_wishlist'
      and policyname = 'user_wishlist_owner_delete'
  ) then
    create policy user_wishlist_owner_delete
    on public.user_wishlist
    for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end;
$$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_compare'
      and policyname = 'user_compare_owner_select'
  ) then
    create policy user_compare_owner_select
    on public.user_compare
    for select
    to authenticated
    using (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_compare'
      and policyname = 'user_compare_owner_insert'
  ) then
    create policy user_compare_owner_insert
    on public.user_compare
    for insert
    to authenticated
    with check (auth.uid() = user_id);
  end if;

  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'user_compare'
      and policyname = 'user_compare_owner_delete'
  ) then
    create policy user_compare_owner_delete
    on public.user_compare
    for delete
    to authenticated
    using (auth.uid() = user_id);
  end if;
end;
$$;

-- 6) Helpful indexes for storefront filtering
create index if not exists idx_products_active_created_at
  on public.products using btree (active, created_at desc);

create index if not exists idx_products_best_seller
  on public.products using btree (is_best_seller, active);

create index if not exists idx_products_featured
  on public.products using btree (is_featured, active);

-- 7) Minimal taxonomy seed: Accessories -> Hair Bows
insert into public.inventory_taxonomy (name, slug, parent_id, depth, sort_order, active, is_featured)
select 'Accessories', 'accessories', null, 1, 2, true, true
where not exists (
  select 1
  from public.inventory_taxonomy
  where slug = 'accessories' and depth = 1
);

insert into public.inventory_taxonomy (name, slug, parent_id, depth, sort_order, active, is_featured)
select 'Hair Bows', 'hair-bows', parent.id, 2, 1, true, true
from public.inventory_taxonomy parent
where parent.slug = 'accessories'
  and parent.depth = 1
  and not exists (
    select 1
    from public.inventory_taxonomy child
    where child.slug = 'hair-bows' and child.depth = 2
  );

-- 8) First product seed under Hair Bows
-- Replace image_url with your real URL later; null is fine (website shows placeholder).
insert into public.products (
  name,
  description,
  price,
  stock,
  taxonomy_id,
  image_url,
  colors,
  details,
  active,
  is_best_seller,
  is_featured
)
select
  'Pearl Hair Bow',
  'Soft satin hair bow with pearl center',
  299.00,
  12,
  t.id,
  null,
  '[{"name":"Pink","hex":"#f6b6cc"},{"name":"Ivory","hex":"#f5efe6"}]'::jsonb,
  '{"Material":"Satin","Occasion":"Daily wear","Fit":"All hair types"}'::jsonb,
  true,
  true,
  true
from public.inventory_taxonomy t
where t.slug = 'hair-bows' and t.depth = 2
  and not exists (
    select 1 from public.products p where lower(p.name) = lower('Pearl Hair Bow')
  )
limit 1;

commit;

-- 9) Verification queries
select id, name, slug, depth, parent_id, active, is_featured
from public.inventory_taxonomy
order by depth, sort_order, id;

select
  id,
  name,
  category,
  subcategory,
  price,
  stock,
  active,
  taxonomy_id,
  is_best_seller,
  is_featured,
  image_url
from public.products
order by id desc
limit 20;
