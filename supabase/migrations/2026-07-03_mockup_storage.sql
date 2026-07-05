-- ProspectFlow CRM: mockup storage bucket + policies
-- Apply AFTER 2026-07-03_auth_rls.sql.

-- 1. Create the bucket. Default name 'mockups' (override via storage.bucket db setting).
do $$
declare
  bucket_name text := coalesce(current_setting('app.mockup_bucket', true), 'mockups');
begin
  insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
  values (
    bucket_name,
    bucket_name,
    true,
    5242880,
    array['text/html', 'text/plain']
  )
  on conflict (id) do nothing;
end $$;

-- 2. Storage RLS: authenticated users can read; only the bucket owners + admins can write.
do $$
declare
  bucket_name text := coalesce(current_setting('app.mockup_bucket', true), 'mockups');
  policy_read text := 'mockups read ' || bucket_name;
  policy_insert text := 'mockups insert ' || bucket_name;
  policy_update text := 'mockups update ' || bucket_name;
  policy_delete text := 'mockups delete ' || bucket_name;
begin
  execute format('drop policy if exists %I on storage.objects', policy_read);
  execute format('drop policy if exists %I on storage.objects', policy_insert);
  execute format('drop policy if exists %I on storage.objects', policy_update);
  execute format('drop policy if exists %I on storage.objects', policy_delete);

  execute format(
    'create policy %I on storage.objects for select to authenticated using (bucket_id = %L)',
    policy_read, bucket_name
  );
  execute format(
    'create policy %I on storage.objects for insert to authenticated with check (bucket_id = %L and (storage.foldername(name))[1] = %L)',
    policy_insert, bucket_name, 'prospect'
  );
  execute format(
    'create policy %I on storage.objects for update to authenticated using (bucket_id = %L and owner = auth.uid()) with check (bucket_id = %L and owner = auth.uid())',
    policy_update, bucket_name, bucket_name
  );
  execute format(
    'create policy %I on storage.objects for delete to authenticated using (bucket_id = %L and public.is_admin())',
    policy_delete, bucket_name
  );
end $$;