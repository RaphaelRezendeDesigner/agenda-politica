import { useState } from 'react'
import { Users, Plus, Edit2, Trash2, Phone, Mail, Shield, X, Key, Send, Eye, EyeOff, Copy, CheckCircle, AlertCircle } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button, Badge, Card, Modal, ConfirmDialog, Input, Select, EmptyState } from '@/components/ui'
import useStore from '@/store/useStore'
import { isSupabaseConfigured } from '@/lib/supabase'
import { ACCESS_LEVELS } from '@/lib/constants'
import { cn, formatPhone, copyToClipboard } from '@/lib/utils'

const defaultMember = { name: '', email: '', phone: '', role: '', access_level: 'visualizador', password: '' }

export default function TeamPage() {
  const { team, addTeamMember, updateTeamMember, deleteTeamMember, settings, currentUser, darkMode } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(defaultMember)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [createMode, setCreateMode] = useState('password') // 'password' | 'invite'
  const [showPassword, setShowPassword] = useState(false)
  const [successMsg, setSuccessMsg] = useState(null)
  const [credentialsCopy, setCredentialsCopy] = useState('')

  const isAdmin = currentUser?.access_level === 'admin'
  const primaryColor = settings?.primary_color || '#1a3a6b'

  const setField = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const validate = () => {
    const e = {}
    if (!form.name.trim()) e.name = 'Nome obrigatório'
    if (!form.email.trim()) e.email = 'E-mail obrigatório'
    if (!form.access_level) e.access_level = 'Nível de acesso obrigatório'
    if (!editTarget && isSupabaseConfigured && createMode === 'password') {
      if (!form.password || form.password.length < 6) e.password = 'Senha mínima 6 caracteres'
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setSubmitError('')
    if (!validate()) return

    setSubmitting(true)
    try {
      if (editTarget) {
        await updateTeamMember(editTarget.id, form)
        closeForm()
      } else {
        if (team.length >= 20) {
          setSubmitError('Limite de 20 membros atingido')
          setSubmitting(false)
          return
        }
        const payload = { ...form, sendInvite: createMode === 'invite' }
        const result = await addTeamMember(payload)

        if (result.error) {
          // Mensagens mais amigáveis para erros comuns
          let friendlyError = result.error
          if (/rate limit|too many|email rate/i.test(result.error)) {
            const isPasswordMode = createMode === 'password'
            friendlyError = isPasswordMode
              ? '⚠️ Limite de e-mails do Supabase atingido (3/hora). Para resolver: vá no Supabase → Authentication → Providers → Email → DESLIGUE "Confirm email" → Save. Aguarde 1 hora e tente de novo. Assim o cadastro com senha não envia email de confirmação.'
              : '⚠️ Limite de e-mails do Supabase atingido (3/hora no plano grátis). Aguarde 1 hora ou use "Definir senha" em vez de "Enviar convite".'
          } else if (/foreign key|profiles_id_fkey/i.test(result.error)) {
            friendlyError = '⚠️ O trigger SQL não foi configurado corretamente. Vá no Supabase → SQL Editor e rode o SQL do trigger (passo 5 da configuração).'
          } else if (/already registered|already exists|duplicate/i.test(result.error)) {
            friendlyError = 'Este e-mail já está cadastrado no sistema.'
          } else if (/invalid email/i.test(result.error)) {
            friendlyError = 'E-mail inválido. Verifique o formato.'
          } else if (/password.*short|weak password/i.test(result.error)) {
            friendlyError = 'Senha muito fraca. Use no mínimo 6 caracteres.'
          }
          setSubmitError(friendlyError)
          setSubmitting(false)
          return
        }

        // Sucesso: mostrar mensagem com credenciais
        if (result.invitedEmail) {
          setSuccessMsg({
            type: 'invite',
            title: 'Convite enviado!',
            text: `Um link de acesso foi enviado para ${result.invitedEmail}. Peça que verifique a caixa de entrada (e o spam).`,
          })
        } else {
          const credText = `Acesso: ${window.location.origin}\nE-mail: ${form.email}\nSenha: ${form.password}`
          setCredentialsCopy(credText)
          setSuccessMsg({
            type: 'password',
            title: 'Membro cadastrado!',
            text: `${form.name} já pode entrar com a senha definida.`,
            credentials: credText,
          })
        }
      }
    } catch (err) {
      setSubmitError(err.message || 'Erro ao salvar')
    }
    setSubmitting(false)
  }

  const closeForm = () => {
    setShowForm(false)
    setEditTarget(null)
    setForm(defaultMember)
    setErrors({})
    setSubmitError('')
    setShowPassword(false)
    setCreateMode('password')
  }

  const copyCredentials = async () => {
    await copyToClipboard(credentialsCopy)
    setCredentialsCopy('__copied__')
    setTimeout(() => setCredentialsCopy(successMsg?.credentials || ''), 2000)
  }

  const startEdit = (member) => {
    setEditTarget(member)
    setForm({ name: member.name, email: member.email, phone: member.phone || '', role: member.role || '', access_level: member.access_level })
    setShowForm(true)
  }

  const handleDelete = (id) => {
    deleteTeamMember(id)
    setDeleteTarget(null)
  }

  const ACCESS_COLORS = {
    admin: { color: '#7c3aed', bg: '#ede9fe' },
    coordenador: { color: '#2563eb', bg: '#dbeafe' },
    visualizador: { color: '#059669', bg: '#d1fae5' },
  }

  return (
    <Layout title="Equipe">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-gray-400">
              {team.length}/20 membros cadastrados
            </p>
          </div>
          {isAdmin && (
            <Button onClick={() => { setEditTarget(null); setForm(defaultMember); setShowForm(true) }} disabled={team.length >= 20}>
              <Plus size={16} /> Adicionar membro
            </Button>
          )}
        </div>

        {/* Capacity bar */}
        <Card>
          <div className="flex items-center justify-between mb-2">
            <span className={cn('text-sm font-medium', darkMode ? 'text-gray-300' : 'text-gray-700')}>
              Capacidade da equipe
            </span>
            <span className={cn('text-sm font-bold', darkMode ? 'text-white' : 'text-gray-900')}>
              {team.length}/20
            </span>
          </div>
          <div className={cn('h-2.5 rounded-full overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${(team.length / 20) * 100}%`, backgroundColor: primaryColor }}
            />
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2">
            {ACCESS_LEVELS.map(level => {
              const count = team.filter(m => m.access_level === level.value).length
              const cfg = ACCESS_COLORS[level.value]
              return (
                <div key={level.value} className={cn('rounded-lg p-2 text-center', darkMode ? 'bg-gray-700' : 'bg-gray-50')}>
                  <p className="text-lg font-bold" style={{ color: cfg.color }}>{count}</p>
                  <p className="text-xs text-gray-400">{level.label}</p>
                </div>
              )
            })}
          </div>
        </Card>

        {/* Team Members */}
        {team.length === 0 ? (
          <EmptyState
            icon={Users}
            title="Nenhum membro na equipe"
            description="Adicione os membros da equipe para colaborar"
            action={isAdmin && <Button onClick={() => setShowForm(true)}><Plus size={16} /> Adicionar</Button>}
          />
        ) : (
          <div className="space-y-3">
            {ACCESS_LEVELS.map(level => {
              const members = team.filter(m => m.access_level === level.value)
              if (members.length === 0) return null
              const cfg = ACCESS_COLORS[level.value]
              return (
                <div key={level.value}>
                  <div className="flex items-center gap-2 mb-2">
                    <Badge color={cfg.color} bg={cfg.bg}>
                      <Shield size={10} className="mr-1" />
                      {level.label}
                    </Badge>
                    <span className="text-xs text-gray-400">{level.description}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {members.map(member => (
                      <Card key={member.id} className="p-4">
                        <div className="flex items-start gap-3">
                          <div
                            className="w-10 h-10 rounded-full flex items-center justify-center text-white text-base font-bold flex-shrink-0"
                            style={{ backgroundColor: primaryColor }}
                          >
                            {member.name?.charAt(0)}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div>
                                <p className={cn('font-semibold text-sm', darkMode ? 'text-white' : 'text-gray-900')}>
                                  {member.name}
                                </p>
                                {member.role && (
                                  <p className="text-xs text-gray-400 mt-0.5">{member.role}</p>
                                )}
                              </div>
                              {isAdmin && member.id !== currentUser?.id && (
                                <div className="flex gap-1 ml-2">
                                  <button
                                    onClick={() => startEdit(member)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                                  >
                                    <Edit2 size={13} />
                                  </button>
                                  <button
                                    onClick={() => setDeleteTarget(member)}
                                    className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                  >
                                    <Trash2 size={13} />
                                  </button>
                                </div>
                              )}
                            </div>
                            <div className="mt-2 space-y-1">
                              {member.email && (
                                <a href={`mailto:${member.email}`}
                                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-blue-500"
                                >
                                  <Mail size={11} /> {member.email}
                                </a>
                              )}
                              {member.phone && (
                                <a href={`tel:${member.phone}`}
                                  className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-green-500"
                                >
                                  <Phone size={11} /> {formatPhone(member.phone)}
                                </a>
                              )}
                            </div>
                          </div>
                        </div>
                      </Card>
                    ))}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={closeForm}
        title={editTarget ? 'Editar membro' : 'Adicionar membro'}
        size="sm"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Toggle modo criação (só ao criar novo, não ao editar) */}
          {!editTarget && isSupabaseConfigured && (
            <div className={cn('rounded-lg p-1 grid grid-cols-2 gap-1', darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
              <button
                type="button"
                onClick={() => setCreateMode('password')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
                  createMode === 'password'
                    ? darkMode ? 'bg-gray-800 text-white shadow' : 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Key size={14} /> Definir senha
              </button>
              <button
                type="button"
                onClick={() => setCreateMode('invite')}
                className={cn(
                  'flex items-center justify-center gap-2 py-2 px-3 rounded-md text-sm font-medium transition-all',
                  createMode === 'invite'
                    ? darkMode ? 'bg-gray-800 text-white shadow' : 'bg-white text-gray-900 shadow'
                    : 'text-gray-500 hover:text-gray-700'
                )}
              >
                <Send size={14} /> Enviar convite
              </button>
            </div>
          )}

          <Input
            label="Nome completo *"
            value={form.name}
            onChange={e => setField('name', e.target.value)}
            placeholder="Nome da pessoa"
            error={errors.name}
          />
          <Input
            label="E-mail *"
            value={form.email}
            onChange={e => setField('email', e.target.value)}
            placeholder="email@exemplo.com"
            type="email"
            error={errors.email}
            disabled={!!editTarget}
          />

          {/* Senha (só no modo password e ao criar) */}
          {!editTarget && createMode === 'password' && isSupabaseConfigured && (
            <div>
              <label className={cn('block text-sm font-medium mb-1', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                Senha de acesso *
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={e => setField('password', e.target.value)}
                  placeholder="Mínimo 6 caracteres"
                  className={cn(
                    'w-full px-3 py-2.5 pr-10 rounded-lg border text-sm outline-none',
                    errors.password ? 'border-red-500' : darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                  )}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1.5 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {errors.password && <p className="text-xs text-red-500 mt-1">{errors.password}</p>}
              <p className="text-xs text-gray-400 mt-1">
                Você poderá copiar e enviar essa senha para o membro depois.
              </p>
            </div>
          )}

          {/* Aviso modo convite */}
          {!editTarget && createMode === 'invite' && isSupabaseConfigured && (
            <div className={cn('text-xs p-3 rounded-lg flex gap-2', darkMode ? 'bg-blue-900/20 text-blue-300' : 'bg-blue-50 text-blue-700')}>
              <Send size={14} className="flex-shrink-0 mt-0.5" />
              <span>Um link de acesso será enviado para o e-mail. O membro define a própria senha ao clicar.</span>
            </div>
          )}

          <Input
            label="Telefone"
            value={form.phone}
            onChange={e => setField('phone', e.target.value)}
            placeholder="(92) 9 9999-9999"
            type="tel"
          />
          <Input
            label="Função / Cargo"
            value={form.role}
            onChange={e => setField('role', e.target.value)}
            placeholder="Ex: Coordenador de Campanha"
          />
          <Select
            label="Nível de acesso *"
            value={form.access_level}
            onChange={e => setField('access_level', e.target.value)}
            options={ACCESS_LEVELS}
            error={errors.access_level}
          />

          {/* Permission info */}
          {form.access_level && (
            <div className={cn('text-xs p-3 rounded-lg', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-700')}>
              <Shield size={12} className="inline mr-1" />
              {ACCESS_LEVELS.find(l => l.value === form.access_level)?.description}
            </div>
          )}

          {/* Erro */}
          {submitError && (
            <div className="flex items-start gap-2 p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
              <AlertCircle size={14} className="flex-shrink-0 mt-0.5" />
              <span>{submitError}</span>
            </div>
          )}

          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={closeForm}>Cancelar</Button>
            <Button type="submit" loading={submitting}>
              {editTarget ? 'Salvar' : createMode === 'invite' ? 'Enviar convite' : 'Criar acesso'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Modal de sucesso (com credenciais) */}
      <Modal
        open={!!successMsg}
        onClose={() => { setSuccessMsg(null); closeForm() }}
        title={successMsg?.title || ''}
        size="sm"
      >
        <div className="space-y-4">
          <div className="flex items-center gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400">
            <CheckCircle size={20} className="flex-shrink-0" />
            <p className="text-sm">{successMsg?.text}</p>
          </div>

          {successMsg?.credentials && (
            <div>
              <label className={cn('block text-xs font-medium mb-1', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                Credenciais (envie para o membro):
              </label>
              <div className={cn('p-3 rounded-lg font-mono text-xs whitespace-pre-line', darkMode ? 'bg-gray-700 text-gray-200' : 'bg-gray-50 text-gray-800')}>
                {successMsg.credentials}
              </div>
              <Button size="sm" variant="secondary" onClick={copyCredentials} className="mt-2 w-full">
                {credentialsCopy === '__copied__' ? <><CheckCircle size={14} className="text-green-500" /> Copiado!</> : <><Copy size={14} /> Copiar credenciais</>}
              </Button>
            </div>
          )}

          <Button onClick={() => { setSuccessMsg(null); closeForm() }} className="w-full">
            Concluir
          </Button>
        </div>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => handleDelete(deleteTarget?.id)}
        title="Remover membro"
        message={`Tem certeza que deseja remover "${deleteTarget?.name}" da equipe?`}
        confirmLabel="Remover"
        danger
      />
    </Layout>
  )
}
