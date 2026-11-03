import { useCallback, useEffect, useState } from 'react'
import { listMyNotifications, markNotificationRead, type UserNotification } from '../services/operationsService'
import { useTranslate, useLanguage } from '../lib/i18n'

interface NotificationCenterProps {
  onUnreadCountChange: (count: number) => void
}

export function NotificationCenter({ onUnreadCountChange }: NotificationCenterProps) {
  const t = useTranslate()
  const language = useLanguage()
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [error, setError] = useState('')

  const refresh = useCallback(async () => {
    try {
      const items = await listMyNotifications()
      setNotifications(items)
      onUnreadCountChange(items.filter((notification) => !notification.read_at).length)
      setError('')
    } catch (loadError) {
      setError(t(loadError instanceof Error ? loadError.message : 'Could not load notifications.'))
    }
  }, [onUnreadCountChange, t])

  useEffect(() => {
    const initialLoad = window.setTimeout(() => void refresh(), 0)
    const refreshTimer = window.setInterval(() => void refresh(), 15000)
    return () => {
      window.clearTimeout(initialLoad)
      window.clearInterval(refreshTimer)
    }
  }, [refresh])

  async function markRead(id: string) {
    try {
      await markNotificationRead(id)
      await refresh()
    } catch (updateError) {
      setError(t(updateError instanceof Error ? updateError.message : 'Could not update notification.'))
    }
  }

  return (
    <section className="panel" id="notifications-panel" aria-labelledby="notifications-title">
      <div className="panel-header panel-header-actions">
        <h3 id="notifications-title">{t('Notifications')}</h3>
        <button type="button" className="text-button" onClick={() => void refresh()}>{t('Refresh')}</button>
      </div>
      {error && <p className="auth-error" role="alert">{t(error)}</p>}
      {notifications.length === 0 ? (
        <p className="section-description">{t('No in-app notifications yet.')}</p>
      ) : (
        <ul className="notification-list">
          {notifications.map((notification) => (
            <li className={notification.read_at ? '' : 'notification-unread'} key={notification.id}>
              <div>
                <strong>{notification.title}</strong>
                <p>{notification.message}</p>
                <small>{new Intl.DateTimeFormat(language === 'fr' ? 'fr-CA' : 'en-CA', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(notification.created_at))}</small>
              </div>
              {!notification.read_at && (
                <button type="button" className="text-button" onClick={() => void markRead(notification.id)}>
                  {t('Mark read')}
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <p className="input-hint">{t('In-app notices refresh every 15 seconds while this page is open. Email and SMS delivery are not configured.')}</p>
    </section>
  )
}
