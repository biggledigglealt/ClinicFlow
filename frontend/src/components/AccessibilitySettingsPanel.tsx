import { useEffect, useState, type FormEvent } from 'react'
import {
  defaultAccessibilityPreferences,
  getAccessibilityPreferences,
  saveAccessibilityPreferences,
  type AccessibilityPreferences,
} from '../services/operationsService'

interface AccessibilitySettingsPanelProps {
  userId: string
  onPreferencesChange: (preferences: AccessibilityPreferences) => void
}

export function AccessibilitySettingsPanel({ userId, onPreferencesChange }: AccessibilitySettingsPanelProps) {
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
        if (active) setError(loadError instanceof Error ? loadError.message : 'Could not load preferences.')
      })
      .finally(() => { if (active) setIsLoading(false) })
    return () => { active = false }
  }, [userId, onPreferencesChange])

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
      setMessage('Accessibility preferences saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save preferences.')
    } finally {
      setIsSaving(false)
    }
  }

  function speakExample() {
    if (!('speechSynthesis' in window)) {
      setError('Text-to-speech is not available in this browser.')
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
      <div className="panel-header"><h3 id="accessibility-title">Accessibility settings</h3></div>
      {isLoading ? <p role="status">Loading preferences…</p> : (
        <form className="settings-form" onSubmit={handleSubmit}>
          <label>
            Language
            <select value={preferences.language} onChange={(event) => update('language', event.target.value as 'en' | 'fr')}>
              <option value="en">English</option>
              <option value="fr">Français</option>
            </select>
          </label>
          <label>
            Text size
            <select
              value={preferences.text_size}
              onChange={(event) => update('text_size', event.target.value as AccessibilityPreferences['text_size'])}
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="extra_large">Extra large</option>
            </select>
          </label>
          <label className="clinic-checkbox">
            <input type="checkbox" checked={preferences.high_contrast}
              onChange={(event) => update('high_contrast', event.target.checked)} />
            High contrast
          </label>
          <label className="clinic-checkbox">
            <input type="checkbox" checked={preferences.text_to_speech}
              onChange={(event) => update('text_to_speech', event.target.checked)} />
            Enable text-to-speech
          </label>
          {error && <p className="auth-error" role="alert">{error}</p>}
          {message && <p className="auth-message" role="status">{message}</p>}
          <div className="settings-actions">
            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving…' : 'Save preferences'}
            </button>
            {preferences.text_to_speech && <button type="button" className="text-button" onClick={speakExample}>Read a sample</button>}
          </div>
          <p className="input-hint">Language choice is saved; full French translation of the prototype interface is still in progress.</p>
        </form>
      )}
    </section>
  )
}
