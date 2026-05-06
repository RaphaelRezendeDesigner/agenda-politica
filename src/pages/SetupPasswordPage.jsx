import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Shield, CheckCircle, AlertCircle, Loader2, Lock } from 'lucide-react'
import useStore from '@/store/useStore'
import { teamService } from '@/lib/services'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

export default function SetupPasswordPage() {
  const navigate = useNavigate()
  const { settings, syncFromServer } = useStore()

  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState(false)
  const [checkingAuth, setCheckingAuth] = useState(true)
  const [userEmail, setUserEmail] = useState('')

  const primaryColor = settings?.primary_color || '#1a3a6b'
  const secondaryColor = settings?.secondary_color || '#c9a84c'

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setError('Sistema não está conectado ao banco de dados.')
      setCheckingAuth(false)
      return
    }

    // Aguarda Supabase processar o token do magic link na URL
    const checkUser = async () => {
      // Pequeno delay para o cliente JS processar o hash da URL
      await new Promise(r => setTimeout(r, 500))

      const { data: { session } } = await supabase.auth.getSession()
      if (!session) {
        setError('Link inválido ou expirado. Peça um novo convite.')
        setCheckingAuth(false)
        return
      }
      setUserEmail(session.user.email)
      setCheckingAuth(false)
    }
    checkUser()
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (password.length < 6) {
      setError('Senha precisa ter no mínimo 6 caracteres')
      return
    }
    if (password !== confirm) {
      setError('As senhas não coincidem')
      return
    }

    setLoading(true)
    const result = await teamService.setPassword(password)
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
    // Sincronizar dados e redirecionar pro dashboard
    await syncFromServer()
    setTimeout(() => navigate('/'), 1500)
  }

  if (checkingAuth) {
    return (
      <div
        className="min-h-screen flex items-center justify-center"
        style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, #0a1628 100%)` }}
      >
        <div className="text-white text-center">
          <Loader2 size={32} className="animate-spin mx-auto mb-3" />
          <p className="text-sm">Verificando seu acesso...</p>
        </div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 50%, #0a1628 100%)` }}
    >
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-96 h-96 rounded-full opacity-10" style={{ backgroundColor: secondaryColor }} />
        <div className="absolute -bottom-40 -left-40 w-96 h-96 rounded-full opacity-5" style={{ backgroundColor: secondaryColor }} />
      </div>

      <div className="relative w-full max-w-md">
        <div className="text-center mb-8">
          <div
            className="w-16 h-16 rounded-2xl mx-auto mb-4 flex items-center justify-center shadow-lg"
            style={{ backgroundColor: secondaryColor }}
          >
            <Lock size={32} style={{ color: primaryColor }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Bem-vindo!
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Você foi convidado para a equipe de
          </p>
          <p className="text-white font-semibold">
            {settings?.candidate_name || 'Agenda Política'}
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Senha definida!</h2>
              <p className="text-sm text-gray-500">Redirecionando para o sistema...</p>
            </div>
          ) : (
            <>
              <h2 className="text-xl font-bold text-gray-900 mb-1">Defina sua senha</h2>
              <p className="text-sm text-gray-500 mb-1">
                Conta: <span className="font-medium text-gray-700">{userEmail}</span>
              </p>
              <p className="text-xs text-gray-400 mb-6">
                Use uma senha forte. Você usará ela para entrar no sistema depois.
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Nova senha</label>
                  <div className="relative">
                    <input
                      type={showPass ? 'text' : 'password'}
                      value={password}
                      onChange={e => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      required
                      className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPass(!showPass)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1"
                    >
                      {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirme a senha</label>
                  <input
                    type={showPass ? 'text' : 'password'}
                    value={confirm}
                    onChange={e => setConfirm(e.target.value)}
                    placeholder="Repita a senha"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:ring-2 focus:border-transparent"
                  />
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl flex items-start gap-2">
                    <AlertCircle size={16} className="flex-shrink-0 mt-0.5" />
                    <span>{error}</span>
                  </div>
                )}

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                  style={{ backgroundColor: primaryColor }}
                >
                  {loading ? (
                    <Loader2 size={18} className="animate-spin" />
                  ) : (
                    <>
                      <Shield size={18} />
                      Definir senha e entrar
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Agenda Política © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
