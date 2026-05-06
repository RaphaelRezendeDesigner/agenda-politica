import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import { Download, BarChart3, TrendingUp, FileText, Calendar } from 'lucide-react'
import { format, startOfMonth, endOfMonth, eachMonthOfInterval, subMonths } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Layout from '@/components/layout/Layout'
import { Button, Card } from '@/components/ui'
import useStore from '@/store/useStore'
import { DEMAND_TYPES, DEMAND_STATUS, APPOINTMENT_STATUS, APPOINTMENT_TYPES } from '@/lib/constants'
import { cn } from '@/lib/utils'

export default function ReportsPage() {
  const { appointments, demands, team, settings, darkMode } = useStore()
  const primaryColor = settings?.primary_color || '#1a3a6b'

  // Appointments by month (last 6 months)
  const aptsByMonth = useMemo(() => {
    const months = eachMonthOfInterval({
      start: subMonths(new Date(), 5),
      end: new Date(),
    })
    return months.map(month => {
      const start = format(startOfMonth(month), 'yyyy-MM-dd')
      const end = format(endOfMonth(month), 'yyyy-MM-dd')
      const count = appointments.filter(a => a.date >= start && a.date <= end).length
      return {
        name: format(month, 'MMM', { locale: ptBR }),
        compromissos: count,
      }
    })
  }, [appointments])

  // Appointments by type
  const aptsByType = useMemo(() => {
    const counts = {}
    appointments.forEach(a => {
      if (a.type) counts[a.type] = (counts[a.type] || 0) + 1
    })
    return APPOINTMENT_TYPES
      .filter(t => counts[t.value])
      .map(t => ({ name: t.label, value: counts[t.value], color: t.color }))
  }, [appointments])

  // Appointments by city
  const aptsByCity = useMemo(() => {
    const counts = {}
    appointments.forEach(a => { if (a.city) counts[a.city] = (counts[a.city] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [appointments])

  // Demands by type
  const demandsByType = useMemo(() => {
    const counts = {}
    demands.forEach(d => { if (d.type) counts[d.type] = (counts[d.type] || 0) + 1 })
    return DEMAND_TYPES
      .filter(t => counts[t.value])
      .map(t => ({ name: t.label, value: counts[t.value] }))
      .sort((a, b) => b.value - a.value)
  }, [demands])

  // Demands by status
  const demandsByStatus = useMemo(() => {
    return DEMAND_STATUS.map(s => ({
      name: s.label,
      value: demands.filter(d => d.status === s.value).length,
      color: s.color,
    })).filter(s => s.value > 0)
  }, [demands])

  // Demands by responsible
  const demandsByResponsible = useMemo(() => {
    const counts = {}
    demands.forEach(d => { if (d.responsible_id) counts[d.responsible_id] = (counts[d.responsible_id] || 0) + 1 })
    return Object.entries(counts)
      .map(([id, count]) => ({
        name: team.find(m => m.id === id)?.name || 'Desconhecido',
        demandas: count,
        resolvidas: demands.filter(d => d.responsible_id === id && d.status === 'resolvida').length,
      }))
      .sort((a, b) => b.demandas - a.demandas)
      .slice(0, 5)
  }, [demands, team])

  // Tags ranking
  const tagRanking = useMemo(() => {
    const counts = {}
    demands.forEach(d => (d.tags || []).forEach(t => { counts[t] = (counts[t] || 0) + 1 }))
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 10)
  }, [demands])

  // Demands by city
  const demandsByCity = useMemo(() => {
    const counts = {}
    demands.forEach(d => { if (d.city) counts[d.city] = (counts[d.city] || 0) + 1 })
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 8)
      .map(([name, value]) => ({ name, value }))
  }, [demands])

  const textColor = darkMode ? '#9ca3af' : '#6b7280'
  const gridColor = darkMode ? '#374151' : '#f3f4f6'

  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload?.length) {
      return (
        <div className={cn('px-3 py-2 rounded-lg shadow-lg text-sm', darkMode ? 'bg-gray-700 text-white' : 'bg-white text-gray-900 border border-gray-200')}>
          <p className="font-semibold">{label}</p>
          {payload.map(p => (
            <p key={p.name} style={{ color: p.color || p.fill }}>{p.name}: {p.value}</p>
          ))}
        </div>
      )
    }
    return null
  }

  const SectionTitle = ({ icon: Icon, children }) => (
    <h2 className={cn('text-lg font-bold mb-4 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
      <Icon size={20} style={{ color: primaryColor }} />
      {children}
    </h2>
  )

  return (
    <Layout title="Relatórios">
      <div className="space-y-8">
        {/* Summary cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total de compromissos', value: appointments.length, sub: `${appointments.filter(a => a.status === 'concluido').length} concluídos` },
            { label: 'Total de demandas', value: demands.length, sub: `${demands.filter(d => d.status === 'resolvida').length} resolvidas` },
            { label: 'Taxa de resolução', value: `${demands.length ? Math.round((demands.filter(d => d.status === 'resolvida').length / demands.length) * 100) : 0}%`, sub: 'demandas resolvidas' },
            { label: 'Membros da equipe', value: team.length, sub: 'usuários ativos' },
          ].map(card => (
            <Card key={card.label}>
              <p className={cn('text-sm', darkMode ? 'text-gray-400' : 'text-gray-500')}>{card.label}</p>
              <p className={cn('text-2xl font-bold mt-1', darkMode ? 'text-white' : 'text-gray-900')}>{card.value}</p>
              <p className="text-xs text-gray-400 mt-0.5">{card.sub}</p>
            </Card>
          ))}
        </div>

        {/* Charts Row 1 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <SectionTitle icon={Calendar}>Compromissos por Mês</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <BarChart data={aptsByMonth}>
                <XAxis dataKey="name" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="compromissos" fill={primaryColor} radius={[6, 6, 0, 0]} name="Compromissos" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <SectionTitle icon={BarChart3}>Demandas por Status</SectionTitle>
            <ResponsiveContainer width="100%" height={220}>
              <PieChart>
                <Pie
                  data={demandsByStatus}
                  cx="50%"
                  cy="50%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={3}
                  dataKey="value"
                >
                  {demandsByStatus.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  formatter={(value) => <span style={{ color: textColor, fontSize: 12 }}>{value}</span>}
                />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Charts Row 2 */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <SectionTitle icon={FileText}>Demandas por Categoria</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={demandsByType} layout="vertical">
                <XAxis type="number" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={120} tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill={primaryColor} radius={[0, 6, 6, 0]} name="Demandas" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <SectionTitle icon={TrendingUp}>Compromissos por Tipo</SectionTitle>
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Pie data={aptsByType} cx="50%" cy="50%" outerRadius={80} paddingAngle={2} dataKey="value">
                  {aptsByType.map((entry, i) => (
                    <Cell key={i} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
                <Legend formatter={(value) => <span style={{ color: textColor, fontSize: 12 }}>{value}</span>} />
              </PieChart>
            </ResponsiveContainer>
          </Card>
        </div>

        {/* Row 3: City + Responsible */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <SectionTitle icon={BarChart3}>Agendas por Cidade</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={aptsByCity} layout="vertical">
                <XAxis type="number" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#8b5cf6" radius={[0, 6, 6, 0]} name="Agendas" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          <Card>
            <SectionTitle icon={TrendingUp}>Ranking de Responsáveis</SectionTitle>
            <div className="space-y-3">
              {demandsByResponsible.map((person, i) => (
                <div key={person.name}>
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2">
                      <span className={cn('text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center text-white', i === 0 ? 'bg-amber-500' : i === 1 ? 'bg-gray-400' : 'bg-orange-400')}>
                        {i + 1}
                      </span>
                      <span className={cn('text-sm font-medium', darkMode ? 'text-white' : 'text-gray-800')}>
                        {person.name}
                      </span>
                    </div>
                    <span className="text-sm text-gray-400">
                      {person.demandas} ({person.resolvidas} resolvidas)
                    </span>
                  </div>
                  <div className={cn('h-1.5 rounded-full', darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${(person.demandas / demandsByResponsible[0].demandas) * 100}%`,
                        backgroundColor: primaryColor,
                      }}
                    />
                  </div>
                </div>
              ))}
              {demandsByResponsible.length === 0 && (
                <p className="text-sm text-gray-400">Nenhum dado disponível</p>
              )}
            </div>
          </Card>
        </div>

        {/* Demands by city */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
            <SectionTitle icon={FileText}>Demandas por Cidade</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={demandsByCity} layout="vertical">
                <XAxis type="number" tick={{ fill: textColor, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis type="category" dataKey="name" width={100} tick={{ fill: textColor, fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="value" fill="#10b981" radius={[0, 6, 6, 0]} name="Demandas" />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* Tag ranking */}
          <Card>
            <SectionTitle icon={FileText}>Ranking de Tags</SectionTitle>
            <div className="space-y-2">
              {tagRanking.map(([tag, count]) => (
                <div key={tag} className="flex items-center gap-2">
                  <span className="flex-1 text-sm text-blue-600 dark:text-blue-400 font-medium">{tag}</span>
                  <div className={cn('flex-1 h-1.5 rounded-full', darkMode ? 'bg-gray-700' : 'bg-gray-100')}>
                    <div
                      className="h-full rounded-full bg-blue-500"
                      style={{ width: `${(count / (tagRanking[0]?.[1] || 1)) * 100}%` }}
                    />
                  </div>
                  <span className="text-sm font-semibold text-gray-400 w-6 text-right">{count}</span>
                </div>
              ))}
              {tagRanking.length === 0 && (
                <p className="text-sm text-gray-400">Nenhuma tag cadastrada ainda</p>
              )}
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  )
}
