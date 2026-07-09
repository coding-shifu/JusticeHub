'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { writeAuditLog } from '@/actions/audit'

// Helper to authenticate staff and return details
async function requireStaff() {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('id, firm_id, role')
    .eq('id', user.id)
    .single()

  if (!profile || !['firm_admin', 'staff'].includes(profile.role)) {
    redirect('/auth/login')
  }

  return { supabase, user, profile }
}

// Helper to check user session (staff or client)
async function requireUser() {
  const supabase = await createClient()

  const { data: { user }, error: authErr } = await supabase.auth.getUser()
  if (authErr || !user) throw new Error('Unauthenticated')

  // Load profile to verify they exist as user_profile (staff) or client (client portal)
  const { data: profile } = await supabase
    .from('user_profile')
    .select('id, firm_id, role')
    .eq('id', user.id)
    .single()

  if (profile) {
    return { supabase, user, role: profile.role, firmId: profile.firm_id }
  }

  const { data: clientRecord } = await supabase
    .from('client')
    .select('id, firm_id')
    .eq('auth_user_id', user.id)
    .single()

  if (clientRecord) {
    return { supabase, user, role: 'client', firmId: clientRecord.firm_id }
  }

  throw new Error('Unauthorized')
}

// ─────────────────────────────────────────────────────────────
// UPLOAD DOCUMENT
// ─────────────────────────────────────────────────────────────
export async function uploadDocument(formData: FormData) {
  const { supabase, profile } = await requireStaff()

  const caseId = formData.get('case_id') as string
  const tag = formData.get('tag') as string || 'Other'
  const visibleToClient = formData.get('visible_to_client') === 'true'
  const file = formData.get('file') as File

  if (!caseId || !file || file.size === 0) {
    throw new Error('Case ID and file are required.')
  }

  if (file.size > 10485760) {
    throw new Error('File size exceeds the 10MB limit.')
  }

  const filename = file.name
  const uuid = crypto.randomUUID()
  const storagePath = `${profile.firm_id}/${caseId}/${uuid}-${filename}`

  // Convert File to Buffer for Supabase Upload compatibility
  const arrayBuffer = await file.arrayBuffer()
  const buffer = Buffer.from(arrayBuffer)

  // Upload file via admin client (bypasses RLS on storage bucket)
  const admin = await createAdminClient()
  const { error: uploadError } = await admin.storage
    .from('case-documents')
    .upload(storagePath, buffer, {
      contentType: file.type,
      duplex: 'half',
    })

  if (uploadError) {
    console.error('[storage] Upload failed:', uploadError.message)
    throw new Error('Storage upload failed: ' + uploadError.message)
  }

  // Insert row in document database table
  const { data: doc, error: dbError } = await supabase
    .from('document')
    .insert({
      case_id: caseId,
      firm_id: profile.firm_id,
      filename,
      storage_path: storagePath,
      tag,
      visible_to_client: visibleToClient,
      uploaded_by: profile.id,
    })
    .select('id')
    .single()

  if (dbError) {
    // Cleanup storage file on database failure
    await admin.storage.from('case-documents').remove([storagePath])
    throw new Error('Database registry failed: ' + dbError.message)
  }

  // Log audit trail
  await writeAuditLog({
    firmId: profile.firm_id,
    actorId: profile.id,
    action: 'document.uploaded',
    entityType: 'document',
    entityId: doc.id,
    payload: { filename, tag, visible_to_client: visibleToClient },
  })

  revalidatePath(`/cases/${caseId}`)
}

// ─────────────────────────────────────────────────────────────
// DELETE DOCUMENT
// ─────────────────────────────────────────────────────────────
export async function deleteDocument(docId: string) {
  const { supabase, profile } = await requireStaff()

  // Fetch document details to verify ownership and get storage path
  const { data: doc, error: fetchErr } = await supabase
    .from('document')
    .select('case_id, filename, storage_path')
    .eq('id', docId)
    .eq('firm_id', profile.firm_id)
    .single()

  if (fetchErr || !doc) {
    throw new Error('Document not found or unauthorized')
  }

  // Delete database record (handles DB RLS validation)
  const { error: dbError } = await supabase
    .from('document')
    .delete()
    .eq('id', docId)

  if (dbError) {
    throw new Error('Failed to delete document metadata: ' + dbError.message)
  }

  // Delete physical storage object via admin storage client
  const admin = await createAdminClient()
  const { error: storageError } = await admin.storage
    .from('case-documents')
    .remove([doc.storage_path])

  if (storageError) {
    console.error('[storage] Failed to delete file object:', storageError.message)
  }

  // Log audit trail
  await writeAuditLog({
    firmId: profile.firm_id,
    actorId: profile.id,
    action: 'document.deleted',
    entityType: 'document',
    entityId: docId,
    payload: { filename: doc.filename },
  })

  revalidatePath(`/cases/${doc.case_id}`)
}

// ─────────────────────────────────────────────────────────────
// TOGGLE DOCUMENT VISIBILITY
// ─────────────────────────────────────────────────────────────
export async function toggleDocumentVisibility(docId: string, visible: boolean) {
  const { supabase, profile } = await requireStaff()

  const { data: doc, error: fetchErr } = await supabase
    .from('document')
    .select('case_id, filename')
    .eq('id', docId)
    .eq('firm_id', profile.firm_id)
    .single()

  if (fetchErr || !doc) {
    throw new Error('Document not found or unauthorized')
  }

  const { error: updateErr } = await supabase
    .from('document')
    .update({ visible_to_client: visible })
    .eq('id', docId)

  if (updateErr) {
    throw new Error('Failed to update visibility: ' + updateErr.message)
  }

  // Log audit trail
  await writeAuditLog({
    firmId: profile.firm_id,
    actorId: profile.id,
    action: 'document.visibility_toggled',
    entityType: 'document',
    entityId: docId,
    payload: { filename: doc.filename, visible_to_client: visible },
  })

  revalidatePath(`/cases/${doc.case_id}`)
}

// ─────────────────────────────────────────────────────────────
// GET SIGNED DOWNLOAD URL
// ─────────────────────────────────────────────────────────────
export async function getSignedDownloadUrl(docId: string): Promise<string> {
  const { supabase, user, role, firmId } = await requireUser()

  // Fetch document row using user-bound client to enforce table-level RLS policies.
  // Clients can only query visible docs on their own cases; staff can query same-firm docs.
  const { data: doc, error: fetchErr } = await supabase
    .from('document')
    .select('filename, storage_path')
    .eq('id', docId)
    .single()

  if (fetchErr || !doc) {
    throw new Error('Unauthorized or file not found')
  }

  // Generate signed URL via admin client (valid for 60 seconds)
  const admin = await createAdminClient()
  const { data, error: storageErr } = await admin.storage
    .from('case-documents')
    .createSignedUrl(doc.storage_path, 60)

  if (storageErr || !data?.signedUrl) {
    throw new Error('Failed to generate download link: ' + storageErr?.message)
  }

  // Log audit trail
  await writeAuditLog({
    firmId: firmId,
    actorId: user.id,
    action: 'document.downloaded',
    entityType: 'document',
    entityId: docId,
    payload: { filename: doc.filename, role },
  })

  return data.signedUrl
}
