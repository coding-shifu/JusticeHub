'use server'

import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
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
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
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

  // No password → send OTP magic link
  const { error } = await supabase.auth.signInWithOtp({
    email,
    options: {
      emailRedirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
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

  // Send the invite via Supabase Admin API
  const { data: inviteData, error: inviteError } = await adminSupabase.auth.admin.inviteUserByEmail(
    clientEmail,
    {
      redirectTo: `${process.env.NEXT_PUBLIC_SITE_URL}/auth/confirm`,
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
