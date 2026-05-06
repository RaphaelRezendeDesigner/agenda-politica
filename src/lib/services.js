import { createClient } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from './supabase'

// Cliente temporário usado apenas para criar novos usuários
// sem afetar a sessão do admin que está logado
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || ''
const tempSignupClient = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
        storageKey: 'sb-temp-signup',
      },
    })
  : null

// Helper: aplica timeout em qualquer promise
function withTimeout(promise, ms = 15000, label = 'operação') {
  return Promise.race([
    promise,
    new Promise((_, reject) =>
      setTimeout(() => reject(new Error(`Tempo esgotado (${label}). Tente novamente.`)), ms)
    ),
  ])
}

const SNAKE_TO_CAMEL = false

function handleError(error, action) {
  if (error) {
    console.error(`[Supabase] ${action}:`, error.message)
    throw error
  }
}

export const authService = {
  async signIn(email, password) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) return { error: error.message }

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', data.user.id)
      .single()

    return { user: profile || { id: data.user.id, email: data.user.email, name: data.user.email, access_level: 'visualizador' } }
  },

  // Login com Google (redireciona para Google e volta)
  async signInWithGoogle() {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }
    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: {
          access_type: 'offline',
          prompt: 'consent',
        },
      },
    })
    if (error) return { error: error.message }
    return { data }
  },

  async signOut() {
    if (!isSupabaseConfigured) return
    await supabase.auth.signOut({ scope: 'global' })
  },

  async getSession() {
    if (!isSupabaseConfigured) return null
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return null
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()
    return profile
  },

  onAuthChange(callback) {
    if (!isSupabaseConfigured) return { unsubscribe: () => {} }
    const { data } = supabase.auth.onAuthStateChange(callback)
    return data.subscription
  },
}

// Generic CRUD factory
function createCRUD(table) {
  return {
    async list() {
      const { data, error } = await supabase.from(table).select('*').order('created_at', { ascending: false })
      handleError(error, `list ${table}`)
      return data || []
    },

    async get(id) {
      const { data, error } = await supabase.from(table).select('*').eq('id', id).single()
      handleError(error, `get ${table}`)
      return data
    },

    async create(payload) {
      const { data, error } = await supabase.from(table).insert(payload).select().single()
      handleError(error, `create ${table}`)
      return data
    },

    async update(id, payload) {
      const { data, error } = await supabase.from(table).update({ ...payload, updated_at: new Date().toISOString() }).eq('id', id).select().single()
      handleError(error, `update ${table}`)
      return data
    },

    async remove(id) {
      const { error } = await supabase.from(table).delete().eq('id', id)
      handleError(error, `delete ${table}`)
    },

    subscribe(callback) {
      if (!isSupabaseConfigured) return { unsubscribe: () => {} }
      const channel = supabase
        .channel(`${table}-realtime`)
        .on('postgres_changes', { event: '*', schema: 'public', table }, callback)
        .subscribe()
      return { unsubscribe: () => supabase.removeChannel(channel) }
    },
  }
}

export const appointmentsService = createCRUD('appointments')
export const demandsService = createCRUD('demands')
export const notesService = createCRUD('notes')
export const profilesService = createCRUD('profiles')

