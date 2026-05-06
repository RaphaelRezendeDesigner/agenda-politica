import { useState, useRef } from 'react'
import { Settings, Palette, User, Save, Upload, Download, RefreshCw, Database, Loader2, Check, AlertCircle, Calendar, Copy, ExternalLink } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button, Input, Card } from '@/components/ui'
import useStore from '@/store/useStore'
import { storageService } from '@/lib/services'
import { isSupabaseConfigured } from '@/lib/supabase'
import { cn } from '@/lib/utils'

const PRESET_COLORS = [
  { primary: '#1a3a6b', secondary: '#c9a84c', label: 'Azul Naval' },
  { primary: '#1e3a5f', secondary: '#f97316', label: 'Azul & Laranja' },
  { primary: '#7c3aed', secondary: '#f59e0b', label: 'Roxo & Dourado' },
  { primary: '#065f46', secondary: '#fbbf24', label: 'Verde & Âmbar' },
  { primary: '#991b1b', secondary: '#fbbf24', label: 'Vermelho & Dourado' },
  { primary: '#1e40af', secondary: '#10b981', label: 'Azul & Verde' },
  { primary: '#374151', secondary: '#d1d5db', label: 'Cinza Clássico' },
  { primary: '#0f172a', secondary: '#60a5fa', label: 'Dark & Azul' },
]

