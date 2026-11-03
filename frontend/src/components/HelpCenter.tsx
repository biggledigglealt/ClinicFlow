import './HelpCenter.css'
import { useTranslate } from '../lib/i18n'

interface HelpCenterProps {
  onFindClinic: () => void
  onOpenProfile: () => void
}

export function HelpCenter({ onFindClinic, onOpenProfile }: HelpCenterProps) {
  const t = useTranslate()
  return (
    <div className="help-page">
      <section className="panel" aria-labelledby="help-booking-title">
        <div className="panel-header">
          <h2 id="help-booking-title">{t('Booking and appointments')}</h2>
        </div>
        <div className="help-answer">
          <h3>{t('How do I book?')}</h3>
          <p>{t("Sign in, save your booking profile, select a clinic, and choose one of the available times. Appointment times use the clinic's local time.")}</p>
        </div>
        <div className="help-answer">
          <h3>{t('How do I change an appointment?')}</h3>
          <p>{t('Open your upcoming appointments to cancel or reschedule. The database checks availability again before saving a change.')}</p>
        </div>
        <div className="help-answer">
          <h3>{t('What does a waitlist offer mean?')}</h3>
          <p>{t('A waitlist offer does not reserve a time. Another patient may book it first, so the system checks the time again when you accept.')}</p>
        </div>
        <button type="button" className="primary-button" onClick={onFindClinic}>{t('Find a clinic')}</button>
      </section>

      <section className="panel" aria-labelledby="help-account-title">
        <div className="panel-header">
          <h2 id="help-account-title">{t('Account and profile')}</h2>
        </div>
        <div className="help-answer">
          <h3>{t('Forgot your password?')}</h3>
          <p>{t('Choose “Forgot password?” on the sign-in form and follow the recovery link sent to your account email.')}</p>
        </div>
        <div className="help-answer">
          <h3>{t('Update your booking details')}</h3>
          <p>{t('Your profile stores your name and optional phone number. Open your profile to review or update these details.')}</p>
        </div>
        <button type="button" className="text-button" onClick={onOpenProfile}>{t('Open profile')}</button>
      </section>

      <section className="panel help-contact-panel" aria-labelledby="help-contact-title">
        <div className="panel-header">
          <h2 id="help-contact-title">{t('Contact a clinic')}</h2>
        </div>
        <p className="section-description">{t("For clinic hours, services, or appointment questions, use the public contact details on that clinic's listing. ClinicFlow does not provide medical advice.")}</p>
        <button type="button" className="text-button" onClick={onFindClinic}>{t('View clinic listings')}</button>
      </section>
    </div>
  )
}
