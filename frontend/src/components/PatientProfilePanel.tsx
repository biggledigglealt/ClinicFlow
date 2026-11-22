import { useEffect, useState, type FormEvent } from 'react'
import { getPatientProfile, savePatientProfile, type PatientProfile } from '../services/patientService'
import { useTranslate } from '../lib/i18n'

interface PatientProfilePanelProps {
  userId: string
  onProfileReady: (ready: boolean) => void
  onFirstProfileComplete?: () => void
  initialFirstName?: string
  initialLastName?: string
}

export function PatientProfilePanel({
  userId,
  onProfileReady,
  onFirstProfileComplete,
  initialFirstName = '',
  initialLastName = '',
}: PatientProfilePanelProps) {
  const t = useTranslate()
  const [profile, setProfile] = useState<PatientProfile | null>(null)
  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [phone, setPhone] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  useEffect(() => {
    let isCurrent = true

    getPatientProfile(userId)
      .then((currentProfile) => {
        if (!isCurrent) return
        setProfile(currentProfile)
        setFirstName(currentProfile?.first_name ?? initialFirstName)
        setLastName(currentProfile?.last_name ?? initialLastName)
        setPhone(currentProfile?.phone ?? '')
        onProfileReady(Boolean(currentProfile))
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          onProfileReady(false)
          setError(t(loadError instanceof Error ? loadError.message : 'Could not load your profile.'))
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [userId, onProfileReady, initialFirstName, initialLastName, t])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSaving(true)

    try {
      const isFirstProfile = !profile
      const savedProfile = await savePatientProfile(userId, {
        firstName,
        lastName,
        phone,
      })
      setProfile(savedProfile)
      setFirstName(savedProfile.first_name)
      setLastName(savedProfile.last_name)
      setPhone(savedProfile.phone ?? '')
      onProfileReady(true)
      if (isFirstProfile) onFirstProfileComplete?.()
      setMessage(t('Your booking profile is saved.'))
    } catch (saveError) {
      setError(t(saveError instanceof Error ? saveError.message : 'Could not save your profile.'))
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="panel profile-panel" aria-labelledby="patient-profile-title">
      <div className="panel-header">
        <h3 id="patient-profile-title">
          {t(profile ? 'Patient profile' : 'Complete your booking profile')}
        </h3>
      </div>

      {isLoading ? (
        <p role="status">{t('Loading your profile…')}</p>
      ) : (
        <>
          <p className="section-description">
            {t(profile
              ? 'We only ask for the contact details needed to manage appointments. Date of birth is not required.'
              : 'Add the name for your appointments. You can add a phone number later if you want.')}
          </p>
          <form className="profile-form" onSubmit={handleSubmit}>
            <label>
              {t('First name')}
              <input
                name="firstName"
                autoComplete="given-name"
                value={firstName}
                onChange={(event) => setFirstName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            <label>
              {t('Last name')}
              <input
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            {profile ? (
              <label>
                {t('Phone')} <span className="input-hint">{t('Optional')}</span>
                <input
                  type="tel"
                  name="phone"
                  autoComplete="tel"
                  value={phone}
                  onChange={(event) => setPhone(event.target.value)}
                  maxLength={32}
                />
              </label>
            ) : (
              <details className="optional-profile-details">
                <summary>{t('Add a phone number (optional)')}</summary>
                <label>
                  {t('Phone')}
                  <input
                    type="tel"
                    name="phone"
                    autoComplete="tel"
                    value={phone}
                    onChange={(event) => setPhone(event.target.value)}
                    maxLength={32}
                  />
                </label>
              </details>
            )}

            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="auth-message" role="status">{message}</p>}

            <button type="submit" className="primary-button" disabled={isSaving}>
              {t(isSaving ? 'Saving…' : profile ? 'Update profile' : 'Continue to booking')}
            </button>
          </form>
        </>
      )}
    </section>
  )
}
