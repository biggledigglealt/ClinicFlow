import { useEffect, useState, type FormEvent } from 'react'
import type { User } from '@supabase/supabase-js'
import { App as CapacitorApp } from '@capacitor/app'
import { Capacitor } from '@capacitor/core'
import { login, logout, register, requestPasswordReset, resendSignupVerification, signInWithGoogle } from './lib/auth'
import { getLocalEmailPreviewUrl, isSupabaseConfigured, supabase } from './lib/supabase'
import { LanguageProvider } from './lib/LanguageProvider'
import { translate } from './lib/i18n'
import { PatientProfilePanel } from './components/PatientProfilePanel'
import { AccountSecurityPanel } from './components/AccountSecurityPanel'
import { AccessibilitySettingsPanel } from './components/AccessibilitySettingsPanel'
import { ClinicExtrasPanel } from './components/ClinicExtrasPanel'
import { NotificationCenter } from './components/NotificationCenter'
import { StaffOperationsPanel } from './components/StaffOperationsPanel'
import { HelpCenter } from './components/HelpCenter'
import { PlatformAdminPanel } from './components/PlatformAdminPanel'
import { CalendarPage } from './features/calendar/CalendarPage'
import { ClinicFinder } from './features/clinics/ClinicFinder'
import type { Clinic } from './services/clinicService'
import { defaultAccessibilityPreferences, getAccessibilityPreferences, type AccessibilityPreferences } from './services/operationsService'
import './App.css'

const localEmailPreviewUrl = getLocalEmailPreviewUrl()

type AppSection = 'home' | 'calendar' | 'profile' | 'settings' | 'notifications' | 'help' | 'staff_access'

function emailDeliveryHint(language: 'en' | 'fr') {
  if (localEmailPreviewUrl) {
    return language === 'fr'
      ? 'Les courriels locaux apparaissent dans Mailpit avec le lien de boîte de réception ci-dessous.'
      : 'Local emails appear in Mailpit through the inbox link below.'
  }

  return language === 'fr'
    ? 'Mailpit n’est pas disponible dans cette version hébergée. Si aucun courriel n’arrive, demandez à l’équipe de vérifier la livraison des courriels dans Supabase.'
    : 'Mailpit is not available on this hosted preview. If no email arrives, ask the team to check email delivery in Supabase.'
}

function BellIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="ui-icon"><path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4" /></svg>
}

function MenuIcon() {
  return <svg aria-hidden="true" viewBox="0 0 24 24" className="ui-icon"><path d="M4 6h16M4 12h16M4 18h16" /></svg>
}

function SectionIcon({ section }: { section: AppSection }) {
  const paths: Record<AppSection, string> = {
    home: 'M3 10.5 12 3l9 7.5M5.5 9v11h13V9M9 20v-6h6v6',
    calendar: 'M8 3v3m8-3v3M4 9h16M5 5h14a1 1 0 0 1 1 1v13H4V6a1 1 0 0 1 1-1Z',
    profile: 'M20 21a8 8 0 0 0-16 0M12 13a4 4 0 1 0 0-8 4 4 0 0 0 0 8',
    settings: 'M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7ZM19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-1.8 3.1-.2-.1a1.7 1.7 0 0 0-1.8.1l-.2.1h-3.6l-.1-.2a1.7 1.7 0 0 0-1.6-1l-.2.1-3.1-1.8.1-.2a1.7 1.7 0 0 0-.1-1.8l-.1-.2v-3.6l.2-.1a1.7 1.7 0 0 0 1-1.6l-.1-.2 1.8-3.1.2.1a1.7 1.7 0 0 0 1.8-.1l.2-.1h3.6l.1.2a1.7 1.7 0 0 0 1.6 1l.2-.1 3.1 1.8-.1.2a1.7 1.7 0 0 0 .1 1.8l.1.2v3.6l-.2.1a1.7 1.7 0 0 0-1 1.6Z',
    notifications: 'M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9M10 21h4',
    help: 'M9.1 9a3 3 0 1 1 5.2 2c-1.1 1.1-2.3 1.4-2.3 3M12 17.5v.1M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
    staff_access: 'M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2M9 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8M20 8v6M23 11h-6',
  }

  return <svg aria-hidden="true" viewBox="0 0 24 24" className="section-icon"><path d={paths[section]} /></svg>
}

