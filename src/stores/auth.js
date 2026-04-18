import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '@/logic/supabase'
import { syncServerTime } from '@/logic/timeUtils'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const sessionId = ref(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2))
  const sessionConflict = ref(false)
  const sessionMode = ref(localStorage.getItem('pokevicio_session_mode') || 'online') // 'online' | 'offline'
  const isOnline = ref(navigator.onLine)
  const connectionLost = ref(false)
  const sessionCheckInterval = ref(null)

  // Monitoreo de Conectividad (Solo para modo Online)

  // Monitoreo de Conectividad (Solo para modo Online)
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true
      if (sessionMode.value === 'online') connectionLost.value = false
    })
    window.addEventListener('offline', () => {
      isOnline.value = false
      if (sessionMode.value === 'online') {
        console.warn('[Auth] Conexión perdida en modo Online. Activando advertencia.')
        connectionLost.value = true
      }
    })

    // Escuchar conflictos de sesión única
    window.addEventListener('session-conflict', () => {
      console.warn('[AuthStore] Conflicto de sesión detectado. Bloqueando acceso.')
      sessionConflict.value = true
    })
  }

  // Guardar modo de sesión para persistencia en recarga
  watch(sessionMode, (newMode) => {
    localStorage.setItem('pokevicio_session_mode', newMode)
  })

  async function checkSession() {
    if (sessionStorage.getItem('block_autologin') === 'true') {
      sessionStorage.removeItem('block_autologin')
      user.value = null
      session.value = null
      loading.value = false
      return
    }

    loading.value = true
    try {
      // 1. Verificar sesión con timeout de seguridad (3s) para evitar bloqueos infinitos
      const sessionPromise = supabase.auth.getSession();
      const timeoutPromise = new Promise((_, reject) => setTimeout(() => reject(new Error('TIMEOUT')), 3000));
      
      const { data } = await Promise.race([sessionPromise, timeoutPromise]);
      
      if (data?.session?.user) {
        session.value = data.session
        user.value = data.session.user
        sessionMode.value = 'online'
        if (supabase && typeof supabase.setMode === 'function') {
          supabase.setMode('online')
        }
        
        // Registrar sesión en DB para unicidad
        await supabase.from('profiles').update({ current_session_id: sessionId.value }).eq('id', user.value.id)
        startSessionMonitoring()
        
        // Fetch profile meta
        const { data: profile } = await supabase.from('profiles').select('db_version').eq('id', user.value.id).single()
        if (profile) user.value.db_version = profile.db_version || 1

        // Sync time only for online session
        syncServerTime()
      } else {
        // 2. Si no hay sesión online, buscar local
        const localUser = localStorage.getItem('pokevicio_local_user')
        if (localUser) {
          user.value = JSON.parse(localUser)
          sessionMode.value = 'offline'
          if (supabase && typeof supabase.setMode === 'function') {
            supabase.setMode('offline')
          }
          if (!user.value.db_version) user.value.db_version = 1
        }
      }
    } catch (e) {
      console.warn('[Auth] CheckSession failed or timed out:', e)
      // En caso de error/timeout, si hay usuario local, lo mantenemos como fallback
      const localUser = localStorage.getItem('pokevicio_local_user')
      if (localUser && !user.value) {
        user.value = JSON.parse(localUser)
        sessionMode.value = 'offline'
      }
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error
    
    session.value = data.session
    user.value = data.user
    sessionMode.value = 'online'
    if (supabase && typeof supabase.setMode === 'function') {
      supabase.setMode('online')
    }
    
    // Registrar sesión
    await supabase.from('profiles').update({ current_session_id: sessionId.value }).eq('id', data.user.id)
    startSessionMonitoring()

    const { data: profile } = await supabase.from('profiles').select('db_version').eq('id', data.user.id).single()
    if (profile) user.value.db_version = profile.db_version || 1
    
    syncServerTime()
    return data
  }

  async function signup(email, password, username) {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { username } } 
    })
    if (error) throw error
    
    // Crear perfil inicial
    await supabase.from('profiles').upsert({ 
      id: data.user.id, 
      username, 
      email, 
      created_at: new Date().toISOString() 
    })
    
    return data
  }

  function startSessionMonitoring() {
    if (!user.value || sessionMode.value === 'offline') return
    
    // Suscribirse a cambios en el perfil del usuario actual
    const channel = supabase.channel(`session_check_${user.value.id}`)
      .on('postgres_changes', { 
        event: 'UPDATE', 
        schema: 'public', 
        table: 'profiles', 
        filter: `id=eq.${user.value.id}` 
      }, payload => {
        const newSessionId = payload.new.current_session_id
        if (newSessionId && newSessionId !== sessionId.value) {
          console.warn('[SESSION] Nueva sesión detectada en otro lugar. Bloqueando esta pestaña.')
          sessionConflict.value = true
          // Disparar evento global para componentes que no usen el store
          window.dispatchEvent(new CustomEvent('session-conflict'))
        }
      })
      .subscribe()
  }

  async function localLogin(name) {
    loading.value = true
    try {
      const userData = {
        id: 'local_' + name.toLowerCase().replace(/\s+/g, '_'),
        email: name + '@local',
        user_metadata: { full_name: name, username: name }
      }
      user.value = userData
      sessionMode.value = 'offline'
      localStorage.setItem('pokevicio_session_mode', 'offline')
      if (supabase && typeof supabase.setMode === 'function') {
        supabase.setMode('offline')
      }
      connectionLost.value = false 
      localStorage.setItem('pokevicio_local_user', JSON.stringify(userData))
      
      // Sync time will handle offline state internally
      syncServerTime()

      // En modo local no hay monitoreo de sesión online
      sessionConflict.value = false
    } finally {
      loading.value = false
    }
  }

  async function logout() {
    console.log('[AuthStore] Iniciando cierre de sesión profundo...')
    try {
      if (sessionMode.value === 'online') {
        await supabase.auth.signOut()
      }
    } catch (e) {
      console.warn('SignOut error:', e)
    }

    localStorage.removeItem('pokevicio_local_user')
    localStorage.removeItem('pokevicio_session_mode')
    
    if (sessionCheckInterval.value) clearInterval(sessionCheckInterval.value)
    
    user.value = null
    session.value = null
    sessionMode.value = 'online'
    connectionLost.value = false
    sessionConflict.value = false
    
    sessionStorage.setItem('block_autologin', 'true')
    window.location.href = '/login?logout=' + Date.now()
  }

  return {
    user,
    session,
    loading,
    sessionId,
    sessionConflict,
    sessionMode,
    isOnline,
    connectionLost,
    checkSession,
    login,
    signup,
    logout,
    localLogin,
    startSessionMonitoring
  }
})
