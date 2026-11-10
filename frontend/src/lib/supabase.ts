import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.DEV
  ? `${window.location.origin}/supabase`
  : import.meta.env.VITE_SUPABASE_URL
const supabasePublishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

if (!supabasePublishableKey || !supabaseUrl) {
  throw new Error(
    'Missing Supabase configuration. Set VITE_SUPABASE_URL and VITE_SUPABASE_PUBLISHABLE_KEY for the hosted app.',
  )
}

export const supabase = createClient(supabaseUrl, supabasePublishableKey)

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
