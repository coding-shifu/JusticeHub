import { signIn } from '@/app/auth/actions'
import { JusticeHubLogo } from '@/components/ui/JusticeHubLogo'

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; next?: string }>
}) {
  const params = await searchParams
  const rawError = params.error
  const next     = params.next || '/dashboard'

  // Map internal error codes to human-readable messages
  const errorMessages: Record<string, string> = {
    confirmation_failed:
      'Email confirmation failed. The confirmation link may have expired or already been used. Request a new one by signing up again.',
    firm_creation_failed:
      'Account confirmed but firm setup failed. Sign in and contact support if this persists.',
  }
  const error = rawError
    ? (errorMessages[rawError] ?? decodeURIComponent(rawError))
    : null

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-header">
          <div style={{ marginBottom: '0.5rem' }}>
            <JusticeHubLogo showSymbolOnly size="2.5rem" />
          </div>
          <p className="auth-subtitle">Staff sign in</p>
        </div>

        {error && (
          <div className="auth-alert auth-alert--error">
            {error}
          </div>
        )}

        <form action={signIn} className="auth-form">
          {/* Pass the intended destination through the form */}
          <input type="hidden" name="next" value={next} />

          <div className="form-group">
            <label htmlFor="login-email" className="form-label">
              Email
            </label>
            <input
              id="login-email"
              name="email"
              type="email"
              placeholder="you@yourfirm.com"
              required
              className="form-input"
              autoComplete="email"
            />
          </div>

          <div className="form-group">
            <label htmlFor="login-password" className="form-label">
              Password
            </label>
            <input
              id="login-password"
              name="password"
              type="password"
              placeholder="Your password"
              required
              className="form-input"
              autoComplete="current-password"
            />
          </div>

          <button type="submit" id="login-submit-btn" className="auth-btn">
            Sign in
          </button>
        </form>

        <p className="auth-footer-link">
          New to JusticeHub?{' '}
          <a href="/auth/signup" id="go-to-signup-link">Create your firm account</a>
        </p>
      </div>
    </div>
  )
}
