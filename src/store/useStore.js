import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import { generateId } from '@/lib/utils'
import {
  authService, appointmentsService, demandsService, notesService,
  profilesService, settingsService, historyService, teamService, codesService, isSupabaseConfigured,
} from '@/lib/services'
import { supabase } from '@/lib/supabase'
import { mockSettings } from './mockData'

// Helper: converte strings vazias em null (Postgres rejeita "" em UUID/DATE/INTEGER)
function cleanPayload(obj) {
  if (!obj || typeof obj !== 'object') return obj
  const cleaned = {}
  for (const [k, v] of Object.entries(obj)) {
    cleaned[k] = (typeof v === 'string' && v.trim() === '') ? null : v
  }
  return cleaned
}

// Helper: aplica mudança em uma lista local com base num evento realtime
function applyRealtimeChange(list, payload) {
  const { eventType, new: newRow, old: oldRow } = payload
  if (eventType === 'INSERT') {
    if (list.some(r => r.id === newRow.id)) return list // já existe
    return [...list, newRow]
  }
  if (eventType === 'UPDATE') {
    return list.map(r => r.id === newRow.id ? newRow : r)
  }
  if (eventType === 'DELETE') {
    return list.filter(r => r.id !== oldRow.id)
  }
  return list
}

const useStore = create(
  persist(
    (set, get) => ({
      // ============ STATUS ============
      isOnline: isSupabaseConfigured,
      syncing: false,
      lastSyncError: null,

      // ============ AUTH ============
      currentUser: null,
      isAuthenticated: false,
      needsInviteCode: false,
      authUserId: null,
      authUserEmail: null,
      authUserMeta: null,

      login: async (email, password) => {
        if (!isSupabaseConfigured) return { success: false, error: 'Sistema offline' }
        const { user, error } = await authService.signIn(email, password)
        if (error) return { success: false, error }
        set({ currentUser: user, isAuthenticated: true })
        await get().syncFromServer()
        return { success: true, user }
      },

      loginWithGoogle: async () => {
        if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }
        const result = await authService.signInWithGoogle()
        if (result.error) return { error: result.error }
        return { success: true }
      },

      logout: async () => {
        try {
          if (isSupabaseConfigured) {
            await supabase.auth.signOut({ scope: 'global' })
          }
        } catch (e) { console.error('signOut error:', e) }

        // Limpa TODO storage relacionado ao app e ao Supabase
        try {
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.startsWith('agenda-') || key.includes('supabase')) {
              localStorage.removeItem(key)
            }
          })
          sessionStorage.clear()
        } catch (e) { console.error('clear storage:', e) }

        set({
          currentUser: null,
          isAuthenticated: false,
          needsInviteCode: false,
          authUserId: null,
          appointments: [],
          demands: [],
          notes: [],
          team: [],
        })
        // Hard redirect
        window.location.replace('/login')
      },

      // Verifica sessão Supabase. Se autenticado e tem profile → entra. Senão → fluxo de código
      checkSession: async () => {
        if (!isSupabaseConfigured) return

        const { data: { session } } = await supabase.auth.getSession()
        if (!session) {
          set({ currentUser: null, isAuthenticated: false, needsInviteCode: false })
          return
        }

        const { data: profile } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', session.user.id)
          .maybeSingle()

        if (profile) {
          set({
            currentUser: profile,
            isAuthenticated: true,
            needsInviteCode: false,
            authUserId: null,
          })
          await get().syncFromServer()
        } else {
          set({
            currentUser: null,
            isAuthenticated: false,
            needsInviteCode: true,
            authUserId: session.user.id,
            authUserEmail: session.user.email,
            authUserMeta: session.user.user_metadata,
          })
        }
      },

      useInviteCode: async (code, profileData) => {
        const result = await codesService.useCode(code, profileData)
        if (result.error) return { error: result.error }
        if (result.profile) {
          set({
            currentUser: result.profile,
            isAuthenticated: true,
            needsInviteCode: false,
            authUserId: null,
          })
          await get().syncFromServer()
        }
        return result
      },

      // ============ SYNC ============
      syncFromServer: async () => {
        if (!isSupabaseConfigured) return
        set({ syncing: true, lastSyncError: null })
        try {
          const [settingsRes, teamRes, apptsRes, demandsRes, notesRes] = await Promise.allSettled([
            settingsService.get(),
            profilesService.list(),
            appointmentsService.list(),
            demandsService.list(),
            notesService.list(),
          ])

          let settings = settingsRes.status === 'fulfilled' ? settingsRes.value : null
          if (!settings) {
            try {
              settings = await settingsService.upsert({
                candidate_name: 'Meu Candidato',
                primary_color: '#1a3a6b',
                secondary_color: '#c9a84c',
              })
            } catch (e) { console.warn('init settings:', e.message) }
          }

          set({
            settings: settings || get().settings,
            team: teamRes.status === 'fulfilled' ? (teamRes.value || []) : [],
            appointments: apptsRes.status === 'fulfilled' ? (apptsRes.value || []) : [],
            demands: demandsRes.status === 'fulfilled' ? (demandsRes.value || []) : [],
            notes: notesRes.status === 'fulfilled' ? (notesRes.value || []) : [],
            syncing: false,
          })

          // Loga erros parciais
          ;[settingsRes, teamRes, apptsRes, demandsRes, notesRes].forEach((r, i) => {
            if (r.status === 'rejected') {
              const labels = ['settings', 'team', 'appointments', 'demands', 'notes']
              console.error(`[sync] ${labels[i]}:`, r.reason?.message || r.reason)
            }
          })
        } catch (e) {
          set({ syncing: false, lastSyncError: e.message })
          console.error('Sync error:', e)
        }
      },

      // ============ SETTINGS ============
      settings: mockSettings,
      updateSettings: async (data) => {
        if (!isSupabaseConfigured) {
          set({ settings: { ...get().settings, ...data } })
          return
        }
        const saved = await settingsService.upsert(data)
        if (saved) set({ settings: saved })
      },

      // ============ TEAM ============
      team: [],
      addTeamMember: async (member) => {
        if (!isSupabaseConfigured) {
          const newMember = { ...member, id: generateId(), created_at: new Date().toISOString() }
          set(state => ({ team: [...state.team, newMember] }))
          return { profile: newMember }
        }

        const { password, sendInvite, ...profileData } = member

        if (sendInvite) {
          const result = await teamService.sendInviteLink(profileData)
          if (result.error) return { error: result.error }
          return { invitedEmail: profileData.email }
        }

        if (!password) return { error: 'Senha obrigatória' }

        const result = await teamService.createMemberWithPassword({ ...profileData, password })
        if (result.error && !result.authUserCreated) return { error: result.error }
        if (result.profile) {
          set(state => ({ team: [...state.team, result.profile] }))
        }
        return result
      },
      updateTeamMember: async (id, data) => {
        if (!isSupabaseConfigured) {
          set(state => ({ team: state.team.map(m => m.id === id ? { ...m, ...data } : m) }))
          return
        }
        const updated = await profilesService.update(id, data)
        set(state => ({ team: state.team.map(m => m.id === id ? updated : m) }))
        // Se foi o próprio usuário, atualiza também currentUser
        if (id === get().currentUser?.id) {
          set({ currentUser: updated })
        }
      },
      deleteTeamMember: async (id) => {
        if (!isSupabaseConfigured) {
          set(state => ({ team: state.team.filter(m => m.id !== id) }))
          return
        }
        await profilesService.remove(id)
        set(state => ({ team: state.team.filter(m => m.id !== id) }))
      },

      // ============ APPOINTMENTS ============
      appointments: [],
      addAppointment: async (apt) => {
        const user = get().currentUser
        const payload = { ...apt, created_by: user?.id, updated_by: user?.id }

        if (!isSupabaseConfigured) {
          const newApt = { ...payload, id: generateId(), created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          set(state => ({ appointments: [...state.appointments, newApt] }))
          return newApt
        }

        // Supabase-puro: erro propaga pra UI
        const created = await appointmentsService.create(cleanPayload(payload))
        set(state => {
          if (state.appointments.some(a => a.id === created.id)) return state
          return { appointments: [...state.appointments, created] }
        })
        return created
      },

      updateAppointment: async (id, data) => {
        const user = get().currentUser
        const payload = { ...data, updated_by: user?.id }

        if (!isSupabaseConfigured) {
          set(state => ({
            appointments: state.appointments.map(a =>
              a.id === id ? { ...a, ...payload, updated_at: new Date().toISOString() } : a
            )
          }))
          return
        }
        const updated = await appointmentsService.update(id, cleanPayload(payload))
        set(state => ({
          appointments: state.appointments.map(a => a.id === id ? updated : a)
        }))
      },

      deleteAppointment: async (id) => {
        if (!isSupabaseConfigured) {
          set(state => ({ appointments: state.appointments.filter(a => a.id !== id) }))
          return
        }
        await appointmentsService.remove(id)
        set(state => ({ appointments: state.appointments.filter(a => a.id !== id) }))
      },

      getAppointmentById: (id) => get().appointments.find(a => a.id === id),

      // ============ DEMANDS ============
      demands: [],
      demandHistory: {},

      addDemand: async (demand) => {
        const user = get().currentUser
        const payload = { ...demand, created_by: user?.id, updated_by: user?.id }

        if (!isSupabaseConfigured) {
          const id = generateId()
          const newDemand = { ...payload, id, created_at: new Date().toISOString(), updated_at: new Date().toISOString() }
          set(state => ({
            demands: [...state.demands, newDemand],
            demandHistory: { ...state.demandHistory, [id]: [] }
          }))
          return newDemand
        }

        const created = await demandsService.create(cleanPayload(payload))
        try { await historyService.add(created.id, 'Criação', 'Demanda cadastrada', user?.id) } catch (e) { console.warn('history:', e.message) }
        set(state => {
          if (state.demands.some(d => d.id === created.id)) return state
          return {
            demands: [...state.demands, created],
            demandHistory: { ...state.demandHistory, [created.id]: [] }
          }
        })
        return created
      },

      updateDemand: async (id, data, historyNote = '') => {
        const user = get().currentUser
        const current = get().demands.find(d => d.id === id)

        if (!isSupabaseConfigured) {
          set(state => ({
            demands: state.demands.map(d =>
              d.id === id ? { ...d, ...data, updated_at: new Date().toISOString() } : d
            )
          }))
          return
        }

        const updated = await demandsService.update(id, cleanPayload({ ...data, updated_by: user?.id }))
        set(state => ({
          demands: state.demands.map(d => d.id === id ? updated : d)
        }))

        try {
          if (historyNote) await historyService.add(id, 'Atualização', historyNote, user?.id)
          if (data.status && current?.status !== data.status) {
            await historyService.add(id, 'Mudança de status', `Status alterado para "${data.status}"`, user?.id)
          }
        } catch (e) { console.warn('history:', e.message) }
      },

      deleteDemand: async (id) => {
        if (!isSupabaseConfigured) {
          set(state => ({ demands: state.demands.filter(d => d.id !== id) }))
          return
        }
        await demandsService.remove(id)
        set(state => ({ demands: state.demands.filter(d => d.id !== id) }))
      },

      getDemandById: (id) => get().demands.find(d => d.id === id),
      getDemandHistory: (id) => get().demandHistory[id] || [],

      loadDemandHistory: async (id) => {
        if (!isSupabaseConfigured) return
        try {
          const history = await historyService.listByDemand(id)
          set(state => ({ demandHistory: { ...state.demandHistory, [id]: history } }))
        } catch (e) { console.error(e) }
      },

      // ============ NOTES ============
      notes: [],
      addNote: async (note) => {
        const user = get().currentUser
        const payload = { ...note, created_by: user?.id }

        if (!isSupabaseConfigured) {
          set(state => ({ notes: [...state.notes, { ...payload, id: generateId(), created_at: new Date().toISOString() }] }))
          return
        }

        const created = await notesService.create(cleanPayload(payload))
        set(state => {
          if (state.notes.some(n => n.id === created.id)) return state
          return { notes: [...state.notes, created] }
        })
      },
      updateNote: async (id, data) => {
        if (!isSupabaseConfigured) {
          set(state => ({ notes: state.notes.map(n => n.id === id ? { ...n, ...data } : n) }))
          return
        }
        const updated = await notesService.update(id, cleanPayload(data))
        set(state => ({ notes: state.notes.map(n => n.id === id ? updated : n) }))
      },
      deleteNote: async (id) => {
        if (!isSupabaseConfigured) {
          set(state => ({ notes: state.notes.filter(n => n.id !== id) }))
          return
        }
        await notesService.remove(id)
        set(state => ({ notes: state.notes.filter(n => n.id !== id) }))
      },

      // ============ NOTIFICATIONS ============
      notifications: [],
      addNotification: (notif) => set(state => ({
        notifications: [{ ...notif, id: generateId(), read: false, created_at: new Date().toISOString() }, ...state.notifications]
      })),
      markNotificationRead: (id) => set(state => ({
        notifications: state.notifications.map(n => n.id === id ? { ...n, read: true } : n)
      })),
      markAllNotificationsRead: () => set(state => ({
        notifications: state.notifications.map(n => ({ ...n, read: true }))
      })),

      // ============ THEME / UI ============
      darkMode: false,
      toggleDarkMode: () => set(state => ({ darkMode: !state.darkMode })),
      sidebarOpen: true,
      toggleSidebar: () => set(state => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open) => set({ sidebarOpen: open }),

      // ============ REALTIME ============
      setupRealtime: () => {
        if (!isSupabaseConfigured) return () => {}

        const subs = [
          // Appointments
          supabase.channel('rt-appointments')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'appointments' }, (payload) => {
              set(state => ({ appointments: applyRealtimeChange(state.appointments, payload) }))
            })
            .subscribe(),
          // Demands
          supabase.channel('rt-demands')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'demands' }, (payload) => {
              set(state => ({ demands: applyRealtimeChange(state.demands, payload) }))
            })
            .subscribe(),
          // Notes
          supabase.channel('rt-notes')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'notes' }, (payload) => {
              set(state => ({ notes: applyRealtimeChange(state.notes, payload) }))
            })
            .subscribe(),
          // Profiles (mudanças de permissão, novos membros)
          supabase.channel('rt-profiles')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, (payload) => {
              set(state => ({ team: applyRealtimeChange(state.team, payload) }))
              // Se o profile do usuário atual mudou, atualiza currentUser
              const me = get().currentUser
              if (me && payload.new && payload.new.id === me.id) {
                set({ currentUser: payload.new })
              }
            })
            .subscribe(),
          // Settings
          supabase.channel('rt-settings')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'settings' }, (payload) => {
              if (payload.new) set({ settings: payload.new })
            })
            .subscribe(),
        ]

        return () => subs.forEach(ch => supabase.removeChannel(ch))
      },

      resetToDemo: () => set({ settings: mockSettings, team: [], appointments: [], demands: [], demandHistory: {}, notes: [] }),
    }),
    {
      name: 'agenda-politica-storage',
      partialize: (state) => ({
        // Só persistimos preferências locais. Dados sempre vêm do servidor.
        settings: state.settings,
        darkMode: state.darkMode,
      }),
    }
  )
)

export default useStore
