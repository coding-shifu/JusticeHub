import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'

/**
 * Root page — redirects authenticated users to their home route,
 * unauthenticated users to the staff login page.
 */
export default async function RootPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  // Check if this is a client user
  const { data: clientRecord } = await supabase
    .from('client')
    .select('id')
    .eq('auth_user_id', user.id)
    .maybeSingle()

  if (clientRecord) {
    redirect('/portal')
  }

  redirect('/dashboard')
}
