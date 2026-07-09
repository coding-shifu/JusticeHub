import { clientSignIn } from '@/app/auth/actions'
import { JusticeHubLogo } from '@/components/ui/JusticeHubLogo'

export default async function ClientLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; success?: string }>
}) {
  const params  = await searchParams
  const error   = params.error
  const success = params.success

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ marginBottom: '0.5rem' }}>
            <JusticeHubLogo showSymbolOnly size="2.5rem" />
          </div>
          <p className="auth-subtitle">Client portal</p>
        </div>

        {success === 'check_email' && (
          <div className="auth-alert auth-alert--success">
            Magic link sent! Check your email to sign in to your case portal.
          </div>
        )}

        {error && (
          <div className="auth-alert auth-alert--error">
            {decodeURIComponent(error) === 'User not found'
              ? 'No portal access found for this email. Please contact your firm to request access.'
              : decodeURIComponent(error)}
          </div>
        )}

        {!success && (
          <>
            <p className="auth-description">
              Enter the email address your firm used to invite you. We&apos;ll
              send you a secure sign-in link — no password required.
            </p>

            <form action={clientSignIn} className="auth-form">
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
                />
              </div>

              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label htmlFor="client-password" className="form-label" style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>Password</span>
                  <span style={{ fontSize: '0.75rem', fontWeight: 'normal', color: 'var(--color-text-muted)' }}>(Optional for testing)</span>
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
                Sign in
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
