import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''

export const supabase = supabaseUrl && supabaseAnonKey
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        // Renova token automaticamente antes de expirar
        autoRefreshToken: true,
        // Mantém sessão entre reloads
        persistSession: true,
        // Detecta callback de OAuth (Google) na URL
        detectSessionInUrl: true,
        // Storage explícito
        storage: typeof window !== 'undefined' ? window.localStorage : undefined,
        flowType: 'pkce',
        // CRITICAL: Desabilita o lock de navigator.locks que fica órfão e trava sync
        lock: (name, acquireTimeout, fn) => fn(),
      },
      realtime: {
        params: {
          eventsPerSecond: 10,
        },
      },
      global: {
        headers: {
          'x-client-info': 'agenda-politica-web',
        },
      },
    })
  : null

export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey)