export default function SettingsPage() {
  const { settings, updateSettings, currentUser, darkMode, resetToDemo } = useStore()
  const [form, setForm] = useState({ ...settings })
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [logoPreview, setLogoPreview] = useState(settings.logo_url || null)
  const [uploadingLogo, setUploadingLogo] = useState(false)
  const fileRef = useRef()

  const isAdmin = currentUser?.access_level === 'admin'

  const setField = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSave = async () => {
    setError('')
    setSaving(true)
    try {
      // Garantir que candidate_name nunca vai vazio (campo NOT NULL no banco)
      const payload = {
        candidate_name: form.candidate_name?.trim() || 'Candidato',
        slogan: form.slogan || null,
        logo_url: form.logo_url || null,
        primary_color: form.primary_color || '#1a3a6b',
        secondary_color: form.secondary_color || '#c9a84c',
      }
      await updateSettings(payload)
      setSaved(true)
      setTimeout(() => setSaved(false), 2500)
    } catch (e) {
      setError(e.message || 'Erro ao salvar')
    } finally {
      setSaving(false)
    }
  }

  const handleLogoChange = async (e) => {
    const file = e.target.files[0]
    if (!file) return

    if (file.size > 5 * 1024 * 1024) {
      setError('Logo muito grande. Máximo 5MB.')
      return
    }

    // Preview imediato
    const reader = new FileReader()
    reader.onload = (ev) => setLogoPreview(ev.target.result)
    reader.readAsDataURL(file)

    // Upload pro Supabase Storage (se configurado)
    if (isSupabaseConfigured) {
      setUploadingLogo(true)
      setError('')
      const result = await storageService.uploadLogo(file)
      setUploadingLogo(false)
      if (result.error) {
        setError('Erro no upload: ' + result.error)
        return
      }
      setField('logo_url', result.url)
      setLogoPreview(result.url)
    } else {
      // Fallback offline: salva como base64
      const r2 = new FileReader()
      r2.onload = (ev) => setField('logo_url', ev.target.result)
      r2.readAsDataURL(file)
    }
  }

  const handleExport = () => {
    const store = useStore.getState()
    const data = {
      settings: store.settings,
      team: store.team,
      appointments: store.appointments,
      demands: store.demands,
      notes: store.notes,
      exported_at: new Date().toISOString(),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `agenda-politica-backup-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
  }

  const handleImport = (e) => {
    const file = e.target.files[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target.result)
        const store = useStore.getState()
        if (data.settings) store.updateSettings(data.settings)
        alert('Dados importados com sucesso!')
      } catch {
        alert('Arquivo inválido')
      }
    }
    reader.readAsText(file)
  }

  const applyPreset = (preset) => {
    setField('primary_color', preset.primary)
    setField('secondary_color', preset.secondary)
  }

  const fieldClass = cn(
    'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors',
    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  )

  return (
    <Layout title="Configurações">
      <div className="max-w-3xl mx-auto space-y-6">
        {!isAdmin && (
          <div className={cn('px-4 py-3 rounded-xl text-sm', darkMode ? 'bg-yellow-900/30 text-yellow-400' : 'bg-yellow-50 text-yellow-700 border border-yellow-200')}>
            Apenas administradores podem editar as configurações.
          </div>
        )}

        {/* Campaign Info */}
        <Card>
          <h2 className={cn('text-lg font-bold mb-5 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
            <User size={20} />
            Dados da Campanha
          </h2>
          <div className="space-y-4">
            <Input
              label="Nome do candidato"
              value={form.candidate_name}
              onChange={e => setField('candidate_name', e.target.value)}
              placeholder="Nome completo do candidato"
              disabled={!isAdmin}
            />
            <Input
              label="Slogan da campanha"
              value={form.slogan || ''}
              onChange={e => setField('slogan', e.target.value)}
              placeholder="Ex: Por um futuro melhor para todos"
              disabled={!isAdmin}
            />
          </div>
        </Card>

        {/* Logo */}
        <Card>
          <h2 className={cn('text-lg font-bold mb-5 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
            <Upload size={20} />
            Logo / Marca
          </h2>
          <div className="flex items-start gap-5">
            <div
              className={cn('w-24 h-24 rounded-xl border-2 border-dashed flex items-center justify-center overflow-hidden', darkMode ? 'border-gray-600' : 'border-gray-300')}
            >
              {logoPreview ? (
                <img src={logoPreview} alt="Logo" className="w-full h-full object-cover" />
              ) : (
                <Upload size={28} className="text-gray-300" />
              )}
            </div>
            <div className="space-y-2">
              <p className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                Faça upload da logo ou foto do candidato
              </p>
              <p className="text-xs text-gray-400">PNG, JPG, SVG — até 5MB</p>
              <div className="flex gap-2">
                <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={handleLogoChange} />
                <Button
                  size="sm"
                  variant="secondary"
                  onClick={() => fileRef.current?.click()}
                  disabled={!isAdmin || uploadingLogo}
                >
                  {uploadingLogo ? <Loader2 size={14} className="animate-spin" /> : <Upload size={14} />}
                  {uploadingLogo ? 'Enviando...' : 'Escolher logo'}
                </Button>
                {logoPreview && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => { setLogoPreview(null); setField('logo_url', null) }}
                    disabled={!isAdmin}
                  >
                    Remover
                  </Button>
                )}
              </div>
            </div>
          </div>
        </Card>

        {/* Colors */}
        <Card>
          <h2 className={cn('text-lg font-bold mb-5 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
            <Palette size={20} />
            Cores do Sistema
          </h2>

          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className={cn('block text-sm font-medium mb-2', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                Cor principal
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.primary_color}
                  onChange={e => setField('primary_color', e.target.value)}
                  disabled={!isAdmin}
                  className="w-12 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                />
                <input
                  type="text"
                  value={form.primary_color}
                  onChange={e => setField('primary_color', e.target.value)}
                  disabled={!isAdmin}
                  className={cn(fieldClass, 'font-mono')}
                />
              </div>
            </div>
            <div>
              <label className={cn('block text-sm font-medium mb-2', darkMode ? 'text-gray-300' : 'text-gray-700')}>
                Cor secundária
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={form.secondary_color}
                  onChange={e => setField('secondary_color', e.target.value)}
                  disabled={!isAdmin}
                  className="w-12 h-10 rounded-lg cursor-pointer border-0 p-0.5"
                />
                <input
                  type="text"
                  value={form.secondary_color}
                  onChange={e => setField('secondary_color', e.target.value)}
                  disabled={!isAdmin}
                  className={cn(fieldClass, 'font-mono')}
                />
              </div>
            </div>
          </div>

          {/* Presets */}
          <div>
            <p className={cn('text-sm font-medium mb-2', darkMode ? 'text-gray-300' : 'text-gray-700')}>
              Temas predefinidos
            </p>
            <div className="grid grid-cols-4 gap-2">
              {PRESET_COLORS.map(preset => (
                <button
                  key={preset.label}
                  onClick={() => isAdmin && applyPreset(preset)}
                  className={cn(
                    'flex items-center gap-2 p-2 rounded-lg border transition-all text-left',
                    darkMode ? 'border-gray-700 hover:border-gray-500' : 'border-gray-200 hover:border-gray-400',
                    !isAdmin && 'opacity-50 cursor-default'
                  )}
                >
                  <div className="flex flex-col gap-0.5">
                    <div className="w-6 h-3 rounded-sm" style={{ backgroundColor: preset.primary }} />
                    <div className="w-6 h-1.5 rounded-sm" style={{ backgroundColor: preset.secondary }} />
                  </div>
                  <span className="text-xs text-gray-400 truncate">{preset.label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Preview */}
          <div
            className="mt-5 p-4 rounded-xl text-white"
            style={{ background: `linear-gradient(135deg, ${form.primary_color}, ${form.primary_color}cc)` }}
          >
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-lg" style={{ backgroundColor: form.secondary_color, color: form.primary_color }}>
                {form.candidate_name?.charAt(0) || 'A'}
              </div>
              <div>
                <p className="font-bold">{form.candidate_name || 'Nome do Candidato'}</p>
                <p className="text-sm text-white/70">{form.slogan || 'Slogan da campanha'}</p>
              </div>
            </div>
          </div>
        </Card>

        {/* Data management */}
        <Card>
          <h2 className={cn('text-lg font-bold mb-5 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
            <Database size={20} />
            Dados e Backup
          </h2>
          <div className="space-y-3">
            <div className={cn('flex items-center justify-between p-3 rounded-lg', darkMode ? 'bg-gray-700' : 'bg-gray-50')}>
              <div>
                <p className={cn('text-sm font-medium', darkMode ? 'text-white' : 'text-gray-700')}>Exportar dados</p>
                <p className="text-xs text-gray-400">Baixar backup completo em JSON</p>
              </div>
              <Button size="sm" variant="secondary" onClick={handleExport}>
                <Download size={14} /> Exportar
              </Button>
            </div>
            {isAdmin && (
              <>
                <div className={cn('flex items-center justify-between p-3 rounded-lg', darkMode ? 'bg-gray-700' : 'bg-gray-50')}>
                  <div>
                    <p className={cn('text-sm font-medium', darkMode ? 'text-white' : 'text-gray-700')}>Importar dados</p>
                    <p className="text-xs text-gray-400">Restaurar backup em JSON</p>
                  </div>
                  <div>
                    <input type="file" accept=".json" className="hidden" id="import-file" onChange={handleImport} />
                    <label htmlFor="import-file">
                      <Button size="sm" variant="secondary" as="span">
                        <Upload size={14} /> Importar
                      </Button>
                    </label>
                  </div>
                </div>
                <div className={cn('flex items-center justify-between p-3 rounded-lg border', darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200')}>
                  <div>
                    <p className="text-sm font-medium text-yellow-700 dark:text-yellow-400">Restaurar dados demo</p>
                    <p className="text-xs text-yellow-600 dark:text-yellow-500">Recarregar dados de exemplo</p>
                  </div>
                  <Button size="sm" variant="secondary" onClick={() => { resetToDemo(); window.location.reload() }}>
                    <RefreshCw size={14} /> Restaurar
                  </Button>
                </div>
              </>
            )}
          </div>
        </Card>

        {/* Google Calendar Sync */}
        <CalendarSyncCard currentUser={currentUser} darkMode={darkMode} />

        {/* Supabase info */}
        <Card>
          <h2 className={cn('text-lg font-bold mb-3 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
            <Settings size={20} />
            Banco de Dados Online (Supabase)
          </h2>
          <div className={cn('p-4 rounded-xl text-sm space-y-2', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-800')}>
            <p className="font-semibold">Como ativar sincronização em tempo real:</p>
            <ol className="list-decimal list-inside space-y-1 text-xs">
              <li>Crie um projeto em <strong>supabase.com</strong></li>
              <li>Execute o schema SQL no SQL Editor do Supabase</li>
              <li>Crie o arquivo <code className="bg-black/10 px-1 rounded">.env</code> com suas credenciais</li>
              <li>Reinicie a aplicação</li>
            </ol>
            <p className="text-xs mt-2 opacity-70">
              Sem o Supabase, os dados ficam salvos no navegador (localStorage).
            </p>
          </div>
        </Card>

        {/* Erro */}
        {error && (
          <div className="flex items-center gap-2 px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-400 text-sm">
            <AlertCircle size={16} className="flex-shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* Save */}
        {isAdmin && (
          <div className="flex justify-end sticky bottom-4">
            <Button
              onClick={handleSave}
              loading={saving}
              className={cn(saved && 'bg-green-500 hover:bg-green-600', 'shadow-lg')}
            >
              {saved ? <Check size={16} /> : <Save size={16} />}
              {saved ? 'Salvo com sucesso!' : 'Salvar configurações'}
            </Button>
          </div>
        )}
      </div>
    </Layout>
  )
}

// Componente para sync com Google Calendar via URL assinável
function CalendarSyncCard({ currentUser, darkMode }) {
  const [copied, setCopied] = useState(false)

  const token = currentUser?.calendar_token
  const calendarUrl = token
    ? `${window.location.origin}/api/calendar/${token}.ics`
    : null
  // Google Calendar tem botão "Adicionar por URL" especial
  const googleAddUrl = calendarUrl
    ? `https://calendar.google.com/calendar/u/0/r/settings/addbyurl?cid=${encodeURIComponent(calendarUrl)}`
    : null

  const handleCopy = async () => {
    if (!calendarUrl) return
    try {
      await navigator.clipboard.writeText(calendarUrl)
      setCopied(true)
      setTimeout(() => setCopied(false), 2500)
    } catch (e) { console.error(e) }
  }

  return (
    <Card>
      <h2 className={cn('text-lg font-bold mb-3 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
        <Calendar size={20} />
        Sincronizar com Google Calendar / Agenda do Celular
      </h2>

      {!token ? (
        <div className={cn('p-4 rounded-xl text-sm', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-yellow-50 text-yellow-800')}>
          Sua URL de calendário ainda não foi gerada. Faça logout e login novamente para criar.
        </div>
      ) : (
        <div className="space-y-3">
          <div className={cn('p-3 rounded-xl flex items-center gap-2 text-xs font-mono break-all', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')}>
            <span className="flex-1 select-all">{calendarUrl}</span>
            <button
              onClick={handleCopy}
              className={cn('p-2 rounded-lg flex-shrink-0', darkMode ? 'hover:bg-gray-600' : 'hover:bg-gray-200')}
              title="Copiar URL"
            >
              {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
            </button>
          </div>

          <div className="flex flex-wrap gap-2">
            <a href={googleAddUrl} target="_blank" rel="noopener noreferrer">
              <Button>
                <ExternalLink size={16} />
                Adicionar ao Google Calendar
              </Button>
            </a>
            <Button onClick={handleCopy} variant="secondary">
              <Copy size={16} />
              {copied ? 'Copiado!' : 'Copiar URL'}
            </Button>
          </div>

          <details className={cn('text-sm rounded-xl p-3', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-blue-50 text-blue-900')}>
            <summary className="cursor-pointer font-semibold">
              📱 Como adicionar no celular (iPhone / Android)
            </summary>
            <div className="mt-3 space-y-3 text-xs">
              <div>
                <p className="font-semibold mb-1">📱 iPhone (Calendário Apple):</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Abre o app <strong>Ajustes</strong> → <strong>Calendário</strong> → <strong>Contas</strong></li>
                  <li>Toca em <strong>Adicionar conta</strong> → <strong>Outra</strong></li>
                  <li>Escolhe <strong>Adicionar Calendário Subscrito</strong></li>
                  <li>Cola a URL acima e confirma</li>
                </ol>
              </div>
              <div>
                <p className="font-semibold mb-1">🤖 Android (Google Calendar):</p>
                <ol className="list-decimal list-inside space-y-1 ml-2">
                  <li>Clica no botão verde <strong>"Adicionar ao Google Calendar"</strong> acima (precisa fazer no computador)</li>
                  <li>Aprova a adição no Google Calendar web</li>
                  <li>No celular, abre o Google Calendar — a agenda aparece automaticamente</li>
                </ol>
              </div>
              <div className={cn('p-2 rounded-lg', darkMode ? 'bg-gray-800' : 'bg-yellow-50 text-yellow-800')}>
                ⏱️ <strong>Atenção:</strong> O Google atualiza calendários assinados a cada ~3 horas. Para mudanças instantâneas, abra o app diretamente.
              </div>
            </div>
          </details>
        </div>
      )}
    </Card>
  )
}
