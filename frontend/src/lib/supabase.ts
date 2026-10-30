import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabaseUrl || !supabasePublishableKey) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY in frontend/.env.local.',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

export function getLocalEmailPreviewUrl() {
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
