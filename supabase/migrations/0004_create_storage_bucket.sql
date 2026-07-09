-- ============================================================
-- JusticeHub — 0004_create_storage_bucket.sql
-- Initializes the private storage bucket for case documents.
-- Apply via Supabase SQL Editor.
-- ============================================================

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'case-documents',
  'case-documents',
  false,             -- Private bucket (requires signed URLs)
  10485760,          -- 10MB file size limit
  NULL               -- Allow all file types (filtering is handled in the app layer)
)
ON CONFLICT (id) DO NOTHING;
