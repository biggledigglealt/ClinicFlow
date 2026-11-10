import { useEffect, useState, type FormEvent } from 'react'
import {
  defaultAccessibilityPreferences,
  getAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
} from '../services/operationsService'
import { useTranslate } from '../lib/i18n'

interface AccessibilitySettingsPanelProps {
  userId: string
  onPreferencesChange: (preferences: AccessibilityPreferences) => void
}

export function AccessibilitySettingsPanel({ userId, onPreferencesChange }: AccessibilitySettingsPanelProps) {
  const t = useTranslate()
  const [preferences, setPreferences] = useState(defaultAccessibilityPreferences)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let active = true
    getAccessibilityPreferences(userId)
      .then((saved) => {
        if (!active) return
        setPreferences(saved)
        onPreferencesChange(saved)
      })
      .catch((loadError: unknown) => {
        if (active) setError(t(loadError instanceof Error ? loadError.message : 'Could not load preferences.'))
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [userId, onPreferencesChange, t])

  function update<K extends keyof AccessibilityPreferences>(key: K, value: AccessibilityPreferences[K]) {
    setPreferences((current) => ({ ...current, [key]: value }))
    setMessage('')
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setIsSaving(true)
    setError('')
    setMessage('')
    try {
      await saveAccessibilityPreferences(userId, preferences)
      onPreferencesChange(preferences)
      setMessage(t('Accessibility preferences saved.'))
    } catch (saveError) {
      setError(t(saveError instanceof Error ? saveError.message : 'Could not save preferences.'))
    } finally {
      setIsSaving(false)
    }
  }

  function speakExample() {
    if (!('speechSynthesis' in window)) {
      setError(t('Text-to-speech is not available in this browser.'))
      return
    }
    window.speechSynthesis.cancel()
    const utterance = new SpeechSynthesisUtterance(
      preferences.language === 'fr'
        ? 'ClinicFlow. Vos préférences d’accessibilité sont enregistrées.'
        : 'ClinicFlow. Your accessibility preferences are saved.',
    )
    utterance.lang = preferences.language === 'fr' ? 'fr-CA' : 'en-CA'
    window.speechSynthesis.speak(utterance)
  }

  return (
    <section className="panel" id="accessibility-panel" aria-labelledby="accessibility-title">
      <div className="panel-header"><h3 id="accessibility-title">{t('Accessibility settings')}</h3></div>
      {isLoading ? <p role="status">{t('Loading preferences…')}</p> : (
        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            {t('Language')}
            <select value={preferences.language} onChange={(event) => update('language', event.target.value as 'en' | 'fr')}>
              <option value="en">{t('English')}</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <label>
            {t('Text size')}
            <select
              value={preferences.text_size}
              onChange={(event) => update('text_size', event.target.value as AccessibilityPreferences['text_size'])}
            >
              <option value="small">{t('Small')}</option>
              <option value="medium">{t('Medium')}</option>
              <option value="large">{t('Large')}</option>
              <option value="extra_large">{t('Extra large')}</option>
            </select>
          </label>
          <label className="clinic-checkbox">
            <input type="checkbox" checked={preferences.high_contrast}
              onChange={(event) => update('high_contrast', event.target.checked)} />
            {t('High contrast')}
          </label>
          <label className="clinic-checkbox">
            <input type="checkbox" checked={preferences.text_to_speech}
              onChange={(event) => update('text_to_speech', event.target.checked)} />
            {t('Enable text-to-speech')}
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <div className="settings-actions">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {t(isSaving ? 'Saving…' : 'Save preferences')}
            </button>
            {preferences.text_to_speech && <button type="button" className="text-button" onClick={speakExample}>{t('Read a sample')}</button>}
          </div>
          <p className="input-hint">{t('French labels are available. Clinic and staff-entered information appears in its original language.')}</p>
        </form>
      )}
    </section>
  )
}
