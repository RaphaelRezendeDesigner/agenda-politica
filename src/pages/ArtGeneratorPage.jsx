import { useState, useRef, useMemo, forwardRef } from 'react'
import { format, addDays, parseISO } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { Image, Download, Calendar, Clock, Palette, Loader2, FileText } from 'lucide-react'
import Layout from '@/components/layout/Layout'
import { Button, Card } from '@/components/ui'
import useStore from '@/store/useStore'
import { ART_FORMATS, ART_TEMPLATES, APPOINTMENT_TYPES } from '@/lib/constants'
import { cn, formatDate } from '@/lib/utils'

// Formata "18:00" → "18h" e "18:30" → "18h30"
const fmtHour = (time) => {
  if (!time) return ''
  const [h, m] = time.split(':')
  return m === '00' ? `${parseInt(h)}h` : `${parseInt(h)}h${m}`
}

// Formata data → "02 ABR"
const fmtDayMonth = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  return `${format(d, 'dd')} ${format(d, 'MMM', { locale: ptBR }).toUpperCase()}`
}

// Formata data → "SÁB"
const fmtWeekday = (dateStr) => {
  const d = new Date(dateStr + 'T12:00:00')
  return format(d, 'EEE', { locale: ptBR }).toUpperCase().replace('.', '')
}

