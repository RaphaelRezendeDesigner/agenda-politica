import { BrowserRouter, Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useEffect } from 'react'
import useStore from '@/store/useStore'
import { authService } from '@/lib/services'

import LoginPage from '@/pages/LoginPage'
import SetupPasswordPage from '@/pages/SetupPasswordPage'
import InviteCodePage from '@/pages/InviteCodePage'
import InviteCodesPage from '@/pages/InviteCodesPage'
import DashboardPage from '@/pages/DashboardPage'
import AgendaPage from '@/pages/AgendaPage'
import AppointmentDetailPage from '@/pages/AppointmentDetailPage'
import DemandsPage from '@/pages/DemandsPage'
import DemandDetailPage from '@/pages/DemandDetailPage'
import ReportsPage from '@/pages/ReportsPage'
import TeamPage from '@/pages/TeamPage'
import SettingsPage from '@/pages/SettingsPage'
import NotesPage from '@/pages/NotesPage'
import ArtGeneratorPage from '@/pages/ArtGeneratorPage'

function ProtectedRoute({ children }) {
  const { isAuthenticated, needsInviteCode } = useStore()
  if (needsInviteCode) return <Navigate to="/codigo-convite" replace />
  if (!isAuthenticated) return <Navigate to="/login" replace />
  return children
}

// Página de callback do OAuth (Google etc) — só processa e redireciona
function AuthCallbackPage() {
  const navigate = useNavigate()
  useEffect(() => {
    let cancelled = false

    const fetchProfile = async (userId, accessToken) => {
      // Busca profile usando fetch direto (não passa pelo lock do SDK)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
      const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
      try {
        const r = await fetch(
          `${supabaseUrl}/rest/v1/profiles?select=*&id=eq.${userId}`,
          {
            headers: {
              'apikey': apikey,
              'authorization': `Bearer ${accessToken}`,
              'accept': 'application/json',
            },
          }
        )
        const data = await r.json()
        return Array.isArray(data) && data.length > 0 ? data[0] : null
      } catch (e) {
        console.error('fetchProfile:', e)
        return null
      }
    }

    const finalizeWithSession = async (session) => {
      if (cancelled || !session) return
      const profile = await fetchProfile(session.user.id, session.access_token)
      if (cancelled) return

      if (profile) {
        useStore.setState({
          currentUser: profile,
          isAuthenticated: true,
          needsInviteCode: false,
          authUserId: null,
        })
        navigate('/', { replace: true })
        useStore.getState().syncFromServer?.()
      } else {
        useStore.setState({
          currentUser: null,
          isAuthenticated: false,
          needsInviteCode: true,
          authUserId: session.user.id,
          authUserEmail: session.user.email,
          authUserMeta: session.user.user_metadata,
        })
        navigate('/codigo-convite', { replace: true })
      }
    }

    const withTimeout = (promise, ms, label) => {
      return Promise.race([
        promise,
        new Promise((_, rej) => setTimeout(() => rej(new Error(`timeout: ${label}`)), ms))
      ])
    }

    ;(async () => {
      const { supabase } = await import('@/lib/supabase')

      // Pega code da URL (PKCE flow)
      const url = new URL(window.location.href)
      const code = url.searchParams.get('code')

      try {
        if (code) {
          // Tenta exchange via SDK com timeout de 5s
          try {
            const { data, error } = await withTimeout(
              supabase.auth.exchangeCodeForSession(code),
              5000,
              'exchangeCodeForSession'
            )
            if (error) throw error
            if (data?.session) {
              await finalizeWithSession(data.session)
              return
            }
          } catch (e) {
            console.warn('SDK exchange falhou:', e.message)
            // Fallback: tenta exchange via REST direto
            const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
            const apikey = import.meta.env.VITE_SUPABASE_ANON_KEY
            // Pega code_verifier do localStorage (PKCE)
            const verifierKey = Object.keys(localStorage).find(k => k.endsWith('-code-verifier'))
            const verifier = verifierKey ? JSON.parse(localStorage.getItem(verifierKey)) : null

            const r = await fetch(`${supabaseUrl}/auth/v1/token?grant_type=pkce`, {
              method: 'POST',
              headers: {
                'apikey': apikey,
                'content-type': 'application/json',
              },
              body: JSON.stringify({ auth_code: code, code_verifier: verifier }),
            })
            if (r.ok) {
              const tokenData = await r.json()
              const sessionLike = {
                access_token: tokenData.access_token,
                refresh_token: tokenData.refresh_token,
                expires_at: Math.floor(Date.now() / 1000) + (tokenData.expires_in || 3600),
                user: tokenData.user,
              }
              // Salva sessão no localStorage no formato que o Supabase espera
              const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
                || `sb-${supabaseUrl.split('//')[1].split('.')[0]}-auth-token`
              localStorage.setItem(sbKey, JSON.stringify(sessionLike))
              if (verifierKey) localStorage.removeItem(verifierKey)
              await finalizeWithSession(sessionLike)
              return
            } else {
              const errBody = await r.text()
              console.error('REST exchange falhou:', r.status, errBody)
            }
          }
        }

        // Fallback: já existe sessão salva?
        const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'))
        const savedSession = sbKey ? JSON.parse(localStorage.getItem(sbKey)) : null
        if (savedSession?.access_token) {
          await finalizeWithSession(savedSession)
        } else {
          navigate('/login', { replace: true })
        }
      } catch (e) {
        console.error('Auth callback error:', e)
        navigate('/login', { replace: true })
      }
    })()

    // Failsafe absoluto: 12s
    const failsafe = setTimeout(() => {
      if (!cancelled) {
        console.warn('Auth callback failsafe — forcing navigation')
        navigate('/login', { replace: true })
      }
    }, 12000)

    return () => {
      cancelled = true
      clearTimeout(failsafe)
    }
  }, [])

  return (
    <div className="min-h-screen flex items-center justify-center" style={{ background: 'linear-gradient(135deg, #1a3a6b 0%, #0a1628 100%)' }}>
      <div className="text-white text-center">
        <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin mx-auto mb-3" />
        <p className="text-sm">Autenticando...</p>
      </div>
    </div>
  )
}

