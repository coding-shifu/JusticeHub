-- ============================================================
-- JusticeHub — 0005_storage_rls_policies.sql
-- Adds Row-Level Security policies for the case-documents
-- storage bucket so staff can upload/manage files and clients
-- can only download files explicitly shared with them.
-- Apply via Supabase SQL Editor.
-- ============================================================

-- ── Helper: get the firm_id of the authenticated user ───────
-- (reads from public.user_profile which is already RLS-protected)

-- ── 1. Staff can INSERT (upload) objects ────────────────────
CREATE POLICY "Staff can upload case documents"
  ON storage.objects
  FOR INSERT
  TO authenticated
  WITH CHECK (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_profile
      WHERE id = auth.uid()
        AND role IN ('firm_admin', 'staff')
    )
  );

-- ── 2. Staff can SELECT (list/download) all objects in their firm ──
CREATE POLICY "Staff can view case documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_profile
      WHERE id = auth.uid()
        AND role IN ('firm_admin', 'staff')
    )
  );

-- ── 3. Staff can DELETE objects ──────────────────────────────
CREATE POLICY "Staff can delete case documents"
  ON storage.objects
  FOR DELETE
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1 FROM public.user_profile
      WHERE id = auth.uid()
        AND role IN ('firm_admin', 'staff')
    )
  );

-- ── 4. Clients can SELECT only documents explicitly shared ───
-- Join: storage.objects → public.document (by storage_path) →
--       public.case (for client_id) → public.client (for auth_user_id)
CREATE POLICY "Clients can download shared documents"
  ON storage.objects
  FOR SELECT
  TO authenticated
  USING (
    bucket_id = 'case-documents'
    AND EXISTS (
      SELECT 1
      FROM public.document d
      JOIN public.case ca ON ca.id = d.case_id
      JOIN public.client cl ON cl.id = ca.client_id
      WHERE d.storage_path = name
        AND d.visible_to_client = true
        AND cl.auth_user_id = auth.uid()
    )
  );
