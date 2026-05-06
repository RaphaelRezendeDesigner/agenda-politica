import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Trash2, Phone, MapPin, Clock, User,
  CheckCircle, FileText, Calendar, MessageSquare, Tag, History
} from 'lucide-react'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import Layout from '@/components/layout/Layout'
import { Button, Badge, Card, Modal, ConfirmDialog } from '@/components/ui'
import DemandForm from '@/components/demands/DemandForm'
import useStore from '@/store/useStore'
import { DEMAND_TYPES, DEMAND_STATUS, PRIORITY_LEVELS, APPOINTMENT_STATUS } from '@/lib/constants'
import { cn, formatDate, formatPhone, whatsappLink, getStatusConfig, formatDateTime } from '@/lib/utils'

export default function DemandDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getDemandById, updateDemand, deleteDemand, getDemandHistory, getAppointmentById, team, settings, currentUser, darkMode } = useStore()

  const demand = getDemandById(id)
  const history = getDemandHistory(id)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [historyNote, setHistoryNote] = useState('')
  const [showAddHistory, setShowAddHistory] = useState(false)

  if (!demand) {
    return (
      <Layout title="Demanda">
        <div className="text-center py-20">
          <p className="text-gray-400">Demanda não encontrada</p>
          <Button className="mt-4" onClick={() => navigate('/demandas')}>Voltar às demandas</Button>
        </div>
      </Layout>
    )
  }

  const canEdit = ['admin', 'coordenador'].includes(currentUser?.access_level)
  const canDelete = currentUser?.access_level === 'admin'

  const statusCfg = getStatusConfig(DEMAND_STATUS, demand.status)
  const typeCfg = DEMAND_TYPES.find(t => t.value === demand.type)
  const priorityCfg = PRIORITY_LEVELS.find(p => p.value === demand.priority)
  const responsible = team.find(m => m.id === demand.responsible_id)
  const linkedAppointment = demand.appointment_id ? getAppointmentById(demand.appointment_id) : null
  const primaryColor = settings?.primary_color || '#1a3a6b'

  const handleEdit = (data) => {
    updateDemand(id, data, 'Dados atualizados')
    setShowEdit(false)
  }

  const handleDelete = () => {
    deleteDemand(id)
    navigate('/demandas')
  }

  const handleStatusChange = (newStatus) => {
    const statusLabel = DEMAND_STATUS.find(s => s.value === newStatus)?.label || newStatus
    updateDemand(id, { status: newStatus }, `Status alterado para "${statusLabel}"`)
  }

  const handleAddHistory = () => {
    if (historyNote.trim()) {
      updateDemand(id, {}, historyNote.trim())
      setHistoryNote('')
      setShowAddHistory(false)
    }
  }

  const InfoItem = ({ icon: Icon, label, children }) => {
    if (!children) return null
    return (
      <div className="flex items-start gap-3">
        <Icon size={15} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          <div className={cn('text-sm font-medium', darkMode ? 'text-white' : 'text-gray-900')}>
            {children}
          </div>
        </div>
      </div>
    )
  }

  return (
    <Layout title="Detalhe da Demanda">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Back + Actions */}
        <div className="flex items-center justify-between flex-wrap gap-2">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Voltar
          </Button>
          <div className="flex gap-2 flex-wrap">
            {demand.phone && (
              <a
                href={whatsappLink(demand.phone)}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white text-sm font-medium transition-colors"
              >
                <Phone size={15} /> WhatsApp
              </a>
            )}
            {canEdit && (
              <Button variant="secondary" size="sm" onClick={() => setShowEdit(true)}>
                <Edit2 size={16} /> Editar
              </Button>
            )}
            {canDelete && (
              <Button variant="danger" size="sm" onClick={() => setShowDelete(true)}>
                <Trash2 size={16} /> Excluir
              </Button>
            )}
          </div>
        </div>

        {/* Header */}
        <Card>
          <div className="flex items-start justify-between gap-4 flex-wrap mb-4">
            <div>
              <div className="flex flex-wrap gap-2 mb-2">
                {typeCfg && (
                  <span className={cn('text-xs px-2.5 py-1 rounded-full font-medium', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')}>
                    {typeCfg.label}
                  </span>
                )}
                <Badge color={statusCfg.color} bg={statusCfg.bg}>{statusCfg.label}</Badge>
                {priorityCfg && (
                  <Badge color={priorityCfg.color} bg={priorityCfg.bg}>
                    Prioridade {priorityCfg.label}
                  </Badge>
                )}
              </div>
              <h1 className={cn('text-2xl font-bold', darkMode ? 'text-white' : 'text-gray-900')}>
                {demand.person_name}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <InfoItem icon={Phone} label="Telefone">
              {demand.phone ? (
                <a href={`tel:${demand.phone}`} className="text-blue-500 hover:underline">
                  {formatPhone(demand.phone)}
                </a>
              ) : null}
            </InfoItem>
            <InfoItem icon={MapPin} label="Bairro / Cidade">
              {[demand.neighborhood, demand.city].filter(Boolean).join(', ')}
            </InfoItem>
            <InfoItem icon={User} label="Responsável">
              {responsible?.name}
            </InfoItem>
            <InfoItem icon={Clock} label="Data de cadastro">
              {formatDate(demand.created_at?.slice(0, 10))}
            </InfoItem>
            <InfoItem icon={Calendar} label="Retorno previsto">
              {demand.expected_return_date ? formatDate(demand.expected_return_date) : null}
            </InfoItem>
          </div>

          {/* Tags */}
          {demand.tags?.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-1.5">
              {demand.tags.map(t => (
                <span
                  key={t}
                  className="px-2.5 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400"
                >
                  {t}
                </span>
              ))}
            </div>
          )}
        </Card>

        {/* Description */}
        {demand.description && (
          <Card>
            <h3 className={cn('font-semibold mb-2 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
              <FileText size={16} style={{ color: primaryColor }} />
              Descrição da Demanda
            </h3>
            <p className={cn('text-sm whitespace-pre-wrap', darkMode ? 'text-gray-300' : 'text-gray-600')}>
              {demand.description}
            </p>
          </Card>
        )}

        {/* Status quick change */}
        {canEdit && (
          <Card>
            <h3 className={cn('font-semibold mb-3', darkMode ? 'text-white' : 'text-gray-900')}>
              Alterar Status
            </h3>
            <div className="flex flex-wrap gap-2">
              {DEMAND_STATUS.map(s => (
                <button
                  key={s.value}
                  onClick={() => handleStatusChange(s.value)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-xs font-medium transition-all border',
                    demand.status === s.value
                      ? 'border-transparent shadow-md scale-105'
                      : 'border-current opacity-60 hover:opacity-100'
                  )}
                  style={{
                    backgroundColor: demand.status === s.value ? s.color : 'transparent',
                    color: s.color,
                    borderColor: s.color,
                  }}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </Card>
        )}

        {/* Result + Next Step + Observations */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
          {demand.observations && (
            <Card>
              <h3 className={cn('font-semibold mb-2 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                <MessageSquare size={15} style={{ color: primaryColor }} />
                Observações
              </h3>
              <p className={cn('text-sm whitespace-pre-wrap', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                {demand.observations}
              </p>
            </Card>
          )}
          {demand.next_step && (
            <Card>
              <h3 className={cn('font-semibold mb-2', darkMode ? 'text-white' : 'text-gray-900')}>
                Próximo Passo
              </h3>
              <p className={cn('text-sm whitespace-pre-wrap', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                {demand.next_step}
              </p>
            </Card>
          )}
          {demand.result && (
            <Card className="sm:col-span-2">
              <h3 className={cn('font-semibold mb-2 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                <CheckCircle size={15} className="text-green-500" />
                Resultado do Atendimento
              </h3>
              <p className={cn('text-sm whitespace-pre-wrap', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                {demand.result}
              </p>
            </Card>
          )}
        </div>

        {/* Linked appointment */}
        {linkedAppointment && (
          <Card>
            <h3 className={cn('font-semibold mb-3 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
              <Calendar size={16} style={{ color: primaryColor }} />
              Agenda Vinculada
            </h3>
            <button
              onClick={() => navigate(`/agenda/${linkedAppointment.id}`)}
              className={cn(
                'w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors',
                darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200 hover:bg-gray-50'
              )}
            >
              <div>
                <p className={cn('font-medium text-sm', darkMode ? 'text-white' : 'text-gray-900')}>
                  {linkedAppointment.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {formatDate(linkedAppointment.date)} · {linkedAppointment.location} · {linkedAppointment.city}
                </p>
              </div>
              <Badge
                color={getStatusConfig(APPOINTMENT_STATUS, linkedAppointment.status).color}
                bg={getStatusConfig(APPOINTMENT_STATUS, linkedAppointment.status).bg}
              >
                {getStatusConfig(APPOINTMENT_STATUS, linkedAppointment.status).label}
              </Badge>
            </button>
          </Card>
        )}

        {/* History Timeline */}
        <Card>
          <div className="flex items-center justify-between mb-4">
            <h3 className={cn('font-semibold flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
              <History size={16} style={{ color: primaryColor }} />
              Histórico de Movimentações
            </h3>
            {canEdit && (
              <Button size="sm" variant="secondary" onClick={() => setShowAddHistory(!showAddHistory)}>
                + Registrar
              </Button>
            )}
          </div>

          {showAddHistory && (
            <div className={cn('mb-4 p-3 rounded-lg', darkMode ? 'bg-gray-700' : 'bg-gray-50')}>
              <textarea
                value={historyNote}
                onChange={e => setHistoryNote(e.target.value)}
                placeholder="Descreva o que foi feito, encaminhamento, contato realizado..."
                rows={3}
                className={cn(
                  'w-full px-3 py-2 rounded-lg border text-sm outline-none resize-none',
                  darkMode ? 'bg-gray-600 border-gray-500 text-white' : 'bg-white border-gray-200'
                )}
              />
              <div className="flex justify-end gap-2 mt-2">
                <Button size="sm" variant="secondary" onClick={() => setShowAddHistory(false)}>Cancelar</Button>
                <Button size="sm" onClick={handleAddHistory}>Salvar registro</Button>
              </div>
            </div>
          )}

          {history.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhum registro ainda</p>
          ) : (
            <div className="space-y-3">
              {[...history].reverse().map((h, i) => {
                const user = team.find(m => m.id === h.user_id)
                return (
                  <div key={h.id} className="flex gap-3">
                    <div className="flex flex-col items-center">
                      <div
                        className="w-7 h-7 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                        style={{ backgroundColor: primaryColor }}
                      >
                        {user?.name?.charAt(0) || '?'}
                      </div>
                      {i < history.length - 1 && (
                        <div className={cn('w-px flex-1 mt-1', darkMode ? 'bg-gray-600' : 'bg-gray-200')} />
                      )}
                    </div>
                    <div className="flex-1 pb-3">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={cn('text-sm font-semibold', darkMode ? 'text-white' : 'text-gray-900')}>
                          {h.action}
                        </span>
                        <span className="text-xs text-gray-400">
                          por {user?.name || 'Sistema'}
                        </span>
                      </div>
                      <p className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                        {h.description}
                      </p>
                      <p className="text-xs text-gray-400 mt-1">
                        {h.created_at ? formatDate(h.created_at.slice(0, 10)) : ''}
                      </p>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Meta */}
        <p className="text-xs text-gray-400">
          Cadastrado em {formatDate(demand.created_at?.slice(0, 10))}
        </p>
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar Demanda" size="lg">
        <DemandForm initial={demand} onSubmit={handleEdit} onCancel={() => setShowEdit(false)} />
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Excluir demanda"
        message={`Tem certeza que deseja excluir a demanda de "${demand.person_name}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />
    </Layout>
  )
}