function ClinicFlowApp() {
  const [user, setUser] = useState<User | null>(null)
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false)
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
  const [activeSection, setActiveSection] = useState<AppSection>('home')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const t = (message: string) => translate(message, accessibilityPreferences.language)

  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        setUser(session?.user ?? null)
        if (!session) {
          setIsPlatformAdmin(false)
          setHasPatientProfile(false)
          setAccessibilityPreferences(defaultAccessibilityPreferences)
          setActiveSection('home')
        }
        if (event === 'PASSWORD_RECOVERY') {
          setIsPasswordRecovery(true)
          setActiveSection('profile')
          setShowAuth(false)
        }
      },
    )

    return () => subscription.unsubscribe()
  }, [])

  useEffect(() => {
    const userId = user?.id
    if (!userId) return

    let active = true
    void (async () => {
      try {
        const [profileResult, preferences] = await Promise.all([
          supabase.from('profiles').select('global_role').eq('id', userId).maybeSingle(),
          getAccessibilityPreferences(userId).catch(() => defaultAccessibilityPreferences),
        ])
        if (active) {
          setIsPlatformAdmin(profileResult.data?.global_role === 'platform_admin')
          setAccessibilityPreferences(preferences)
        }
      } catch {
        if (active) setIsPlatformAdmin(false)
      }
    })()
    return () => { active = false }
  }, [user?.id])

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
        if (callbackError) {
          if (active) setAuthError(callbackError)
          return
        }

        const code = callbackUrl.searchParams.get('code')
        const isRecovery = callbackUrl.searchParams.get('type') === 'recovery'
          || callbackParams.get('type') === 'recovery'
        if (code) {
          const { error } = await supabase.auth.exchangeCodeForSession(code)
          if (error) {
            if (active) setAuthError(error.message)
            return
          }
        } else {
          const accessToken = callbackParams.get('access_token')
          const refreshToken = callbackParams.get('refresh_token')
          if (!accessToken || !refreshToken) return
          const { error } = await supabase.auth.setSession({
            access_token: accessToken,
            refresh_token: refreshToken,
          })
          if (error) {
            if (active) setAuthError(error.message)
            return
          }
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
        setAuthMessage(accessibilityPreferences.language === 'fr'
          ? `Si un compte existe pour ${email.trim()}, vérifiez la boîte de réception et le dossier indésirable. ${emailDeliveryHint('fr')}`
          : `If an account exists for ${email.trim()}, check the inbox and spam folder. ${emailDeliveryHint('en')}`)
      } else if (authMode === 'login') {
        await login(email.trim(), password)
        setAuthMessage(t('You are signed in.'))
        setShowAuth(false)
      } else {
        const signupEmail = email.trim()
        const { user: createdUser, session } = await register(signupEmail, password)

        if (session) {
          setUser(createdUser)
          setAuthMessage(t('Your account is ready.'))
          setShowAuth(false)
        } else {
          setVerificationEmail(signupEmail)
          setCanResendVerification(true)
          setAuthMessage(accessibilityPreferences.language === 'fr'
            ? `Vérifiez la boîte de réception de ${signupEmail} et le dossier indésirable pour un lien de vérification. ${emailDeliveryHint('fr')}`
            : `Check ${signupEmail}'s inbox and spam folder for a verification link. ${emailDeliveryHint('en')}`)
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not complete authentication.'
      setAuthError(t(message))
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
      setAuthMessage(accessibilityPreferences.language === 'fr'
        ? `Si ${verificationEmail} doit encore être vérifié, vérifiez la boîte de réception et le dossier indésirable. ${emailDeliveryHint('fr')}`
        : `If ${verificationEmail} still needs verification, check the inbox and spam folder. ${emailDeliveryHint('en')}`)
    } catch (error) {
      setAuthError(t(error instanceof Error ? error.message : 'Could not resend the verification email.'))
    } finally {
      setIsResendingVerification(false)
    }
  }

  async function handleGoogleSignIn() {
    setAuthError('')
    setAuthMessage('')
    setIsSubmitting(true)
    try {
      await signInWithGoogle()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Could not start Google sign-in.'
      setAuthError(/provider.*(disabled|not enabled|unsupported)/i.test(message)
        ? t('Google sign-in is not configured for this project yet.')
        : t(message))
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleLogout() {
    setAuthError('')
    setAuthMessage('')

    try {
      await logout()
      setAuthMessage(t('You are signed out.'))
    } catch (error) {
      setAuthError(t(error instanceof Error ? error.message : 'Could not sign out.'))
    }
  }

  function navigateTo(section: AppSection) {
    setActiveSection(section)
    setIsMobileMenuOpen(false)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function openLogin() {
    setAuthMode('login')
    setShowAuth(true)
    setAuthError('')
    setAuthMessage('')
    setIsMobileMenuOpen(false)
  }

  const sectionTitle: Record<AppSection, string> = {
    home: 'Appointment & clinic access',
    calendar: 'Calendar',
    profile: 'Your profile',
    settings: 'Accessibility settings',
    notifications: 'Notifications',
    help: 'Help and contact',
    staff_access: 'Staff access',
  }

  return (
    <LanguageProvider language={accessibilityPreferences.language}>
    <div className={"app-shell text-size-" + accessibilityPreferences.text_size + (accessibilityPreferences.high_contrast ? " high-contrast" : "") + (activeSection === 'calendar' ? " calendar-active" : "")}>
      <a className="skip-link" href="#main-content">{t('Skip to content')}</a>
      {isMobileMenuOpen && <button type="button" className="navigation-scrim" aria-label={t('Close navigation menu')} onClick={() => setIsMobileMenuOpen(false)} />}

      <div className="app-layout">
        <aside id="mobile-navigation" className={"side-rail" + (isMobileMenuOpen ? " is-open" : "")} aria-label={t('Application navigation')}>
          <div className="rail-brand">
            <span className="brand-mark" aria-hidden="true">C</span>
            <div><strong>ClinicFlow</strong><span>{t('Clinic appointments')}</span></div>
          </div>
          <nav className="rail-navigation" aria-label={t('Main navigation')}>
            <button type="button" className="rail-link" aria-current={activeSection === 'home' ? 'page' : undefined} onClick={() => navigateTo('home')}><SectionIcon section="home" />{t('Home')}</button>
            <button type="button" className="rail-link" aria-current={activeSection === 'calendar' ? 'page' : undefined} onClick={() => navigateTo('calendar')}><SectionIcon section="calendar" />{t('Calendar')}</button>
            <button type="button" className="rail-link" aria-current={activeSection === 'settings' ? 'page' : undefined} onClick={() => navigateTo('settings')}><SectionIcon section="settings" />{t('Settings')}</button>
            <button type="button" className="rail-link" aria-current={activeSection === 'profile' ? 'page' : undefined} onClick={() => navigateTo('profile')}><SectionIcon section="profile" />{t('Profile')}</button>
            {isPlatformAdmin && <button type="button" className="rail-link" aria-current={activeSection === 'staff_access' ? 'page' : undefined} onClick={() => navigateTo('staff_access')}><SectionIcon section="staff_access" />{t('Staff access')}</button>}
          </nav>
          <div className="rail-footer">
            <button type="button" className="support-link" aria-current={activeSection === 'help' ? 'page' : undefined} onClick={() => navigateTo('help')}>
              <strong>{t('Support & contact')}</strong><span>{t('Booking help and clinic contact details.')}</span>
            </button>
            <span className="rail-prototype-label">{t('ClinicFlow prototype')}</span>
          </div>
        </aside>

        <div className="app-main">
          <header className="topbar">
            <div className="topbar-heading"><p className="eyebrow">ClinicFlow</p><h1>{t(sectionTitle[activeSection])}</h1></div>
            <div className="topbar-actions">
              <button type="button" className="icon-button mobile-menu-trigger" aria-label={t(isMobileMenuOpen ? 'Close navigation menu' : 'Open navigation menu')} aria-expanded={isMobileMenuOpen} aria-controls="mobile-navigation" onClick={() => setIsMobileMenuOpen((open) => !open)}><MenuIcon /></button>
              <button type="button" className="icon-button notification-trigger" aria-label={t('Notifications') + ', ' + unreadNotificationCount + ' ' + (accessibilityPreferences.language === 'fr' ? 'non lues' : 'unread')} onClick={() => navigateTo('notifications')}>
                <BellIcon />{unreadNotificationCount > 0 && <span className="unread-badge">{unreadNotificationCount}</span>}
              </button>
              {user ? (
                <div className="account-actions"><span className="signed-in-label">{t('Signed in: ')}{user.email}</span><button type="button" className="primary-button" onClick={handleLogout}>{t('Log out')}</button></div>
              ) : (
                <button type="button" className="primary-button" onClick={() => showAuth ? setShowAuth(false) : openLogin()} aria-expanded={showAuth} aria-controls="auth-panel">{t(showAuth ? 'Close' : 'Log in')}</button>
              )}
            </div>
          </header>

          <main id="main-content" className="main-content">
      {showAuth && !user && (
        <section className="panel auth-panel" id="auth-panel" aria-labelledby="auth-title">
          <div className="panel-header">
          <h3 id="auth-title">
            {t(authMode === 'login' ? 'Log in' : authMode === 'signup' ? 'Create an account' : 'Recover your password')}
          </h3>
          </div>

          <form className="auth-form" onSubmit={handleAuthSubmit}>
            <label>
              {t('Email')}
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
                {t('Password')}
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
                  <span className="input-hint">{t('Use at least 12 characters.')}</span>
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
                {t('Forgot password?')}
              </button>
            )}

            {authError && <p className="auth-error" role="alert">{t(authError)}</p>}
            {authMessage && <p className="auth-message" role="status">{t(authMessage)}</p>}

            {canResendVerification && (
              <div className="verification-actions">
                <button
                  type="button"
                  className="text-button"
                  onClick={handleResendVerification}
                  disabled={isResendingVerification}
                >
                  {t(isResendingVerification ? 'Sending' : 'Resend verification email')}
                </button>
                {localEmailPreviewUrl && (
                  <a href={localEmailPreviewUrl} target="_blank" rel="noreferrer">
                    {t('Open local email inbox')}
                  </a>
                )}
              </div>
            )}

            {authMode === 'reset' && localEmailPreviewUrl && (
              <div className="verification-actions">
                <a href={localEmailPreviewUrl} target="_blank" rel="noreferrer">
                  {t('Open local email inbox')}
                </a>
              </div>
            )}

            <button type="submit" className="primary-button" disabled={isSubmitting}>
              {isSubmitting
                ? t('Please wait')
                : authMode === 'login'
                  ? t('Log in')
                  : authMode === 'signup'
                    ? t('Create account')
                    : t('Send recovery link')}
            </button>
          </form>

          {authMode !== 'reset' && !Capacitor.isNativePlatform() && (
            <div className="oauth-actions">
              <div className="oauth-divider"><span>{t('or')}</span></div>
              <button type="button" className="google-auth-button" onClick={handleGoogleSignIn} disabled={isSubmitting}>
                <svg aria-hidden="true" viewBox="0 0 48 48">
                  <path fill="#4285F4" d="M43.6 24.5c0-1.4-.1-2.8-.4-4.1H24v7.8h11c-.5 2.5-2 4.6-4.2 6v5.1h6.8c4-3.7 6-9 6-14.8Z" />
                  <path fill="#34A853" d="M24 44c5.5 0 10.1-1.8 13.5-4.8l-6.8-5.1c-1.9 1.3-4.1 2.1-6.7 2.1-5.2 0-9.6-3.5-11.2-8.2H5.8v5.2C9.2 39.7 16 44 24 44Z" />
                  <path fill="#FBBC05" d="M12.8 28c-.4-1.2-.7-2.6-.7-4s.3-2.8.7-4v-5.2H5.8C4.3 17.7 3.5 20.8 3.5 24s.8 6.3 2.3 9.2l7-5.2Z" />
                  <path fill="#EA4335" d="M24 11.8c3 0 5.7 1 7.8 3.1l5.8-5.8C34.1 5.8 29.5 4 24 4 16 4 9.2 8.3 5.8 14.8l7 5.2c1.6-4.7 6-8.2 11.2-8.2Z" />
                </svg>
                {t('Continue with Google')}
              </button>
            </div>
          )}

          <p className="auth-mode-switch">
            {authMode === 'reset' ? (
              <>
                {t('Remember your password?')}{' '}
                <button type="button" className="text-button" onClick={() => setAuthMode('login')}>
                  {t('Return to log in')}
                </button>
              </>
            ) : (
              <>
                {t(authMode === 'login' ? 'New to ClinicFlow?' : 'Already have an account?')}{' '}
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
                  {t(authMode === 'login' ? 'Create an account' : 'Log in')}
                </button>
              </>
            )}
          </p>
        </section>
      )}

            {authMessage && !showAuth && <p className="auth-message" role="status">{t(authMessage)}</p>}
            {authError && !showAuth && <p className="auth-error" role="alert">{t(authError)}</p>}

            {activeSection === 'home' && (
              <>
                <section className="hero-panel">
                  <div><p className="eyebrow">{t('Patient appointment flow')}</p><h2>{t('Find a clinic and book an appointment')}</h2><p className="hero-description">{t('Search local clinics, compare availability, and manage upcoming bookings.')}</p></div>
                  <span className="status-pill">{t('Current prototype')}</span>
                </section>
                <div className="clinic-booking-flow" id="clinic-search">
                  <ClinicFinder selectedClinicId={selectedClinic?.id ?? null} onSelectClinic={setSelectedClinic} />
                  <CalendarPage
                    key={user?.id ?? 'guest'}
                    preferredClinicId={selectedClinic?.id ?? null}
                    userId={user?.id ?? null}
                    hasPatientProfile={hasPatientProfile}
                    refreshToken={appointmentsRefreshToken}
                    onLoginRequest={openLogin}
                    onOpenProfile={() => navigateTo('profile')}
                    onClinicChange={setSelectedClinic}
                  />
                </div>
                {user && (
                  <div className="home-secondary-grid">
                    <ClinicExtrasPanel
                      key={user.id + ':' + (selectedClinic?.id ?? 'no-clinic')}
                      clinic={selectedClinic} userId={user.id} hasPatientProfile={hasPatientProfile}
                      onWaitlistAccepted={() => setAppointmentsRefreshToken((token) => token + 1)}
                    />
                    <StaffOperationsPanel key={user.id} userId={user.id} />
                  </div>
                )}
              </>
            )}

            {activeSection === 'calendar' && (
              <CalendarPage
                key={user?.id ?? 'guest'}
                preferredClinicId={selectedClinic?.id ?? null}
                userId={user?.id ?? null}
                hasPatientProfile={hasPatientProfile}
                refreshToken={appointmentsRefreshToken}
                onLoginRequest={openLogin}
                onOpenProfile={() => navigateTo('profile')}
                onClinicChange={setSelectedClinic}
              />
            )}

            {user && (
              <div className="settings-page-grid" hidden={activeSection !== 'profile'}>
                <PatientProfilePanel key={user.id} userId={user.id} onProfileReady={setHasPatientProfile} />
                {user.email && <AccountSecurityPanel key={user.id} email={user.email} recoveryMode={isPasswordRecovery} onRecoveryComplete={() => setIsPasswordRecovery(false)} />}
              </div>
            )}
            {activeSection === 'profile' && !user && (
              <section className="panel access-prompt"><h2>{t('Sign in to manage your profile')}</h2><p className="section-description">{t('Your booking profile and password controls are available after you log in.')}</p><button type="button" className="primary-button" onClick={openLogin}>{t('Log in')}</button></section>
            )}

            {activeSection === 'settings' && (
              user ? (
                <section className="settings-page-grid" id="accessibility-panel">
                  <AccessibilitySettingsPanel key={user.id} userId={user.id} onPreferencesChange={setAccessibilityPreferences} />
                  <div className="panel settings-guidance"><h3>{t('Using ClinicFlow')}</h3><p className="section-description">{t('Your text size, contrast, speech, and language preferences apply across the app.')}</p><button type="button" className="text-button" onClick={() => navigateTo('home')}>{t('Return to clinic search')}</button></div>
                </section>
              ) : (
                <section className="panel access-prompt"><h2>{t('Sign in to save your settings')}</h2><p className="section-description">{t('Accessibility preferences are saved to your account.')}</p><button type="button" className="primary-button" onClick={openLogin}>{t('Log in')}</button></section>
              )
            )}

            {activeSection === 'help' && (
              <HelpCenter
                onFindClinic={() => navigateTo('home')}
                onOpenProfile={() => navigateTo('profile')}
              />
            )}

            {activeSection === 'staff_access' && isPlatformAdmin && <PlatformAdminPanel />}

            {activeSection === 'notifications' && !user && (
              <section className="panel access-prompt"><h2>{t('Sign in to view notifications')}</h2><p className="section-description">{t('Appointment and clinic updates are linked to your account.')}</p><button type="button" className="primary-button" onClick={openLogin}>{t('Log in')}</button></section>
            )}
            {user && <div className="notification-page" hidden={activeSection !== 'notifications'}><NotificationCenter key={user.id} onUnreadCountChange={setUnreadNotificationCount} /></div>}
          </main>
        </div>
      </div>

      <nav className="mobile-bottom-navigation" aria-label="Main navigation">
        <button type="button" className="mobile-nav-link" aria-current={activeSection === 'home' ? 'page' : undefined} onClick={() => navigateTo('home')}><SectionIcon section="home" />{t('Home')}</button>
        <button type="button" className="mobile-nav-link" aria-current={activeSection === 'calendar' ? 'page' : undefined} onClick={() => navigateTo('calendar')}><SectionIcon section="calendar" />{t('Calendar')}</button>
        <button type="button" className="mobile-nav-link" aria-current={activeSection === 'profile' ? 'page' : undefined} onClick={() => navigateTo('profile')}><SectionIcon section="profile" />{t('Profile')}</button>
        <button type="button" className="mobile-nav-link" aria-current={activeSection === 'settings' ? 'page' : undefined} onClick={() => navigateTo('settings')}><SectionIcon section="settings" />{t('Settings')}</button>
      </nav>
    </div>
    </LanguageProvider>
  )
}

