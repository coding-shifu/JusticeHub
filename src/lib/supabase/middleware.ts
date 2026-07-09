import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

/**
 * Refreshes the Supabase auth session on every request.
 * Must be called from src/proxy.ts.
 *
 * Route map:
 *   /cases/*     → staff + admin only
 *   /dashboard/* → staff + admin only
 *   /portal/*    → clients only
 *   /auth/*      → public (redirect to correct home if already authed)
 */
export async function updateSession(request: NextRequest) {
  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          )
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // IMPORTANT: do not add any logic between createServerClient and
  // getUser(). A bug here could make it very hard to debug issues with
  // users being randomly logged out.
  const {
    data: { user },
  } = await supabase.auth.getUser()

  const { pathname } = request.nextUrl

  const isAuthRoute           = pathname.startsWith('/auth')
  const isDashboardRoute      = pathname.startsWith('/dashboard')
  const isCasesRoute          = pathname.startsWith('/cases')
  const isClientsRoute        = pathname.startsWith('/clients')
  const isDocumentsRoute      = pathname.startsWith('/documents')
  const isPortalRoute         = pathname.startsWith('/portal')
  const isProtectedStaffRoute = isDashboardRoute || isCasesRoute || isClientsRoute || isDocumentsRoute

  // ── Unauthenticated → send to login ──────────────────────────
  if (!user && (isProtectedStaffRoute || isPortalRoute)) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = isPortalRoute ? '/auth/client-login' : '/auth/login'
    loginUrl.searchParams.set('next', pathname)
    return NextResponse.redirect(loginUrl)
  }

  // ── Authenticated on an auth page → redirect to correct home ──
  // Exception: /auth/confirm must always run (it exchanges the token and
  // sets up the firm/profile). /auth/signout must also be excluded.
  const isConfirmRoute = pathname.startsWith('/auth/confirm')
  const isSignoutRoute = pathname.startsWith('/auth/signout')

  if (user && isAuthRoute && !isConfirmRoute && !isSignoutRoute) {
    // Fetch profile and client records in parallel
    const [clientRes, profileRes] = await Promise.all([
      supabase.from('client').select('id').eq('auth_user_id', user.id).maybeSingle(),
      supabase.from('user_profile').select('role').eq('id', user.id).maybeSingle()
    ])

    const clientRow = clientRes.data
    const profile = profileRes.data

    if (!clientRow && !profile) {
      // Stale session or failed signup confirmation: sign out to clear session and break the loop
      await supabase.auth.signOut()
      const loginUrl = request.nextUrl.clone()
      loginUrl.pathname = '/auth/login'
      loginUrl.searchParams.set('error', 'confirmation_failed')
      return NextResponse.redirect(loginUrl)
    }

    const homeUrl = request.nextUrl.clone()
    homeUrl.pathname = clientRow ? '/portal' : '/dashboard'
    homeUrl.search = ''
    return NextResponse.redirect(homeUrl)
  }

  // ── Client user trying to access staff routes → portal ───────
  if (user && isProtectedStaffRoute) {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile?.role === 'client') {
      const portalUrl = request.nextUrl.clone()
      portalUrl.pathname = '/portal'
      portalUrl.search = ''
      return NextResponse.redirect(portalUrl)
    }
  }

  // ── Staff user trying to access portal route → dashboard ──────
  if (user && isPortalRoute) {
    const { data: profile } = await supabase
      .from('user_profile')
      .select('role')
      .eq('id', user.id)
      .maybeSingle()

    if (profile && ['firm_admin', 'staff'].includes(profile.role)) {
      const dashboardUrl = request.nextUrl.clone()
      dashboardUrl.pathname = '/dashboard'
      dashboardUrl.search = ''
      return NextResponse.redirect(dashboardUrl)
    }
  }

  return supabaseResponse
}

