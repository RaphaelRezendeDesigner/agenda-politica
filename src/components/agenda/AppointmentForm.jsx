import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import { X, Plus, MapPin } from 'lucide-react'
import { Button, Input, Textarea, Select } from '@/components/ui'
import { APPOINTMENT_TYPES, APPOINTMENT_STATUS, PRIORITY_LEVELS } from '@/lib/constants'
import useStore from '@/store/useStore'
import { cn } from '@/lib/utils'

const defaultForm = {
  title: '', date: format(new Date(), 'yyyy-MM-dd'), start_time: '',
  end_time: '', location: '', address: '', city: '', neighborhood: '',
  responsible_id: '', type: '', priority: 'media', status: 'pendente',
  observations: '', map_link: '', involved_people: [], result: '',
  next_step: '',
}

export default function AppointmentForm({ initial, onSubmit, onCancel }) {
  const { team, currentUser, darkMode } = useStore()
  const [form, setForm] = useState(initial ? { ...defaultForm, ...initial, involved_people: initial.involved_people || [] } : { ...defaultForm, responsible_id: currentUser?.id || '' })
  const [personInput, setPersonInput] = useState('')
  const [errors, setErrors] = useState({})
  const [loading, setLoading] = useState(false)

  const set = (field, val) => setForm(f => ({ ...f, [field]: val }))

  const validate = () => {
    const e = {}
    if (!form.title.trim()) e.title = 'Título obrigatório'
    if (!form.date) e.date = 'Data obrigatória'
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

  const addPerson = () => {
    if (personInput.trim() && !form.involved_people.includes(personInput.trim())) {
      set('involved_people', [...form.involved_people, personInput.trim()])
      setPersonInput('')
    }
  }

  const removePerson = (p) => set('involved_people', form.involved_people.filter(x => x !== p))

  const labelClass = cn('block text-sm font-medium mb-1', darkMode ? 'text-gray-300' : 'text-gray-700')
  const fieldClass = cn(
    'w-full px-3 py-2.5 rounded-lg border text-sm outline-none transition-colors',
    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  )

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title + Type */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="sm:col-span-2">
          <Input
            label="Título do compromisso *"
            value={form.title}
            onChange={e => set('title', e.target.value)}
            placeholder="Ex: Reunião com lideranças"
            error={errors.title}
          />
        </div>
        <Select
          label="Tipo de agenda"
          value={form.type}
          onChange={e => set('type', e.target.value)}
          options={APPOINTMENT_TYPES}
          placeholder="Selecione..."
        />
      </div>

      {/* Date + Times */}
      <div className="grid grid-cols-3 gap-4">
        <div>
          <label className={labelClass}>Data *</label>
          <input
            type="date"
            value={form.date}
            onChange={e => set('date', e.target.value)}
            className={cn(fieldClass, errors.date ? 'border-red-500' : '')}
          />
          {errors.date && <p className="text-xs text-red-500 mt-1">{errors.date}</p>}
        </div>
        <div>
          <label className={labelClass}>Início</label>
          <input
            type="time"
            value={form.start_time}
            onChange={e => set('start_time', e.target.value)}
            className={fieldClass}
          />
        </div>
        <div>
          <label className={labelClass}>Término</label>
          <input
            type="time"
            value={form.end_time}
            onChange={e => set('end_time', e.target.value)}
            className={fieldClass}
          />
        </div>
      </div>

      {/* Location */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <Input
          label="Local / Estabelecimento"
          value={form.location}
          onChange={e => set('location', e.target.value)}
          placeholder="Ex: Centro Comunitário"
        />
        <Input
          label="Endereço"
          value={form.address}
          onChange={e => set('address', e.target.value)}
          placeholder="Rua, número"
        />
      </div>

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

      <Input
        label="Link do mapa (Google Maps)"
        value={form.map_link}
        onChange={e => set('map_link', e.target.value)}
        placeholder="https://maps.google.com/..."
      />

      {/* Priority + Status + Responsible */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
          options={APPOINTMENT_STATUS}
        />
        <Select
          label="Responsável"
          value={form.responsible_id}
          onChange={e => set('responsible_id', e.target.value)}
          options={team.map(m => ({ value: m.id, label: m.name }))}
          placeholder="Selecione..."
        />
      </div>

      {/* Involved People */}
      <div>
        <label className={labelClass}>Pessoas envolvidas</label>
        <div className="flex gap-2 mb-2">
          <input
            type="text"
            value={personInput}
            onChange={e => setPersonInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && (e.preventDefault(), addPerson())}
            placeholder="Nome da pessoa..."
            className={cn(fieldClass, 'flex-1')}
          />
          <Button type="button" variant="secondary" size="md" onClick={addPerson}>
            <Plus size={16} />
          </Button>
        </div>
        {form.involved_people.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {form.involved_people.map(p => (
              <span
                key={p}
                className={cn('flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-medium', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')}
              >
                {p}
                <button type="button" onClick={() => removePerson(p)} className="hover:text-red-500">
                  <X size={10} />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Observations */}
      <Textarea
        label="Observações"
        value={form.observations}
        onChange={e => set('observations', e.target.value)}
        placeholder="Informações importantes, material a levar, contexto..."
        rows={3}
      />

      {/* Result + Next Step (only for edit) */}
      {initial && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <Textarea
            label="Resultado da agenda"
            value={form.result}
            onChange={e => set('result', e.target.value)}
            placeholder="O que aconteceu, acordos, decisões..."
            rows={3}
          />
          <Textarea
            label="Próximo passo"
            value={form.next_step}
            onChange={e => set('next_step', e.target.value)}
            placeholder="O que fazer após este compromisso..."
            rows={3}
          />
        </div>
      )}

      {/* Actions */}
      <div className="flex gap-3 justify-end pt-2 border-t border-gray-100 dark:border-gray-700">
        <Button type="button" variant="secondary" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading}>
          {initial ? 'Salvar alterações' : 'Criar compromisso'}
        </Button>
      </div>
    </form>
  )
}
