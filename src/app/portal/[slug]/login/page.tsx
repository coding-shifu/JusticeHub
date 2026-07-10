import { redirect } from 'next/navigation'
import { createAdminClient } from '@/lib/supabase/server'
import { clientSignIn } from '@/app/auth/actions'
import { JusticeHubLogo } from '@/components/ui/JusticeHubLogo'

export default async function ClientFirmLoginPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const { slug } = await params
  const sParams = await searchParams

  const error = sParams.error
  const success = sParams.success

  // Fetch the firm details by slug using the admin client (since client is not authenticated yet)
  const adminSupabase = await createAdminClient()
  const { data: firm, error: firmError } = await adminSupabase
    .from('firm')
    .select('name')
    .eq('slug', slug)
    .maybeSingle()

  // If the firm doesn't exist, redirect to the generic client login error page
  if (firmError || !firm) {
    redirect('/auth/client-login?error=invalid_firm')
  }

  // Map internal error codes to user-friendly messages
  const getErrorMessage = (code: string) => {
    switch (code) {
      case 'missing_fields':
        return 'Please enter your email address.'
      case 'no_portal_access':
        return 'No portal access found for this email under this firm. Please contact your law firm.'
      case 'invalid_firm':
        return 'The specified firm portal was not found.'
      default:
        return decodeURIComponent(code)
    }
  }

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ marginBottom: '0.5rem' }}>
            <JusticeHubLogo showSymbolOnly size="2.5rem" />
          </div>
          <h1 className="auth-logo" style={{ fontSize: '20px', fontWeight: 600, color: 'var(--color-text-primary)' }}>
            {firm.name}
          </h1>
          <p className="auth-subtitle">Client Case Portal</p>
        </div>

        {success === 'check_email' ? (
          <div className="auth-alert auth-alert--success">
            Magic link sent! Check your email to sign in to your case portal.
          </div>
        ) : (
          <>
            {error && (
              <div className="auth-alert auth-alert--error">
                {getErrorMessage(error)}
              </div>
            )}

            <p className="auth-description">
              Enter your email to request a secure passwordless sign-in link.
            </p>

            <form action={clientSignIn} className="auth-form">
              {/* Pass the firm slug to the login action */}
              <input type="hidden" name="slug" value={slug} />

              <div className="form-group">
                <label htmlFor="client-email" className="form-label">
                  Your email address
                </label>
                <input
                  id="client-email"
                  name="email"
                  type="email"
                  placeholder="you@example.com"
                  required
                  className="form-input"
                  autoComplete="email"
                  autoFocus
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="client-password" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Password</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(Optional if configured)</span>
                </label>
                <input
                  id="client-password"
                  name="password"
                  type="password"
                  placeholder="Your password (if set)"
                  className="form-input"
                  autoComplete="current-password"
                />
              </div>

              <button type="submit" id="client-login-submit-btn" className="auth-btn" style={{ marginTop: '1.5rem' }}>
                Get Sign-In Link
              </button>
            </form>
          </>
        )}

        <p className="auth-footer-link">
          Are you from the firm?{' '}
          <a href="/auth/login" id="go-to-staff-login-link">Staff sign in</a>
        </p>
      </div>
    </div>
  )
}
