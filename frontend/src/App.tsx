import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { login, logout, register, resendSignupVerification } from './lib/auth'
import { getLocalEmailPreviewUrl, supabase } from './lib/supabase'
import { PatientProfilePanel } from './components/PatientProfilePanel'
import { ClinicFinder } from './features/clinics/ClinicFinder'
import type { Clinic } from './services/clinicService'
import './App.css'

const localEmailPreviewUrl = getLocalEmailPreviewUrl()

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [canResendVerification, setCanResendVerification] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event, session) => setUser(session?.user ?? null),
    )

    return () => subscription.unsubscribe()
  }, [])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')
    setCanResendVerification(false)
    setVerificationEmail('')
    setIsSubmitting(true)

    try {
      if (authMode === 'login') {
        await login(email.trim(), password)
        setAuthMessage('You are signed in.')
        setShowAuth(false)
      } else {
        const signupEmail = email.trim()
        const { user: createdUser, session } = await register(signupEmail, password)

        if (session) {
          setUser(createdUser)
          setAuthMessage('Your account is ready.')
          setShowAuth(false)
        } else {
          setVerificationEmail(signupEmail)
          setCanResendVerification(true)
          setAuthMessage(`A verification link was sent to ${signupEmail}. Confirm your email before logging in.`)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not complete authentication.'
      setAuthError(message)
      if (authMode === 'login' && message.toLowerCase().includes('email not confirmed')) {
        setVerificationEmail(email.trim())
        setCanResendVerification(true)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleResendVerification() {
    if (!verificationEmail) return

    setAuthError('')
    setAuthMessage('')
    setIsResendingVerification(true)
    try {
      await resendSignupVerification(verificationEmail)
      setAuthMessage(
        `If ${verificationEmail} still needs verification, a new link has been sent.`,
      )
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not resend the verification email.')
    } finally {
      setIsResendingVerification(false)
    }
  }

  async function handleLogout() {
    setAuthError('')
    setAuthMessage('')

    try {
      await logout()
      setAuthMessage('You are signed out.')
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Could not sign out.')
    }
  }

  return (
    <div className="app-shell">
      <header className="topbar">
        <div>
          <p className="eyebrow">ClinicFlow</p>
          <h1>Appointment & clinic access</h1>
        </div>
        {user ? (
          <div className="account-actions">
            <span className="signed-in-label">Signed in: {user.email}</span>
            <button type="button" className="primary-button" onClick={handleLogout}>
              Log out
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              setShowAuth((isOpen) => !isOpen)
              setAuthError('')
              setAuthMessage('')
            }}
            aria-expanded={showAuth}
            aria-controls="auth-panel"
          >
            {showAuth ? 'Close' : 'Log in'}
          </button>
        )}
      </header>

      {showAuth && !user && (
        <section className="panel auth-panel" id="auth-panel" aria-labelledby="auth-title">
          <div className="panel-header">
            <h3 id="auth-title">{authMode === 'login' ? 'Log in' : 'Create an account'}</h3>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              Email
              <input
                type="email"
                name="email"
                autoComplete="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </label>

            <label>
              Password
              <input
                type="password"
                name="password"
                autoComplete={authMode === 'login' ? 'current-password' : 'new-password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                minLength={authMode === 'signup' ? 12 : undefined}
                required
              />
              {authMode === 'signup' && (
                <span className="input-hint">Use at least 12 characters.</span>
              )}
            </label>

            {authError && <p className="auth-error" role="alert">{authError}</p>}
            {authMessage && <p className="auth-message" role="status">{authMessage}</p>}

            {canResendVerification && (
              <div className="verification-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {isResendingVerification ? 'Sending…' : 'Resend verification email'}
                </button>
                {localEmailPreviewUrl && (
                  <a href={localEmailPreviewUrl} target="_blank" rel="noreferrer">
                    Open local email inbox
                  </a>
                )}
              </div>
            )}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait…'
                : authMode === 'login'
                  ? 'Log in'
                  : 'Create account'}
            </button>
          </form>

          <p className="auth-mode-switch">
            {authMode === 'login' ? 'New to ClinicFlow?' : 'Already have an account?'}{' '}
            <button
              type="button"
              className="text-button"
              onClick={() => {
                setAuthMode((mode) => mode === 'login' ? 'signup' : 'login')
                setAuthError('')
                setAuthMessage('')
                setCanResendVerification(false)
                setVerificationEmail('')
              }}
            >
              {authMode === 'login' ? 'Create an account' : 'Log in'}
            </button>
          </p>
        </section>
      )}

      {authMessage && !showAuth && <p className="auth-message" role="status">{authMessage}</p>}
      {authError && !showAuth && <p className="auth-error" role="alert">{authError}</p>}

      {user && <PatientProfilePanel key={user.id} userId={user.id} />}

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Deliverable C / D</p>
          <h2>Simple scheduling for patients and front-desk staff</h2>
        </div>
        <span className="status-pill">Admin-first workflow</span>
      </section>

      <main className="content-grid">
        <ClinicFinder
          selectedClinicId={selectedClinic?.id ?? null}
          onSelectClinic={setSelectedClinic}
        />

        <aside className="panel">
          <div className="panel-header">
            <h3>Appointment booking</h3>
          </div>
          {selectedClinic ? (
            <div className="booking-card">
              <p className="label">Selected clinic</p>
              <h4>{selectedClinic.name}</h4>
              <p className="section-description">
                Provider schedules and available appointment times will appear here once the booking workflow is connected.
              </p>
              <button type="button" className="confirm-button" disabled>
                Appointment booking is coming next
              </button>
            </div>
          ) : (
            <p className="section-description">
              Select a clinic to continue. Appointment times will be added after clinic staff schedules are connected.
            </p>
          )}
        </aside>
      </main>

      <section className="bottom-grid">
        <article className="panel">
          <div className="panel-header">
            <h3>Accessibility settings</h3>
          </div>
          <ul className="feature-list">
            <li>English / French toggle</li>
            <li>Large text mode</li>
            <li>High contrast mode</li>
            <li>Text-to-speech support</li>
          </ul>
        </article>

        <article className="panel">
          <div className="panel-header">
            <h3>Notifications</h3>
          </div>
          <ul className="feature-list">
            <li>Reminder sent 24 hours before visit</li>
            <li>Cancellation alert to patient</li>
            <li>Clinic announcement banner</li>
            <li>Audit log retained for system activity</li>
          </ul>
        </article>
      </section>
    </div>
  )
}

export default App
