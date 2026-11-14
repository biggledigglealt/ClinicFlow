import { createClient } from '@supabase/supabase-js'

const configuredSupabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseUrl = new URL(
  configuredSupabaseUrl || '/supabase',
  window.location.origin,
).toString()
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
const hasPlaceholderUrl = configuredSupabaseUrl?.includes('YOUR_PROJECT_ID') ?? false
const hasPlaceholderKey = supabasePublishableKey?.includes('YOUR_SUPABASE_PUBLISHABLE_KEY') ?? false

export const isSupabaseConfigured = Boolean(
  supabaseUrl && supabasePublishableKey && !hasPlaceholderUrl && !hasPlaceholderKey,
)

export const supabase = createClient(supabaseUrl, supabasePublishableKey || 'not-configured')

export function getLocalEmailPreviewUrl() {
  const hostname = window.location.hostname

  if (hostname === 'localhost' || hostname === '127.0.0.1') {
    return 'http://127.0.0.1:54324'
  }

  const codespaceHost = hostname.match(/^(.*)-5173(\.app\.github\.dev)$/)
  if (codespaceHost) {
    return `${window.location.protocol}//${codespaceHost[1]}-54324${codespaceHost[2]}`
  }

  return null
}
