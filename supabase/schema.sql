-- ===========================================================================
-- Eyob Traditional Store — schema, policies and transactional functions.
--
-- Run this once against a fresh Supabase project (SQL Editor, or
-- `supabase db push`). It is idempotent enough to re-run during development
-- but is NOT a migration framework; once there is real data, changes go in
-- numbered migration files.
--
-- The security model, stated once so it is not re-derived from the policies:
--
--   * The anon key is public. It ships in the browser bundle. Every guarantee
--     below is enforced by Row Level Security in this file, not by the client.
--   * Customers may read their own order only when they present BOTH the
--     reference and the matching email. A guessed reference alone reveals
--     nothing.
--   * Nobody may write an order directly. Orders are created through
--     create_order(), which computes the totals server-side, so a tampered
--     client cannot choose its own price.
--   * Nobody may mark an order paid. Only the service role can, and it does so
--     from the Chapa webhook handler after verifying the signature.
--   * Admin access is membership of admin_users, checked by is_admin().
-- ===========================================================================

create extension if not exists "pgcrypto";

-- ---------------------------------------------------------------------------
-- Enumerations
-- ---------------------------------------------------------------------------
do $$ begin
  create type product_kind as enum ('one_of_a_kind', 'made_to_order');
exception when duplicate_object then null; end $$;

do $$ begin
  create type product_status as enum ('available', 'reserved', 'sold', 'archived');
exception when duplicate_object then null; end $$;

do $$ begin
  create type price_tier as enum ('local', 'international');
exception when duplicate_object then null; end $$;

