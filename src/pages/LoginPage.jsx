import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Eye, EyeOff, Shield, LogIn, Loader2 } from 'lucide-react'
import useStore from '@/store/useStore'

export default function LoginPage() {
  const navigate = useNavigate()
  const { login, loginWithGoogle, isAuthenticated, needsInviteCode } = useStore()

  const [showEmailLogin, setShowEmailLogin] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPass, setShowPass] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [googleLoading, setGoogleLoading] = useState(false)

  const primaryColor = '#1a3a6b'
  const secondaryColor = '#c9a84c'

  useEffect(() => {
    if (isAuthenticated) navigate('/')
    else if (needsInviteCode) navigate('/codigo-convite')
  }, [isAuthenticated, needsInviteCode])

  const handleGoogle = async () => {
    setError('')
    setGoogleLoading(true)
    const result = await loginWithGoogle()
    if (result.error) {
      setError(result.error)
      setGoogleLoading(false)
    }
    // Não desativa loading: vai redirecionar para Google
  }

  const handleEmailSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/')
    } else {
      setError(result.error)
    }
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center p-4"
      style={{
        background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 50%, #0a1628 100%)`,
      }}
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
            <Shield size={32} style={{ color: primaryColor }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Agenda Política
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Sistema de Gestão de Agenda Política
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          <h2 className="text-xl font-bold text-gray-900 mb-1">Entrar no sistema</h2>
          <p className="text-sm text-gray-500 mb-6">
            {showEmailLogin ? 'Acesse com email e senha' : 'Use sua conta Google para entrar'}
          </p>

          {!showEmailLogin && (
            <>
              {/* Botão Google em destaque */}
              <button
                onClick={handleGoogle}
                disabled={googleLoading}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-4 rounded-xl border-2 border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all font-semibold text-gray-700 disabled:opacity-60"
              >
                {googleLoading ? (
                  <Loader2 size={20} className="animate-spin" />
                ) : (
                  <svg width="20" height="20" viewBox="0 0 24 24">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                  </svg>
                )}
                Entrar com Google
              </button>

              <div className="relative my-6">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-xs">
                  <span className="bg-white px-3 text-gray-400">ou</span>
                </div>
              </div>

              <button
                onClick={() => setShowEmailLogin(true)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2"
              >
                Entrar com email e senha
              </button>

              {error && (
                <div className="mt-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">
                  {error}
                </div>
              )}

              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <p className="text-xs text-gray-400">
                  💡 Primeiro acesso? Você precisará de um código de convite do administrador.
                </p>
              </div>
            </>
          )}

          {showEmailLogin && (
            <form onSubmit={handleEmailSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">E-mail</label>
                <input type="email" value={email} onChange={e => setEmail(e.target.value)}
                  placeholder="seu@email.com" required
                  className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500" />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Senha</label>
                <div className="relative">
                  <input type={showPass ? 'text' : 'password'} value={password} onChange={e => setPassword(e.target.value)}
                    placeholder="••••••••" required
                    className="w-full px-4 py-3 pr-12 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500" />
                  <button type="button" onClick={() => setShowPass(!showPass)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 p-1">
                    {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>

              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-xl">{error}</div>
              )}

              <button type="submit" disabled={loading}
                className="w-full py-3 rounded-xl font-semibold text-white transition-all flex items-center justify-center gap-2 mt-2 disabled:opacity-60"
                style={{ backgroundColor: primaryColor }}>
                {loading ? <Loader2 size={18} className="animate-spin" /> : <><LogIn size={18} /> Entrar</>}
              </button>

              <button type="button" onClick={() => setShowEmailLogin(false)}
                className="w-full text-sm text-gray-500 hover:text-gray-700 py-2">
                ← Voltar para login com Google
              </button>
            </form>
          )}
        </div>

        <p className="text-center text-white/30 text-xs mt-6">
          Agenda Política © {new Date().getFullYear()}
        </p>
      </div>
    </div>
  )
}
