import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Key, Shield, AlertCircle, Loader2, LogOut, CheckCircle } from 'lucide-react'
import useStore from '@/store/useStore'

export default function InviteCodePage() {
  const navigate = useNavigate()
  const { needsInviteCode, isAuthenticated, useInviteCode, logout, authUserEmail, authUserMeta } = useStore()

  const [code, setCode] = useState('')
  const [name, setName] = useState(authUserMeta?.full_name || '')
  const [phone, setPhone] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState(false)

  // Cores fixas (não usa settings da campanha — pessoa ainda não entrou)
  const primaryColor = '#1a3a6b'
  const secondaryColor = '#c9a84c'

  useEffect(() => {
    if (isAuthenticated) navigate('/')
    if (!needsInviteCode && !isAuthenticated) navigate('/login')
  }, [isAuthenticated, needsInviteCode])

  useEffect(() => {
    if (authUserMeta?.full_name && !name) setName(authUserMeta.full_name)
  }, [authUserMeta])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!code.trim()) {
      setError('Informe o código de convite')
      return
    }
    if (!name.trim()) {
      setError('Informe seu nome')
      return
    }

    setLoading(true)
    const result = await useInviteCode(code, { name: name.trim(), phone: phone.trim() })
    setLoading(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setSuccess(true)
    setTimeout(() => navigate('/'), 1200)
  }

  const handleLogout = async () => {
    await logout()
    navigate('/login')
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
            <Key size={32} style={{ color: primaryColor }} />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight">
            Quase lá!
          </h1>
          <p className="text-white/60 text-sm mt-2">
            Insira o código de convite que o administrador da campanha te enviou
          </p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {success ? (
            <div className="text-center py-4">
              <CheckCircle size={48} className="text-green-500 mx-auto mb-3" />
              <h2 className="text-xl font-bold text-gray-900 mb-1">Bem-vindo(a) à equipe!</h2>
              <p className="text-sm text-gray-500">Redirecionando...</p>
            </div>
          ) : (
            <>
              <p className="text-xs text-gray-400 mb-4">
                Logado como: <span className="font-medium text-gray-700">{authUserEmail}</span>
              </p>

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Código de convite *
                  </label>
                  <input
                    type="text"
                    value={code}
                    onChange={e => setCode(e.target.value.toUpperCase())}
                    placeholder="AGD-XXXXXX"
                    required
                    className="w-full px-4 py-3 rounded-xl border-2 border-gray-200 text-base font-mono text-center tracking-widest focus:outline-none focus:border-blue-500 transition-all"
                    style={{ letterSpacing: '0.2em' }}
                  />
                  <p className="text-xs text-gray-400 mt-1">Pergunte ao administrador da campanha</p>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Seu nome completo *
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={e => setName(e.target.value)}
                    placeholder="Como você prefere ser chamado"
                    required
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">
                    Telefone (opcional)
                  </label>
                  <input
                    type="tel"
                    value={phone}
                    onChange={e => setPhone(e.target.value)}
                    placeholder="(00) 00000-0000"
                    className="w-full px-4 py-3 rounded-xl border border-gray-200 text-sm focus:outline-none focus:border-blue-500 transition-all"
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
                      Validar e entrar
                    </>
                  )}
                </button>
              </form>

              <div className="mt-6 pt-5 border-t border-gray-100 text-center">
                <button
                  onClick={handleLogout}
                  className="text-sm text-gray-400 hover:text-gray-600 transition-colors flex items-center gap-1.5 mx-auto"
                >
                  <LogOut size={14} />
                  Sair e usar outra conta
                </button>
              </div>
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
