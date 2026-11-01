import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { login, logout, register, requestPasswordReset, resendSignupVerification } from './lib/auth'
import { getLocalEmailPreviewUrl, supabase } from './lib/supabase'
import { PatientProfilePanel } from './components/PatientProfilePanel'
import { AccountSecurityPanel } from './components/AccountSecurityPanel'
import { AccessibilitySettingsPanel } from './components/AccessibilitySettingsPanel'
import { ClinicExtrasPanel } from './components/ClinicExtrasPanel'
import { NotificationCenter } from './components/NotificationCenter'
import { StaffOperationsPanel } from './components/StaffOperationsPanel'
import { AppointmentBookingPanel } from './features/appointments/AppointmentBookingPanel'
import { ClinicFinder } from './features/clinics/ClinicFinder'
import type { Clinic } from './services/clinicService'
import { defaultAccessibilityPreferences, type AccessibilityPreferences } from './services/operationsService'
import './App.css'

const localEmailPreviewUrl = getLocalEmailPreviewUrl()

function App() {
  const [user, setUser] = useState<User | null>(null)
  const [showAuth, setShowAuth] = useState(false)
  const [authMode, setAuthMode] = useState<'login' | 'signup' | 'reset'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [authError, setAuthError] = useState('')
  const [authMessage, setAuthMessage] = useState('')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [verificationEmail, setVerificationEmail] = useState('')
  const [canResendVerification, setCanResendVerification] = useState(false)
  const [isResendingVerification, setIsResendingVerification] = useState(false)
  const [selectedClinic, setSelectedClinic] = useState<Clinic | null>(null)
  const [hasPatientProfile, setHasPatientProfile] = useState(false)
  const [isPasswordRecovery, setIsPasswordRecovery] = useState(false)
  const [accessibilityPreferences, setAccessibilityPreferences] = useState<AccessibilityPreferences>(defaultAccessibilityPreferences)
  const [unreadNotificationCount, setUnreadNotificationCount] = useState(0)
  const [appointmentsRefreshToken, setAppointmentsRefreshToken] = useState(0)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (!session) setHasPatientProfile(false)
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true)
          setShowAuth(false)
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return

    let active = true
    let listener: { remove: () => Promise<void> } | undefined
    const handledUrls = new Set<string>()

    async function handleAuthCallback(url: string) {
      if (handledUrls.has(url)) return
      handledUrls.add(url)

      try {
        const callbackUrl = new URL(url)
        if (callbackUrl.protocol !== 'ca.uottawa.clinicflow:') return
        const callbackParams = new URLSearchParams(callbackUrl.hash.slice(1))
        const callbackError = callbackUrl.searchParams.get('error_description')
          ?? callbackParams.get('error_description')
        if (callbackError) throw new Error(callbackError)

        const code = callbackUrl.searchParams.get('code')
        const isRecovery = callbackUrl.searchParams.get('type') === 'recovery'
          || callbackParams.get('type') === 'recovery'
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) throw error
        } else {
          const accessToken = callbackParams.get('access_token')
          const refreshToken = callbackParams.get('refresh_token')
          if (!accessToken || !refreshToken) return
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) throw error
        }
        setShowAuth(false)
        setAuthError('')
        setAuthMessage(isRecovery
          ? 'Recovery link accepted. Choose a new password below.'
          : 'Your account is verified and signed in.')
      } catch (callbackFailure) {
        if (active) setAuthError(callbackFailure instanceof Error
          ? callbackFailure.message
          : 'Could not complete the account verification or recovery link.')
      }
    }

    void CapacitorApp.addListener('appUrlOpen', ({ url }) => void handleAuthCallback(url))
      .then((registeredListener) => {
        if (active) listener = registeredListener
        else void registeredListener.remove()
      })
    void CapacitorApp.getLaunchUrl().then((launch) => {
      if (launch?.url) return handleAuthCallback(launch.url)
    })

    return () => {
      active = false
      void listener?.remove()
    }
  }, [])

  useEffect(() => {
    document.documentElement.lang = accessibilityPreferences.language
  }, [accessibilityPreferences.language])

  async function handleAuthSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setAuthError('')
    setAuthMessage('')
    setCanResendVerification(false)
    setVerificationEmail('')
    setIsSubmitting(true)

    try {
      if (authMode === 'reset') {
        await requestPasswordReset(email.trim())
        setAuthMessage(`If an account exists for ${email.trim()}, a password recovery link has been sent.`)
      } else if (authMode === 'login') {
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
    <div className={`app-shell text-size-${accessibilityPreferences.text_size}${accessibilityPreferences.high_contrast ? ' high-contrast' : ''}`}>
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
        <nav className="primary-navigation" aria-label="Main navigation">
          <a href="#clinic-search">Find clinics</a>
          <a href="#appointment-panel">Appointments</a>
          {user && <a href="#accessibility-panel">Accessibility</a>}
          {user && (
            <a className="notification-nav-link" href="#notifications-panel" aria-label={`Notifications, ${unreadNotificationCount} unread`}>
              <span aria-hidden="true">🔔</span> Notifications
              {unreadNotificationCount > 0 && <span className="unread-badge">{unreadNotificationCount}</span>}
            </a>
          )}
        </nav>
      </header>

      {showAuth && !user && (
        <section className="panel auth-panel" id="auth-panel" aria-labelledby="auth-title">
          <div className="panel-header">
          <h3 id="auth-title">
            {authMode === 'login' ? 'Log in' : authMode === 'signup' ? 'Create an account' : 'Recover your password'}
          </h3>
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

            {authMode !== 'reset' && (
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
            )}

            {authMode === 'login' && (
              <button
                type="button"
                className="text-button auth-reset-link"
                onClick={() => {
                  setAuthMode('reset')
                  setAuthError('')
                  setAuthMessage('')
                }}
              >
                Forgot password?
              </button>
            )}

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

            {authMode === 'reset' && localEmailPreviewUrl && (
              <div className="verification-actions">
                <a href={localEmailPreviewUrl} target="_blank" rel="noreferrer">
                  Open local email inbox
                </a>
              </div>
            )}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting
                ? 'Please wait…'
                : authMode === 'login'
                  ? 'Log in'
                  : authMode === 'signup'
                    ? 'Create account'
                    : 'Send recovery link'}
            </button>
          </form>

          <p className="auth-mode-switch">
            {authMode === 'reset' ? (
              <>
                Remember your password?{' '}
                <button type="button" className="text-button" onClick={() => setAuthMode('login')}>
                  Return to log in
                </button>
              </>
            ) : (
              <>
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
              </>
            )}
          </p>
        </section>
      )}

      {authMessage && !showAuth && <p className="auth-message" role="status">{authMessage}</p>}
      {authError && !showAuth && <p className="auth-error" role="alert">{authError}</p>}

      {user && (
        <PatientProfilePanel
          key={user.id}
          userId={user.id}
          onProfileReady={setHasPatientProfile}
        />
      )}

      {user?.email && (
        <AccountSecurityPanel
          key={user.id}
          email={user.email}
          recoveryMode={isPasswordRecovery}
          onRecoveryComplete={() => setIsPasswordRecovery(false)}
        />
      )}

      {user && <StaffOperationsPanel key={user.id} userId={user.id} />}

      <section className="hero-panel">
        <div>
          <p className="eyebrow">Patient appointment flow</p>
          <h2>Find a clinic and book an appointment</h2>
        </div>
        <span className="status-pill">Current prototype</span>
      </section>

      <main className="content-grid" id="clinic-search">
        <ClinicFinder
          selectedClinicId={selectedClinic?.id ?? null}
          onSelectClinic={setSelectedClinic}
        />
        <AppointmentBookingPanel
          key={`${user?.id ?? 'guest'}:${selectedClinic?.id ?? 'no-clinic'}`}
          clinic={selectedClinic}
          userId={user?.id ?? null}
          hasPatientProfile={hasPatientProfile}
          textToSpeech={accessibilityPreferences.text_to_speech}
          language={accessibilityPreferences.language}
          refreshToken={appointmentsRefreshToken}
        />
      </main>

      {user && <section className="bottom-grid">
        <AccessibilitySettingsPanel
          key={user.id}
          userId={user.id}
          onPreferencesChange={setAccessibilityPreferences}
        />
        <ClinicExtrasPanel
          key={`${user.id}:${selectedClinic?.id ?? 'no-clinic'}`}
          clinic={selectedClinic}
          userId={user.id}
          hasPatientProfile={hasPatientProfile}
          onWaitlistAccepted={() => setAppointmentsRefreshToken((token) => token + 1)}
        />
      </section>}

      {user && <NotificationCenter key={user.id} onUnreadCountChange={setUnreadNotificationCount} />}
    </div>
  )
}

export default App
