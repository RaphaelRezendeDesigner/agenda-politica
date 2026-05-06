import { useState, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Search, Filter, X, Phone, MapPin, Tag,
  FileText, AlertTriangle, ChevronDown
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button, Badge, Card, Modal, EmptyState, Select } from '@/components/ui'
import DemandForm from '@/components/demands/DemandForm'
import useStore from '@/store/useStore'
import { DEMAND_TYPES, DEMAND_STATUS, PRIORITY_LEVELS } from '@/lib/constants'
import { cn, formatDate, getStatusConfig, whatsappLink, formatPhone } from '@/lib/utils'

const SORT_OPTIONS = [
  { value: 'created_desc', label: 'Mais recentes' },
  { value: 'created_asc', label: 'Mais antigas' },
  { value: 'priority', label: 'Prioridade' },
  { value: 'return_date', label: 'Data de retorno' },
]

export default function DemandsPage() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { demands, addDemand, team, settings, currentUser, darkMode } = useStore()

  const initialTag = searchParams.get('tag') || ''
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [sort, setSort] = useState('created_desc')
  const [filters, setFilters] = useState({
    status: '', type: '', priority: '', city: '', responsible: '',
    search: '', tag: initialTag,
  })

  const primaryColor = settings?.primary_color || '#1a3a6b'
  const canEdit = ['admin', 'coordenador'].includes(currentUser?.access_level)

  const filtered = useMemo(() => {
    let res = [...demands]
    if (filters.status) res = res.filter(d => d.status === filters.status)
    if (filters.type) res = res.filter(d => d.type === filters.type)
    if (filters.priority) res = res.filter(d => d.priority === filters.priority)
    if (filters.city) res = res.filter(d => d.city?.toLowerCase().includes(filters.city.toLowerCase()))
    if (filters.responsible) res = res.filter(d => d.responsible_id === filters.responsible)
    if (filters.tag) res = res.filter(d => (d.tags || []).some(t => t.toLowerCase().includes(filters.tag.toLowerCase())))
    if (filters.search) res = res.filter(d =>
      d.person_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
      d.phone?.includes(filters.search) ||
      d.description?.toLowerCase().includes(filters.search.toLowerCase()) ||
      d.neighborhood?.toLowerCase().includes(filters.search.toLowerCase()) ||
      (d.tags || []).some(t => t.toLowerCase().includes(filters.search.toLowerCase()))
    )

    // Sort
    if (sort === 'created_desc') res.sort((a, b) => b.created_at?.localeCompare(a.created_at || ''))
    else if (sort === 'created_asc') res.sort((a, b) => a.created_at?.localeCompare(b.created_at || ''))
    else if (sort === 'priority') {
      const order = { alta: 0, media: 1, baixa: 2 }
      res.sort((a, b) => (order[a.priority] || 1) - (order[b.priority] || 1))
    }
    else if (sort === 'return_date') res.sort((a, b) => (a.expected_return_date || '9999').localeCompare(b.expected_return_date || '9999'))

    return res
  }, [demands, filters, sort])

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  // All tags from demands
  const allTags = useMemo(() => {
    const counts = {}
    demands.forEach(d => (d.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1 }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1])
  }, [demands])

  const handleCreate = async (data) => {
    try {
      await addDemand(data)
      setShowForm(false)
    } catch (e) {
      alert('Erro ao salvar demanda: ' + (e?.message || 'erro desconhecido'))
      console.error('addDemand error:', e)
    }
  }

  const DemandCard = ({ demand }) => {
    const statusCfg = getStatusConfig(DEMAND_STATUS, demand.status)
    const priorityCfg = PRIORITY_LEVELS.find(p => p.value === demand.priority)
    const typeCfg = DEMAND_TYPES.find(t => t.value === demand.type)
    const responsible = team.find(m => m.id === demand.responsible_id)

    return (
      <button
        onClick={() => navigate(`/demandas/${demand.id}`)}
        className={cn(
          'w-full text-left rounded-xl border transition-all hover:shadow-md p-4',
          darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
        )}
      >
        <div className="flex items-start gap-3">
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  {demand.priority === 'alta' && <AlertTriangle size={12} className="text-red-500 flex-shrink-0" />}
                  <p className={cn('font-semibold text-sm truncate', darkMode ? 'text-white' : 'text-gray-900')}>
                    {demand.person_name}
                  </p>
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  {typeCfg && (
                    <span className={cn('text-xs', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                      {typeCfg.label}
                    </span>
                  )}
                  {demand.neighborhood && (
                    <span className="flex items-center gap-1 text-xs text-gray-400">
                      <MapPin size={9} />{demand.neighborhood}
                      {demand.city && `, ${demand.city}`}
                    </span>
                  )}
                </div>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <Badge color={statusCfg.color} bg={statusCfg.bg}>{statusCfg.label}</Badge>
                {priorityCfg && (
                  <Badge color={priorityCfg.color} bg={priorityCfg.bg}>
                    {priorityCfg.label}
                  </Badge>
                )}
              </div>
            </div>

            {/* Description */}
            {demand.description && (
              <p className={cn('text-xs mb-2 line-clamp-2', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                {demand.description}
              </p>
            )}

            {/* Tags */}
            {demand.tags?.length > 0 && (
              <div className="flex flex-wrap gap-1 mb-2">
                {demand.tags.slice(0, 4).map(t => (
                  <span
                    key={t}
                    className="px-2 py-0.5 rounded-full text-xs bg-blue-50 text-blue-600 dark:bg-blue-900/20 dark:text-blue-400"
                    onClick={e => { e.stopPropagation(); setFilters(f => ({ ...f, tag: t })) }}
                  >
                    {t}
                  </span>
                ))}
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between flex-wrap gap-2">
              <div className="flex items-center gap-3">
                {demand.phone && (
                  <a
                    href={whatsappLink(demand.phone)}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={e => e.stopPropagation()}
                    className="flex items-center gap-1 text-xs text-green-600 hover:text-green-700"
                  >
                    <Phone size={10} />
                    {formatPhone(demand.phone)}
                  </a>
                )}
                {responsible && (
                  <span className="text-xs text-gray-400">Resp: {responsible.name}</span>
                )}
              </div>
              {demand.expected_return_date && (
                <span className="text-xs text-gray-400">
                  Retorno: {formatDate(demand.expected_return_date)}
                </span>
              )}
            </div>
          </div>
        </div>
      </button>
    )
  }

  return (
    <Layout title="Demandas">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nome, telefone, bairro, #tag..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className={cn(
                'w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm outline-none',
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200'
              )}
            />
          </div>

          <div className="flex gap-2">
            <select
              value={sort}
              onChange={e => setSort(e.target.value)}
              className={cn(
                'px-3 py-2 rounded-xl border text-sm outline-none',
                darkMode ? 'bg-gray-800 border-gray-700 text-white' : 'bg-white border-gray-200 text-gray-700'
              )}
            >
              {SORT_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
            </select>

            <Button
              variant="secondary"
              onClick={() => setShowFilters(!showFilters)}
              className="relative"
            >
              <Filter size={16} />
              Filtros
              {activeFiltersCount > 0 && (
                <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-red-500 text-white text-xs flex items-center justify-center">
                  {activeFiltersCount}
                </span>
              )}
            </Button>

            {canEdit && (
              <Button onClick={() => setShowForm(true)}>
                <Plus size={16} /> Nova demanda
              </Button>
            )}
          </div>
        </div>

        {/* Active tag filter */}
        {filters.tag && (
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Filtrando por tag:</span>
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400">
              {filters.tag}
              <button onClick={() => setFilters(f => ({ ...f, tag: '' }))}>
                <X size={12} />
              </button>
            </span>
          </div>
        )}

        {/* Filters Panel */}
        {showFilters && (
          <Card className="animate-slide-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select
                placeholder="Status"
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                options={DEMAND_STATUS}
              />
              <Select
                placeholder="Tipo"
                value={filters.type}
                onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                options={DEMAND_TYPES}
              />
              <Select
                placeholder="Prioridade"
                value={filters.priority}
                onChange={e => setFilters(f => ({ ...f, priority: e.target.value }))}
                options={PRIORITY_LEVELS}
              />
              <Select
                placeholder="Responsável"
                value={filters.responsible}
                onChange={e => setFilters(f => ({ ...f, responsible: e.target.value }))}
                options={team.map(m => ({ value: m.id, label: m.name }))}
              />
              <input
                type="text"
                placeholder="Cidade..."
                value={filters.city}
                onChange={e => setFilters(f => ({ ...f, city: e.target.value }))}
                className={cn(
                  'px-3 py-2.5 rounded-lg border text-sm outline-none',
                  darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300'
                )}
              />
            </div>

            {/* Tag filter */}
            {allTags.length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-700">
                <p className="text-xs text-gray-400 mb-2 flex items-center gap-1"><Tag size={12} /> Filtrar por tag</p>
                <div className="flex flex-wrap gap-1.5">
                  {allTags.map(([tag, count]) => (
                    <button
                      key={tag}
                      onClick={() => setFilters(f => ({ ...f, tag: f.tag === tag ? '' : tag }))}
                      className={cn(
                        'px-2.5 py-1 rounded-full text-xs font-medium transition-colors',
                        filters.tag === tag
                          ? 'bg-blue-600 text-white'
                          : 'bg-blue-50 text-blue-600 hover:bg-blue-100 dark:bg-blue-900/20 dark:text-blue-400'
                      )}
                    >
                      {tag} ({count})
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="flex justify-end mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ status: '', type: '', priority: '', city: '', responsible: '', search: '', tag: '' })}
              >
                <X size={14} /> Limpar filtros
              </Button>
            </div>
          </Card>
        )}

        {/* Count + Summary */}
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-400">
            {filtered.length} demanda{filtered.length !== 1 ? 's' : ''}
          </p>
          <div className="flex gap-2">
            {DEMAND_STATUS.slice(0, 4).map(s => {
              const count = filtered.filter(d => d.status === s.value).length
              if (count === 0) return null
              return (
                <Badge key={s.value} color={s.color} bg={s.bg}>
                  {s.label}: {count}
                </Badge>
              )
            })}
          </div>
        </div>

        {/* Demands Grid */}
        {filtered.length === 0 ? (
          <EmptyState
            icon={FileText}
            title="Nenhuma demanda encontrada"
            description="Ajuste os filtros ou cadastre uma nova demanda"
            action={canEdit && <Button onClick={() => setShowForm(true)}><Plus size={16} /> Nova demanda</Button>}
          />
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            {filtered.map(d => <DemandCard key={d.id} demand={d} />)}
          </div>
        )}
      </div>

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Nova Demanda" size="lg">
        <DemandForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </Modal>
    </Layout>
  )
}
