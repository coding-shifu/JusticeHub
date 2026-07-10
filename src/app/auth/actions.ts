'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { headers } from 'next/headers'
import { createClient, createAdminClient } from '@/lib/supabase/server'

// ─────────────────────────────────────────────────────────────
// STAFF SIGNUP
// Creates a Supabase auth user, then (on email confirmation)
// creates the firm + user_profile rows via the confirm callback.
// The actual firm creation happens in /auth/confirm.
// ─────────────────────────────────────────────────────────────
export async function signUp(formData: FormData) {
  const supabase = await createClient()

  const email    = formData.get('email') as string
  const password = formData.get('password') as string
  const fullName = formData.get('full_name') as string
  const firmName = formData.get('firm_name') as string

  if (!email || !password || !fullName || !firmName) {
    redirect('/auth/signup?error=missing_fields')
  }

  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`

  const { error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      // Pass firm name and full name through the email confirmation flow
      data: {
        full_name: fullName,
        firm_name: firmName,
        role: 'firm_admin',
      },
      emailRedirectTo: `${siteUrl}/auth/confirm`,
    },
  })

  if (error) {
    redirect(`/auth/signup?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/signup?success=check_email')
}

// ─────────────────────────────────────────────────────────────
// STAFF / ADMIN LOGIN
// ─────────────────────────────────────────────────────────────
export async function signIn(formData: FormData) {
  const supabase = await createClient()

  const email    = formData.get('email') as string
  const password = formData.get('password') as string
  const next     = (formData.get('next') as string) || '/dashboard'

  const { error } = await supabase.auth.signInWithPassword({ email, password })

  if (error) {
    redirect(`/auth/login?error=${encodeURIComponent(error.message)}`)
  }

  revalidatePath('/', 'layout')
  redirect(next)
}

// ─────────────────────────────────────────────────────────────
// SIGN OUT
// ─────────────────────────────────────────────────────────────
export async function signOut() {
  const supabase = await createClient()
  await supabase.auth.signOut()
  revalidatePath('/', 'layout')
  redirect('/auth/login')
}

// ─────────────────────────────────────────────────────────────
// CLIENT PORTAL LOGIN (magic link / OTP)
// Clients can sign in with email+password (if set during invite) or get a magic link.
// ─────────────────────────────────────────────────────────────
export async function clientSignIn(formData: FormData) {
  const supabase = await createClient()

  const email    = formData.get('email') as string
  const password = (formData.get('password') as string)?.trim()

  if (!email) {
    redirect('/auth/client-login?error=missing_email')
  }

  // If a password was supplied, try email+password sign-in first
  if (password) {
    const { error } = await supabase.auth.signInWithPassword({ email, password })

    if (error) {
      redirect(`/auth/client-login?error=${encodeURIComponent(error.message)}`)
    }

    redirect('/portal')
  }

  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`

  // No password → send OTP magic link
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${siteUrl}/auth/confirm`,
      shouldCreateUser: false, // Clients must already exist via invite
    },
  })

  if (error) {
    redirect(`/auth/client-login?error=${encodeURIComponent(error.message)}`)
  }

  redirect('/auth/client-login?success=check_email')
}

// ─────────────────────────────────────────────────────────────
// INVITE CLIENT (called by staff)
// Uses service role to invoke Supabase Admin API.
// Links the resulting auth user to the client record.
// ─────────────────────────────────────────────────────────────
export async function inviteClient(clientId: string, clientEmail: string, clientName: string) {
  const supabase      = await createClient()
  const adminSupabase = await createAdminClient()

  // Verify the caller is authenticated staff
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) throw new Error('Unauthorized')

  const { data: profile } = await supabase
    .from('user_profile')
    .select('role, firm_id')
    .eq('id', user.id)
    .single()

  if (!profile || !['firm_admin', 'staff'].includes(profile.role)) {
    throw new Error('Only firm staff can invite clients')
  }

  const headersList = await headers()
  const host = headersList.get('host')
  const protocol = host?.includes('localhost') ? 'http' : 'https'
  const siteUrl = `${protocol}://${host}`

  // Send the invite via Supabase Admin API
  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
    clientEmail,
    {
      redirectTo: `${siteUrl}/auth/confirm`,
      data: {
        client_id: clientId,
        firm_id:   profile.firm_id,
        full_name: clientName,
        role:      'client',
      },
    }
  )

  if (inviteError) throw inviteError

  // Mark the client record as having portal access
  await supabase
    .from('client')
    .update({ portal_access: true })
    .eq('id', clientId)
    .eq('firm_id', profile.firm_id)

  return { success: true, userId: inviteData.user?.id }
}

// ─────────────────────────────────────────────────────────────
// COMPLETE ONBOARDING
// Creates the firm and user profile for a newly signed-up OAuth user.
// ─────────────────────────────────────────────────────────────
export async function completeOnboarding(formData: FormData) {
  const supabase = await createClient()
  const adminSupabase = await createAdminClient()

  // Get current authenticated user
  const { data: { user }, error: authError } = await supabase.auth.getUser()
  if (authError || !user) {
    redirect('/auth/login?error=not_authenticated')
  }

  const firmName = formData.get('firm_name') as string
  const fullName = formData.get('full_name') as string

  if (!firmName || !fullName) {
    redirect('/auth/onboarding?error=missing_fields')
  }

  // Create the firm
  const { data: firm, error: firmError } = await adminSupabase
    .from('firm')
    .insert({ name: firmName })
    .select('id')
    .single()

  if (firmError || !firm) {
    redirect('/auth/onboarding?error=firm_creation_failed')
  }

  // Create the user_profile as firm_admin
  const { error: profileError } = await adminSupabase
    .from('user_profile')
    .upsert({
      id:        user.id,
      firm_id:   firm.id,
      full_name: fullName,
      role:      'firm_admin',
    })

  if (profileError) {
    redirect('/auth/onboarding?error=profile_creation_failed')
  }

  revalidatePath('/', 'layout')
  redirect('/dashboard')
}