// Serviço especial de equipe: cria usuário no auth + perfil
export const teamService = {
  // Cadastra membro com senha definida pelo admin
  async createMemberWithPassword({ email, password, name, phone, role, access_level }) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }

    try {
      // 1. Criar usuário no auth (com timeout de 10s)
      // NOTA: Não passamos emailRedirectTo aqui pois é cadastro com senha
      // (não precisa de confirmação por email)
      const signupResult = await withTimeout(
        tempSignupClient.auth.signUp({
          email,
          password,
          options: {
            data: { name, phone, role, access_level },
          },
        }),
        10000,
        'criação do usuário'
      )

      const { data: authData, error: authError } = signupResult
      if (authError) return { error: authError.message }
      if (!authData?.user?.id) return { error: 'Resposta inválida do servidor' }

      const userId = authData.user.id

      // 2. Aguardar trigger (curto)
      await new Promise(r => setTimeout(r, 800))

      // 3. Buscar profile (com timeout)
      const selectResult = await withTimeout(
        supabase.from('profiles').select('*').eq('id', userId).maybeSingle(),
        5000,
        'busca do perfil'
      )

      let profile = selectResult.data

      if (!profile) {
        return {
          error: 'O perfil não foi criado automaticamente. Verifique se o trigger SQL está ativo no Supabase.',
          authUserCreated: true,
        }
      }

      // 4. Atualizar profile (com timeout) — se falhar por RLS, devolve o profile que o trigger criou
      try {
        const updateResult = await withTimeout(
          supabase
            .from('profiles')
            .update({ name, email, phone, role, access_level })
            .eq('id', userId)
            .select()
            .maybeSingle(),
          5000,
          'atualização do perfil'
        )

        if (updateResult.data) profile = updateResult.data
        else if (updateResult.error) console.warn('Update warning:', updateResult.error.message)
      } catch (e) {
        console.warn('Update timeout/error:', e.message)
      }

      return {
        profile,
        needsConfirmation: !authData.session && !authData.user.email_confirmed_at,
      }
    } catch (e) {
      return { error: e.message || 'Erro ao criar usuário' }
    }
  },

  // Envia link de convite por e-mail (membro define senha no link)
  async sendInviteLink({ email, name, phone, role, access_level }) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }

    const redirectTo = `${window.location.origin}/setup-senha`

    const { error } = await tempSignupClient.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: redirectTo,
        data: { name, phone, role, access_level },
      },
    })

    if (error) return { error: error.message }
    return { success: true }
  },

  // Atualiza senha do usuário autenticado (usado na tela de setup)
  async setPassword(password) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }
    const { error } = await supabase.auth.updateUser({ password })
    if (error) return { error: error.message }
    return { success: true }
  },
}

export const storageService = {
  async uploadLogo(file) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }

    const ext = file.name.split('.').pop()
    const fileName = `logo-${Date.now()}.${ext}`

    const { data, error } = await supabase.storage
      .from('logos')
      .upload(fileName, file, { cacheControl: '3600', upsert: true })

    if (error) return { error: error.message }

    const { data: urlData } = supabase.storage.from('logos').getPublicUrl(fileName)
    return { url: urlData.publicUrl }
  },

  async uploadFlyer(file) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }

    const ext = file.name.split('.').pop()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 50)
    const fileName = `flyer-${Date.now()}-${safeName}`

    const { error } = await supabase.storage
      .from('flyers')
      .upload(fileName, file, { cacheControl: '3600', upsert: false })

    if (error) return { error: error.message }

    const { data: urlData } = supabase.storage.from('flyers').getPublicUrl(fileName)
    return { url: urlData.publicUrl, name: file.name, path: fileName }
  },

  async deleteFlyer(path) {
    if (!isSupabaseConfigured || !path) return
    await supabase.storage.from('flyers').remove([path])
  },
}

export const settingsService = {
  async get() {
    const { data, error } = await supabase
      .from('campaign_settings')
      .select('*')
      .limit(1)
      .single()
    if (error && error.code !== 'PGRST116') handleError(error, 'get settings')
    return data
  },

  async upsert(payload) {
    const existing = await this.get()
    if (existing) {
      const { data, error } = await supabase
        .from('campaign_settings')
        .update({ ...payload, updated_at: new Date().toISOString() })
        .eq('id', existing.id)
        .select()
        .single()
      handleError(error, 'update settings')
      return data
    } else {
      const { data, error } = await supabase
        .from('campaign_settings')
        .insert(payload)
        .select()
        .single()
      handleError(error, 'create settings')
      return data
    }
  },
}

