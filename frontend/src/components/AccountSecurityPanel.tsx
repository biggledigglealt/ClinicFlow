import { useState, type FormEvent } from 'react'
import { changePassword, updatePassword } from '../lib/auth'
import { useTranslate } from '../lib/i18n'

interface AccountSecurityPanelProps {
  email: string
  recoveryMode: boolean
  onRecoveryComplete: () => void
}

export function AccountSecurityPanel({ email, recoveryMode, onRecoveryComplete }: AccountSecurityPanelProps) {
  const t = useTranslate()
  const [isOpen, setIsOpen] = useState(recoveryMode)
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')

    if (newPassword !== confirmPassword) {
      setError(t('The new passwords do not match.'))
      return
    }

    setIsSaving(true)
    try {
      if (recoveryMode) {
        await updatePassword(newPassword)
        onRecoveryComplete()
        setMessage(t('Your password has been reset.'))
      } else {
        await changePassword(email, currentPassword, newPassword)
        setMessage(t('Your password has been changed.'))
      }
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setIsOpen(false)
    } catch (saveError) {
      setError(t(saveError instanceof Error ? saveError.message : 'Could not update your password.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="panel account-security-panel" aria-labelledby="account-security-title">
      <div className="panel-header">
        <h3 id="account-security-title">{t('Account security')}</h3>
      </div>

      {recoveryMode ? (
        <p className="section-description">{t('Choose a new password to finish recovering your account.')}</p>
      ) : (
        <button
          type="button"
          className="text-button"
          aria-expanded={isOpen}
          onClick={() => {
            setIsOpen((open) => !open)
            setError('')
            setMessage('')
          }}
        >
          {t(isOpen ? 'Cancel password change' : 'Change password')}
        </button>
      )}

      {(isOpen || recoveryMode) && (
        <form className="security-form" onSubmit={handleSubmit}>
          {!recoveryMode && (
            <label>
              {t('Current password')}
              <input
                type="password"
                autoComplete="current-password"
                value={currentPassword}
                onChange={(event) => setCurrentPassword(event.target.value)}
                required
              />
            </label>
          )}
          <label>
            {t('New password')}
            <input
              type="password"
              autoComplete="new-password"
              value={newPassword}
              onChange={(event) => setNewPassword(event.target.value)}
              minLength={12}
              required
            />
            <span className="input-hint">{t('Use at least 12 characters.')}</span>
          </label>
          <label>
            {t('Confirm new password')}
            <input
              type="password"
              autoComplete="new-password"
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              minLength={12}
              required
            />
          </label>

          {error && <p className="auth-error" role="alert">{error}</p>}
          <button type="submit" className="primary-button" disabled={isSaving}>
            {t(isSaving ? 'Updating…' : recoveryMode ? 'Set new password' : 'Change password')}
          </button>
        </form>
      )}
      {message && <p className="auth-message" role="status">{message}</p>}
    </section>
  )
}
