-- ============================================================================
-- Row Level Security — run AFTER schema.sql
-- ============================================================================

alter table admin_users enable row level security;
alter table customers enable row level security;
alter table policy_documents enable row level security;
alter table policy_acceptances enable row level security;
alter table purchases enable row level security;
alter table installments enable row level security;
alter table payments enable row level security;
alter table audit_log enable row level security;

-- Helper: is the current auth user an admin (any role)?
create or replace function is_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from admin_users
    where auth_user_id = auth.uid() and is_active = true
  );
$$;

create or replace function is_super_admin() returns boolean
language sql stable security definer as $$
  select exists (
    select 1 from admin_users
    where auth_user_id = auth.uid() and is_active = true and role = 'SUPER_ADMIN'
  );
$$;

create or replace function current_customer_id() returns uuid
language sql stable security definer as $$
  select id from customers where auth_user_id = auth.uid();
$$;

-- ----------------------------------------------------------------------------
-- ADMIN_USERS: admins can read the roster; only super admins manage it.
-- ----------------------------------------------------------------------------
create policy admin_read_roster on admin_users
  for select using (is_admin());

create policy super_admin_manage_roster on admin_users
  for all using (is_super_admin()) with check (is_super_admin());

-- ----------------------------------------------------------------------------
-- CUSTOMERS: a customer can see/update only their own row.
-- Admins can see/update all customer rows (needed for onboarding review,
-- purchase creation, KYC checks).
-- ----------------------------------------------------------------------------
create policy customer_select_own on customers
  for select using (auth_user_id = auth.uid() or is_admin());

create policy customer_insert_own on customers
  for insert with check (auth_user_id = auth.uid());

create policy customer_update_own on customers
  for update using (auth_user_id = auth.uid() or is_admin());

-- ----------------------------------------------------------------------------
-- POLICY_DOCUMENTS: anyone (incl. anonymous, for /terms and /privacy pages)
-- can read PUBLISHED docs. Only admins can read drafts/archived, and only
-- SUPER_ADMIN can write.
-- ----------------------------------------------------------------------------
create policy policy_docs_read_published on policy_documents
  for select using (status = 'PUBLISHED' or is_admin());

create policy policy_docs_write_super_admin on policy_documents
  for insert with check (is_super_admin());

create policy policy_docs_update_super_admin on policy_documents
  for update using (is_super_admin());

-- ----------------------------------------------------------------------------
-- POLICY_ACCEPTANCES: append-only, customer can insert their own; nobody
-- can update/delete (immutable audit trail). Admins + owner can read.
-- ----------------------------------------------------------------------------
create policy acceptances_insert_own on policy_acceptances
  for insert with check (customer_id = current_customer_id());

create policy acceptances_select on policy_acceptances
  for select using (customer_id = current_customer_id() or is_admin());

-- ----------------------------------------------------------------------------
-- PURCHASES: customer reads only their own purchases. Only admins create
-- purchases (never directly from a customer client).
-- ----------------------------------------------------------------------------
create policy purchases_select on purchases
  for select using (customer_id = current_customer_id() or is_admin());

create policy purchases_admin_write on purchases
  for insert with check (is_admin());

create policy purchases_admin_update on purchases
  for update using (is_admin());

-- ----------------------------------------------------------------------------
-- INSTALLMENTS: read-only for owning customer; admin manages.
-- ----------------------------------------------------------------------------
create policy installments_select on installments
  for select using (
    is_admin() or
    purchase_id in (select id from purchases where customer_id = current_customer_id())
  );

create policy installments_admin_write on installments
  for insert with check (is_admin());

create policy installments_admin_update on installments
  for update using (is_admin());

-- ----------------------------------------------------------------------------
-- PAYMENTS: read-only for owning customer; only admins insert (normally via
-- the record_payment() function, which runs as SECURITY DEFINER).
-- ----------------------------------------------------------------------------
create policy payments_select on payments
  for select using (customer_id = current_customer_id() or is_admin());

create policy payments_admin_write on payments
  for insert with check (is_admin());

-- ----------------------------------------------------------------------------
-- AUDIT_LOG: admins only.
-- ----------------------------------------------------------------------------
create policy audit_admin_read on audit_log
  for select using (is_admin());

create policy audit_admin_write on audit_log
  for insert with check (is_admin());
