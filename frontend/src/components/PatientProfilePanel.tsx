import { useEffect, useState, type FormEvent } from 'react'
import { getPatientProfile, savePatientProfile, type PatientProfile } from '../services/patientService'

interface PatientProfilePanelProps {
  userId: string
}

export function PatientProfilePanel({ userId }: PatientProfilePanelProps) {
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
        setFirstName(currentProfile?.first_name ?? '')
        setLastName(currentProfile?.last_name ?? '')
        setPhone(currentProfile?.phone ?? '')
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load your profile.')
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [userId])

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError('')
    setMessage('')
    setIsSaving(true)

    try {
      const savedProfile = await savePatientProfile(userId, {
        firstName,
        lastName,
        phone,
      })
      setProfile(savedProfile)
      setFirstName(savedProfile.first_name)
      setLastName(savedProfile.last_name)
      setPhone(savedProfile.phone ?? '')
      setMessage('Your booking profile is saved.')
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'Could not save your profile.')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <section className="panel profile-panel" aria-labelledby="patient-profile-title">
      <div className="panel-header">
        <h3 id="patient-profile-title">
          {profile ? 'Patient profile' : 'Complete your booking profile'}
        </h3>
      </div>

      {isLoading ? (
        <p role="status">Loading your profile…</p>
      ) : (
        <>
          <p className="section-description">
            We only ask for the contact details needed to manage appointments. Date of birth is not required.
          </p>
          <form className="profile-form" onSubmit={handleSubmit}>
            <label>
              First name
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
              Last name
              <input
                name="lastName"
                autoComplete="family-name"
                value={lastName}
                onChange={(event) => setLastName(event.target.value)}
                maxLength={80}
                required
              />
            </label>
            <label>
              Phone <span className="input-hint">Optional</span>
              <input
                type="tel"
                name="phone"
                autoComplete="tel"
                value={phone}
                onChange={(event) => setPhone(event.target.value)}
                maxLength={32}
              />
            </label>

            {error && <p className="auth-error" role="alert">{error}</p>}
            {message && <p className="auth-message" role="status">{message}</p>}

            <button type="submit" className="primary-button" disabled={isSaving}>
              {isSaving ? 'Saving…' : profile ? 'Update profile' : 'Save profile'}
            </button>
          </form>
        </>
      )}
    </section>
  )
}
