-- ============================================================================
-- Storage buckets — run AFTER schema.sql and policies.sql
-- ============================================================================

-- Private bucket for selfies + Aadhaar. NOT public.
insert into storage.buckets (id, name, public)
values ('customer-documents-private', 'customer-documents-private', false)
on conflict (id) do nothing;

-- Public bucket for site assets (logo, product images) — safe to be public.
insert into storage.buckets (id, name, public)
values ('public-assets', 'public-assets', true)
on conflict (id) do nothing;

-- ----------------------------------------------------------------------------
-- customer-documents-private policies
-- Path convention: customers/{customer_id}/selfie/..., customers/{customer_id}/aadhaar/front, .../back
-- A customer may only read/write objects under their own customer_id folder.
-- Admins may read (never overwrite/delete) any customer's documents.
-- ----------------------------------------------------------------------------

create policy "customer upload own docs"
on storage.objects for insert
with check (
  bucket_id = 'customer-documents-private'
  and (storage.foldername(name))[1] = 'customers'
  and (storage.foldername(name))[2] = (select id::text from customers where auth_user_id = auth.uid())
);

create policy "customer read own docs"
on storage.objects for select
using (
  bucket_id = 'customer-documents-private'
  and (
    (
      (storage.foldername(name))[1] = 'customers'
      and (storage.foldername(name))[2] = (select id::text from customers where auth_user_id = auth.uid())
    )
    or is_admin()
  )
);

create policy "customer update own docs"
on storage.objects for update
using (
  bucket_id = 'customer-documents-private'
  and (storage.foldername(name))[1] = 'customers'
  and (storage.foldername(name))[2] = (select id::text from customers where auth_user_id = auth.uid())
);

-- public-assets: readable by everyone, writable only by admins.
create policy "public assets read"
on storage.objects for select
using (bucket_id = 'public-assets');

create policy "public assets admin write"
on storage.objects for insert
with check (bucket_id = 'public-assets' and is_admin());

create policy "public assets admin update"
on storage.objects for update
using (bucket_id = 'public-assets' and is_admin());
