import { useState, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Plus, Calendar, List, ChevronLeft, ChevronRight,
  MapPin, Clock, Filter, X, Search, Star, Users
} from 'lucide-react'
import {
  format, addDays, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth,
  eachDayOfInterval, isSameDay, parseISO, addMonths, subMonths, isToday
} from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Layout from '@/components/layout/Layout'
import { Button, Badge, Card, Modal, EmptyState, Select } from '@/components/ui'
import AppointmentForm from '@/components/agenda/AppointmentForm'
import useStore from '@/store/useStore'
import { APPOINTMENT_TYPES, APPOINTMENT_STATUS, PRIORITY_LEVELS } from '@/lib/constants'
import { cn, formatDate, formatTime, getStatusConfig } from '@/lib/utils'

const VIEW_MODES = [
  { value: 'dia', label: 'Dia', icon: Clock },
  { value: 'semana', label: 'Semana', icon: Calendar },
  { value: 'mes', label: 'Mês', icon: Calendar },
  { value: 'lista', label: 'Lista', icon: List },
]

export default function AgendaPage() {
  const navigate = useNavigate()
  const { appointments, addAppointment, deleteAppointment, team, settings, currentUser, darkMode } = useStore()

  const [view, setView] = useState('lista')
  const [currentDate, setCurrentDate] = useState(new Date())
  const [showForm, setShowForm] = useState(false)
  const [showFilters, setShowFilters] = useState(false)
  const [filters, setFilters] = useState({ status: '', type: '', priority: '', city: '', responsible: '', search: '' })

  const primaryColor = settings?.primary_color || '#1a3a6b'
  const canEdit = ['admin', 'coordenador'].includes(currentUser?.access_level)

  const filtered = useMemo(() => {
    let res = [...appointments]
    if (filters.status) res = res.filter(a => a.status === filters.status)
    if (filters.type) res = res.filter(a => a.type === filters.type)
    if (filters.priority) res = res.filter(a => a.priority === filters.priority)
    if (filters.city) res = res.filter(a => a.city?.toLowerCase().includes(filters.city.toLowerCase()))
    if (filters.responsible) res = res.filter(a => a.responsible_id === filters.responsible)
    if (filters.search) res = res.filter(a =>
      a.title?.toLowerCase().includes(filters.search.toLowerCase()) ||
      a.location?.toLowerCase().includes(filters.search.toLowerCase()) ||
      a.neighborhood?.toLowerCase().includes(filters.search.toLowerCase())
    )
    return res.sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''))
  }, [appointments, filters])

  const activeFiltersCount = Object.values(filters).filter(Boolean).length

  // Navigation
  const navigate_date = (dir) => {
    if (view === 'dia') setCurrentDate(d => dir > 0 ? addDays(d, 1) : subDays(d, 1))
    else if (view === 'semana') setCurrentDate(d => dir > 0 ? addDays(d, 7) : subDays(d, 7))
    else setCurrentDate(d => dir > 0 ? addMonths(d, 1) : subMonths(d, 1))
  }

  const handleCreate = async (data) => {
    try {
      await addAppointment(data)
      setShowForm(false)
    } catch (e) {
      alert('Erro ao salvar compromisso: ' + (e?.message || 'erro desconhecido'))
      console.error('addAppointment error:', e)
    }
  }

  const AppointmentCard = ({ apt, compact = false }) => {
    const statusCfg = getStatusConfig(APPOINTMENT_STATUS, apt.status)
    const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
    const responsible = team.find(m => m.id === apt.responsible_id)

    return (
      <button
        onClick={() => navigate(`/agenda/${apt.id}`)}
        className={cn(
          'w-full text-left rounded-xl border transition-all hover:shadow-md group',
          compact ? 'p-3' : 'p-4',
          darkMode ? 'bg-gray-800 border-gray-700 hover:border-gray-600' : 'bg-white border-gray-200 hover:border-gray-300'
        )}
      >
        <div className="flex items-start gap-3">
          <div
            className="w-1 self-stretch rounded-full flex-shrink-0 min-h-[40px]"
            style={{ backgroundColor: typeCfg?.color || '#94a3b8' }}
          />
          <div className="flex-1 min-w-0">
            <div className="flex items-start justify-between gap-2">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  {apt.priority === 'alta' && <Star size={12} className="text-amber-500 flex-shrink-0" />}
                  <p className={cn('font-semibold text-sm truncate', darkMode ? 'text-white' : 'text-gray-900')}>
                    {apt.title}
                  </p>
                </div>
                {!compact && (
                  <div className="flex flex-wrap items-center gap-x-3 gap-y-1 mt-1.5">
                    {(apt.start_time || apt.end_time) && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Clock size={10} />
                        {formatTime(apt.start_time)}{apt.end_time ? ` - ${formatTime(apt.end_time)}` : ''}
                      </span>
                    )}
                    {apt.location && (
                      <span className="flex items-center gap-1 text-xs text-gray-400 truncate max-w-[200px]">
                        <MapPin size={10} className="flex-shrink-0" />
                        {apt.location}
                        {apt.city && `, ${apt.city}`}
                      </span>
                    )}
                    {responsible && (
                      <span className="flex items-center gap-1 text-xs text-gray-400">
                        <Users size={10} />
                        {responsible.name}
                      </span>
                    )}
                  </div>
                )}
                {compact && apt.location && (
                  <p className="text-xs text-gray-400 mt-0.5 flex items-center gap-1 truncate">
                    <MapPin size={10} className="flex-shrink-0" />
                    {apt.location}
                  </p>
                )}
              </div>
              <div className="flex flex-col items-end gap-1.5 flex-shrink-0">
                <Badge color={statusCfg.color} bg={statusCfg.bg}>{statusCfg.label}</Badge>
                {typeCfg && (
                  <span className="text-xs text-gray-400">{typeCfg.label}</span>
                )}
              </div>
            </div>
          </div>
        </div>
      </button>
    )
  }

  const DayView = () => {
    const dateStr = format(currentDate, 'yyyy-MM-dd')
    const dayApts = filtered.filter(a => a.date === dateStr)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || ''))

    return (
      <div className="space-y-3">
        {dayApts.length === 0 ? (
          <EmptyState icon={Calendar} title="Nenhum compromisso" description="Nenhum compromisso para este dia" />
        ) : (
          dayApts.map(apt => <AppointmentCard key={apt.id} apt={apt} />)
        )}
      </div>
    )
  }

  const WeekView = () => {
    const start = startOfWeek(currentDate, { locale: ptBR })
    const days = eachDayOfInterval({ start, end: addDays(start, 6) })

    return (
      <div className="grid grid-cols-7 gap-2">
        {days.map(day => {
          const dateStr = format(day, 'yyyy-MM-dd')
          const dayApts = filtered.filter(a => a.date === dateStr)
          const todayClass = isToday(day)

          return (
            <div key={dateStr} className={cn('rounded-xl border min-h-[120px]', darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white')}>
              <div className={cn(
                'px-2 py-2 text-center rounded-t-xl',
                todayClass ? 'text-white' : ''
              )} style={todayClass ? { backgroundColor: primaryColor } : {}}>
                <p className={cn('text-xs font-medium', todayClass ? 'text-white/80' : 'text-gray-400')}>
                  {format(day, 'EEE', { locale: ptBR }).toUpperCase()}
                </p>
                <p className={cn('text-base font-bold', todayClass ? 'text-white' : darkMode ? 'text-white' : 'text-gray-900')}>
                  {format(day, 'd')}
                </p>
              </div>
              <div className="p-1.5 space-y-1">
                {dayApts.slice(0, 3).map(apt => {
                  const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
                  return (
                    <button
                      key={apt.id}
                      onClick={() => navigate(`/agenda/${apt.id}`)}
                      className="w-full text-left px-1.5 py-1 rounded text-xs truncate font-medium text-white"
                      style={{ backgroundColor: typeCfg?.color || primaryColor }}
                    >
                      {apt.title}
                    </button>
                  )
                })}
                {dayApts.length > 3 && (
                  <p className="text-xs text-center text-gray-400">+{dayApts.length - 3}</p>
                )}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  const MonthView = () => {
    const start = startOfMonth(currentDate)
    const end = endOfMonth(currentDate)
    const calStart = startOfWeek(start, { locale: ptBR })
    const calEnd = endOfWeek(end, { locale: ptBR })
    const days = eachDayOfInterval({ start: calStart, end: calEnd })
    const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb']

    return (
      <div>
        <div className="grid grid-cols-7 mb-2">
          {weekDays.map(d => (
            <div key={d} className="text-center text-xs font-medium text-gray-400 py-2">{d}</div>
          ))}
        </div>
        <div className="grid grid-cols-7 gap-1">
          {days.map(day => {
            const dateStr = format(day, 'yyyy-MM-dd')
            const dayApts = filtered.filter(a => a.date === dateStr)
            const isCurrentMonth = day >= start && day <= end
            const todayClass = isToday(day)

            return (
              <div
                key={dateStr}
                className={cn(
                  'min-h-[80px] rounded-lg p-1 border',
                  !isCurrentMonth && 'opacity-30',
                  todayClass ? 'border-2' : darkMode ? 'border-gray-700' : 'border-gray-100',
                  darkMode ? 'bg-gray-800' : 'bg-white'
                )}
                style={todayClass ? { borderColor: primaryColor } : {}}
              >
                <p className={cn(
                  'text-xs font-semibold text-center w-6 h-6 flex items-center justify-center rounded-full mx-auto mb-1',
                  todayClass ? 'text-white' : darkMode ? 'text-gray-300' : 'text-gray-700'
                )} style={todayClass ? { backgroundColor: primaryColor } : {}}>
                  {format(day, 'd')}
                </p>
                <div className="space-y-0.5">
                  {dayApts.slice(0, 2).map(apt => {
                    const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
                    return (
                      <button
                        key={apt.id}
                        onClick={() => navigate(`/agenda/${apt.id}`)}
                        className="w-full text-left text-xs truncate px-1 py-0.5 rounded font-medium text-white"
                        style={{ backgroundColor: typeCfg?.color || primaryColor }}
                      >
                        {apt.title}
                      </button>
                    )
                  })}
                  {dayApts.length > 2 && (
                    <p className="text-xs text-center text-gray-400">+{dayApts.length - 2}</p>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    )
  }

  const ListView = () => {
    const grouped = {}
    filtered.forEach(apt => {
      if (!grouped[apt.date]) grouped[apt.date] = []
      grouped[apt.date].push(apt)
    })
    const dates = Object.keys(grouped).sort()

    if (dates.length === 0) {
      return <EmptyState icon={Calendar} title="Nenhum compromisso encontrado" description="Tente ajustar os filtros ou criar um novo compromisso" />
    }

    return (
      <div className="space-y-6">
        {dates.map(date => (
          <div key={date}>
            <div className={cn('flex items-center gap-3 mb-3')}>
              <div
                className="px-3 py-1 rounded-full text-sm font-semibold text-white"
                style={{ backgroundColor: primaryColor }}
              >
                {isToday(parseISO(date)) ? 'Hoje' : formatDate(date, "dd 'de' MMMM, EEEE", { locale: ptBR })}
              </div>
              <div className={cn('flex-1 h-px', darkMode ? 'bg-gray-700' : 'bg-gray-200')} />
              <span className="text-xs text-gray-400">{grouped[date].length} compromisso{grouped[date].length > 1 ? 's' : ''}</span>
            </div>
            <div className="space-y-2.5">
              {grouped[date].map(apt => <AppointmentCard key={apt.id} apt={apt} />)}
            </div>
          </div>
        ))}
      </div>
    )
  }

  const dateLabel = useMemo(() => {
    if (view === 'dia') return format(currentDate, "d 'de' MMMM, yyyy", { locale: ptBR })
    if (view === 'semana') {
      const start = startOfWeek(currentDate, { locale: ptBR })
      return `${format(start, 'dd/MM')} - ${format(addDays(start, 6), 'dd/MM/yyyy')}`
    }
    return format(currentDate, "MMMM 'de' yyyy", { locale: ptBR })
  }, [currentDate, view])

  return (
    <Layout title="Agenda">
      <div className="space-y-4">
        {/* Toolbar */}
        <div className="flex flex-col sm:flex-row gap-3">
          {/* View modes */}
          <div className={cn('flex rounded-xl border overflow-hidden', darkMode ? 'border-gray-700' : 'border-gray-200')}>
            {VIEW_MODES.map(m => (
              <button
                key={m.value}
                onClick={() => setView(m.value)}
                className={cn(
                  'px-4 py-2 text-sm font-medium transition-colors border-r last:border-0',
                  darkMode ? 'border-gray-700' : 'border-gray-200',
                  view === m.value
                    ? 'text-white'
                    : darkMode ? 'text-gray-400 hover:bg-gray-700' : 'text-gray-600 hover:bg-gray-50'
                )}
                style={view === m.value ? { backgroundColor: primaryColor } : {}}
              >
                {m.label}
              </button>
            ))}
          </div>

          {/* Date nav (for non-list views) */}
          {view !== 'lista' && (
            <div className={cn('flex items-center gap-2 rounded-xl border px-3', darkMode ? 'border-gray-700 bg-gray-800' : 'border-gray-200 bg-white')}>
              <button onClick={() => navigate_date(-1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronLeft size={16} />
              </button>
              <span className={cn('text-sm font-medium min-w-[160px] text-center capitalize', darkMode ? 'text-white' : 'text-gray-700')}>
                {dateLabel}
              </span>
              <button onClick={() => navigate_date(1)} className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700">
                <ChevronRight size={16} />
              </button>
              <button
                onClick={() => setCurrentDate(new Date())}
                className="px-2 py-1 text-xs rounded-md text-blue-600 hover:bg-blue-50 font-medium"
              >
                Hoje
              </button>
            </div>
          )}

          {/* Search */}
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar compromissos..."
              value={filters.search}
              onChange={e => setFilters(f => ({ ...f, search: e.target.value }))}
              className={cn(
                'w-full pl-9 pr-3 py-2 rounded-xl border text-sm outline-none',
                darkMode ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-500' : 'bg-white border-gray-200 text-gray-900'
              )}
            />
          </div>

          <div className="flex gap-2">
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
                <Plus size={16} /> Novo
              </Button>
            )}
          </div>
        </div>

        {/* Filters */}
        {showFilters && (
          <Card className="animate-slide-in">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
              <Select
                placeholder="Status"
                value={filters.status}
                onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
                options={APPOINTMENT_STATUS}
              />
              <Select
                placeholder="Tipo"
                value={filters.type}
                onChange={e => setFilters(f => ({ ...f, type: e.target.value }))}
                options={APPOINTMENT_TYPES}
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
            <div className="flex justify-end mt-3">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setFilters({ status: '', type: '', priority: '', city: '', responsible: '', search: '' })}
              >
                <X size={14} /> Limpar filtros
              </Button>
            </div>
          </Card>
        )}

        {/* Count */}
        <p className="text-sm text-gray-400">
          {filtered.length} compromisso{filtered.length !== 1 ? 's' : ''} encontrado{filtered.length !== 1 ? 's' : ''}
        </p>

        {/* Views */}
        <Card padding={view === 'lista' ? false : true}>
          {view === 'dia' && <DayView />}
          {view === 'semana' && <WeekView />}
          {view === 'mes' && <MonthView />}
          {view === 'lista' && (
            <div className="p-5">
              <ListView />
            </div>
          )}
        </Card>
      </div>

      {/* Create Modal */}
      <Modal open={showForm} onClose={() => setShowForm(false)} title="Novo Compromisso" size="lg">
        <AppointmentForm onSubmit={handleCreate} onCancel={() => setShowForm(false)} />
      </Modal>
    </Layout>
  )
}
