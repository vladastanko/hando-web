-- ============================================================
-- HANDO — 011: Storage RLS definitive fix
-- Run this in Supabase SQL Editor
-- ============================================================

-- Create bucket if missing (public=false for security)
INSERT INTO storage.buckets (id, name, public)
VALUES ('user-media', 'user-media', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- Drop ALL existing policies on storage.objects for this bucket
DO $$
DECLARE
  pol record;
BEGIN
  FOR pol IN
    SELECT policyname FROM pg_policies
    WHERE tablename = 'objects' AND schemaname = 'storage'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON storage.objects', pol.policyname);
  END LOOP;
END $$;

-- Simple permissive policies for user-media bucket
-- Allow any authenticated user to upload
CREATE POLICY "allow_authenticated_upload"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'user-media');

-- Allow public read (avatars need to be visible to everyone)
CREATE POLICY "allow_public_read"
ON storage.objects FOR SELECT
USING (bucket_id = 'user-media');

-- Allow users to update their own files
CREATE POLICY "allow_owner_update"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'user-media' AND auth.uid()::text = (string_to_array(name, '/'))[2]);

-- Allow users to delete their own files  
CREATE POLICY "allow_owner_delete"
ON storage.objects FOR DELETE TO authenticated
USING (bucket_id = 'user-media' AND auth.uid()::text = (string_to_array(name, '/'))[2]);

-- Verify policies were created
SELECT policyname, cmd FROM pg_policies
WHERE tablename = 'objects' AND schemaname = 'storage';

SELECT '011_storage_rls_fix applied successfully' AS result;
