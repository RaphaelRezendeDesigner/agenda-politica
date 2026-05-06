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
  const { checkSession } = useStore()
  useEffect(() => {
    (async () => {
      // Aguarda o Supabase processar a URL
      await new Promise(r => setTimeout(r, 500))
      await checkSession?.()
      // checkSession redireciona implicitamente; navega para raiz como fallback
      const { isAuthenticated, needsInviteCode } = useStore.getState()
      if (needsInviteCode) navigate('/codigo-convite', { replace: true })
      else if (isAuthenticated) navigate('/', { replace: true })
      else navigate('/login', { replace: true })
    })()
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
    return () => {
      document.removeEventListener('visibilitychange', handleVisibility)
      window.removeEventListener('focus', handleVisibility)
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