function App() {
  if (!isSupabaseConfigured) {
    const language = typeof navigator !== 'undefined' && navigator.language.toLowerCase().startsWith('fr')
      ? 'fr'
      : 'en'
    const copy = language === 'fr'
      ? {
          eyebrow: 'Configuration ClinicFlow',
          title: 'Configuration Supabase requise',
          description: 'ClinicFlow a besoin des paramètres Supabase pour charger les comptes et les rendez-vous.',
          localPrefix: 'Pour le développement local, lancez',
          localSuffix: 'depuis le dossier principal du projet.',
          hosted: 'Pour une version hébergée, définissez VITE_SUPABASE_URL et VITE_SUPABASE_PUBLISHABLE_KEY dans les variables de déploiement, puis reconstruisez l’application.',
        }
      : {
          eyebrow: 'ClinicFlow setup',
          title: 'Supabase setup required',
          description: 'ClinicFlow needs Supabase settings to load accounts and appointments.',
          localPrefix: 'For local development, run',
          localSuffix: 'from the project root.',
          hosted: 'For a hosted build, set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in the deployment environment, then rebuild the app.',
        }

    return (
      <main className="setup-required" lang={language}>
        <section className="setup-required__content" aria-labelledby="setup-title">
          <p className="setup-required__eyebrow">{copy.eyebrow}</p>
          <h1 id="setup-title">{copy.title}</h1>
          <p>{copy.description}</p>
          <ol>
            <li>{copy.localPrefix} <code>npm run dev</code> {copy.localSuffix}</li>
            <li>{copy.hosted}</li>
          </ol>
        </section>
      </main>
    )
  }

  return <ClinicFlowApp />
}

export default App
