-- Reading list covers: optional cover_url column + public "covers" storage bucket.
-- Safe to run repeatedly.

alter table public.reading_lists
  add column if not exists cover_url text;

-- Public artwork bucket used for reading-list covers (and other member artwork).
insert into storage.buckets (id, name, public)
values ('covers', 'covers', true)
on conflict (id) do update set public = true;

-- Anyone signed in may read cover artwork.
drop policy if exists covers_public_read on storage.objects;
create policy covers_public_read on storage.objects
  for select to anon, authenticated
  using (bucket_id = 'covers');

-- Owners may upload/update/delete their own cover objects (path starts with their uid).
drop policy if exists covers_owner_insert on storage.objects;
create policy covers_owner_insert on storage.objects
  for insert to authenticated
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists covers_owner_update on storage.objects;
create policy covers_owner_update on storage.objects
  for update to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

drop policy if exists covers_owner_delete on storage.objects;
create policy covers_owner_delete on storage.objects
  for delete to authenticated
  using (
    bucket_id = 'covers'
    and (storage.foldername(name))[1] = auth.uid()::text
  );
