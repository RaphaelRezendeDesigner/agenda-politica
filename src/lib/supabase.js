import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

// Lock em memória (não usa navigator.locks que fica órfão entre tabs/reloads).
// Serializa chamadas para evitar race conditions no refresh de token.
let _lockChain = Promise.resolve()
const memoryLock = (name, acquireTimeout, fn) => {
  const next = _lockChain.then(() => fn(), () => fn())
  _lockChain = next.catch(() => {})
  return next
}

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        autoRefreshToken: true,
        persistSession: true,
        // Desabilitado: nós fazemos o exchange manualmente no AuthCallbackPage
        // pra evitar race condition + lock hang
        detectSessionInUrl: false,
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        flowType: 'pkce',
        lock: memoryLock,
      },
      realtime: {
        params: { eventsPerSecond: 10 },
      },
      global: {
        headers: { 'x-client-info': 'agenda-politica-web' },
      },
    })
  : null

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
