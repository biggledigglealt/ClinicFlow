import { useEffect, useState, type FormEvent } from 'react'
import { useLanguage, useTranslate } from '../../lib/i18n'
import {
  listClinicServiceOptions,
  searchClinics,
  type Clinic,
  type ClinicSearchOptions,
} from '../../services/clinicService'

interface ClinicFinderProps {
  selectedClinicId: string | null
  onSelectClinic: (clinic: Clinic) => void
}

const defaultSearch: ClinicSearchOptions = {
  location: 'Ottawa',
  maxDistanceKm: 25,
  services: [],
  acceptingNewPatients: false,
  onlyWithAvailability: false,
}

function formatNextAvailable(value: string, timeZone: string, language: 'en' | 'fr') {
  return new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', {
    dateStyle: 'medium',
    timeStyle: 'short',
    timeZone,
  }).format(new Date(value))
}

export function ClinicFinder({ selectedClinicId, onSelectClinic }: ClinicFinderProps) {
  const t = useTranslate()
  const language = useLanguage()
  const [clinics, setClinics] = useState<Clinic[]>([])
  const [serviceOptions, setServiceOptions] = useState<string[]>([])
  const [location, setLocation] = useState(defaultSearch.location)
  const [maxDistanceKm, setMaxDistanceKm] = useState(defaultSearch.maxDistanceKm)
  const [selectedServices, setSelectedServices] = useState<string[]>([])
  const [acceptingNewPatients, setAcceptingNewPatients] = useState(false)
  const [onlyWithAvailability, setOnlyWithAvailability] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState('')

  useEffect(() => {
    let isCurrent = true

    Promise.all([
      listClinicServiceOptions(),
      searchClinics(defaultSearch),
    ])
      .then(([services, initialClinics]) => {
        if (!isCurrent) return
        setServiceOptions(services)
        setClinics(initialClinics)
      })
      .catch((loadError: unknown) => {
        if (isCurrent) {
          setError(loadError instanceof Error ? loadError.message : 'Could not load clinic search.')
        }
      })
      .finally(() => {
        if (isCurrent) setIsLoading(false)
      })

    return () => {
      isCurrent = false
    }
  }, [])

  async function loadClinics(options: ClinicSearchOptions) {
    setError('')
    setIsLoading(true)
    try {
      setClinics(await searchClinics(options))
    } catch (searchError) {
      setClinics([])
      setError(searchError instanceof Error ? searchError.message : 'Could not search clinics.')
    } finally {
      setIsLoading(false)
    }
  }

  function handleSearch(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    void loadClinics({
      location: location.trim(),
      maxDistanceKm,
      services: selectedServices,
      acceptingNewPatients,
      onlyWithAvailability,
    })
  }

  function toggleService(service: string) {
    setSelectedServices((current) => current.includes(service)
      ? current.filter((item) => item !== service)
      : [...current, service])
  }

  return (
    <section className="panel" aria-labelledby="clinic-finder-title">
      <div className="panel-header">
        <h3 id="clinic-finder-title">{t('Find a clinic')}</h3>
      </div>

      <form className="clinic-search" onSubmit={handleSearch}>
        <div className="clinic-search-fields">
          <label htmlFor="clinic-location-search">
            {t('City or postal code')}
            <input
              id="clinic-location-search"
              type="search"
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder={t('e.g. Ottawa or K1N 6N5')}
              maxLength={100}
              required
            />
            <span className="field-hint">{t('Prototype data covers Ottawa and postal prefixes K1N and K2G.')}</span>
          </label>

          <label htmlFor="clinic-distance-search">
            {t('Maximum distance')}
            <select
              id="clinic-distance-search"
              value={maxDistanceKm}
              onChange={(event) => setMaxDistanceKm(Number(event.target.value))}
            >
              {[5, 10, 25, 50, 100, 200].map((distance) => (
                <option key={distance} value={distance}>{distance} km</option>
              ))}
            </select>
          </label>
        </div>

        <fieldset className="clinic-service-filter">
          <legend>{t('Services')}</legend>
          {serviceOptions.length > 0 ? (
            <div className="clinic-filter-options">
              {serviceOptions.map((service) => (
                <label className="clinic-checkbox" key={service}>
                  <input
                    type="checkbox"
                    checked={selectedServices.includes(service)}
                    onChange={() => toggleService(service)}
                  />
                  {service}
                </label>
              ))}
            </div>
          ) : (
            <p className="section-description">{t('No clinic services are listed yet.')}</p>
          )}
        </fieldset>

        <div className="clinic-filter-options clinic-boolean-filters">
          <label className="clinic-checkbox">
            <input
              type="checkbox"
              checked={acceptingNewPatients}
              onChange={(event) => setAcceptingNewPatients(event.target.checked)}
            />
            {t('Accepting new patients')}
          </label>
          <label className="clinic-checkbox">
            <input
              type="checkbox"
              checked={onlyWithAvailability}
              onChange={(event) => setOnlyWithAvailability(event.target.checked)}
            />
            {t('Only show clinics with available appointments')}
          </label>
        </div>

        <button type="submit" disabled={isLoading}>
          {isLoading ? t('Searching…') : t('Search clinics')}
        </button>
      </form>

      {error && <p className="auth-error" role="alert">{t(error)}</p>}
      {isLoading ? (
        <p role="status">Finding nearby clinics…</p>
      ) : clinics.length > 0 ? (
        <div className="clinic-list" aria-live="polite">
          {clinics.map((clinic) => {
            const isSelected = clinic.id === selectedClinicId
            const locationLabel = [clinic.city, clinic.province].filter(Boolean).join(', ')

            return (
              <article className={`clinic-card${isSelected ? ' selected' : ''}`} key={clinic.id}>
                <div className="clinic-details">
                  <h4>{clinic.name}</h4>
                  {clinic.listing_status === 'demo' ? (
                    <p className="clinic-listing-note"><strong>{t('Demo listing:')}</strong> {t('synthetic prototype data, not a real clinic.')}</p>
                  ) : (
                    <p className="clinic-listing-note">
                      {t('Verified from')} {clinic.source_name} {t('on')} {clinic.source_checked_on}
                      {clinic.source_url && <> · <a href={clinic.source_url} target="_blank" rel="noreferrer">{t('View source')}</a></>}
                    </p>
                  )}
                  <p>{clinic.address}</p>
                  {locationLabel && <p>{locationLabel}</p>}
                  {clinic.description && <p>{clinic.description}</p>}
                  {clinic.phone && <p><strong>{t('Phone:')}</strong> <a href={'tel:' + clinic.phone.replace(/[^+\d]/g, '')}>{clinic.phone}</a></p>}
                  <p><strong>{t('Approx. distance:')}</strong> {clinic.distance_km.toFixed(1)} km</p>
                  <p>
                    <strong>{t('Services:')}</strong>{' '}
                    {clinic.services.length > 0 ? clinic.services.join(', ') : t('Not listed')}
                  </p>
                  <p>
                    <strong>{t('New patients:')}</strong>{' '}
                    {clinic.accepting_new_patients ? t('Accepted') : t('Not currently accepted')}
                  </p>
                  <p>
                    <strong>{t('Next available:')}</strong>{' '}
                    {clinic.next_available_at
                      ? formatNextAvailable(clinic.next_available_at, clinic.time_zone, language)
                      : t('No opening found in the next 60 days')}
                  </p>
                </div>
                <button
                  type="button"
                  className="clinic-select-button"
                  aria-pressed={isSelected}
                  onClick={() => onSelectClinic(clinic)}
                >
                  {isSelected ? t('Selected') : t('Select clinic')}
                </button>
              </article>
            )
          })}
        </div>
      ) : (
        <p>{t('No clinics match these search options. Try a larger distance or remove a filter.')}</p>
      )}
    </section>
  )
}
