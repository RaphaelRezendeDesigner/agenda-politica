import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Calendar, FileText, AlertTriangle, Clock, CheckCircle,
  TrendingUp, MapPin, Users, ArrowRight, Bell, Star
} from 'lucide-react'
import { format, isToday, isTomorrow, parseISO, isAfter, isBefore, addDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Layout from '@/components/layout/Layout'
import { Card, StatsCard, Badge, Button, EmptyState } from '@/components/ui'
import useStore from '@/store/useStore'
import {
  APPOINTMENT_STATUS, APPOINTMENT_TYPES, DEMAND_STATUS, PRIORITY_LEVELS
} from '@/lib/constants'
import { cn, formatDate, formatTime, getStatusConfig } from '@/lib/utils'

export default function DashboardPage() {
  const navigate = useNavigate()
  const { appointments, demands, settings, currentUser, darkMode } = useStore()

  const today = format(new Date(), 'yyyy-MM-dd')
  const tomorrow = format(addDays(new Date(), 1), 'yyyy-MM-dd')

  const todayAppointments = useMemo(() =>
    appointments
      .filter(a => a.date === today)
      .sort((a, b) => (a.start_time || '').localeCompare(b.start_time || '')),
    [appointments, today]
  )

  const upcomingAppointments = useMemo(() =>
    appointments
      .filter(a => a.date > today && a.status !== 'cancelado')
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''))
      .slice(0, 5),
    [appointments, today]
  )

  const newDemands = useMemo(() => demands.filter(d => d.status === 'nova'), [demands])
  const urgentDemands = useMemo(() => demands.filter(d => d.priority === 'alta' && d.status !== 'resolvida' && d.status !== 'arquivada'), [demands])
  const waitingDemands = useMemo(() => demands.filter(d => d.status === 'aguardando_retorno'), [demands])

  const weekAppointments = useMemo(() => {
    const nextWeek = format(addDays(new Date(), 7), 'yyyy-MM-dd')
    return appointments.filter(a => a.date >= today && a.date <= nextWeek)
  }, [appointments, today])

  const demandsByStatus = useMemo(() => {
    const counts = {}
    DEMAND_STATUS.forEach(s => { counts[s.value] = 0 })
    demands.forEach(d => { if (counts[d.status] !== undefined) counts[d.status]++ })
    return counts
  }, [demands])

  const cityCounts = useMemo(() => {
    const counts = {}
    appointments.forEach(a => {
      if (a.city) counts[a.city] = (counts[a.city] || 0) + 1
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 5)
  }, [appointments])

  const tagCounts = useMemo(() => {
    const counts = {}
    demands.forEach(d => {
      (d.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1 })
    })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
  }, [demands])

  const primaryColor = settings?.primary_color || '#1a3a6b'

  return (
    <Layout title="Dashboard">
      {/* Welcome */}
      <div className={cn(
        'rounded-2xl p-6 mb-6 text-white relative overflow-hidden',
      )} style={{ background: `linear-gradient(135deg, ${primaryColor} 0%, ${primaryColor}cc 100%)` }}>
        <div className="relative z-10">
          <p className="text-white/70 text-sm">Bom dia, {currentUser?.name?.split(' ')[0]}!</p>
          <h2 className="text-2xl font-bold mt-1">
            {format(new Date(), "EEEE, dd 'de' MMMM", { locale: ptBR })}
          </h2>
          <p className="text-white/60 text-sm mt-1">
            {todayAppointments.length > 0
              ? `Você tem ${todayAppointments.length} compromisso${todayAppointments.length > 1 ? 's' : ''} hoje`
              : 'Nenhum compromisso agendado para hoje'}
          </p>
        </div>
        <div className="absolute right-6 top-1/2 -translate-y-1/2 opacity-10">
          <Calendar size={100} />
        </div>
      </div>

      {/* Stats Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <StatsCard
          icon={Calendar}
          label="Hoje"
          value={todayAppointments.length}
          sub={`${todayAppointments.filter(a => a.status === 'confirmado').length} confirmados`}
          color="#3b82f6"
        />
        <StatsCard
          icon={Clock}
          label="Esta semana"
          value={weekAppointments.length}
          sub="compromissos"
          color="#8b5cf6"
        />
        <StatsCard
          icon={FileText}
          label="Demandas novas"
          value={newDemands.length}
          sub="aguardando ação"
          color="#f59e0b"
        />
        <StatsCard
          icon={AlertTriangle}
          label="Urgentes"
          value={urgentDemands.length}
          sub="demandas urgentes"
          color="#ef4444"
        />
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Agenda */}
        <div className="lg:col-span-2 space-y-6">
          <Card padding={false}>
            <div className={cn('flex items-center justify-between px-5 py-4 border-b', darkMode ? 'border-gray-700' : 'border-gray-100')}>
              <div className="flex items-center gap-2">
                <Calendar size={18} style={{ color: primaryColor }} />
                <h3 className={cn('font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>
                  Agenda de Hoje
                </h3>
              </div>
              <Button variant="ghost" size="sm" onClick={() => navigate('/agenda')}>
                Ver tudo <ArrowRight size={14} />
              </Button>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {todayAppointments.length === 0 ? (
                <EmptyState
                  icon={Calendar}
                  title="Nenhum compromisso hoje"
                  description="Aproveite para planejar a próxima semana"
                  action={
                    <Button size="sm" onClick={() => navigate('/agenda')}>
                      Ver agenda completa
                    </Button>
                  }
                />
              ) : (
                todayAppointments.map(apt => {
                  const statusCfg = getStatusConfig(APPOINTMENT_STATUS, apt.status)
                  const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
                  const priorityCfg = PRIORITY_LEVELS.find(p => p.value === apt.priority)
                  return (
                    <button
                      key={apt.id}
                      onClick={() => navigate(`/agenda/${apt.id}`)}
                      className={cn(
                        'w-full text-left px-5 py-4 flex items-start gap-4 hover:bg-gray-50 transition-colors',
                        darkMode ? 'hover:bg-gray-700/50' : ''
                      )}
                    >
                      <div className="text-center min-w-[48px]">
                        <p className="text-sm font-bold" style={{ color: primaryColor }}>
                          {formatTime(apt.start_time) || '--:--'}
                        </p>
                        {apt.end_time && <p className="text-xs text-gray-400">{formatTime(apt.end_time)}</p>}
                      </div>
                      <div
                        className="w-1 self-stretch rounded-full flex-shrink-0 mt-1"
                        style={{ backgroundColor: typeCfg?.color || '#94a3b8' }}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1 flex-wrap">
                          <p className={cn('font-medium text-sm truncate', darkMode ? 'text-white' : 'text-gray-900')}>
                            {apt.title}
                          </p>
                          {apt.priority === 'alta' && (
                            <Star size={12} className="text-amber-500 flex-shrink-0" />
                          )}
                        </div>
                        {apt.location && (
                          <p className="text-xs text-gray-400 flex items-center gap-1">
                            <MapPin size={10} />
                            {apt.location}{apt.city ? `, ${apt.city}` : ''}
                          </p>
                        )}
                      </div>
                      <Badge color={statusCfg.color} bg={statusCfg.bg}>
                        {statusCfg.label}
                      </Badge>
                    </button>
                  )
                })
              )}
            </div>
          </Card>

          {/* Upcoming */}
          <Card padding={false}>
            <div className={cn('flex items-center justify-between px-5 py-4 border-b', darkMode ? 'border-gray-700' : 'border-gray-100')}>
              <div className="flex items-center gap-2">
                <Clock size={18} className="text-purple-500" />
                <h3 className={cn('font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>
                  Próximos Compromissos
                </h3>
              </div>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {upcomingAppointments.length === 0 ? (
                <div className="py-8 text-center text-sm text-gray-400">Nenhum compromisso futuro</div>
              ) : (
                upcomingAppointments.map(apt => {
                  const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
                  const dateLabel = apt.date === tomorrow ? 'Amanhã' : formatDate(apt.date, "dd/MM")
                  return (
                    <button
                      key={apt.id}
                      onClick={() => navigate(`/agenda/${apt.id}`)}
                      className={cn(
                        'w-full text-left px-5 py-3 flex items-center gap-3 hover:bg-gray-50 transition-colors',
                        darkMode ? 'hover:bg-gray-700/50' : ''
                      )}
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{ backgroundColor: typeCfg?.color || '#94a3b8' }}
                      />
                      <div className="flex-1 min-w-0">
                        <p className={cn('text-sm font-medium truncate', darkMode ? 'text-white' : 'text-gray-900')}>
                          {apt.title}
                        </p>
                        <p className="text-xs text-gray-400">
                          {apt.city || apt.neighborhood}
                        </p>
                      </div>
                      <div className="text-right flex-shrink-0">
                        <p className="text-xs font-semibold text-blue-600">{dateLabel}</p>
                        {apt.start_time && <p className="text-xs text-gray-400">{formatTime(apt.start_time)}</p>}
                      </div>
                    </button>
                  )
                })
              )}
            </div>
          </Card>
        </div>

        {/* Right Column */}
        <div className="space-y-6">
          {/* Urgent Demands */}
          <Card padding={false}>
            <div className={cn('flex items-center justify-between px-5 py-4 border-b', darkMode ? 'border-gray-700' : 'border-gray-100')}>
              <div className="flex items-center gap-2">
                <AlertTriangle size={18} className="text-red-500" />
                <h3 className={cn('font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>Demandas Urgentes</h3>
              </div>
              <Badge color="#ef4444" bg="#fee2e2">{urgentDemands.length}</Badge>
            </div>
            <div className="divide-y divide-gray-100 dark:divide-gray-700">
              {urgentDemands.slice(0, 4).map(d => {
                const statusCfg = getStatusConfig(DEMAND_STATUS, d.status)
                return (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/demandas/${d.id}`)}
                    className={cn(
                      'w-full text-left px-5 py-3 hover:bg-gray-50 transition-colors',
                      darkMode ? 'hover:bg-gray-700/50' : ''
                    )}
                  >
                    <p className={cn('text-sm font-medium truncate', darkMode ? 'text-white' : 'text-gray-900')}>
                      {d.person_name}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Badge color={statusCfg.color} bg={statusCfg.bg} className="text-xs">
                        {statusCfg.label}
                      </Badge>
                      <span className="text-xs text-gray-400">{d.neighborhood}</span>
                    </div>
                  </button>
                )
              })}
              {urgentDemands.length === 0 && (
                <div className="py-6 text-center">
                  <CheckCircle size={24} className="mx-auto text-green-400 mb-2" />
                  <p className="text-sm text-gray-400">Nenhuma demanda urgente</p>
                </div>
              )}
            </div>
            <div className={cn('px-5 py-3 border-t', darkMode ? 'border-gray-700' : 'border-gray-100')}>
              <button
                onClick={() => navigate('/demandas')}
                className="text-sm font-medium flex items-center gap-1 hover:opacity-80"
                style={{ color: primaryColor }}
              >
                Ver todas as demandas <ArrowRight size={14} />
              </button>
            </div>
          </Card>

          {/* Demand Status Summary */}
          <Card>
            <h3 className={cn('font-semibold mb-4 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
              <TrendingUp size={18} className="text-blue-500" />
              Status das Demandas
            </h3>
            <div className="space-y-2.5">
              {DEMAND_STATUS.map(s => (
                <div key={s.value} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: s.color }} />
                    <span className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-600')}>{s.label}</span>
                  </div>
                  <span className={cn('text-sm font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>
                    {demandsByStatus[s.value] || 0}
                  </span>
                </div>
              ))}
            </div>
          </Card>

          {/* Top Cities */}
          {cityCounts.length > 0 && (
            <Card>
              <h3 className={cn('font-semibold mb-4 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                <MapPin size={18} className="text-green-500" />
                Agendas por Cidade
              </h3>
              <div className="space-y-2.5">
                {cityCounts.map(([city, count]) => (
                  <div key={city} className="flex items-center gap-2">
                    <div className="flex-1">
                      <div className="flex justify-between mb-1">
                        <span className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-600')}>{city}</span>
                        <span className={cn('text-sm font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>{count}</span>
                      </div>
                      <div className={cn('h-1.5 rounded-full overflow-hidden', darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
                        <div
                          className="h-full rounded-full transition-all"
                          style={{
                            width: `${(count / appointments.length) * 100}%`,
                            backgroundColor: primaryColor,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          )}

          {/* Tags */}
          {tagCounts.length > 0 && (
            <Card>
              <h3 className={cn('font-semibold mb-4', darkMode ? 'text-white' : 'text-gray-900')}>
                Tags mais usadas
              </h3>
              <div className="flex flex-wrap gap-2">
                {tagCounts.map(([tag, count]) => (
                  <button
                    key={tag}
                    onClick={() => navigate(`/demandas?tag=${encodeURIComponent(tag)}`)}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400 hover:bg-blue-100 transition-colors"
                  >
                    {tag}
                    <span className="bg-blue-200 dark:bg-blue-800 px-1.5 py-0.5 rounded-full text-xs">
                      {count}
                    </span>
                  </button>
                ))}
              </div>
            </Card>
          )}
        </div>
      </div>
    </Layout>
  )
}