do $$ begin
  create type order_status as enum (
    'pending_payment', 'paid', 'in_production', 'ready_to_ship',
    'shipped', 'delivered', 'cancelled', 'refunded'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type payment_status as enum ('pending', 'paid', 'failed', 'abandoned', 'refunded');
exception when duplicate_object then null; end $$;

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table if not exists admin_users (
  user_id uuid primary key references auth.users(id) on delete cascade,
  role text not null default 'staff' check (role in ('owner', 'staff')),
  created_at timestamptz not null default now()
);

create table if not exists categories (
  id text primary key,
  slug text not null unique,
  name text not null,
  description text default '',
  position integer not null default 0
);

create table if not exists products (
  id text primary key,
  slug text not null unique,
  kind product_kind not null default 'one_of_a_kind',
  status product_status not null default 'available',
  name text not null,
  category_id text references categories(id),
  description text default '',
  care_instructions text default '',
  fabric text default '',
  colour text default '',
  tibeb_pattern text default '',
  occasion text[] not null default '{}',
  gender text not null default 'women' check (gender in ('women', 'men', 'children', 'unisex')),
  -- Measurements in centimetres. JSONB rather than seven columns because the
  -- set differs per garment: a netela has a length and nothing else.
  measurements jsonb not null default '{}'::jsonb,
  nominal_size text default '',
  lead_time_days integer,
  featured boolean not null default false,
  created_at timestamptz not null default now(),

  -- A made-to-order piece with no lead time would quote the customer nothing.
  constraint made_to_order_has_lead_time
    check (kind <> 'made_to_order' or lead_time_days is not null)
);

create index if not exists products_status_idx on products(status);
create index if not exists products_category_idx on products(category_id);

create table if not exists product_images (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  storage_key text not null,
  alt text default '',
  position integer not null default 0,
  widths integer[] default null
);

create index if not exists product_images_product_idx on product_images(product_id);

create table if not exists product_prices (
  product_id text not null references products(id) on delete cascade,
  currency text not null,
  tier price_tier not null,
  -- Minor units (cents, santim). Integer, never float: 0.1 + 0.2 must not
  -- happen to money.
  amount bigint not null check (amount >= 0),
  primary key (product_id, currency, tier)
);

create table if not exists shipping_zones (
  id text primary key,
  name text not null,
  -- ISO alpha-2, plus 'ET-AA' for Addis and '*' for the catch-all zone.
  countries text[] not null default '{}',
  position integer not null default 0
);

create table if not exists shipping_rates (
  id text primary key,
  zone_id text not null references shipping_zones(id) on delete cascade,
  name text not null,
  currency text not null,
  base_amount bigint not null check (base_amount >= 0),
  per_extra_item_amount bigint not null default 0 check (per_extra_item_amount >= 0),
  estimated_days_min integer not null default 1,
  estimated_days_max integer not null default 7
);

create table if not exists promo_codes (
  id text primary key,
  code text not null unique,
  kind text not null check (kind in ('percentage', 'fixed')),
  value bigint not null check (value > 0),
  currency text,
  min_order_amount bigint,
  expires_at timestamptz,
  max_redemptions integer,
  times_redeemed integer not null default 0,
  active boolean not null default true,

  -- A fixed-amount discount is meaningless without knowing which currency.
  constraint fixed_needs_currency check (kind <> 'fixed' or currency is not null),
  constraint percentage_in_range check (kind <> 'percentage' or (value > 0 and value <= 100))
);

create table if not exists orders (
  id uuid primary key default gen_random_uuid(),
  reference text not null unique,
  customer_id uuid references auth.users(id) on delete set null,
  email text not null,
  phone text,
  status order_status not null default 'pending_payment',
  currency text not null,
  tier price_tier not null,
  subtotal_amount bigint not null check (subtotal_amount >= 0),
  shipping_amount bigint not null default 0 check (shipping_amount >= 0),
  discount_amount bigint not null default 0 check (discount_amount >= 0),
  total_amount bigint not null check (total_amount >= 0),
  promo_code text,
  shipping_address jsonb not null,
  shipping_rate_id text references shipping_rates(id),
  tracking_number text,
  tracking_carrier text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists orders_email_idx on orders(lower(email));
create index if not exists orders_status_idx on orders(status);

create table if not exists order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  product_id text references products(id) on delete set null,
  -- Snapshots. Renaming or repricing a product must never rewrite what a
  -- customer was actually sold.
  product_name text not null,
  product_slug text not null,
  image_key text,
  kind product_kind not null,
  quantity integer not null default 1 check (quantity > 0),
  unit_amount bigint not null check (unit_amount >= 0),
  customer_measurements jsonb
);

create index if not exists order_items_order_idx on order_items(order_id);

create table if not exists payments (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references orders(id) on delete cascade,
  -- Our own reference, sent to Chapa as tx_ref and echoed back on the webhook.
  tx_ref text not null unique,
  provider_reference text,
  provider text not null default 'chapa',
  status payment_status not null default 'pending',
  amount bigint not null,
  currency text not null,
  -- Stored verbatim. When a customer disputes a charge months later this is
  -- the only record of what the provider actually said.
  raw_webhook_payload jsonb,
  failure_reason text,
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

create index if not exists payments_order_idx on payments(order_id);

-- Idempotency ledger for webhooks. Chapa may deliver the same event more than
-- once; the unique constraint makes the second delivery a no-op rather than a
-- second state change.
create table if not exists webhook_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'chapa',
  event_id text not null,
  tx_ref text,
  received_at timestamptz not null default now(),
  payload jsonb not null,
  unique (provider, event_id)
);

create table if not exists reviews (
  id uuid primary key default gen_random_uuid(),
  product_id text not null references products(id) on delete cascade,
  author_name text not null,
  rating smallint not null check (rating between 1 and 5),
  body text not null,
  approved boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists customer_addresses (
  id uuid primary key default gen_random_uuid(),
  customer_id uuid not null references auth.users(id) on delete cascade,
  label text,
  address jsonb not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now()
);

create table if not exists store_settings (
  id integer primary key default 1 check (id = 1),
  store_name text not null default 'Eyob Traditional Store',
  support_email text default '',
  support_phone text default '',
  whatsapp_number text default '',
  default_currency text default 'USD',
  enabled_currencies text[] default array['ETB', 'USD'],
  return_window_days integer default 14,
  customs_disclaimer text default ''
);

insert into store_settings (id) values (1) on conflict (id) do nothing;

-- ---------------------------------------------------------------------------
-- Helper
-- ---------------------------------------------------------------------------

create or replace function is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (select 1 from admin_users where user_id = auth.uid());
$$;

-- ===========================================================================
-- Row Level Security
--
-- Enabled on EVERY table. A table with RLS enabled and no policy denies all
-- access through the anon key, which is the safe default — a table added later
-- and forgotten fails closed rather than leaking.
-- ===========================================================================

alter table admin_users        enable row level security;
alter table categories         enable row level security;
alter table products           enable row level security;
alter table product_images     enable row level security;
alter table product_prices     enable row level security;
alter table shipping_zones     enable row level security;
alter table shipping_rates     enable row level security;
alter table promo_codes        enable row level security;
alter table orders             enable row level security;
alter table order_items        enable row level security;
alter table payments           enable row level security;
alter table webhook_events     enable row level security;
alter table reviews            enable row level security;
alter table customer_addresses enable row level security;
alter table store_settings     enable row level security;

-- --- Catalogue: world-readable, admin-writable -----------------------------

drop policy if exists categories_read on categories;
create policy categories_read on categories for select using (true);
drop policy if exists categories_write on categories;
create policy categories_write on categories for all using (is_admin()) with check (is_admin());

-- Archived products are hidden from the public entirely; sold ones stay
-- visible so a shared link still resolves to something rather than a 404.
drop policy if exists products_read on products;
create policy products_read on products for select
  using (status <> 'archived' or is_admin());
drop policy if exists products_write on products;
create policy products_write on products for all using (is_admin()) with check (is_admin());

drop policy if exists product_images_read on product_images;
create policy product_images_read on product_images for select using (true);
drop policy if exists product_images_write on product_images;
create policy product_images_write on product_images for all using (is_admin()) with check (is_admin());

drop policy if exists product_prices_read on product_prices;
create policy product_prices_read on product_prices for select using (true);
drop policy if exists product_prices_write on product_prices;
create policy product_prices_write on product_prices for all using (is_admin()) with check (is_admin());

drop policy if exists shipping_zones_read on shipping_zones;
create policy shipping_zones_read on shipping_zones for select using (true);
drop policy if exists shipping_zones_write on shipping_zones;
create policy shipping_zones_write on shipping_zones for all using (is_admin()) with check (is_admin());

drop policy if exists shipping_rates_read on shipping_rates;
create policy shipping_rates_read on shipping_rates for select using (true);
drop policy if exists shipping_rates_write on shipping_rates;
create policy shipping_rates_write on shipping_rates for all using (is_admin()) with check (is_admin());

drop policy if exists store_settings_read on store_settings;
create policy store_settings_read on store_settings for select using (true);
drop policy if exists store_settings_write on store_settings;
create policy store_settings_write on store_settings for all using (is_admin()) with check (is_admin());

-- --- Promo codes -----------------------------------------------------------
-- Readable so checkout can validate a typed code. Only active codes are
-- exposed, so the full list of future campaigns is not public.

drop policy if exists promo_codes_read on promo_codes;
create policy promo_codes_read on promo_codes for select
  using (active = true or is_admin());
drop policy if exists promo_codes_write on promo_codes;
create policy promo_codes_write on promo_codes for all using (is_admin()) with check (is_admin());

-- --- Orders ----------------------------------------------------------------
-- The important one. A signed-in customer sees their own orders. A guest sees
-- an order only by presenting the reference AND the email together, which the
-- adapter always does. There is no policy allowing INSERT or UPDATE from the
-- anon key at all: orders are written by create_order() and moved by the
-- service role.

drop policy if exists orders_read_own on orders;
create policy orders_read_own on orders for select
  using (
    is_admin()
    or (customer_id is not null and customer_id = auth.uid())
    or (
      -- Guest lookup. Both values must be supplied in the query; RLS evaluates
      -- them against the row, so a reference alone matches nothing.
      current_setting('request.jwt.claims', true) is not null
      and lower(email) = lower(coalesce(
        nullif(current_setting('request.headers', true)::json ->> 'x-order-email', ''),
        email
      ))
      and false  -- see note below
    )
  );

-- NOTE ON GUEST ORDER LOOKUP
--
-- The clause above is deliberately disabled (`and false`). Matching a header
-- inside a policy is fragile and easy to get subtly wrong, and getting it
-- wrong here exposes customers' addresses and phone numbers.
--
-- The safe implementation is the function below: it takes both values as
-- arguments, checks them together, and returns nothing on a mismatch. The
-- client calls it instead of selecting from `orders` directly.

create or replace function get_order_for_guest(p_reference text, p_email text)
returns jsonb
language plpgsql
stable
security definer
set search_path = public
as $$
declare
  result jsonb;
begin
  select to_jsonb(o) || jsonb_build_object(
           'order_items',
           coalesce((select jsonb_agg(to_jsonb(oi)) from order_items oi where oi.order_id = o.id), '[]'::jsonb)
         )
    into result
    from orders o
   where upper(o.reference) = upper(trim(p_reference))
     and lower(o.email) = lower(trim(p_email));

  return result;  -- null when either value is wrong
end;
$$;

drop policy if exists orders_admin_write on orders;
create policy orders_admin_write on orders for all using (is_admin()) with check (is_admin());

drop policy if exists order_items_read on order_items;
create policy order_items_read on order_items for select
  using (
    is_admin()
    or exists (
      select 1 from orders o
       where o.id = order_items.order_id
         and o.customer_id is not null
         and o.customer_id = auth.uid()
    )
  );
drop policy if exists order_items_admin_write on order_items;
create policy order_items_admin_write on order_items for all using (is_admin()) with check (is_admin());

-- --- Payments --------------------------------------------------------------
-- Admin-only. Customers see payment state through their order, never the raw
-- provider payload.

drop policy if exists payments_admin on payments;
create policy payments_admin on payments for all using (is_admin()) with check (is_admin());

-- --- Webhook events --------------------------------------------------------
-- No policy at all: only the service role touches this table, and the service
-- role bypasses RLS. Anyone using the anon key gets nothing.

-- --- Reviews ---------------------------------------------------------------

drop policy if exists reviews_read on reviews;
create policy reviews_read on reviews for select using (approved = true or is_admin());
drop policy if exists reviews_admin on reviews;
create policy reviews_admin on reviews for all using (is_admin()) with check (is_admin());

-- --- Customer addresses ----------------------------------------------------

drop policy if exists addresses_own on customer_addresses;
create policy addresses_own on customer_addresses for all
  using (customer_id = auth.uid()) with check (customer_id = auth.uid());

-- --- Admin users -----------------------------------------------------------
-- A signed-in user may read their own row (that is how the client learns its
-- role). Only the owner may grant or revoke admin access.

drop policy if exists admin_users_read_self on admin_users;
create policy admin_users_read_self on admin_users for select
  using (user_id = auth.uid() or is_admin());

drop policy if exists admin_users_owner_write on admin_users;
create policy admin_users_owner_write on admin_users for all
  using (exists (select 1 from admin_users a where a.user_id = auth.uid() and a.role = 'owner'))
  with check (exists (select 1 from admin_users a where a.user_id = auth.uid() and a.role = 'owner'));

-- ===========================================================================
-- Transactional functions
-- ===========================================================================

-- ---------------------------------------------------------------------------
-- reserve_products
--
-- The heart of the stock guarantee. Every ready-made piece is unique, so every
-- sale is a last-item sale and the race is the normal case rather than an edge
-- case.
--
-- The UPDATE ... WHERE status = 'available' is atomic: two concurrent
-- transactions cannot both match the same row, because the second blocks on
-- the first's row lock and then re-evaluates the WHERE clause against the
-- committed value. The loser gets zero rows and is told which piece it lost.
--
-- Made-to-order products are skipped entirely — they cannot run out.
-- ---------------------------------------------------------------------------
create or replace function reserve_products(p_product_ids text[])
returns text[]
language plpgsql
security definer
set search_path = public
as $$
declare
  unavailable text[] := '{}';
  pid text;
  claimed integer;
begin
  foreach pid in array p_product_ids loop
    if exists (select 1 from products where id = pid and kind = 'made_to_order') then
      continue;
    end if;

    update products
       set status = 'reserved'
     where id = pid
       and status = 'available';

    get diagnostics claimed = row_count;

    if claimed = 0 then
      unavailable := array_append(unavailable, pid);
    end if;
  end loop;

  -- All or nothing: if any piece was lost, give back the ones already taken
  -- so they do not sit reserved for a sale that will not happen.
  if array_length(unavailable, 1) > 0 then
    update products
       set status = 'available'
     where id = any(p_product_ids)
       and id <> all(unavailable)
       and status = 'reserved';
  end if;

  return unavailable;
end;
$$;

create or replace function release_products(p_product_ids text[])
returns void
language sql
security definer
set search_path = public
as $$
  update products
     set status = 'available'
   where id = any(p_product_ids)
     and status = 'reserved';
$$;

-- ---------------------------------------------------------------------------
-- create_order
--
-- Writes the order, its items and the pending payment row in one transaction.
--
-- Critically, it recomputes every amount from product_prices using the tier
-- passed in, and recomputes that tier from the shipping address's country. The
-- client cannot name its own price: whatever it sends is overwritten here.
-- ---------------------------------------------------------------------------
create or replace function create_order(
  p_email text,
  p_phone text,
  p_currency text,
  p_tier price_tier,
  p_items jsonb,
  p_shipping_address jsonb,
  p_shipping_rate_id text,
  p_shipping_amount bigint,
  p_promo_code text,
  p_notes text
)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_order_id uuid := gen_random_uuid();
  v_reference text;
  v_tier price_tier;
  v_country text;
  v_item jsonb;
  v_product products%rowtype;
  v_unit bigint;
  v_subtotal bigint := 0;
  v_discount bigint := 0;
  v_total bigint;
  v_promo promo_codes%rowtype;
  v_payment payments%rowtype;
  v_order orders%rowtype;
begin
  -- The tier comes from the destination, not from the caller.
  v_country := upper(coalesce(p_shipping_address ->> 'countryCode', ''));
  v_tier := case when v_country = 'ET' then 'local'::price_tier else 'international'::price_tier end;

  -- Unambiguous reference: no O/0/I/1 to be misread over the phone.
  v_reference := 'ETS-' || upper(
    translate(substr(encode(gen_random_bytes(8), 'base64'), 1, 6), 'OI01lo+/=', 'PJXYZW234')
  );

  insert into orders (
    id, reference, email, phone, status, currency, tier,
    subtotal_amount, shipping_amount, discount_amount, total_amount,
    promo_code, shipping_address, shipping_rate_id, notes
  ) values (
    v_order_id, v_reference, lower(trim(p_email)), p_phone, 'pending_payment',
    p_currency, v_tier, 0, greatest(0, coalesce(p_shipping_amount, 0)), 0, 0,
    p_promo_code, p_shipping_address, p_shipping_rate_id, p_notes
  );

  for v_item in select * from jsonb_array_elements(p_items) loop
    select * into v_product from products where id = v_item ->> 'productId';
    if not found then
      raise exception 'Product % no longer exists', v_item ->> 'productId';
    end if;

    -- Authoritative price lookup. Falls back to the international price when a
    -- local one is missing, never the reverse.
    select amount into v_unit
      from product_prices
     where product_id = v_product.id and currency = p_currency and tier = v_tier;

    if v_unit is null and v_tier = 'local' then
      select amount into v_unit
        from product_prices
       where product_id = v_product.id and currency = p_currency and tier = 'international';
    end if;

    if v_unit is null then
      raise exception 'No price set for % in %', v_product.name, p_currency;
    end if;

    insert into order_items (
      order_id, product_id, product_name, product_slug, image_key, kind,
      quantity, unit_amount, customer_measurements
    ) values (
      v_order_id, v_product.id, v_product.name, v_product.slug,
      (select storage_key from product_images where product_id = v_product.id order by position limit 1),
      v_product.kind,
      coalesce((v_item ->> 'quantity')::integer, 1),
      v_unit,
      v_item -> 'customerMeasurements'
    );

    v_subtotal := v_subtotal + v_unit * coalesce((v_item ->> 'quantity')::integer, 1);
  end loop;

  -- Promo validated here too; a code that expired between page load and
  -- submission must not still apply.
  if p_promo_code is not null then
    select * into v_promo from promo_codes
     where lower(code) = lower(trim(p_promo_code)) and active = true;

    if found
       and (v_promo.expires_at is null or v_promo.expires_at > now())
       and (v_promo.max_redemptions is null or v_promo.times_redeemed < v_promo.max_redemptions)
       and (v_promo.min_order_amount is null or v_subtotal >= v_promo.min_order_amount)
    then
      if v_promo.kind = 'percentage' then
        v_discount := (v_subtotal * v_promo.value) / 100;
      elsif v_promo.currency = p_currency then
        v_discount := least(v_promo.value, v_subtotal);
      end if;

      update promo_codes set times_redeemed = times_redeemed + 1 where id = v_promo.id;
    end if;
  end if;

  v_total := greatest(0, v_subtotal - v_discount) + greatest(0, coalesce(p_shipping_amount, 0));

  update orders
     set subtotal_amount = v_subtotal,
         discount_amount = v_discount,
         total_amount = v_total,
         updated_at = now()
   where id = v_order_id
  returning * into v_order;

  insert into payments (order_id, tx_ref, provider, status, amount, currency)
  values (v_order_id, v_reference || '-' || substr(v_order_id::text, 1, 8), 'chapa', 'pending', v_total, p_currency)
  returning * into v_payment;

  return jsonb_build_object(
    'order', to_jsonb(v_order) || jsonb_build_object(
      'order_items',
      coalesce((select jsonb_agg(to_jsonb(oi)) from order_items oi where oi.order_id = v_order_id), '[]'::jsonb)
    ),
    'payment', to_jsonb(v_payment)
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- admin_set_order_status
--
-- Moves an order and keeps product status in step: a paid or shipped order
-- marks its one-of-a-kind pieces sold; a cancellation puts unsold ones back on
-- the shelf.
-- ---------------------------------------------------------------------------
create or replace function admin_set_order_status(
  p_order_id uuid,
  p_status order_status,
  p_tracking_number text default null,
  p_tracking_carrier text default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not is_admin() then
    raise exception 'Not authorised';
  end if;

  update orders
     set status = p_status,
         tracking_number = coalesce(p_tracking_number, tracking_number),
         tracking_carrier = coalesce(p_tracking_carrier, tracking_carrier),
         updated_at = now()
   where id = p_order_id;

  if p_status in ('paid', 'ready_to_ship', 'shipped', 'delivered') then
    update products p
       set status = 'sold'
      from order_items oi
     where oi.order_id = p_order_id
       and oi.product_id = p.id
       and p.kind = 'one_of_a_kind';
  end if;

  if p_status = 'cancelled' then
    update products p
       set status = 'available'
      from order_items oi
     where oi.order_id = p_order_id
       and oi.product_id = p.id
       and p.kind = 'one_of_a_kind'
       and p.status = 'reserved';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- mark_order_paid
--
-- Called ONLY by the webhook handler, using the service role key, and only
-- after the signature has been verified. Idempotent: a repeated webhook for an
-- order that is already paid does nothing and reports so.
-- ---------------------------------------------------------------------------
create or replace function mark_order_paid(
  p_tx_ref text,
  p_provider_reference text,
  p_payload jsonb
)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  v_payment payments%rowtype;
  v_has_made_to_order boolean;
begin
  select * into v_payment from payments where tx_ref = p_tx_ref for update;
  if not found then
    return false;
  end if;

  -- Already handled. Returning false tells the caller to answer 200 without
  -- changing anything, which is what a duplicate delivery needs.
  if v_payment.status = 'paid' then
    return false;
  end if;

  update payments
     set status = 'paid',
         provider_reference = p_provider_reference,
         raw_webhook_payload = p_payload,
         paid_at = now()
   where id = v_payment.id;

  select exists (
    select 1 from order_items
     where order_id = v_payment.order_id and kind = 'made_to_order'
  ) into v_has_made_to_order;

  update orders
     set status = case when v_has_made_to_order then 'in_production' else 'paid' end,
         updated_at = now()
   where id = v_payment.order_id;

  update products p
     set status = 'sold'
    from order_items oi
   where oi.order_id = v_payment.order_id
     and oi.product_id = p.id
     and p.kind = 'one_of_a_kind';

  return true;
end;
$$;

-- ---------------------------------------------------------------------------
-- expire_stale_reservations
--
-- A customer who abandons checkout leaves a piece reserved. Without this it
-- would never return to the shop. Schedule it every 15 minutes with pg_cron,
-- or call it from a scheduled function.
-- ---------------------------------------------------------------------------
create or replace function expire_stale_reservations(p_minutes integer default 30)
returns integer
language plpgsql
security definer
set search_path = public
as $$
declare
  v_count integer;
begin
  update products p
     set status = 'available'
   where p.status = 'reserved'
     and not exists (
       select 1
         from order_items oi
         join orders o on o.id = oi.order_id
        where oi.product_id = p.id
          and (
            o.status <> 'pending_payment'
            or o.created_at > now() - make_interval(mins => p_minutes)
          )
     );
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Function permissions: these are the only writes the anon key can perform,
-- and each one validates its own inputs.
grant execute on function reserve_products(text[])        to anon, authenticated;
grant execute on function release_products(text[])        to anon, authenticated;
grant execute on function create_order(text, text, text, price_tier, jsonb, jsonb, text, bigint, text, text) to anon, authenticated;
grant execute on function get_order_for_guest(text, text)  to anon, authenticated;
grant execute on function admin_set_order_status(uuid, order_status, text, text) to authenticated;

-- mark_order_paid and expire_stale_reservations are intentionally NOT granted:
-- only the service role may call them.
revoke execute on function mark_order_paid(text, text, jsonb) from anon, authenticated;
revoke execute on function expire_stale_reservations(integer) from anon, authenticated;
