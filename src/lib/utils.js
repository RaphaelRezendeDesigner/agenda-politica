import { format, isToday, isTomorrow, isThisWeek, parseISO, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

export function formatDate(date, fmt = 'dd/MM/yyyy') {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, fmt, { locale: ptBR })
}

export function formatDateTime(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  return format(d, "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })
}

export function formatTime(time) {
  if (!time) return ''
  return time.slice(0, 5)
}

export function getRelativeDate(date) {
  if (!date) return ''
  const d = typeof date === 'string' ? parseISO(date) : date
  if (isToday(d)) return 'Hoje'
  if (isTomorrow(d)) return 'Amanhã'
  if (isThisWeek(d, { locale: ptBR })) return format(d, "EEEE", { locale: ptBR })
  return format(d, "dd 'de' MMMM", { locale: ptBR })
}

export function getDaysUntil(date) {
  if (!date) return null
  const d = typeof date === 'string' ? parseISO(date) : date
  return differenceInDays(d, new Date())
}

export function generateId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
}

export function cn(...classes) {
  return classes.filter(Boolean).join(' ')
}

export function getStatusConfig(statusList, value) {
  return statusList.find(s => s.value === value) || statusList[0]
}

export function extractTags(text) {
  if (!text) return []
  const matches = text.match(/#[\wáàâãéèêíïóôõöúçñÁÀÂÃÉÈÊÍÏÓÔÕÖÚÇÑ]+/g)
  return matches ? [...new Set(matches.map(t => t.toLowerCase()))] : []
}

export function groupByDate(items) {
  return items.reduce((acc, item) => {
    const date = item.date
    if (!acc[date]) acc[date] = []
    acc[date].push(item)
    return acc
  }, {})
}

export function sortByTime(items) {
  return [...items].sort((a, b) => {
    if (a.date !== b.date) return a.date.localeCompare(b.date)
    return (a.start_time || '').localeCompare(b.start_time || '')
  })
}

export function downloadFile(blob, filename) {
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export function formatPhone(phone) {
  if (!phone) return ''
  const cleaned = phone.replace(/\D/g, '')
  if (cleaned.length === 11) {
    return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,7)}-${cleaned.slice(7)}`
  }
  if (cleaned.length === 10) {
    return `(${cleaned.slice(0,2)}) ${cleaned.slice(2,6)}-${cleaned.slice(6)}`
  }
  return phone
}

export function whatsappLink(phone, message = '') {
  const cleaned = phone.replace(/\D/g, '')
  const msg = encodeURIComponent(message)
  return `https://wa.me/55${cleaned}${msg ? `?text=${msg}` : ''}`
}

export function copyToClipboard(text) {
  return navigator.clipboard.writeText(text)
}

export function buildAgendaSummaryText(appointments, candidateName) {
  const lines = [`📅 AGENDA - ${candidateName}\n`]
  appointments.forEach(a => {
    lines.push(`🕐 ${formatTime(a.start_time)}${a.end_time ? ` - ${formatTime(a.end_time)}` : ''}`)
    lines.push(`📌 ${a.title}`)
    if (a.location) lines.push(`📍 ${a.location}`)
    if (a.city) lines.push(`🏙️ ${a.city}`)
    lines.push('')
  })
  return lines.join('\n')
}

export function capitalizeFirst(str) {
  if (!str) return ''
  return str.charAt(0).toUpperCase() + str.slice(1)
}
