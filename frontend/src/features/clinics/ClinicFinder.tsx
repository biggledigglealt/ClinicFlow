import { useEffect, useState, type FormEvent } from 'react'
import { listActiveClinics, type Clinic } from '../../services/clinicService'

interface ClinicFinderProps {
  selectedClinicId: string | null
  onSelectClinic: (clinic: Clinic) => void
}

export function ClinicFinder({ selectedClinicId, onSelectClinic }: ClinicFinderProps) {
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [cityInput, setCityInput] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  async function loadClinics(city = '') {
    setError('')
    setIsLoading(true)
    try {
      setClinics(await listActiveClinics(city))
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Could not load clinics.')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    let isCurrent = true

    listActiveClinics()
      .then((activeClinics) => {
        if (isCurrent) setClinics(activeClinics)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load clinics.')
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadClinics(cityInput)
  }

  return (
    <section className="panel" aria-labelledby="clinic-finder-title">
      <div className="panel-header">
        <h3 id="clinic-finder-title">Find a clinic</h3>
      </div>

      <form className="clinic-search" onSubmit={handleSearch}>
        <label className="visually-hidden" htmlFor="clinic-city-search">Search by city</label>
        <input
          id="clinic-city-search"
          type="search"
          value={cityInput}
          onChange={(event) => setCityInput(event.target.value)}
          placeholder="Search by city"
        />
        <button type="submit" disabled={isLoading}>Search</button>
      </form>

      {error && <p className="auth-error" role="alert">{error}</p>}
      {isLoading ? (
        <p role="status">Loading clinics…</p>
      ) : clinics.length > 0 ? (
        <div className="clinic-list" aria-live="polite">
          {clinics.map((clinic) => {
            const isSelected = clinic.id === selectedClinicId
            const location = [clinic.city, clinic.province].filter(Boolean).join(', ')

            return (
              <article className={`clinic-card${isSelected ? ' selected' : ''}`} key={clinic.id}>
                <div className="clinic-details">
                  <h4>{clinic.name}</h4>
                  <p>{clinic.address}</p>
                  {location && <p>{location}</p>}
                  {clinic.description && <p>{clinic.description}</p>}
                  {clinic.phone && <p>{clinic.phone}</p>}
                </div>
                <button
                  type="button"
                  className="clinic-select-button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectClinic(clinic)}
                >
                  {isSelected ? 'Selected' : 'Select clinic'}
                </button>
              </article>
            )
          })}
        </div>
      ) : (
        <p>No active clinics found. Try another city or check back later.</p>
      )}
    </section>
  )
}
