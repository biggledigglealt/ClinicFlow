import { useEffect, useRef } from 'react'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useTranslate } from '../../lib/i18n'
import type { Clinic } from '../../services/clinicService'

interface ClinicLocationsMapProps {
  clinics: Clinic[]
  selectedClinicId: string | null
  onSelectClinic: (clinic: Clinic) => void
}

export function ClinicLocationsMap({ clinics, selectedClinicId, onSelectClinic }: ClinicLocationsMapProps) {
  const t = useTranslate()
  const mapElement = useRef<HTMLDivElement>(null)
  const mapInstance = useRef<L.Map | null>(null)
  const markerLayer = useRef<L.FeatureGroup | null>(null)

  useEffect(() => {
    if (!mapElement.current) return

    const map = L.map(mapElement.current, {
      scrollWheelZoom: false,
      zoomControl: true,
      attributionControl: false,
    }).setView([45.4215, -75.6972], 12)
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>',
    }).addTo(map)
    const pins = L.featureGroup().addTo(map)
    L.control.attribution({ prefix: false }).addTo(map)
    mapInstance.current = map
    markerLayer.current = pins

    const resizeFrame = window.requestAnimationFrame(() => map.invalidateSize())
    return () => {
      window.cancelAnimationFrame(resizeFrame)
      map.remove()
      mapInstance.current = null
      markerLayer.current = null
    }
  }, [])

  useEffect(() => {
    const map = mapInstance.current
    const pins = markerLayer.current
    if (!map || !pins) return

    pins.clearLayers()
    const clinicsWithLocations = clinics.filter((clinic) => clinic.latitude != null && clinic.longitude != null)
    clinicsWithLocations.forEach((clinic, index) => {
      const selected = clinic.id === selectedClinicId
      const icon = L.divIcon({
        className: 'clinic-map-icon',
        html: `<span class="clinic-map-pin${selected ? ' is-selected' : ''}"><span>${index + 1}</span></span>`,
        iconSize: [38, 46],
        iconAnchor: [19, 44],
      })
      const popup = document.createElement('div')
      const popupTitle = document.createElement('strong')
      popupTitle.textContent = `${index + 1}. ${clinic.name}`
      const popupAddress = document.createElement('div')
      popupAddress.textContent = clinic.address
      popup.append(popupTitle, popupAddress)
      L.marker([clinic.latitude as number, clinic.longitude as number], {
        icon,
        title: clinic.name,
        alt: clinic.name,
        keyboard: true,
      })
        .bindPopup(popup)
        .on('click', () => onSelectClinic(clinic))
        .addTo(pins)
    })

    if (clinicsWithLocations.length > 0) {
      map.fitBounds(pins.getBounds().pad(clinicsWithLocations.length === 1 ? 0.6 : 0.2), { maxZoom: 14 })
    }
    const resizeFrame = window.requestAnimationFrame(() => map.invalidateSize())
    return () => window.cancelAnimationFrame(resizeFrame)
  }, [clinics, selectedClinicId, onSelectClinic])

  return <div className="clinic-map-canvas" ref={mapElement} role="region" aria-label={t('Map showing all clinic search results')} />
}
