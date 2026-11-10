import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
export const isSupabaseConfigured = Boolean(
  supabaseUrl
  && supabasePublishableKey
  && !supabaseUrl.includes('YOUR_PROJECT_ID')
  && !supabasePublishableKey.includes('YOUR_SUPABASE_PUBLISHABLE_KEY'),
)

export const supabase = createClient(
  supabaseUrl || 'http://127.0.0.1:54321',
  supabasePublishableKey || 'not-configured',
)

export function getLocalEmailPreviewUrl() {
  if (!supabaseUrl) return null

  const apiUrl = new URL(supabaseUrl)

  if (apiUrl.hostname === 'localhost' || apiUrl.hostname === '127.0.0.1') {
    return `${apiUrl.protocol}//${apiUrl.hostname}:54324`
  }

  const codespaceHost = apiUrl.hostname.match(/^(.*)-54321(\.app\.github\.dev)$/)
  if (codespaceHost) {
    return `https://${codespaceHost[1]}-54324${codespaceHost[2]}`
  }

  return null
}