export default function App() {
  const { darkMode, checkSession, setupRealtime, isAuthenticated, syncFromServer } = useStore()

  useEffect(() => {
    if (darkMode) document.documentElement.classList.add('dark')
    else document.documentElement.classList.remove('dark')
  }, [darkMode])

  useEffect(() => {
    checkSession?.()
    const sub = authService.onAuthChange?.(async (event, session) => {
      if (event === 'SIGNED_IN' && session) {
        await checkSession?.()
      }
      if (event === 'TOKEN_REFRESHED') {
        // Token foi renovado — re-sincroniza dados pra garantir consistência
        console.log('[auth] Token renovado')
        await syncFromServer?.()
      }
      if (event === 'SIGNED_OUT') {
        useStore.setState({ currentUser: null, isAuthenticated: false, needsInviteCode: false })
      }
    })
    return () => sub?.unsubscribe?.()
  }, [])

  useEffect(() => {
    if (isAuthenticated) {
      const cleanup = setupRealtime?.()
      return cleanup
    }
  }, [isAuthenticated])

  // Sincroniza dados sempre que o usuário volta para o app (troca de aba, desbloqueia celular)
  useEffect(() => {
    if (!isAuthenticated) return
    const handleVisibility = () => {
      if (!document.hidden) {
        checkSession?.()    // recarrega perfil (mudanças de permissão)
        syncFromServer?.()  // recarrega dados (agendas, demandas, etc)
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)
    window.addEventListener('focus', handleVisibility)

    // Refresh automático a cada 30s — força renovação de token e re-sync
    // Isso garante que a sessão nunca fique "presa" depois de um tempo
    const interval = setInterval(async () => {
      if (document.hidden) return
      try {
        const { supabase } = await import('@/lib/supabase')
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Se token expira em menos de 5min, força refresh
          const expiresIn = session.expires_at - Date.now() / 1000
          if (expiresIn < 300) {
            await supabase.auth.refreshSession()
          }
          syncFromServer?.()
        }
      } catch (e) { console.warn('[interval refresh]', e.message) }
    }, 30000)

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
      clearInterval(interval)
    }
  }, [isAuthenticated])

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/auth/callback" element={<AuthCallbackPage />} />
        <Route path="/codigo-convite" element={<InviteCodePage />} />
        <Route path="/setup-senha" element={<SetupPasswordPage />} />
        <Route path="/" element={<ProtectedRoute><DashboardPage /></ProtectedRoute>} />
        <Route path="/agenda" element={<ProtectedRoute><AgendaPage /></ProtectedRoute>} />
        <Route path="/agenda/:id" element={<ProtectedRoute><AppointmentDetailPage /></ProtectedRoute>} />
        <Route path="/demandas" element={<ProtectedRoute><DemandsPage /></ProtectedRoute>} />
        <Route path="/demandas/:id" element={<ProtectedRoute><DemandDetailPage /></ProtectedRoute>} />
        <Route path="/relatorios" element={<ProtectedRoute><ReportsPage /></ProtectedRoute>} />
        <Route path="/equipe" element={<ProtectedRoute><TeamPage /></ProtectedRoute>} />
        <Route path="/codigos" element={<ProtectedRoute><InviteCodesPage /></ProtectedRoute>} />
        <Route path="/configuracoes" element={<ProtectedRoute><SettingsPage /></ProtectedRoute>} />
        <Route path="/observacoes" element={<ProtectedRoute><NotesPage /></ProtectedRoute>} />
        <Route path="/arte" element={<ProtectedRoute><ArtGeneratorPage /></ProtectedRoute>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}
