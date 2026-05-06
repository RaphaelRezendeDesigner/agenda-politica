import { useState, useEffect } from 'react'
import { Key, Plus, Copy, Trash2, CheckCircle, AlertCircle, Clock, X, Loader2 } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button, Card } from '@/components/ui'
import useStore from '@/store/useStore'
import { codesService } from '@/lib/services'
import { ACCESS_LEVELS } from '@/lib/constants'
import { cn, formatDate, formatTime } from '@/lib/utils'

const ROLE_SUGGESTIONS = [
  'Coordenador de campanha',
  'Assessor',
  'Cabo eleitoral',
  'Liderança comunitária',
  'Comunicação',
  'Voluntário',
]

export default function InviteCodesPage() {
  const { currentUser, darkMode, settings } = useStore()
  const [codes, setCodes] = useState([])
  const [loading, setLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [form, setForm] = useState({ role: '', access_level: 'visualizador', description: '', expires_in_days: '' })
  const [generatedCode, setGeneratedCode] = useState(null)
  const [copiedCode, setCopiedCode] = useState(null)
  const [error, setError] = useState('')

  const primaryColor = settings?.primary_color || '#1a3a6b'
  const isAdmin = currentUser?.access_level === 'admin'

  useEffect(() => {
    loadCodes()
  }, [])

  const loadCodes = async () => {
    setLoading(true)
    const data = await codesService.list()
    setCodes(data)
    setLoading(false)
  }

  const handleGenerate = async (e) => {
    e.preventDefault()
    setError('')
    setSubmitting(true)

    const result = await codesService.generate({
      role: form.role || null,
      access_level: form.access_level,
      description: form.description || null,
      expires_in_days: form.expires_in_days ? parseInt(form.expires_in_days) : null,
      created_by: currentUser?.id,
    })

    setSubmitting(false)

    if (result.error) {
      setError(result.error)
      return
    }

    setGeneratedCode(result.code)
    setForm({ role: '', access_level: 'visualizador', description: '', expires_in_days: '' })
    await loadCodes()
  }

  const handleDelete = async (id) => {
    if (!confirm('Excluir este código?')) return
    await codesService.remove(id)
    await loadCodes()
  }

  const copyCode = async (code) => {
    const link = `${window.location.origin}/login`
    const text = `Você foi convidado para a equipe!\n\n1. Acesse: ${link}\n2. Entre com Google\n3. Use o código: ${code}`
    await navigator.clipboard.writeText(text)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const copyJustCode = async (code) => {
    await navigator.clipboard.writeText(code)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(null), 2500)
  }

  const getCodeStatus = (code) => {
    if (code.used_by) return { label: 'Usado', color: 'bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400' }
    if (code.expires_at && new Date(code.expires_at) < new Date()) {
      return { label: 'Expirado', color: 'bg-red-100 text-red-700 dark:bg-red-900/20 dark:text-red-400' }
    }
    return { label: 'Ativo', color: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400' }
  }

  if (!isAdmin) {
    return (
      <Layout title="Códigos de Convite">
        <Card>
          <div className="text-center py-12">
            <AlertCircle size={48} className="text-gray-300 mx-auto mb-3" />
            <p className={cn('font-medium', darkMode ? 'text-white' : 'text-gray-900')}>Acesso restrito</p>
            <p className="text-sm text-gray-500 mt-1">Apenas administradores podem gerenciar códigos de convite.</p>
          </div>
        </Card>
      </Layout>
    )
  }

  const fieldClass = cn(
    'w-full px-3 py-2.5 rounded-lg border text-sm outline-none focus:ring-2',
    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  )

  return (
    <Layout title="Códigos de Convite">
      <div className="max-w-5xl mx-auto space-y-5">
        {/* Header info */}
        <Card>
          <div className="flex items-start gap-4">
            <div className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0" style={{ backgroundColor: primaryColor + '15', color: primaryColor }}>
              <Key size={24} />
            </div>
            <div className="flex-1">
              <h2 className={cn('font-bold mb-1', darkMode ? 'text-white' : 'text-gray-900')}>
                Como funciona
              </h2>
              <p className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                Gere um código único para cada pessoa da equipe. Envie pelo WhatsApp. A pessoa entra com Google e usa o código para se juntar à campanha.
                Cada código é <strong>de uso único</strong> e expira após ser usado.
              </p>
            </div>
            <Button onClick={() => { setShowForm(true); setGeneratedCode(null); }}>
              <Plus size={18} /> Gerar código
            </Button>
          </div>
        </Card>

        {/* Form */}
        {showForm && (
          <Card>
            <div className="flex items-center justify-between mb-4">
              <h3 className={cn('font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>Novo código de convite</h3>
              <button onClick={() => { setShowForm(false); setGeneratedCode(null); }} className="text-gray-400 hover:text-gray-600">
                <X size={20} />
              </button>
            </div>

            {generatedCode ? (
              <div className="space-y-4">
                <div className="bg-green-50 dark:bg-green-900/20 border-2 border-green-200 dark:border-green-800 rounded-xl p-6 text-center">
                  <CheckCircle size={32} className="text-green-500 mx-auto mb-2" />
                  <p className="text-sm text-green-700 dark:text-green-400 mb-3">Código gerado com sucesso</p>
                  <p className="text-3xl font-bold font-mono tracking-widest text-green-800 dark:text-green-300">
                    {generatedCode.code}
                  </p>
                  {generatedCode.role && <p className="text-sm text-green-700 dark:text-green-400 mt-2">{generatedCode.role}</p>}
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <Button onClick={() => copyJustCode(generatedCode.code)} variant="secondary">
                    <Copy size={16} /> {copiedCode === generatedCode.code ? 'Copiado!' : 'Copiar código'}
                  </Button>
                  <Button onClick={() => copyCode(generatedCode.code)}>
                    <Copy size={16} /> Copiar mensagem completa
                  </Button>
                </div>

                <div className={cn('text-xs p-3 rounded-lg', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-50 text-gray-600')}>
                  <p className="font-medium mb-1">📲 Mensagem pronta para enviar:</p>
                  <pre className="font-sans whitespace-pre-wrap text-xs">{`Você foi convidado para a equipe!

1. Acesse: ${window.location.origin}/login
2. Entre com Google
3. Use o código: ${generatedCode.code}`}</pre>
                </div>

                <Button onClick={() => { setGeneratedCode(null); setShowForm(false); }} variant="secondary" className="w-full">
                  Fechar
                </Button>
              </div>
            ) : (
              <form onSubmit={handleGenerate} className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className={cn('block text-sm font-medium mb-1.5', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      Função / Cargo
                    </label>
                    <input type="text" value={form.role} onChange={e => setForm({ ...form, role: e.target.value })}
                      list="roles" placeholder="Ex: Coordenador" className={fieldClass} />
                    <datalist id="roles">
                      {ROLE_SUGGESTIONS.map(r => <option key={r} value={r} />)}
                    </datalist>
                  </div>
                  <div>
                    <label className={cn('block text-sm font-medium mb-1.5', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                      Nível de acesso *
                    </label>
                    <select value={form.access_level} onChange={e => setForm({ ...form, access_level: e.target.value })}
                      className={fieldClass} required>
                      {ACCESS_LEVELS.map(l => <option key={l.value} value={l.value}>{l.label}</option>)}
                    </select>
                  </div>
                </div>

                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    Descrição (opcional)
                  </label>
                  <input type="text" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })}
                    placeholder="Ex: Para o João da equipe de campo" className={fieldClass} />
                </div>

                <div>
                  <label className={cn('block text-sm font-medium mb-1.5', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                    Validade em dias (opcional)
                  </label>
                  <input type="number" value={form.expires_in_days} onChange={e => setForm({ ...form, expires_in_days: e.target.value })}
                    placeholder="Deixe vazio para nunca expirar" min="1" max="365" className={fieldClass} />
                  <p className="text-xs text-gray-400 mt-1">Se não preencher, o código fica ativo até alguém usar</p>
                </div>

                {error && (
                  <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>
                )}

                <div className="flex gap-2">
                  <Button type="submit" disabled={submitting}>
                    {submitting ? <Loader2 size={16} className="animate-spin" /> : <Key size={16} />}
                    Gerar código
                  </Button>
                  <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
                </div>
              </form>
            )}
          </Card>
        )}

        {/* List */}
        <Card>
          <h3 className={cn('font-semibold mb-4', darkMode ? 'text-white' : 'text-gray-900')}>
            Códigos ({codes.length})
          </h3>

          {loading ? (
            <div className="text-center py-8">
              <Loader2 size={28} className="animate-spin text-gray-400 mx-auto" />
            </div>
          ) : codes.length === 0 ? (
            <div className="text-center py-12">
              <Key size={36} className="text-gray-300 mx-auto mb-2" />
              <p className="text-sm text-gray-500">Nenhum código gerado ainda</p>
            </div>
          ) : (
            <div className="space-y-2">
              {codes.map(c => {
                const status = getCodeStatus(c)
                const accessLabel = ACCESS_LEVELS.find(l => l.value === c.access_level)?.label || c.access_level
                return (
                  <div key={c.id} className={cn(
                    'flex items-center gap-3 p-3 rounded-lg border',
                    darkMode ? 'border-gray-700' : 'border-gray-100'
                  )}>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <p className={cn('font-mono font-bold text-sm tracking-wider', darkMode ? 'text-white' : 'text-gray-900')}>
                          {c.code}
                        </p>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase', status.color)}>
                          {status.label}
                        </span>
                        <span className={cn('text-[10px] px-2 py-0.5 rounded-full font-medium', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}>
                          {accessLabel}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 mt-1 text-xs text-gray-400 flex-wrap">
                        {c.role && <span>{c.role}</span>}
                        {c.description && <span>• {c.description}</span>}
                        {c.expires_at && (
                          <span className="flex items-center gap-1">
                            <Clock size={11} /> exp. {formatDate(c.expires_at)}
                          </span>
                        )}
                        {c.used_at && (
                          <span>• usado em {formatDate(c.used_at)} {formatTime(c.used_at)}</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-1 flex-shrink-0">
                      {!c.used_by && (
                        <button
                          onClick={() => copyCode(c.code)}
                          className={cn('p-2 rounded-lg transition-colors', darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-500')}
                          title="Copiar mensagem para enviar"
                        >
                          {copiedCode === c.code ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(c.id)}
                        className="p-2 rounded-lg transition-colors text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Excluir código"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>
      </div>
    </Layout>
  )
}
