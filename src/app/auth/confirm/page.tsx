import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'

/**
 * /auth/confirm
 *
 * Handles two flows depending on metadata in the auth token:
 *
 * 1. STAFF SIGNUP CONFIRMATION
 *    After email confirmation, creates:
 *    - firm row (name from user metadata)
 *    - user_profile row (role = 'firm_admin')
 *    Then redirects to /dashboard.
 *
 * 2. CLIENT INVITE ACCEPTANCE
 *    After clicking the invite link:
 *    - Links auth.users.id → client.auth_user_id
 *    - Sets client.portal_access = true
 *    - Creates a user_profile row (role = 'client') for consistent RLS lookups
 *    Then redirects to /portal.
 *
 * Supabase handles the actual token exchange via the URL hash/code;
 * by the time this page renders, auth.getUser() returns the confirmed user.
 */
import { type EmailOtpType } from '@supabase/supabase-js'

export default async function ConfirmPage({
  searchParams,
}: {
  searchParams: Promise<{
    code?: string
    token_hash?: string
    type?: string
    next?: string
  }>
}) {
  const supabase      = await createClient()
  const adminSupabase = await createAdminClient()

  const params     = await searchParams
  const code       = params.code
  const token_hash = params.token_hash
  const type       = params.type

  // 1. Exchange PKCE code or verify OTP token to establish session
  if (code) {
    await supabase.auth.exchangeCodeForSession(code)
  } else if (token_hash && type) {
    await supabase.auth.verifyOtp({
      token_hash,
      type: type as EmailOtpType,
    })
  }

  // 2. Fetch authenticated user details
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/login?error=confirmation_failed')
  }

  const meta = user.user_metadata as Record<string, string>
  const role = meta?.role ?? 'firm_admin'

  if (role === 'client') {
    // ── Client invite acceptance ─────────────────────────────
    const clientId = meta?.client_id
    const firmId   = meta?.firm_id

    if (clientId && firmId) {
      // Link the auth user to the client record
      await adminSupabase
        .from('client')
        .update({ auth_user_id: user.id, portal_access: true })
        .eq('id', clientId)
        .eq('firm_id', firmId)

      // Create a minimal user_profile for RLS resolution
      await adminSupabase
        .from('user_profile')
        .upsert({
          id:        user.id,
          firm_id:   firmId,
          full_name: meta?.full_name ?? 'Client',
          role:      'client',
        })
    }

    redirect('/portal')
  } else {
    // ── Staff / firm admin signup confirmation ───────────────
    const firmName = meta?.firm_name ?? 'My Firm'
    const fullName = meta?.full_name ?? 'Admin'

    // Create the firm
    const { data: firm, error: firmError } = await adminSupabase
      .from('firm')
      .insert({ name: firmName })
      .select('id')
      .single()

    if (firmError || !firm) {
      redirect('/auth/signup?error=firm_creation_failed')
    }

    // Create the user_profile as firm_admin
    await adminSupabase
      .from('user_profile')
      .upsert({
        id:        user.id,
        firm_id:   firm.id,
        full_name: fullName,
        role:      'firm_admin',
      })

    redirect('/dashboard')
  }
}
