-- Storage bucket for Future > Bucket List photos.
--
-- Until now the bucket list only had a "paste an image URL" field. In
-- practice a link copied from a phone's Photos app share sheet points at a
-- share PAGE, not a raw image file, so it silently fails to render as a
-- background image - that's the "images won't show" bug. This adds real
-- photo upload via Supabase Storage so items carry a photo the app
-- actually hosts.
--
-- APPLY ONCE: after this runs, "Upload photo" in the Bucket List editor
-- starts working (see supabase/functions and docs/setup/AUTH_SETUP.md for
-- how earlier migrations here were rolled out).

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'bucket-list-photos',
  'bucket-list-photos',
  true, -- public read: needed for <img> tags and the /view share link to load photos without an auth header
  10485760, -- 10MB
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif']
)
on conflict (id) do update set
  public = excluded.public,
  file_size_limit = excluded.file_size_limit,
  allowed_mime_types = excluded.allowed_mime_types;

-- Only Kimber and Siona (public.is_member(), added in
-- 20260920130000_auth_and_rls.sql) can upload, replace or delete photos.
-- Reads are public because the bucket itself is public.

drop policy if exists "Members upload bucket list photos" on storage.objects;
create policy "Members upload bucket list photos" on storage.objects
  for insert to authenticated
  with check (bucket_id = 'bucket-list-photos' and public.is_member());

drop policy if exists "Members update bucket list photos" on storage.objects;
create policy "Members update bucket list photos" on storage.objects
  for update to authenticated
  using (bucket_id = 'bucket-list-photos' and public.is_member())
  with check (bucket_id = 'bucket-list-photos' and public.is_member());

drop policy if exists "Members delete bucket list photos" on storage.objects;
create policy "Members delete bucket list photos" on storage.objects
  for delete to authenticated
  using (bucket_id = 'bucket-list-photos' and public.is_member());
