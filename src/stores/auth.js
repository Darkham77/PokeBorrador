import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { supabase } from '@/logic/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)
  const sessionId = ref(crypto.randomUUID ? crypto.randomUUID() : Math.random().toString(36).substring(2))
  const sessionConflict = ref(false)
  const sessionMode = ref(localStorage.getItem('pokevicio_session_mode') || 'online') // 'online' | 'offline'
  const isOnline = ref(navigator.onLine)
  const connectionLost = ref(false)

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
      await logout()
      loading.value = false
      return
    }

    loading.value = true
    try {
      // 1. Verificar sesión de Supabase
      const { data } = await supabase.auth.getSession()
      
      if (data.session?.user) {
        session.value = data.session
        user.value = data.session.user
        sessionMode.value = 'online'
        if (typeof supabase.initSession === 'function') {
          await supabase.initSession(user.value.id, sessionId.value)
        }
      } else {
        // 2. Si no hay sesión online, buscar local
        const localUser = localStorage.getItem('pokevicio_local_user')
        if (localUser) {
          user.value = JSON.parse(localUser)
          sessionMode.value = 'offline'
        }
      }
    } catch (e) {
      console.warn('CheckSession error:', e)
    } finally {
      loading.value = false
    }
  }

  async function login(email, password) {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password
    })
    if (error) throw error
    
    session.value = data.session
    user.value = data.user
    sessionMode.value = 'online'
    connectionLost.value = !navigator.onLine

    if (typeof supabase.initSession === 'function' && data.user) {
      await supabase.initSession(data.user.id, sessionId.value)
    }

    return data
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
      connectionLost.value = false // En offline no importa el estado de red
      localStorage.setItem('pokevicio_local_user', JSON.stringify(userData))
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
    
    user.value = null
    session.value = null
    sessionMode.value = 'online'
    connectionLost.value = false
    
    sessionStorage.setItem('block_autologin', 'true')
    window.location.href = '/?logout=' + Date.now()
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
    logout,
    localLogin
  }
})
