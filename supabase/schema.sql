-- ============================================================================
-- Vasantham Furniture & Home Appliances — Core Schema
-- Run this in Supabase SQL Editor (or via `supabase db push`) on a fresh project.
-- ============================================================================

create extension if not exists "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. ADMIN ROLES
-- ----------------------------------------------------------------------------
create type admin_role as enum ('SUPER_ADMIN', 'ADMIN', 'VIEWER');

create table if not exists admin_users (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  full_name text not null,
  email text not null unique,
  role admin_role not null default 'VIEWER',
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 2. CUSTOMER ID SEQUENCE -> VFA-000001 format
-- ----------------------------------------------------------------------------
create sequence if not exists customer_id_seq start 1;

create or replace function generate_customer_code()
returns text language plpgsql as $$
declare
  next_val bigint;
begin
  next_val := nextval('customer_id_seq');
  return 'VFA-' || lpad(next_val::text, 6, '0');
end;
$$;

-- ----------------------------------------------------------------------------
-- 3. CUSTOMERS
-- ----------------------------------------------------------------------------
create type onboarding_status as enum ('INCOMPLETE', 'COMPLETE');
create type account_status as enum ('ACTIVE', 'SUSPENDED', 'CLOSED');

create table if not exists customers (
  id uuid primary key default uuid_generate_v4(),
  auth_user_id uuid not null unique references auth.users(id) on delete cascade,
  customer_code text not null unique default generate_customer_code(),

  full_name text,
  mobile_number text,
  address text,

  selfie_path text,           -- path inside private bucket
  aadhaar_front_path text,
  aadhaar_back_path text,

  nominee_name text,
  nominee_relationship text,
  nominee_contact text,

  onboarding_status onboarding_status not null default 'INCOMPLETE',
  account_status account_status not null default 'ACTIVE',

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists idx_customers_auth_user on customers(auth_user_id);

-- ----------------------------------------------------------------------------
-- 4. TERMS & PRIVACY VERSIONING (CMS)
-- ----------------------------------------------------------------------------
create type doc_status as enum ('DRAFT', 'PUBLISHED', 'ARCHIVED');
create type doc_type as enum ('TERMS', 'PRIVACY');

create table if not exists policy_documents (
  id uuid primary key default uuid_generate_v4(),
  doc_type doc_type not null,
  version text not null,
  title text not null,
  content text not null, -- sanitized HTML
  status doc_status not null default 'DRAFT',
  created_by uuid references admin_users(id),
  created_at timestamptz not null default now(),
  published_at timestamptz,
  archived_at timestamptz,
  unique (doc_type, version)
);

-- Enforce only one PUBLISHED doc per doc_type
create unique index if not exists uniq_published_doc
  on policy_documents(doc_type)
  where status = 'PUBLISHED';

-- ----------------------------------------------------------------------------
-- 5. CONSENT / ACCEPTANCE RECORDS (never overwritten, append-only)
-- ----------------------------------------------------------------------------
create table if not exists policy_acceptances (
  id uuid primary key default uuid_generate_v4(),
  customer_id uuid not null references customers(id) on delete cascade,
  doc_type doc_type not null,
  version text not null,
  accepted boolean not null default true,
  accepted_at timestamptz not null default now()
);

create index if not exists idx_acceptances_customer on policy_acceptances(customer_id);

-- ----------------------------------------------------------------------------
-- 6. PRODUCT PURCHASES
-- ----------------------------------------------------------------------------
create type purchase_status as enum ('ACTIVE', 'CLOSED', 'CANCELLED');
create type installment_frequency as enum ('WEEKLY', 'MONTHLY');

create sequence if not exists purchase_id_seq start 1;

create table if not exists purchases (
  id uuid primary key default uuid_generate_v4(),
  purchase_code text not null unique default ('PUR-' || lpad(nextval('purchase_id_seq')::text, 6, '0')),
  customer_id uuid not null references customers(id) on delete restrict,

  product_name text not null,
  category text not null,
  description text,
  quantity int not null default 1,

  product_price numeric(12,2) not null,
  down_payment numeric(12,2) not null default 0,
  total_payable numeric(12,2) not null, -- product_price*qty - down_payment (+ any charges, admin-set)
  installment_amount numeric(12,2) not null,
  installment_count int not null,
  frequency installment_frequency not null default 'MONTHLY',

  purchase_date date not null default current_date,
  first_due_date date not null,
  status purchase_status not null default 'ACTIVE',

  created_by uuid references admin_users(id),
  created_at timestamptz not null default now()
);

create index if not exists idx_purchases_customer on purchases(customer_id);

-- ----------------------------------------------------------------------------
-- 7. INSTALLMENT SCHEDULE (generated when a purchase is created)
-- ----------------------------------------------------------------------------
create type installment_status as enum ('PENDING', 'PARTIALLY_PAID', 'PAID', 'OVERDUE');

create table if not exists installments (
  id uuid primary key default uuid_generate_v4(),
  purchase_id uuid not null references purchases(id) on delete cascade,
  installment_no int not null,
  due_date date not null,
  amount_due numeric(12,2) not null,
  amount_paid numeric(12,2) not null default 0,
  status installment_status not null default 'PENDING',
  unique (purchase_id, installment_no)
);

create index if not exists idx_installments_purchase on installments(purchase_id);
create index if not exists idx_installments_due_date on installments(due_date);

-- ----------------------------------------------------------------------------
-- 8. PAYMENTS (cash collected, recorded by admin)
-- ----------------------------------------------------------------------------
create type payment_method as enum ('CASH', 'UPI', 'BANK_TRANSFER', 'OTHER');

create sequence if not exists receipt_id_seq start 1;

create table if not exists payments (
  id uuid primary key default uuid_generate_v4(),
  receipt_code text not null unique default ('RCPT-' || lpad(nextval('receipt_id_seq')::text, 6, '0')),
  purchase_id uuid not null references purchases(id) on delete restrict,
  customer_id uuid not null references customers(id) on delete restrict,
  installment_id uuid references installments(id),

  amount numeric(12,2) not null,
  method payment_method not null default 'CASH',
  paid_at timestamptz not null default now(),
  recorded_by uuid references admin_users(id),
  notes text,

  created_at timestamptz not null default now()
);

create index if not exists idx_payments_purchase on payments(purchase_id);
create index if not exists idx_payments_customer on payments(customer_id);

-- ----------------------------------------------------------------------------
-- 9. AUDIT LOG
-- ----------------------------------------------------------------------------
create table if not exists audit_log (
  id uuid primary key default uuid_generate_v4(),
  actor_user_id uuid,
  action text not null,
  entity_type text,
  entity_id text,
  metadata jsonb,
  created_at timestamptz not null default now()
);

-- ----------------------------------------------------------------------------
-- 10. HELPER: apply a payment against a purchase, updating installments +
--     installment/purchase status. Called from a server route (service role
--     or an authenticated admin via RPC) — never directly from the client.
-- ----------------------------------------------------------------------------
create or replace function record_payment(
  p_purchase_id uuid,
  p_amount numeric,
  p_method payment_method,
  p_recorded_by uuid,
  p_notes text default null
) returns uuid
language plpgsql
security definer
as $$
declare
  v_remaining numeric := p_amount;
  v_installment record;
  v_customer_id uuid;
  v_payment_id uuid;
  v_apply numeric;
begin
  select customer_id into v_customer_id from purchases where id = p_purchase_id;
  if v_customer_id is null then
    raise exception 'Purchase not found';
  end if;

  insert into payments (purchase_id, customer_id, amount, method, recorded_by, notes)
  values (p_purchase_id, v_customer_id, p_amount, p_method, p_recorded_by, p_notes)
  returning id into v_payment_id;

  for v_installment in
    select * from installments
    where purchase_id = p_purchase_id and status <> 'PAID'
    order by installment_no asc
  loop
    exit when v_remaining <= 0;
    v_apply := least(v_remaining, v_installment.amount_due - v_installment.amount_paid);
    update installments
      set amount_paid = amount_paid + v_apply,
          status = case
            when amount_paid + v_apply >= amount_due then 'PAID'::installment_status
            else 'PARTIALLY_PAID'::installment_status
          end
      where id = v_installment.id;
    v_remaining := v_remaining - v_apply;
  end loop;

  -- close purchase if fully paid
  update purchases set status = 'CLOSED'
  where id = p_purchase_id
    and not exists (
      select 1 from installments where purchase_id = p_purchase_id and status <> 'PAID'
    );

  update installments set status = 'OVERDUE'
  where purchase_id = p_purchase_id and status = 'PENDING' and due_date < current_date;

  return v_payment_id;
end;
$$;

-- ----------------------------------------------------------------------------
-- 11. Nightly-safe overdue recompute (call from a scheduled Supabase Edge
--     Function / cron, or on-demand from admin dashboard load).
-- ----------------------------------------------------------------------------
create or replace function refresh_overdue_status()
returns void language sql as $$
  update installments
  set status = 'OVERDUE'
  where status in ('PENDING','PARTIALLY_PAID') and due_date < current_date;
$$;

-- ----------------------------------------------------------------------------
-- 12. updated_at triggers
-- ----------------------------------------------------------------------------
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_customers_updated on customers;
create trigger trg_customers_updated before update on customers
  for each row execute function set_updated_at();
