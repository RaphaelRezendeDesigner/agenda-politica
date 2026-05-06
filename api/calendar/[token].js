// Vercel Serverless Function: gera arquivo .ics do calendário
// URL: /api/calendar/<token>.ics
// O token vem do profiles.calendar_token e identifica que o usuário é autorizado.

import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || 'https://uxwnxwxwiahtygxnhzvb.supabase.co'
// Usa service_role pra acessar dados sem RLS (endpoint protegido pelo token)
const SUPABASE_KEY =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

// Escapa caracteres especiais do formato ICS
function escapeICS(text) {
  if (!text) return ''
  return String(text)
    .replace(/\\/g, '\\\\')
    .replace(/;/g, '\\;')
    .replace(/,/g, '\\,')
    .replace(/\n/g, '\\n')
    .replace(/\r/g, '')
}

// Formata data/hora pra ICS (timezone fixa America/Manaus = UTC-4)
function formatDateTime(dateStr, timeStr) {
  if (!dateStr) return null
  const date = dateStr.replace(/-/g, '')
  if (!timeStr) {
    // Evento de dia inteiro
    return { value: date, allDay: true }
  }
  const time = timeStr.replace(/:/g, '').padEnd(6, '0').slice(0, 6)
  return { value: `${date}T${time}`, allDay: false }
}

// Gera UID único e estável por evento
function eventUid(id) {
  return `${id}@agenda-politica.vercel.app`
}

function fold(line) {
  // ICS recomenda quebrar linhas com mais de 75 chars
  if (line.length <= 75) return line
  const chunks = []
  let i = 0
  chunks.push(line.slice(0, 75))
  i = 75
  while (i < line.length) {
    chunks.push(' ' + line.slice(i, i + 74))
    i += 74
  }
  return chunks.join('\r\n')
}

function buildICS(events, calendarName = 'Agenda Política') {
  const lines = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Agenda Politica//PT-BR',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:${escapeICS(calendarName)}`,
    'X-WR-TIMEZONE:America/Manaus',
    'X-PUBLISHED-TTL:PT1H',
    // Definição de timezone Manaus (UTC-4, sem DST)
    'BEGIN:VTIMEZONE',
    'TZID:America/Manaus',
    'BEGIN:STANDARD',
    'DTSTART:19700101T000000',
    'TZOFFSETFROM:-0400',
    'TZOFFSETTO:-0400',
    'TZNAME:AMT',
    'END:STANDARD',
    'END:VTIMEZONE',
  ]

  for (const ev of events) {
    if (!ev.date) continue
    const start = formatDateTime(ev.date, ev.start_time)
    if (!start) continue

    let endStr = null
    if (ev.end_time) {
      const end = formatDateTime(ev.date, ev.end_time)
      endStr = end?.value
    }

    const stamp =
      new Date(ev.updated_at || ev.created_at || Date.now())
        .toISOString()
        .replace(/[-:]/g, '')
        .split('.')[0] + 'Z'

    lines.push('BEGIN:VEVENT')
    lines.push(fold(`UID:${eventUid(ev.id)}`))
    lines.push(`DTSTAMP:${stamp}`)

    if (start.allDay) {
      lines.push(`DTSTART;VALUE=DATE:${start.value}`)
      if (endStr) lines.push(`DTEND;VALUE=DATE:${endStr.split('T')[0]}`)
    } else {
      lines.push(`DTSTART;TZID=America/Manaus:${start.value}`)
      if (endStr) {
        lines.push(`DTEND;TZID=America/Manaus:${endStr}`)
      } else {
        // Sem end_time: usa start + 1h
        const dt = new Date(`${ev.date}T${ev.start_time}:00-04:00`)
        dt.setHours(dt.getHours() + 1)
        const fallback =
          dt.toISOString().replace(/[-:]/g, '').split('.')[0].slice(0, 15)
        lines.push(`DTEND;TZID=America/Manaus:${fallback}`)
      }
    }

    lines.push(fold(`SUMMARY:${escapeICS(ev.title || 'Compromisso')}`))

    const locParts = [ev.location, ev.address, ev.neighborhood, ev.city]
      .filter(Boolean)
      .join(', ')
    if (locParts) lines.push(fold(`LOCATION:${escapeICS(locParts)}`))

    const descParts = []
    if (ev.type) descParts.push(`Tipo: ${ev.type}`)
    if (ev.status) descParts.push(`Status: ${ev.status}`)
    if (ev.priority) descParts.push(`Prioridade: ${ev.priority}`)
    if (ev.observations) descParts.push(`\nObservações:\n${ev.observations}`)
    if (ev.next_step) descParts.push(`\nPróximo passo: ${ev.next_step}`)
    if (descParts.length) {
      lines.push(fold(`DESCRIPTION:${escapeICS(descParts.join('\n'))}`))
    }

    if (ev.map_link) lines.push(fold(`URL:${ev.map_link}`))

    lines.push('END:VEVENT')
  }

  lines.push('END:VCALENDAR')
  return lines.join('\r\n') + '\r\n'
}

export default async function handler(req, res) {
  try {
    let token = req.query.token || ''
    // Remove .ics do final se vier no URL
    token = token.replace(/\.ics$/i, '')

    if (!token || token.length < 10) {
      res.status(400).send('Token inválido')
      return
    }

    // Valida o token: precisa existir um profile com esse calendar_token
    const { data: profile, error: profErr } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('calendar_token', token)
      .maybeSingle()

    if (profErr || !profile) {
      res.status(404).send('Calendário não encontrado')
      return
    }

    // Busca todas as agendas (campanha inteira)
    const { data: appointments, error: apptErr } = await supabase
      .from('appointments')
      .select(
        'id,title,date,start_time,end_time,location,address,city,neighborhood,type,priority,status,observations,next_step,map_link,created_at,updated_at'
      )
      .order('date', { ascending: true })

    if (apptErr) {
      console.error('Erro ao buscar agendas:', apptErr)
      res.status(500).send('Erro ao carregar agendas')
      return
    }

    // Busca settings pra usar nome do candidato no nome do calendário
    const { data: settings } = await supabase
      .from('settings')
      .select('candidate_name')
      .maybeSingle()

    const calName = `Agenda - ${settings?.candidate_name || 'Política'}`
    const ics = buildICS(appointments || [], calName)

    // Headers pra Google Calendar / Apple Calendar
    res.setHeader('Content-Type', 'text/calendar; charset=utf-8')
    res.setHeader('Content-Disposition', `inline; filename="agenda.ics"`)
    res.setHeader('Cache-Control', 'public, max-age=600') // 10min cache
    res.status(200).send(ics)
  } catch (e) {
    console.error('handler error:', e)
    res.status(500).send('Erro interno')
  }
}
