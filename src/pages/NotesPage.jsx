import { useState, useMemo } from 'react'
import { format } from 'date-fns'
import { BookOpen, Plus, Edit2, Trash2, Search, Filter } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button, Badge, Card, Modal, Input, Select, Textarea, EmptyState, ConfirmDialog } from '@/components/ui'
import useStore from '@/store/useStore'
import { NOTE_TYPES } from '@/lib/constants'
import { cn, formatDate } from '@/lib/utils'

const defaultNote = {
  title: '',
  content: '',
  date: format(new Date(), 'yyyy-MM-dd'),
  type: 'relato',
}

const TYPE_COLORS = {
  relato: { color: '#3b82f6', bg: '#dbeafe' },
  atencao: { color: '#f59e0b', bg: '#fef3c7' },
  problema: { color: '#ef4444', bg: '#fee2e2' },
  pessoa: { color: '#8b5cf6', bg: '#ede9fe' },
  encaminhamento: { color: '#10b981', bg: '#d1fae5' },
  interno: { color: '#6b7280', bg: '#f3f4f6' },
}

export default function NotesPage() {
  const { notes, addNote, updateNote, deleteNote, settings, currentUser, darkMode } = useStore()
  const [showForm, setShowForm] = useState(false)
  const [editTarget, setEditTarget] = useState(null)
  const [deleteTarget, setDeleteTarget] = useState(null)
  const [form, setForm] = useState(defaultNote)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('')

  const canEdit = ['admin', 'coordenador'].includes(currentUser?.access_level)
  const primaryColor = settings?.primary_color || '#1a3a6b'

  const filtered = useMemo(() => {
    let res = [...notes]
    if (typeFilter) res = res.filter(n => n.type === typeFilter)
    if (search) res = res.filter(n =>
      n.title?.toLowerCase().includes(search.toLowerCase()) ||
      n.content?.toLowerCase().includes(search.toLowerCase())
    )
    return res.sort((a, b) => b.created_at?.localeCompare(a.created_at || ''))
  }, [notes, typeFilter, search])

  const setField = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.content.trim()) return
    try {
      if (editTarget) {
        await updateNote(editTarget.id, form)
      } else {
        await addNote(form)
      }
      setShowForm(false)
      setEditTarget(null)
      setForm(defaultNote)
    } catch (err) {
      alert('Erro ao salvar observação: ' + (err?.message || 'erro desconhecido'))
      console.error('saveNote error:', err)
    }
  }

  const startEdit = (note) => {
    setEditTarget(note)
    setForm({ title: note.title || '', content: note.content, date: note.date, type: note.type })
    setShowForm(true)
  }

  const fieldClass = cn(
    'w-full px-3 py-2.5 rounded-lg border text-sm outline-none',
    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
  )

  return (
    <Layout title="Observações">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar observações..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className={cn(
                'w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none',
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200'
              )}
            />
          </div>
          <div className="flex gap-2">
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className={cn(
                'px-3 py-2 rounded-xl border text-sm outline-none',
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-700'
              )}
            >
              <option value="">Todos os tipos</option>
              {NOTE_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
            </select>
            {canEdit && (
              <Button onClick={() => { setEditTarget(null); setForm(defaultNote); setShowForm(true) }}>
                <Plus size={16} /> Nova observação
              </Button>
            )}
          </div>
        </div>

        {/* Notes */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={BookOpen}
            title="Nenhuma observação encontrada"
            description="Registre relatos, pontos de atenção e encaminhamentos importantes"
            action={canEdit && (
              <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova observação</Button>
            )}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {filtered.map(note => {
              const typeCfg = NOTE_TYPES.find(t => t.value === note.type)
              const colorCfg = TYPE_COLORS[note.type] || TYPE_COLORS.interno
              return (
                <Card key={note.id} className={cn('relative group')}>
                  <div
                    className="absolute top-0 left-0 w-1 h-full rounded-l-xl"
                    style={{ backgroundColor: colorCfg.color }}
                  />
                  <div className="pl-3">
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <div>
                        <Badge color={colorCfg.color} bg={colorCfg.bg}>
                          {typeCfg?.label || note.type}
                        </Badge>
                        {note.title && (
                          <h3 className={cn('font-semibold mt-1.5', darkMode ? 'text-white' : 'text-gray-900')}>
                            {note.title}
                          </h3>
                        )}
                      </div>
                      {canEdit && (
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => startEdit(note)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-blue-500 hover:bg-blue-50 transition-colors"
                          >
                            <Edit2 size={13} />
                          </button>
                          <button
                            onClick={() => setDeleteTarget(note)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                          >
                            <Trash2 size={13} />
                          </button>
                        </div>
                      )}
                    </div>
                    <p className={cn('text-sm whitespace-pre-wrap', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                      {note.content}
                    </p>
                    <p className="text-xs text-gray-400 mt-3">
                      {formatDate(note.date)}
                    </p>
                  </div>
                </Card>
              )
            })}
          </div>
        )}
      </div>

      {/* Form Modal */}
      <Modal
        open={showForm}
        onClose={() => { setShowForm(false); setEditTarget(null) }}
        title={editTarget ? 'Editar observação' : 'Nova observação'}
        size="md"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <Select
              label="Tipo"
              value={form.type}
              onChange={e => setField('type', e.target.value)}
              options={NOTE_TYPES}
            />
            <div>
              <label className={cn('block text-sm font-medium mb-1', darkMode ? 'text-gray-300' : 'text-gray-700')}>Data</label>
              <input
                type="date"
                value={form.date}
                onChange={e => setField('date', e.target.value)}
                className={fieldClass}
              />
            </div>
          </div>
          <Input
            label="Título (opcional)"
            value={form.title}
            onChange={e => setField('title', e.target.value)}
            placeholder="Título curto da observação..."
          />
          <Textarea
            label="Observação *"
            value={form.content}
            onChange={e => setField('content', e.target.value)}
            placeholder="Descreva detalhadamente..."
            rows={5}
          />
          <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
            <Button type="button" variant="secondary" onClick={() => setShowForm(false)}>Cancelar</Button>
            <Button type="submit">{editTarget ? 'Salvar' : 'Registrar'}</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={() => { deleteNote(deleteTarget?.id); setDeleteTarget(null) }}
        title="Excluir observação"
        message="Tem certeza que deseja excluir esta observação?"
        confirmLabel="Excluir"
        danger
      />
    </Layout>
  )
}
