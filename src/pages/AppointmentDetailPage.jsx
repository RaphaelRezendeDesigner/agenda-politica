import { useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Edit2, Trash2, MapPin, Clock, Calendar, Users,
  CheckCircle, ExternalLink, FileText, MessageSquare, Share2, Copy
} from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button, Badge, Card, Modal, ConfirmDialog } from '@/components/ui'
import AppointmentForm from '@/components/agenda/AppointmentForm'
import useStore from '@/store/useStore'
import { APPOINTMENT_TYPES, APPOINTMENT_STATUS, PRIORITY_LEVELS, DEMAND_STATUS } from '@/lib/constants'
import { cn, formatDate, formatTime, getStatusConfig, buildAgendaSummaryText, copyToClipboard } from '@/lib/utils'

export default function AppointmentDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const { getAppointmentById, updateAppointment, deleteAppointment, demands, team, settings, currentUser, darkMode } = useStore()

  const apt = getAppointmentById(id)
  const [showEdit, setShowEdit] = useState(false)
  const [showDelete, setShowDelete] = useState(false)
  const [copied, setCopied] = useState(false)

  if (!apt) {
    return (
      <Layout title="Compromisso">
        <div className="text-center py-20">
          <p className="text-gray-400">Compromisso não encontrado</p>
          <Button className="mt-4" onClick={() => navigate('/agenda')}>Voltar à agenda</Button>
        </div>
      </Layout>
    )
  }

  const canEdit = ['admin', 'coordenador'].includes(currentUser?.access_level)
  const canDelete = currentUser?.access_level === 'admin'

  const statusCfg = getStatusConfig(APPOINTMENT_STATUS, apt.status)
  const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
  const priorityCfg = PRIORITY_LEVELS.find(p => p.value === apt.priority)
  const responsible = team.find(m => m.id === apt.responsible_id)
  const linkedDemands = demands.filter(d => d.appointment_id === id)
  const primaryColor = settings?.primary_color || '#1a3a6b'

  const handleEdit = (data) => {
    updateAppointment(id, data)
    setShowEdit(false)
  }

  const handleDelete = () => {
    deleteAppointment(id)
    navigate('/agenda')
  }

  const handleShare = async () => {
    const text = buildAgendaSummaryText([apt], settings?.candidate_name || 'Candidato')
    await copyToClipboard(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const InfoRow = ({ icon: Icon, label, value, link }) => {
    if (!value) return null
    return (
      <div className="flex items-start gap-3">
        <Icon size={16} className="text-gray-400 mt-0.5 flex-shrink-0" />
        <div>
          <p className="text-xs text-gray-400">{label}</p>
          {link ? (
            <a href={link} target="_blank" rel="noopener noreferrer"
              className="text-sm text-blue-500 hover:underline flex items-center gap-1">
              {value} <ExternalLink size={12} />
            </a>
          ) : (
            <p className={cn('text-sm font-medium', darkMode ? 'text-white' : 'text-gray-900')}>{value}</p>
          )}
        </div>
      </div>
    )
  }

  return (
    <Layout title="Detalhes do Compromisso">
      <div className="max-w-4xl mx-auto space-y-5">
        {/* Back + Actions */}
        <div className="flex items-center justify-between">
          <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
            <ArrowLeft size={16} /> Voltar
          </Button>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={handleShare}>
              {copied ? <CheckCircle size={16} className="text-green-500" /> : <Copy size={16} />}
              {copied ? 'Copiado!' : 'Copiar'}
            </Button>
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

        {/* Header Card */}
        <Card>
          <div className="flex items-start justify-between gap-4 flex-wrap">
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-2 flex-wrap">
                {typeCfg && (
                  <span
                    className="text-xs font-medium px-2.5 py-1 rounded-full text-white"
                    style={{ backgroundColor: typeCfg.color }}
                  >
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
                {apt.title}
              </h1>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mt-5">
            <InfoRow
              icon={Calendar}
              label="Data"
              value={formatDate(apt.date, "EEEE, dd 'de' MMMM 'de' yyyy")}
            />
            <InfoRow
              icon={Clock}
              label="Horário"
              value={apt.start_time
                ? `${formatTime(apt.start_time)}${apt.end_time ? ` - ${formatTime(apt.end_time)}` : ''}`
                : null}
            />
            <InfoRow
              icon={Users}
              label="Responsável"
              value={responsible?.name}
            />
            <InfoRow
              icon={MapPin}
              label="Local"
              value={apt.location}
            />
            <InfoRow
              icon={MapPin}
              label="Endereço"
              value={apt.address}
            />
            <InfoRow
              icon={MapPin}
              label="Cidade / Bairro"
              value={[apt.city, apt.neighborhood].filter(Boolean).join(' · ')}
            />
            {apt.map_link && (
              <InfoRow
                icon={ExternalLink}
                label="Localização"
                value="Ver no mapa"
                link={apt.map_link}
              />
            )}
          </div>
        </Card>

        {/* Involved People */}
        {apt.involved_people?.length > 0 && (
          <Card>
            <h3 className={cn('font-semibold mb-3 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
              <Users size={16} style={{ color: primaryColor }} />
              Pessoas Envolvidas
            </h3>
            <div className="flex flex-wrap gap-2">
              {apt.involved_people.map(p => (
                <span
                  key={p}
                  className={cn('px-3 py-1.5 rounded-full text-sm font-medium', darkMode ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-700')}
                >
                  {p}
                </span>
              ))}
            </div>
          </Card>
        )}

        {/* Observations */}
        {apt.observations && (
          <Card>
            <h3 className={cn('font-semibold mb-2 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
              <MessageSquare size={16} style={{ color: primaryColor }} />
              Observações
            </h3>
            <p className={cn('text-sm whitespace-pre-wrap', darkMode ? 'text-gray-300' : 'text-gray-600')}>
              {apt.observations}
            </p>
          </Card>
        )}

        {/* Result + Next Step */}
        {(apt.result || apt.next_step) && (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            {apt.result && (
              <Card>
                <h3 className={cn('font-semibold mb-2 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                  <CheckCircle size={16} className="text-green-500" />
                  Resultado
                </h3>
                <p className={cn('text-sm whitespace-pre-wrap', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                  {apt.result}
                </p>
              </Card>
            )}
            {apt.next_step && (
              <Card>
                <h3 className={cn('font-semibold mb-2 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                  <ArrowLeft size={16} className="text-blue-500 rotate-180" />
                  Próximo Passo
                </h3>
                <p className={cn('text-sm whitespace-pre-wrap', darkMode ? 'text-gray-300' : 'text-gray-600')}>
                  {apt.next_step}
                </p>
              </Card>
            )}
          </div>
        )}

        {/* Linked Demands */}
        <Card>
          <div className="flex items-center justify-between mb-3">
            <h3 className={cn('font-semibold flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
              <FileText size={16} style={{ color: primaryColor }} />
              Demandas Vinculadas
            </h3>
            <span className="text-sm text-gray-400">{linkedDemands.length}</span>
          </div>
          {linkedDemands.length === 0 ? (
            <p className="text-sm text-gray-400">Nenhuma demanda vinculada a este compromisso</p>
          ) : (
            <div className="space-y-2">
              {linkedDemands.map(d => {
                const statusCfg = getStatusConfig(DEMAND_STATUS, d.status)
                return (
                  <button
                    key={d.id}
                    onClick={() => navigate(`/demandas/${d.id}`)}
                    className={cn(
                      'w-full text-left flex items-center justify-between p-3 rounded-lg border transition-colors hover:bg-gray-50',
                      darkMode ? 'border-gray-700 hover:bg-gray-700' : 'border-gray-200'
                    )}
                  >
                    <div>
                      <p className={cn('text-sm font-medium', darkMode ? 'text-white' : 'text-gray-900')}>
                        {d.person_name}
                      </p>
                      <p className="text-xs text-gray-400 mt-0.5">{d.description?.slice(0, 80)}...</p>
                    </div>
                    <Badge color={statusCfg.color} bg={statusCfg.bg}>{statusCfg.label}</Badge>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Meta */}
        <div className="text-xs text-gray-400 space-y-0.5">
          {apt.created_at && <p>Criado em {formatDate(apt.created_at.slice(0,10))}</p>}
          {apt.updated_at && apt.updated_at !== apt.created_at && (
            <p>Atualizado em {formatDate(apt.updated_at.slice(0,10))}</p>
          )}
        </div>
      </div>

      {/* Edit Modal */}
      <Modal open={showEdit} onClose={() => setShowEdit(false)} title="Editar Compromisso" size="lg">
        <AppointmentForm initial={apt} onSubmit={handleEdit} onCancel={() => setShowEdit(false)} />
      </Modal>

      <ConfirmDialog
        open={showDelete}
        onClose={() => setShowDelete(false)}
        onConfirm={handleDelete}
        title="Excluir compromisso"
        message={`Tem certeza que deseja excluir "${apt.title}"? Esta ação não pode ser desfeita.`}
        confirmLabel="Excluir"
        danger
      />
    </Layout>
  )
}
