import { redirect } from 'next/navigation'
import { createClient, createAdminClient } from '@/lib/supabase/server'
import { generateUniqueSlug } from '@/lib/slug'

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
      // Get the firm's slug
      const { data: firm } = await adminSupabase
        .from('firm')
        .select('slug')
        .eq('id', firmId)
        .single()

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

      if (firm) {
        redirect(`/portal/${firm.slug}`)
      }
    }

    redirect('/portal')
  } else {
    // Check if the user already has a profile (existing user logging in)
    const { data: profile } = await supabase
      .from('user_profile')
      .select('id')
      .eq('id', user.id)
      .maybeSingle()

    if (profile) {
      redirect('/dashboard')
    }

    // If no profile exists and this is a Google sign up (no firm_name in metadata),
    // redirect to onboarding page to enter firm name.
    if (!meta?.firm_name) {
      redirect('/auth/onboarding')
    }

    const firmName = meta.firm_name
    const fullName = meta.full_name ?? 'Admin'

    // Generate unique slug for the new firm
    const slug = await generateUniqueSlug(firmName)

    // Create the firm
    const { data: firm, error: firmError } = await adminSupabase
      .from('firm')
      .insert({ name: firmName, slug })
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