// Códigos de convite (admin gera, novos usuários usam para entrar no grupo)
function generateRandomCode(prefix = 'AGD') {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789' // sem 0/O/I/1/L para evitar confusão
  let code = ''
  for (let i = 0; i < 6; i++) code += chars[Math.floor(Math.random() * chars.length)]
  return `${prefix}-${code}`
}

export const codesService = {
  // Gera novo código (admin)
  async generate({ role, access_level, description, expires_in_days, created_by }) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }

    const code = generateRandomCode()
    const expires_at = expires_in_days
      ? new Date(Date.now() + expires_in_days * 24 * 60 * 60 * 1000).toISOString()
      : null

    const { data, error } = await supabase
      .from('invite_codes')
      .insert({ code, role, access_level, description, expires_at, created_by })
      .select()
      .single()

    if (error) return { error: error.message }
    return { code: data }
  },

  // Lista todos os códigos (admin)
  async list() {
    if (!isSupabaseConfigured) return []
    const { data, error } = await supabase
      .from('invite_codes')
      .select('*')
      .order('created_at', { ascending: false })
    if (error) {
      console.error('list codes:', error)
      return []
    }
    return data || []
  },

  // Deleta código (admin)
  async remove(id) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }
    const { error } = await supabase.from('invite_codes').delete().eq('id', id)
    if (error) return { error: error.message }
    return { success: true }
  },

  // Valida e usa código (usuário novo)
  async useCode(code, profileData) {
    if (!isSupabaseConfigured) return { error: 'Supabase não configurado' }

    // 1. Pega usuário autenticado
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return { error: 'Você precisa estar autenticado' }

    // 2. Busca código
    const { data: codeData, error: codeError } = await supabase
      .from('invite_codes')
      .select('*')
      .eq('code', code.toUpperCase().trim())
      .maybeSingle()

    if (codeError) return { error: 'Erro ao buscar código' }
    if (!codeData) return { error: 'Código inválido ou inexistente' }
    if (codeData.used_by) return { error: 'Este código já foi usado' }
    if (codeData.expires_at && new Date(codeData.expires_at) < new Date()) {
      return { error: 'Este código expirou' }
    }

    // 3. Marca código como usado
    const { error: updateError } = await supabase
      .from('invite_codes')
      .update({ used_by: user.id, used_at: new Date().toISOString() })
      .eq('id', codeData.id)
      .is('used_by', null) // race condition guard

    if (updateError) return { error: 'Não foi possível usar este código (talvez alguém usou ao mesmo tempo)' }

    // 4. Cria profile do usuário
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .insert({
        id: user.id,
        name: profileData.name || user.user_metadata?.full_name || user.email,
        email: user.email,
        phone: profileData.phone,
        role: codeData.role || profileData.role,
        access_level: codeData.access_level || 'visualizador',
        avatar_url: user.user_metadata?.avatar_url,
      })
      .select()
      .single()

    if (profileError) {
      // Tenta atualizar se já existe
      const { data: updated } = await supabase
        .from('profiles')
        .update({
          name: profileData.name || user.user_metadata?.full_name || user.email,
          phone: profileData.phone,
          role: codeData.role || profileData.role,
          access_level: codeData.access_level || 'visualizador',
        })
        .eq('id', user.id)
        .select()
        .single()
      return { profile: updated, codeUsed: codeData }
    }

    return { profile, codeUsed: codeData }
  },
}

export const historyService = {
  async listByDemand(demandId) {
    const { data, error } = await supabase
      .from('demand_history')
      .select('*')
      .eq('demand_id', demandId)
      .order('created_at', { ascending: true })
    handleError(error, 'list history')
    return data || []
  },

  async add(demandId, action, description, userId) {
    const { data, error } = await supabase
      .from('demand_history')
      .insert({ demand_id: demandId, action, description, user_id: userId })
      .select()
      .single()
    handleError(error, 'add history')
    return data
  },
}

export { isSupabaseConfigured }
