import { useState } from 'react'
import { format } from 'date-fns'
import { X, Plus } from 'lucide-react'
import { Button, Input, Textarea, Select } from '@/components/ui'
import { DEMAND_TYPES, DEMAND_STATUS, PRIORITY_LEVELS, SUGGESTED_TAGS } from '@/lib/constants'
import useStore from '@/store/useStore'
import { cn, extractTags } from '@/lib/utils'

const defaultForm = {
  person_name: '', phone: '', city: '', neighborhood: '',
  type: '', description: '', responsible_id: '', status: 'nova',
  priority: 'media', expected_return_date: '',
  observations: '', next_step: '', result: '',
  appointment_id: '', tags: [],
}

export default function DemandForm({ initial, onSubmit, onCancel }) {
  const { team, appointments, currentUser, darkMode } = useStore()
  const [form, setForm] = useState(initial
    ? { ...defaultForm, ...initial, tags: initial.tags || [] }
    : { ...defaultForm, responsible_id: currentUser?.id || '' }
  )
  const [tagInput, setTagInput] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const validate = () => {
    const e = {}
    if (!form.person_name.trim()) e.person_name = 'Nome obrigatório'
    setErrors(e)
    return Object.keys(e).length === 0
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!validate()) return
    setLoading(true)
    await new Promise(r => setTimeout(r, 300))
    onSubmit(form)
    setLoading(false)
  }

  const addTag = (tag) => {
    const normalized = tag.startsWith('#') ? tag.toLowerCase() : `#${tag.toLowerCase()}`
    if (!form.tags.includes(normalized)) {
      set('tags', [...form.tags, normalized])
    }
    setTagInput('')
  }

  const removeTag = (t) => set('tags', form.tags.filter(x => x !== t))

  const handleTagInput = (e) => {
    const val = e.target.value
    if (val.endsWith(' ') && val.trim()) {
      addTag(val.trim())
    } else {
      setTagInput(val)
    }
  }

  const fieldClass = cn(
    'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors',
    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Person + Phone */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Nome / Liderança / Comunidade *"
          value={form.person_name}
          onChange={e => set('person_name', e.target.value)}
          placeholder="Ex: Dona Rosa, Associação do Bairro..."
          error={errors.person_name}
        />
        <Input
          label="Telefone"
          value={form.phone}
          onChange={e => set('phone', e.target.value)}
          placeholder="(92) 9 9999-9999"
          type="tel"
        />
      </div>

      {/* City + Neighborhood */}
      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Cidade"
          value={form.city}
          onChange={e => set('city', e.target.value)}
          placeholder="Manaus"
        />
        <Input
          label="Bairro / Comunidade"
          value={form.neighborhood}
          onChange={e => set('neighborhood', e.target.value)}
          placeholder="Compensa"
        />
      </div>

      {/* Type + Priority + Status */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Select
          label="Tipo de demanda"
          value={form.type}
          onChange={e => set('type', e.target.value)}
          options={DEMAND_TYPES}
          placeholder="Selecione..."
        />
        <Select
          label="Prioridade"
          value={form.priority}
          onChange={e => set('priority', e.target.value)}
          options={PRIORITY_LEVELS}
        />
        <Select
          label="Status"
          value={form.status}
          onChange={e => set('status', e.target.value)}
          options={DEMAND_STATUS}
        />
      </div>

      {/* Description */}
      <Textarea
        label="Descrição da demanda"
        value={form.description}
        onChange={e => set('description', e.target.value)}
        placeholder="Descreva detalhadamente a situação e o que está sendo solicitado..."
        rows={4}
      />

      {/* Responsible + Return Date */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Select
          label="Responsável pelo acompanhamento"
          value={form.responsible_id}
          onChange={e => set('responsible_id', e.target.value)}
          options={team.map(m => ({ value: m.id, label: m.name }))}
          placeholder="Selecione..."
        />
        <div>
          <label className={cn('block text-sm font-medium mb-1', darkMode ? 'text-gray-300' : 'text-gray-700')}>
            Data prevista para retorno
          </label>
          <input
            type="date"
            value={form.expected_return_date}
            onChange={e => set('expected_return_date', e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      {/* Link to appointment */}
      <Select
        label="Vincular a uma agenda"
        value={form.appointment_id}
        onChange={e => set('appointment_id', e.target.value)}
        options={appointments.map(a => ({
          value: a.id,
          label: `${a.date} - ${a.title.slice(0, 50)}`
        }))}
        placeholder="Selecione uma agenda (opcional)..."
      />

      {/* Tags */}
      <div>
        <label className={cn('block text-sm font-medium mb-1', darkMode ? 'text-gray-300' : 'text-gray-700')}>
          Tags
        </label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={tagInput}
            onChange={handleTagInput}
            onKeyDown={e => {
              if (e.key === 'Enter') { e.preventDefault(); tagInput.trim() && addTag(tagInput.trim()) }
            }}
            placeholder="#saúde, #urgente... (pressione Enter)"
            className={cn(fieldClass, 'flex-1')}
          />
        </div>
        {/* Suggested tags */}
        <div className="flex flex-wrap gap-1.5 mb-2">
          {SUGGESTED_TAGS.filter(t => !form.tags.includes(t)).slice(0, 8).map(t => (
            <button
              key={t}
              type="button"
              onClick={() => addTag(t)}
              className="px-2 py-0.5 rounded-full text-xs border border-dashed border-gray-300 text-gray-500 hover:border-blue-400 hover:text-blue-600 transition-colors"
            >
              {t}
            </button>
          ))}
        </div>
        {form.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.tags.map(t => (
              <span
                key={t}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
              >
                {t}
                <button type="button" onClick={() => removeTag(t)} className="hover:text-blue-900">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Observations + Next Step */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Textarea
          label="Observações"
          value={form.observations}
          onChange={e => set('observations', e.target.value)}
          placeholder="Informações adicionais..."
          rows={3}
        />
        <Textarea
          label="Próximo passo"
          value={form.next_step}
          onChange={e => set('next_step', e.target.value)}
          placeholder="O que precisa ser feito..."
          rows={3}
        />
      </div>

      {/* Result (only for edit) */}
      {initial && (
        <Textarea
          label="Resultado do atendimento"
          value={form.result}
          onChange={e => set('result', e.target.value)}
          placeholder="Como foi resolvido, encaminhamentos feitos..."
          rows={3}
        />
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>Cancelar</Button>
        <Button type="submit" loading={loading}>
          {initial ? 'Salvar alterações' : 'Cadastrar demanda'}
        </Button>
      </div>
    </form>
  )
}