export default function ArtGeneratorPage() {
  const { appointments, settings, team, darkMode } = useStore()
  const artRef = useRef()
  const pdfRef = useRef()

  const today = format(new Date(), 'yyyy-MM-dd')
  const [artDate, setArtDate] = useState(today)
  const [artEndDate, setArtEndDate] = useState(today)
  const [format_, setFormat_] = useState('story')
  const [template, setTemplate] = useState('premium')
  const [mode, setMode] = useState('dia')
  const [downloading, setDownloading] = useState(false)

  const [showLocation, setShowLocation] = useState(true)
  const [showEndTime, setShowEndTime] = useState(true)
  const [showType, setShowType] = useState(true)
  const [showResponsible, setShowResponsible] = useState(true)
  const [showObservations, setShowObservations] = useState(false)

  const primaryColor = settings?.primary_color || '#1a3a6b'
  const secondaryColor = settings?.secondary_color || '#c9a84c'

  const selectedApts = useMemo(() => {
    let start = artDate
    let end = mode === 'dia' ? artDate
      : mode === 'semana' ? format(addDays(new Date(artDate), 6), 'yyyy-MM-dd')
      : artEndDate

    return appointments
      .filter(a => a.date >= start && a.date <= end && a.status !== 'cancelado')
      .sort((a, b) => a.date.localeCompare(b.date) || (a.start_time || '').localeCompare(b.start_time || ''))
  }, [appointments, artDate, artEndDate, mode])

  const formatCfg = ART_FORMATS.find(f => f.value === format_) || ART_FORMATS[0]

  const getResponsibleName = (id) => {
    if (!id) return null
    return team.find(m => m.id === id)?.name || null
  }

  const handleDownload = async () => {
    setDownloading(true)
    try {
      const { default: html2canvas } = await import('html2canvas')
      const canvas = await html2canvas(artRef.current, {
        scale: 1,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: formatCfg.width,
        height: formatCfg.height,
      })
      canvas.toBlob(blob => {
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = `agenda-${artDate}-${format_}.png`
        a.click()
        URL.revokeObjectURL(url)
      }, 'image/png', 0.95)
    } catch (e) {
      console.error(e)
      alert('Erro ao gerar imagem: ' + e.message)
    }
    setDownloading(false)
  }

  const handleDownloadPDF = async () => {
    setDownloading(true)
    try {
      const [{ default: html2canvas }, { jsPDF }] = await Promise.all([
        import('html2canvas'),
        import('jspdf'),
      ])

      const target = pdfRef.current
      if (!target) throw new Error('Layout do PDF não encontrado')

      // Captura altura natural completa (sem corte)
      const naturalHeight = target.scrollHeight
      const naturalWidth = target.scrollWidth

      const canvas = await html2canvas(target, {
        scale: 2,
        useCORS: true,
        allowTaint: false,
        backgroundColor: '#ffffff',
        logging: false,
        width: naturalWidth,
        height: naturalHeight,
        windowWidth: naturalWidth,
        windowHeight: naturalHeight,
      })

      // Dimensões A4 em pontos
      const A4_W = 595
      const A4_H = 842
      const PAGE_MARGIN = 0

      // Largura da imagem no PDF = A4 inteira
      const imgWidth = A4_W - PAGE_MARGIN * 2
      const imgHeight = (canvas.height * imgWidth) / canvas.width

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'pt',
        format: 'a4',
        compress: true,
      })

      // Se a imagem cabe em 1 página
      if (imgHeight <= A4_H - PAGE_MARGIN * 2) {
        const imgData = canvas.toDataURL('image/jpeg', 0.92)
        pdf.addImage(imgData, 'JPEG', PAGE_MARGIN, PAGE_MARGIN, imgWidth, imgHeight, undefined, 'FAST')
      } else {
        // Quebra em várias páginas
        const pageHeightPx = (canvas.width * (A4_H - PAGE_MARGIN * 2)) / imgWidth
        let yOffset = 0
        let pageNum = 0

        while (yOffset < canvas.height) {
          const sliceHeight = Math.min(pageHeightPx, canvas.height - yOffset)

          // Cria canvas temporário com a fatia
          const sliceCanvas = document.createElement('canvas')
          sliceCanvas.width = canvas.width
          sliceCanvas.height = sliceHeight
          const ctx = sliceCanvas.getContext('2d')
          ctx.fillStyle = '#ffffff'
          ctx.fillRect(0, 0, canvas.width, sliceHeight)
          ctx.drawImage(canvas, 0, -yOffset)

          const sliceData = sliceCanvas.toDataURL('image/jpeg', 0.92)
          const sliceHeightPt = (sliceHeight * imgWidth) / canvas.width

          if (pageNum > 0) pdf.addPage()
          pdf.addImage(sliceData, 'JPEG', PAGE_MARGIN, PAGE_MARGIN, imgWidth, sliceHeightPt, undefined, 'FAST')

          yOffset += sliceHeight
          pageNum++
        }
      }

      pdf.save(`agenda-${artDate}-${mode}.pdf`)
    } catch (e) {
      console.error(e)
      alert('Erro ao gerar PDF: ' + e.message)
    }
    setDownloading(false)
  }

  const headerLabel = useMemo(() => {
    if (mode === 'dia') {
      const d = new Date(artDate + 'T12:00:00')
      return format(d, "EEEE, dd 'de' MMMM", { locale: ptBR })
    }
    if (mode === 'semana') {
      const end = format(addDays(new Date(artDate), 6), "dd 'de' MMM", { locale: ptBR })
      return `${formatDate(artDate, "dd 'de' MMM")} a ${end}`
    }
    return `${formatDate(artDate)} a ${formatDate(artEndDate)}`
  }, [mode, artDate, artEndDate])

  const PREVIEW_MAX_W = 460
  const previewScale = Math.min(PREVIEW_MAX_W / formatCfg.width, 1)
  const previewW = formatCfg.width * previewScale
  const previewH = formatCfg.height * previewScale

  // ======================================================================
  // ART CANVAS - Foco: data+hora na mesma linha, MESMO tamanho
  // Linha topo: "18h - 02 ABR - SÁB" (mesmo tamanho, mesma cor de destaque)
  // ======================================================================
  const ArtCanvas = ({ refTarget }) => {
    const W = formatCfg.width
    const H = formatCfg.height
    const baseW = 1080
    const s = W / baseW

    // Renderiza a "linha de data+hora" prominente de um compromisso
    const DateTimeLine = ({ apt, accentColor, mutedColor = null }) => {
      const parts = []
      if (apt.start_time) parts.push(fmtHour(apt.start_time))
      parts.push(fmtDayMonth(apt.date))
      parts.push(fmtWeekday(apt.date))

      return (
        <div style={{
          display: 'flex',
          alignItems: 'baseline',
          gap: 18 * s,
          flexWrap: 'wrap',
          marginBottom: 12 * s,
        }}>
          {parts.map((p, i) => (
            <span key={i} style={{
              fontSize: 56 * s,
              fontWeight: 900,
              color: accentColor,
              letterSpacing: -1 * s,
              lineHeight: 1,
            }}>
              {p}{i < parts.length - 1 && (
                <span style={{ marginLeft: 18 * s, opacity: 0.4, fontWeight: 700 }}>—</span>
              )}
            </span>
          ))}
          {showEndTime && apt.end_time && (
            <span style={{
              fontSize: 28 * s,
              fontWeight: 700,
              color: mutedColor || accentColor,
              opacity: 0.7,
            }}>
              até {fmtHour(apt.end_time)}
            </span>
          )}
        </div>
      )
    }

    // ================ TEMPLATE: PREMIUM ================
    if (template === 'premium') {
      return (
        <div ref={refTarget} style={{
          width: W, height: H,
          backgroundColor: '#f8f9fc',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex', flexDirection: 'column',
          boxSizing: 'border-box',
        }}>
          <div style={{ height: 18 * s, width: '100%', backgroundColor: primaryColor, flexShrink: 0 }} />

          <div style={{ flex: 1, padding: `${44 * s}px ${48 * s}px`, display: 'flex', flexDirection: 'column' }}>
            {/* Header simples (logo + nome) */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 * s }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 16 * s }}>
                {settings?.logo_url ? (
                  <img src={settings.logo_url} crossOrigin="anonymous" style={{ width: 70 * s, height: 70 * s, borderRadius: '50%', objectFit: 'cover' }} alt="" />
                ) : (
                  <div style={{ width: 70 * s, height: 70 * s, borderRadius: '50%', backgroundColor: primaryColor, color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 32 * s, fontWeight: 900 }}>
                    {settings?.candidate_name?.charAt(0) || 'A'}
                  </div>
                )}
                <p style={{ fontSize: 32 * s, fontWeight: 900, color: primaryColor }}>{settings?.candidate_name || 'Candidato'}</p>
              </div>
              <p style={{ fontSize: 18 * s, fontWeight: 700, letterSpacing: 4 * s, textTransform: 'uppercase', color: '#94a3b8' }}>
                Agenda
              </p>
            </div>

            {/* Subtítulo: período */}
            <div style={{
              padding: `${16 * s}px ${24 * s}px`,
              backgroundColor: primaryColor,
              color: 'white',
              borderRadius: 14 * s,
              marginBottom: 24 * s,
              display: 'inline-flex',
              alignSelf: 'flex-start',
            }}>
              <p style={{ fontSize: 26 * s, fontWeight: 800, textTransform: 'capitalize', letterSpacing: 1 * s }}>
                {mode === 'dia' ? headerLabel : mode === 'semana' ? `Semana: ${headerLabel}` : `Período: ${headerLabel}`}
              </p>
            </div>

            {/* Cards de compromissos */}
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 * s, overflow: 'hidden' }}>
              {selectedApts.length === 0 ? (
                <div style={{ textAlign: 'center', padding: 80 * s, fontSize: 32 * s, color: '#94a3b8' }}>
                  Nenhum compromisso agendado
                </div>
              ) : (
                selectedApts.map(apt => {
                  const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
                  const respName = getResponsibleName(apt.responsible_id)
                  return (
                    <div key={apt.id} style={{
                      backgroundColor: 'white',
                      borderRadius: 18 * s,
                      boxShadow: '0 3px 10px rgba(0,0,0,0.07)',
                      overflow: 'hidden',
                      display: 'flex',
                    }}>
                      {/* Barra colorida lateral */}
                      <div style={{ width: 8 * s, backgroundColor: typeCfg?.color || secondaryColor, flexShrink: 0 }} />

                      <div style={{ flex: 1, padding: `${22 * s}px ${28 * s}px`, minWidth: 0 }}>
                        {/* LINHA DATA+HORA - DESTAQUE PRINCIPAL */}
                        <DateTimeLine apt={apt} accentColor={primaryColor} mutedColor="#64748b" />

                        {/* Título */}
                        <p style={{ fontSize: 38 * s, fontWeight: 800, color: '#0f172a', lineHeight: 1.15, marginBottom: 10 * s }}>
                          {apt.title}
                        </p>

                        {/* Local */}
                        {showLocation && apt.location && (
                          <p style={{ fontSize: 26 * s, color: '#475569', lineHeight: 1.3, marginBottom: 8 * s }}>
                            📍 {apt.location}{apt.city ? ` • ${apt.city}` : ''}
                          </p>
                        )}

                        {/* Responsável + Tipo */}
                        <div style={{ display: 'flex', gap: 16 * s, marginTop: 8 * s, flexWrap: 'wrap', alignItems: 'center' }}>
                          {showResponsible && respName && (
                            <p style={{ fontSize: 24 * s, color: primaryColor, fontWeight: 700 }}>
                              👤 {respName}
                            </p>
                          )}
                          {showType && typeCfg && (
                            <p style={{ fontSize: 22 * s, color: typeCfg.color, fontWeight: 700, padding: `${5 * s}px ${14 * s}px`, backgroundColor: typeCfg.color + '15', borderRadius: 8 * s }}>
                              {typeCfg.label}
                            </p>
                          )}
                        </div>

                        {/* Observações */}
                        {showObservations && apt.observations && (
                          <p style={{ fontSize: 22 * s, color: '#64748b', fontStyle: 'italic', marginTop: 12 * s, lineHeight: 1.35 }}>
                            {apt.observations.length > 110 ? apt.observations.slice(0, 110) + '...' : apt.observations}
                          </p>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
            </div>

            {/* Rodapé */}
            <div style={{ marginTop: 22 * s, display: 'flex', alignItems: 'center', gap: 14 * s }}>
              <div style={{ flex: 1, height: 2, backgroundColor: secondaryColor + '60' }} />
              <p style={{ fontSize: 16 * s, color: primaryColor, fontWeight: 700, padding: `0 ${12 * s}px`, letterSpacing: 3 * s }}>AGENDA OFICIAL</p>
              <div style={{ flex: 1, height: 2, backgroundColor: secondaryColor + '60' }} />
            </div>
          </div>
        </div>
      )
    }

    // ================ TEMPLATE: INSTITUCIONAL ================
    if (template === 'institucional') {
      return (
        <div ref={refTarget} style={{
          width: W, height: H,
          background: `linear-gradient(180deg, ${primaryColor} 0%, ${primaryColor}f0 60%, #0a1628 100%)`,
          color: 'white',
          fontFamily: 'Inter, system-ui, sans-serif',
          display: 'flex', flexDirection: 'column',
          padding: 50 * s, boxSizing: 'border-box',
        }}>
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 24 * s, paddingBottom: 22 * s, borderBottom: `2px solid ${secondaryColor}`, marginBottom: 24 * s }}>
            {settings?.logo_url ? (
              <img src={settings.logo_url} crossOrigin="anonymous" style={{ width: 80 * s, height: 80 * s, borderRadius: '50%', objectFit: 'cover', border: `3px solid ${secondaryColor}` }} alt="" />
            ) : (
              <div style={{ width: 80 * s, height: 80 * s, borderRadius: '50%', backgroundColor: secondaryColor, color: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 * s, fontWeight: 900 }}>
                {settings?.candidate_name?.charAt(0) || 'A'}
              </div>
            )}
            <div style={{ flex: 1 }}>
              <p style={{ fontSize: 36 * s, fontWeight: 900, lineHeight: 1.05 }}>{settings?.candidate_name || 'Candidato'}</p>
              {settings?.slogan && <p style={{ fontSize: 18 * s, opacity: 0.6, fontStyle: 'italic', marginTop: 4 * s }}>{settings.slogan}</p>}
            </div>
            <p style={{ fontSize: 18 * s, fontWeight: 700, letterSpacing: 5 * s, color: secondaryColor }}>AGENDA</p>
          </div>

          {/* Subtítulo período */}
          <div style={{
            padding: `${16 * s}px ${24 * s}px`,
            backgroundColor: secondaryColor,
            color: primaryColor,
            borderRadius: 14 * s,
            marginBottom: 24 * s,
            display: 'inline-flex',
            alignSelf: 'flex-start',
          }}>
            <p style={{ fontSize: 26 * s, fontWeight: 800, textTransform: 'capitalize' }}>
              {mode === 'dia' ? headerLabel : mode === 'semana' ? `Semana: ${headerLabel}` : `Período: ${headerLabel}`}
            </p>
          </div>

          {/* Cards */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 16 * s, overflow: 'hidden' }}>
            {selectedApts.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 80 * s, fontSize: 32 * s, opacity: 0.4 }}>
                Nenhum compromisso agendado
              </div>
            ) : (
              selectedApts.map(apt => {
                const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
                const respName = getResponsibleName(apt.responsible_id)
                return (
                  <div key={apt.id} style={{
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    borderRadius: 18 * s,
                    padding: `${22 * s}px ${28 * s}px`,
                    borderLeft: `8px solid ${secondaryColor}`,
                  }}>
                    {/* LINHA DATA+HORA */}
                    <DateTimeLine apt={apt} accentColor={secondaryColor} mutedColor="rgba(255,255,255,0.7)" />

                    <p style={{ fontSize: 38 * s, fontWeight: 800, lineHeight: 1.15, marginBottom: 10 * s }}>{apt.title}</p>

                    {showLocation && apt.location && (
                      <p style={{ fontSize: 26 * s, opacity: 0.85, lineHeight: 1.3, marginBottom: 8 * s }}>
                        📍 {apt.location}{apt.city ? ` • ${apt.city}` : ''}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 16 * s, marginTop: 8 * s, flexWrap: 'wrap', alignItems: 'center' }}>
                      {showResponsible && respName && (
                        <p style={{ fontSize: 24 * s, color: secondaryColor, fontWeight: 700 }}>
                          👤 {respName}
                        </p>
                      )}
                      {showType && typeCfg && (
                        <p style={{ fontSize: 22 * s, opacity: 0.85, padding: `${5 * s}px ${14 * s}px`, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 * s, fontWeight: 600 }}>
                          {typeCfg.label}
                        </p>
                      )}
                    </div>

                    {showObservations && apt.observations && (
                      <p style={{ fontSize: 22 * s, opacity: 0.75, fontStyle: 'italic', marginTop: 12 * s, lineHeight: 1.35 }}>
                        {apt.observations.length > 120 ? apt.observations.slice(0, 120) + '...' : apt.observations}
                      </p>
                    )}
                  </div>
                )
              })
            )}
          </div>

          <div style={{ marginTop: 24 * s, paddingTop: 18 * s, borderTop: '1px solid rgba(255,255,255,0.15)', textAlign: 'center', opacity: 0.5, fontSize: 18 * s }}>
            Agenda Política Oficial
          </div>
        </div>
      )
    }

    // ================ TEMPLATE: CAMPANHA POPULAR ================
    return (
      <div ref={refTarget} style={{
        width: W, height: H,
        background: `linear-gradient(135deg, ${primaryColor} 0%, #0a1628 100%)`,
        fontFamily: 'Inter, system-ui, sans-serif',
        color: 'white', padding: 44 * s,
        boxSizing: 'border-box', position: 'relative', overflow: 'hidden',
        display: 'flex', flexDirection: 'column',
      }}>
        <div style={{ position: 'absolute', top: -200 * s, right: -200 * s, width: 600 * s, height: 600 * s, borderRadius: '50%', backgroundColor: secondaryColor, opacity: 0.1 }} />
        <div style={{ position: 'absolute', bottom: -150 * s, left: -150 * s, width: 400 * s, height: 400 * s, borderRadius: '50%', backgroundColor: secondaryColor, opacity: 0.05 }} />

        {/* Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 20 * s, marginBottom: 22 * s, position: 'relative', zIndex: 10 }}>
          {settings?.logo_url ? (
            <img src={settings.logo_url} crossOrigin="anonymous" style={{ width: 80 * s, height: 80 * s, borderRadius: '50%', objectFit: 'cover', border: `4px solid ${secondaryColor}` }} alt="" />
          ) : (
            <div style={{ width: 80 * s, height: 80 * s, borderRadius: '50%', border: `4px solid ${secondaryColor}`, color: secondaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 38 * s, fontWeight: 900 }}>
              {settings?.candidate_name?.charAt(0) || 'A'}
            </div>
          )}
          <div style={{ flex: 1 }}>
            <p style={{ fontSize: 36 * s, fontWeight: 900, lineHeight: 1.05 }}>{settings?.candidate_name || 'Candidato'}</p>
            {settings?.slogan && <p style={{ fontSize: 18 * s, fontStyle: 'italic', color: secondaryColor, marginTop: 4 * s }}>{settings.slogan}</p>}
          </div>
        </div>

        {/* Subtítulo período */}
        <div style={{
          display: 'inline-flex',
          alignSelf: 'flex-start',
          backgroundColor: secondaryColor,
          color: primaryColor,
          padding: `${14 * s}px ${24 * s}px`,
          borderRadius: 14 * s,
          marginBottom: 22 * s,
          position: 'relative',
          zIndex: 10,
          boxShadow: '0 8px 20px rgba(0,0,0,0.25)',
        }}>
          <p style={{ fontSize: 24 * s, fontWeight: 900, textTransform: 'uppercase', letterSpacing: 3 * s }}>
            {mode === 'dia' ? headerLabel : mode === 'semana' ? `Semana ${headerLabel}` : headerLabel}
          </p>
        </div>

        {/* Cards */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 14 * s, overflow: 'hidden', position: 'relative', zIndex: 10 }}>
          {selectedApts.length === 0 ? (
            <div style={{ textAlign: 'center', padding: 80 * s, fontSize: 30 * s, opacity: 0.3 }}>
              Nenhum compromisso
            </div>
          ) : (
            selectedApts.map((apt, i) => {
              const typeCfg = APPOINTMENT_TYPES.find(t => t.value === apt.type)
              const respName = getResponsibleName(apt.responsible_id)
              return (
                <div key={apt.id} style={{ display: 'flex', alignItems: 'stretch', gap: 14 * s }}>
                  <div style={{ width: 56 * s, height: 56 * s, borderRadius: '50%', backgroundColor: secondaryColor, color: primaryColor, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 28 * s, fontWeight: 900, flexShrink: 0, alignSelf: 'flex-start', marginTop: 16 * s }}>
                    {i + 1}
                  </div>
                  <div style={{ flex: 1, minWidth: 0, backgroundColor: 'rgba(255,255,255,0.12)', borderRadius: 16 * s, padding: `${20 * s}px ${24 * s}px` }}>
                    {/* LINHA DATA+HORA */}
                    <DateTimeLine apt={apt} accentColor={secondaryColor} mutedColor="rgba(255,255,255,0.7)" />

                    <p style={{ fontSize: 32 * s, fontWeight: 800, lineHeight: 1.15, marginBottom: 8 * s }}>{apt.title}</p>

                    {showLocation && apt.location && (
                      <p style={{ fontSize: 24 * s, opacity: 0.85, marginBottom: 6 * s }}>
                        📍 {apt.location}{apt.city ? ` • ${apt.city}` : ''}
                      </p>
                    )}

                    <div style={{ display: 'flex', gap: 14 * s, marginTop: 8 * s, flexWrap: 'wrap', alignItems: 'center' }}>
                      {showResponsible && respName && (
                        <p style={{ fontSize: 22 * s, color: secondaryColor, fontWeight: 700 }}>
                          👤 {respName}
                        </p>
                      )}
                      {showType && typeCfg && (
                        <p style={{ fontSize: 20 * s, opacity: 0.85, padding: `${4 * s}px ${12 * s}px`, backgroundColor: 'rgba(255,255,255,0.15)', borderRadius: 8 * s, fontWeight: 600 }}>
                          {typeCfg.label}
                        </p>
                      )}
                    </div>

                    {showObservations && apt.observations && (
                      <p style={{ fontSize: 20 * s, opacity: 0.75, fontStyle: 'italic', marginTop: 10 * s, lineHeight: 1.35 }}>
                        {apt.observations.length > 100 ? apt.observations.slice(0, 100) + '...' : apt.observations}
                      </p>
                    )}
                  </div>
                </div>
              )
            })
          )}
        </div>

        <p style={{ textAlign: 'center', opacity: 0.3, fontSize: 16 * s, marginTop: 22 * s, position: 'relative', zIndex: 10 }}>
          Agenda Política Oficial
        </p>
      </div>
    )
  }

  const fieldClass = cn(
    'px-3 py-2.5 rounded-lg border text-sm outline-none',
    darkMode ? 'bg-gray-700 border-gray-600 text-white' : 'bg-white border-gray-300 text-gray-900'
  )

  const ToggleRow = ({ checked, onChange, label }) => (
    <label className="flex items-center gap-2 cursor-pointer py-1">
      <input type="checkbox" checked={checked} onChange={e => onChange(e.target.checked)} className="w-4 h-4" style={{ accentColor: primaryColor }} />
      <span className={cn('text-sm', darkMode ? 'text-gray-300' : 'text-gray-700')}>{label}</span>
    </label>
  )

  return (
    <Layout title="Gerar Arte da Agenda">
      <div className="max-w-6xl mx-auto">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Controles */}
          <div className="space-y-5">
            <Card>
              <h3 className={cn('font-semibold mb-4 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                <Calendar size={18} /> Período
              </h3>
              <div className="space-y-3">
                <div className="flex gap-2">
                  {['dia', 'semana', 'personalizado'].map(m => (
                    <button key={m} onClick={() => setMode(m)}
                      className={cn(
                        'flex-1 py-2 rounded-lg text-sm font-medium transition-colors border',
                        mode === m ? 'text-white border-transparent' : darkMode ? 'border-gray-600 text-gray-400 hover:bg-gray-700' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                      )}
                      style={mode === m ? { backgroundColor: primaryColor } : {}}
                    >{m === 'dia' ? 'Dia' : m === 'semana' ? 'Semana' : 'Período'}</button>
                  ))}
                </div>
                <div className={cn('grid gap-3', mode === 'personalizado' ? 'grid-cols-2' : 'grid-cols-1')}>
                  <div>
                    <label className={cn('block text-xs font-medium mb-1', darkMode ? 'text-gray-400' : 'text-gray-500')}>
                      {mode === 'personalizado' ? 'Data inicial' : 'Data'}
                    </label>
                    <input type="date" value={artDate} onChange={e => setArtDate(e.target.value)} className={fieldClass + ' w-full'} />
                  </div>
                  {mode === 'personalizado' && (
                    <div>
                      <label className={cn('block text-xs font-medium mb-1', darkMode ? 'text-gray-400' : 'text-gray-500')}>Data final</label>
                      <input type="date" value={artEndDate} onChange={e => setArtEndDate(e.target.value)} className={fieldClass + ' w-full'} />
                    </div>
                  )}
                </div>
              </div>
            </Card>

            <Card>
              <h3 className={cn('font-semibold mb-4 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                <Palette size={18} /> Formato e Modelo
              </h3>
              <div className="space-y-4">
                <div>
                  <label className={cn('block text-sm font-medium mb-2', darkMode ? 'text-gray-300' : 'text-gray-700')}>Formato</label>
                  <div className="grid grid-cols-3 gap-2">
                    {ART_FORMATS.map(f => (
                      <button key={f.value} onClick={() => setFormat_(f.value)}
                        className={cn(
                          'py-2 px-2 rounded-lg text-xs font-medium border transition-colors text-center',
                          format_ === f.value ? 'text-white border-transparent' : darkMode ? 'border-gray-600 text-gray-400' : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}
                        style={format_ === f.value ? { backgroundColor: primaryColor } : {}}
                      >
                        <p className="font-semibold">{f.label}</p>
                        <p className="opacity-60 text-[10px]">{f.description}</p>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className={cn('block text-sm font-medium mb-2', darkMode ? 'text-gray-300' : 'text-gray-700')}>Modelo</label>
                  <div className="space-y-2">
                    {ART_TEMPLATES.map(t => (
                      <button key={t.value} onClick={() => setTemplate(t.value)}
                        className={cn(
                          'w-full flex items-center gap-3 p-3 rounded-lg border transition-colors text-left',
                          template === t.value ? 'border-transparent' : darkMode ? 'border-gray-700' : 'border-gray-200 hover:border-gray-300'
                        )}
                        style={template === t.value ? { backgroundColor: primaryColor + '20', borderColor: primaryColor } : {}}
                      >
                        <div className="w-3 h-3 rounded-full border-2 flex-shrink-0" style={{ borderColor: primaryColor, backgroundColor: template === t.value ? primaryColor : 'transparent' }} />
                        <div>
                          <p className={cn('text-sm font-medium', darkMode ? 'text-white' : 'text-gray-900')}>{t.label}</p>
                          <p className="text-xs text-gray-400">{t.description}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </Card>

            <Card>
              <h3 className={cn('font-semibold mb-3 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                <FileText size={18} /> O que mostrar na arte
              </h3>
              <div className={cn('text-xs mb-3 p-2 rounded', darkMode ? 'bg-gray-700 text-gray-400' : 'bg-blue-50 text-blue-700')}>
                💡 Hora • Dia • Mês ficam sempre destacados na mesma linha.
              </div>
              <div className="space-y-1">
                <ToggleRow checked={showLocation} onChange={setShowLocation} label="Local e cidade" />
                <ToggleRow checked={showEndTime} onChange={setShowEndTime} label="Horário de término" />
                <ToggleRow checked={showType} onChange={setShowType} label="Tipo do compromisso" />
                <ToggleRow checked={showResponsible} onChange={setShowResponsible} label="Responsável" />
                <ToggleRow checked={showObservations} onChange={setShowObservations} label="Observações" />
              </div>
            </Card>

            <Card>
              <h3 className={cn('font-semibold mb-3 flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
                <Clock size={18} /> Compromissos ({selectedApts.length})
              </h3>
              <div className="space-y-1.5 max-h-40 overflow-y-auto">
                {selectedApts.map(apt => (
                  <div key={apt.id} className={cn('flex items-center gap-2 px-3 py-2 rounded-lg text-sm', darkMode ? 'bg-gray-700' : 'bg-gray-50')}>
                    <span className="text-gray-400 text-xs w-12 flex-shrink-0">{fmtHour(apt.start_time) || '--'}</span>
                    <span className={cn('truncate', darkMode ? 'text-gray-200' : 'text-gray-700')}>{apt.title}</span>
                  </div>
                ))}
                {selectedApts.length === 0 && (
                  <p className="text-sm text-gray-400 py-2">Nenhum compromisso para este período</p>
                )}
              </div>
              {selectedApts.length > 4 && format_ !== 'story' && (
                <p className="text-xs text-amber-600 dark:text-amber-400 mt-2">
                  💡 Muitos compromissos? Prefira o formato Story (mais espaço vertical).
                </p>
              )}
            </Card>

            <div className="grid grid-cols-2 gap-2">
              <Button onClick={handleDownload} size="lg" disabled={selectedApts.length === 0 || downloading}>
                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Baixar PNG
              </Button>
              <Button onClick={handleDownloadPDF} variant="secondary" size="lg" disabled={selectedApts.length === 0 || downloading}>
                {downloading ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                Baixar PDF
              </Button>
            </div>
            {selectedApts.length === 0 && (
              <p className="text-xs text-gray-400 text-center">Selecione pelo menos 1 compromisso</p>
            )}
          </div>

          {/* Preview */}
          <div className="space-y-3">
            <h3 className={cn('font-semibold flex items-center gap-2', darkMode ? 'text-white' : 'text-gray-900')}>
              <Image size={18} /> Preview — {formatCfg.label}
            </h3>

            <div
              className={cn('rounded-xl border overflow-hidden mx-auto', darkMode ? 'border-gray-700' : 'border-gray-200')}
              style={{ width: previewW, height: previewH }}
            >
              <div style={{
                width: formatCfg.width, height: formatCfg.height,
                transform: `scale(${previewScale})`, transformOrigin: 'top left',
              }}>
                <ArtCanvas />
              </div>
            </div>

            <p className="text-xs text-gray-400 text-center">
              Imagem real: <strong>{formatCfg.width}×{formatCfg.height}px</strong>
            </p>
          </div>
        </div>
      </div>

      {/* Off-screen full-size canvas para captura PNG (formato fixo) */}
      <div style={{
        position: 'fixed', top: 0, left: -99999,
        width: formatCfg.width, height: formatCfg.height,
        pointerEvents: 'none', zIndex: -1,
      }}>
        <ArtCanvas refTarget={artRef} />
      </div>

      {/* Off-screen layout para PDF — largura fixa A4-equivalente, altura natural */}
      <div style={{
        position: 'fixed', top: 0, left: -99999,
        width: 1080, // largura ampla pra qualidade
        pointerEvents: 'none', zIndex: -1,
      }}>
        <PDFLayout
          ref={pdfRef}
          appointments={selectedApts}
          settings={settings}
          team={team}
          mode={mode}
          startDate={artDate}
          endDate={mode === 'mes' ? artEndDate : (mode === 'semana' ? format(addDays(new Date(artDate), 6), 'yyyy-MM-dd') : artDate)}
          showLocation={showLocation}
          showEndTime={showEndTime}
          showType={showType}
          showResponsible={showResponsible}
          showObservations={showObservations}
          getResponsibleName={getResponsibleName}
        />
      </div>
    </Layout>
  )
}

// Layout dedicado para PDF — vertical, com altura natural, sem cortes
const PDFLayout = forwardRef(function PDFLayout(props, ref) {
  const {
    appointments, settings, mode, startDate, endDate,
    showLocation, showEndTime, showType, showResponsible, showObservations,
    getResponsibleName,
  } = props

  const primaryColor = settings?.primary_color || '#1a3a6b'
  const secondaryColor = settings?.secondary_color || '#c9a84c'
  const candidateName = settings?.candidate_name || 'Agenda Política'

  // Agrupa por data
  const grouped = appointments.reduce((acc, apt) => {
    if (!acc[apt.date]) acc[apt.date] = []
    acc[apt.date].push(apt)
    return acc
  }, {})
  const dates = Object.keys(grouped).sort()

  const titleText = mode === 'dia'
    ? `Agenda de ${format(parseISO(startDate), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}`
    : mode === 'semana'
    ? `Agenda Semanal — ${format(parseISO(startDate), 'dd/MM')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`
    : `Agenda — ${format(parseISO(startDate), 'dd/MM')} a ${format(parseISO(endDate), 'dd/MM/yyyy')}`

  return (
    <div ref={ref} style={{
      background: '#ffffff',
      width: 1080,
      padding: 40,
      fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, sans-serif',
      color: '#1f2937',
      boxSizing: 'border-box',
    }}>
      {/* Header */}
      <div style={{
        background: primaryColor,
        color: '#fff',
        padding: '28px 32px',
        borderRadius: 16,
        marginBottom: 24,
        display: 'flex',
        alignItems: 'center',
        gap: 20,
      }}>
        {settings?.logo_url && (
          <img src={settings.logo_url} alt="logo" crossOrigin="anonymous" style={{
            width: 64, height: 64, borderRadius: 12, objectFit: 'cover', flexShrink: 0,
          }} />
        )}
        <div style={{ flex: 1 }}>
          <p style={{ fontSize: 14, opacity: 0.85, margin: 0, marginBottom: 4 }}>{candidateName}</p>
          <h1 style={{ fontSize: 28, margin: 0, fontWeight: 800 }}>{titleText}</h1>
        </div>
        <div style={{
          background: secondaryColor,
          color: primaryColor,
          padding: '8px 14px',
          borderRadius: 999,
          fontWeight: 700,
          fontSize: 14,
          flexShrink: 0,
        }}>
          {appointments.length} {appointments.length === 1 ? 'compromisso' : 'compromissos'}
        </div>
      </div>

      {/* Grupos por data */}
      {dates.map(date => {
        const items = grouped[date]
        const dayLabel = format(parseISO(date), "EEEE, dd 'de' MMMM", { locale: ptBR })
        return (
          <div key={date} style={{ marginBottom: 28 }}>
            <h2 style={{
              fontSize: 18, fontWeight: 700,
              color: primaryColor, margin: 0, marginBottom: 12,
              padding: '8px 14px',
              background: `${primaryColor}15`,
              borderLeft: `4px solid ${primaryColor}`,
              borderRadius: 6,
              textTransform: 'capitalize',
            }}>
              {dayLabel}
            </h2>

            {items.map(apt => {
              const responsible = showResponsible ? getResponsibleName(apt.responsible_id) : null
              return (
                <div key={apt.id} style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: 12,
                  padding: 18,
                  marginBottom: 12,
                  borderLeft: `5px solid ${secondaryColor}`,
                  pageBreakInside: 'avoid',
                  breakInside: 'avoid',
                }}>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16, marginBottom: 8 }}>
                    {(apt.start_time || apt.end_time) && (
                      <div style={{
                        background: primaryColor,
                        color: '#fff',
                        padding: '6px 12px',
                        borderRadius: 8,
                        fontWeight: 700,
                        fontSize: 14,
                        flexShrink: 0,
                        whiteSpace: 'nowrap',
                      }}>
                        {apt.start_time || ''}{showEndTime && apt.end_time ? ` — ${apt.end_time}` : ''}
                      </div>
                    )}
                    <h3 style={{ fontSize: 18, fontWeight: 700, margin: 0, color: '#111827', flex: 1 }}>
                      {apt.title}
                    </h3>
                  </div>

                  {showLocation && (apt.location || apt.address) && (
                    <p style={{ margin: '6px 0', fontSize: 14, color: '#4b5563' }}>
                      📍 {[apt.location, apt.address, apt.neighborhood, apt.city].filter(Boolean).join(', ')}
                    </p>
                  )}

                  {showType && apt.type && (
                    <p style={{ margin: '6px 0', fontSize: 13, color: '#6b7280' }}>
                      🏷️ {apt.type}
                    </p>
                  )}

                  {responsible && (
                    <p style={{ margin: '6px 0', fontSize: 13, color: '#6b7280' }}>
                      👤 {responsible}
                    </p>
                  )}

                  {showObservations && apt.observations && (
                    <p style={{
                      margin: '10px 0 0',
                      fontSize: 13,
                      color: '#374151',
                      padding: 10,
                      background: '#f9fafb',
                      borderRadius: 6,
                      whiteSpace: 'pre-wrap',
                    }}>
                      {apt.observations}
                    </p>
                  )}
                </div>
              )
            })}
          </div>
        )
      })}

      {/* Footer */}
      <div style={{
        marginTop: 30, paddingTop: 16,
        borderTop: '1px solid #e5e7eb',
        textAlign: 'center', fontSize: 12, color: '#9ca3af',
      }}>
        Gerado em {format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })} • Agenda Política
      </div>
    </div>
  )
})
