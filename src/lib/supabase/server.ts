import { createClient as createBaseClient } from '@supabase/supabase-js'
import { createServerClient } from '@supabase/ssr'
import { cookies } from 'next/headers'

/**
 * Server-side Supabase client.
 * Use in Server Components, Server Actions, and Route Handlers.
 * Reads auth session from request cookies — honours RLS policies.
 */
export async function createClient() {
  const cookieStore = await cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll()
        },
        setAll(cookiesToSet) {
          try {
            cookiesToSet.forEach(({ name, value, options }) => {
              cookieStore.set(name, value, options)
            })
          } catch {
            // setAll called from a Server Component — cookies are read-only.
            // The middleware will handle session refresh.
          }
        },
      },
    }
  )
}

/**
 * Server-side Supabase client using the service role key.
 * ONLY use server-side in trusted contexts (invite flow, firm creation).
 * Bypasses all RLS policies on both database and storage tables.
 */
export async function createAdminClient() {
  return createBaseClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    }
  )
}
