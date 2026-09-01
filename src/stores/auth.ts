import { defineStore } from 'pinia'
import { ref, watch } from 'vue'
import { logger } from '@/logic/utils/logger.ts'
import { supabase } from '@/logic/db/supabase.ts'
import { syncServerTime } from '@/logic/auth/timeSync.ts'
import { useLoadingStore } from '@/stores/loading.ts'
import { useModalStore } from '@/stores/modals.ts'
import { useGameStore } from './game.ts'
import { safeStorage } from '@/logic/utils/storage.ts'
import { SESSION_ID } from '@/logic/auth/sessionId.ts'
import type { AuthUser, SessionMode } from '@/types/auth/auth.ts'
import { requireGenderId, type GenderId } from '@/types/system/game.ts'
import type { Session } from '@supabase/supabase-js'
import {
  fetchOnlineSessionWithRetry,
  recordSessionIdInProfile,
  fetchProfileMetadata,
  enrichAuthUser
} from './auth/authSessionVerifier.ts'

const isLocalhost = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1')

export const useAuthStore = defineStore('auth', () => {
  const user = ref<AuthUser | null>(null)
  const session = ref<Session | null>(null)
  const loading = ref(true)
  const sessionId = ref(SESSION_ID)
  const sessionConflict = ref(false)
  const sessionMode = ref<SessionMode>((safeStorage.getItem('pokevicio_session_mode') as SessionMode) || (isLocalhost ? 'offline' : 'online')) // 'online' | 'offline'
  const isOnline = ref(navigator.onLine)
  const connectionLost = ref(false)
  const isBanned = ref(false)
  const banReason = ref('')

  // Monitoreo de Conectividad (Solo para modo Online)
  if (typeof window !== 'undefined') {
    window.addEventListener('online', () => {
      isOnline.value = true
      if (sessionMode.value === 'online') connectionLost.value = false
    })
    window.addEventListener('offline', () => {
      isOnline.value = false
      if (sessionMode.value === 'online') {
        logger.warn('Auth', 'Conexión perdida en modo Online. Activando advertencia.')
        connectionLost.value = true
      }
    })

    // Escuchar conflictos de sesión única
    window.addEventListener('session-conflict', () => {
      logger.error('AuthStore', 'Conflicto de sesión detectado. Bloqueando acceso.')
      sessionConflict.value = true
      
      // Auto-open modal via ModalStore
      try {
        const modalStore = useModalStore()
        modalStore.open('SessionConflict')
      } catch (e) {
        logger.error('AuthStore', `Failed to open SessionConflict modal: ${(e as Error).message}`)
      }
    })
    // Escuchar errores de conexión a la base de datos (Supabase unreachability)
    window.addEventListener('db-connection-error', () => {
      if (sessionMode.value === 'online') {
        logger.warn('AuthStore', 'Error de conexión a DB detectado.')
        connectionLost.value = true
      }
    })
  }

  // Guardar modo de sesión para persistencia en recarga
  watch(sessionMode, (newMode) => {
    safeStorage.setItem('pokevicio_session_mode', newMode)
  })

  // Persistir cambios en el usuario local (como db_version) para evitar re-migraciones
  watch(user, (newUser) => {
    if (sessionMode.value === 'offline' && newUser) {
      safeStorage.setItem('pokevicio_local_user', JSON.stringify(newUser))
    }
  }, { deep: true })

  async function checkSession() {
    if (sessionStorage.getItem('block_autologin') === 'true') {
      sessionStorage.removeItem('block_autologin')
      user.value = null
      session.value = null
      loading.value = false
      return
    }

    loading.value = true
    useLoadingStore().start('auth_init', 'Iniciando sesión...', 'Conectando con el servidor', false, '📶')
    try {
      if (sessionMode.value === 'online') {
        // Sincronizar el enrutador en modo online antes de pedir la sesión
        if (supabase && typeof supabase.setMode === 'function') {
          supabase.setMode('online')
        }

        const onlineSession = await fetchOnlineSessionWithRetry(2)
        
        if (onlineSession?.user) {
          const rawUser = onlineSession.user as AuthUser
          const isLocalId = rawUser?.id === 'local_user' || rawUser?.id?.startsWith('local_')
          
          let sessionValid = true
          if (!isLocalId) {
            sessionValid = await recordSessionIdInProfile(rawUser.id, sessionId.value)
          }

          const profileData = isLocalId ? {
            dbVersion: 1,
            userGender: requireGenderId('h'),
            userRole: undefined,
            isUserBanned: false,
            banMsg: 'Uso indebido de la plataforma',
            sessionValid: true,
          } : await fetchProfileMetadata(rawUser.id)

          if (profileData.isUserBanned) {
            isBanned.value = true
            banReason.value = profileData.banMsg
            await logout()
            return
          }

          if ((!sessionValid || !profileData.sessionValid) && !isLocalId) {
            logger.error('Auth', 'Session validation failed. Forcing logout with warning.')
            sessionStorage.setItem('pokevicio_logout_reason', 'session_invalidated')
            await logout()
            return
          }

          user.value = enrichAuthUser(rawUser, profileData)
          session.value = onlineSession
          sessionMode.value = 'online'

          startSessionMonitoring()
          syncServerTime()
          return // Finalizamos con éxito online
        }
      }

      // Si llegamos aquí, o estamos en modo offline o falló la sesión online
      // 2. Si no hay sesión online, buscar local
      const localUser = safeStorage.getItem('pokevicio_local_user')
      if (localUser) {
        user.value = JSON.parse(localUser) as AuthUser
        sessionMode.value = 'offline'
        if (supabase && typeof supabase.setMode === 'function') {
          supabase.setMode('offline')
        }
        if (user.value && !user.value.db_version) user.value.db_version = 1
      }
    } catch (e) {
      logger.warn('Auth', `CheckSession failed or timed out: ${(e as Error).message}`)
      // En caso de error/timeout, si hay usuario local, lo mantenemos como fallback
      const localUser = safeStorage.getItem('pokevicio_local_user')
      if (localUser && !user.value) {
        user.value = JSON.parse(localUser) as AuthUser
        sessionMode.value = 'offline'
        if (supabase && typeof supabase.setMode === 'function') {
          supabase.setMode('offline')
        }
      }
    } finally {
      loading.value = false
      useLoadingStore().finish('auth_init')
      logger.debug('Auth', `CheckSession finished. Loading: ${loading.value}`)
    }
  }

  async function login(email: string, password: string) {
    const loadingStore = useLoadingStore()
    loadingStore.start('auth_action', 'Verificando credenciales...', 'Por favor espera', true, '🔑')
    
    try {
      if (supabase && typeof supabase.setMode === 'function') {
        supabase.setMode('online')
      }
      const { data, error } = await supabase.auth.signInWithPassword({ email, password })
      if (error) throw error
      
      session.value = data.session
      user.value = data.user as AuthUser
      sessionMode.value = 'online'
      safeStorage.setItem('pokevicio_session_mode', 'online')
      if (supabase && typeof supabase.setMode === 'function') {
        supabase.setMode('online')
      }
      
      // Registrar sesión
      const updateRes = await supabase.from('profiles').update({ current_session_id: sessionId.value }).eq('id', data.user.id) as { error?: { message?: string } | null }
      const updateError = updateRes?.error
      if (updateError) {
        logger.error('Auth', `Login session update failed: ${updateError.message}`)
        throw new Error(`Error de verificación de sesión: ${updateError.message || 'Error desconocido'}`)
      }
      
      interface ProfileData {
        db_version: number;
        is_banned: boolean;
        ban_reason: string | null;
        gender?: GenderId;
      }
      const profileRes = await supabase.from('profiles').select('db_version, is_banned, ban_reason, gender').eq('id', data.user.id).single() as { data: ProfileData | null, error?: { message?: string } | null }
      const profile = profileRes.data
      const profileError = profileRes.error
      
      if (profileError) {
        logger.error('Auth', `Login profile fetch failed: ${profileError.message}`)
        throw new Error(`Error de perfil: ${profileError.message || 'Error de lectura de perfil'}`)
      }
      
      if (profile?.is_banned) {
        isBanned.value = true
        banReason.value = profile.ban_reason || 'Uso indebido de la plataforma'
        await supabase.auth.signOut()
        user.value = null
        session.value = null
        throw new Error('BAN:' + banReason.value)
      }

      if (profile && user.value) {
        user.value.db_version = profile.db_version || 1
        if (!user.value.user_metadata) {
          user.value.user_metadata = { username: user.value.email || 'user' }
        }
        user.value.user_metadata.gender = profile.gender || 'h'
      }
      
      startSessionMonitoring()
      syncServerTime()
      return data
    } finally {
      loadingStore.finish('auth_action')
    }
  }

  async function signup(email: string, password: string, username: string, gender: GenderId = 'h') {
    const { data, error } = await supabase.auth.signUp({ 
      email, 
      password, 
      options: { data: { username, gender } } 
    })
    if (error) throw error
    if (!data.user) throw new Error('No user created')
    
    // Crear perfil inicial
    await supabase.from('profiles').upsert({ 
      id: data.user.id, 
      username, 
      email, 
      gender,
      db_version: 3,
      created_at: Temporal.Now.instant().toString() 
    })
    
    return data
  }

  async function checkDbConnectivity(): Promise<boolean> {
    try {
      const { error } = await supabase.from('profiles').select('id').limit(1).maybeSingle()
      return !error
    } catch (_) {
      return false
    }
  }

  function startSessionMonitoring() {
    if (!user.value || sessionMode.value === 'offline') return
    
    // Suscribirse al canal para monitorear el estado de la conexión
    supabase.channel(`session_check_${user.value.id}`)
      .subscribe(async (status: string) => {
        if (status === 'SUBSCRIBED') {
          connectionLost.value = false
        }
        if (status === 'CLOSED' || status === 'CHANNEL_ERROR') {
          if (sessionMode.value === 'online') {
            logger.warn('SESSION', 'Conexión con el servidor perdida (Realtime). Verificando conectividad HTTP...')
            const isHttpOk = await checkDbConnectivity()
            if (!isHttpOk) {
              logger.warn('SESSION', 'Pérdida temporal de conexión HTTP. Reconectando en segundo plano...')
              connectionLost.value = true
            } else {
              logger.info('SESSION', 'Conexión HTTP activa. Desconectando Realtime para evitar spam y continuando en modo degradado.')
              connectionLost.value = false
              
              // Desconectar Realtime para detener intentos fallidos recurrentes de WebSocket
              try {
                const client = supabase.realClient
                if (client && client.realtime) {
                  client.realtime.disconnect()
                }
              } catch (err) {
                logger.warn('Auth', `No se pudo desconectar el cliente de Realtime: ${(err as Error).message}`)
              }
            }
          }
        }
      })
  }


  async function localLogin(name: string, gender: GenderId = 'h') {
    loading.value = true
    const loadingStore = useLoadingStore()
    loadingStore.start('auth_action', 'Entrando como invitado...', 'Preparando partida local', true, '🎮')
    try {
      const userData = {
        id: 'local_' + name.toLowerCase().replace(/\s+/g, '_'), // text-ok
        email: name + '@local',
        user_metadata: { full_name: name, username: name, gender },
        db_version: 3
      }
      user.value = userData as AuthUser
      sessionMode.value = 'offline'
      safeStorage.setItem('pokevicio_session_mode', 'offline')
      if (supabase && typeof supabase.setMode === 'function') {
        supabase.setMode('offline')
      }
      connectionLost.value = false 
      safeStorage.setItem('pokevicio_local_user', JSON.stringify(userData))
      
      // Sync time will handle offline state internally
      syncServerTime()

      // En modo local no hay monitoreo de sesión online
      sessionConflict.value = false
    } finally {
      loading.value = false
      loadingStore.finish('auth_action')
    }
  }

  async function logout(preventReload = false) {
    logger.info('AuthStore', 'Iniciando cierre de sesión...')

    // Safe preventative save if game is active
    try {
      const gameStore = useGameStore()
      if (gameStore.isReady && gameStore.save) {
        logger.info('AuthStore', 'Guardando partida de forma segura antes de cerrar sesión...')
        await gameStore.save(false)
      }
    } catch (e) {
      logger.warn('AuthStore', `Error al guardar antes de cerrar sesión: ${(e as Error).message}`)
    }

    try {
      if (sessionMode.value === 'online') {
        await supabase.auth.signOut()
      }
    } catch (e) {
      logger.warn('Auth', `SignOut error: ${(e as Error).message}`)
    }

    safeStorage.removeItem('pokevicio_local_user')
    safeStorage.removeItem('pokevicio_session_mode')

    user.value = null
    session.value = null
    sessionMode.value = 'online'
    safeStorage.setItem('pokevicio_session_mode', 'online')
    if (supabase && typeof supabase.setMode === 'function') {
      supabase.setMode('online')
    }
    connectionLost.value = false
    sessionConflict.value = false

    sessionStorage.setItem('block_autologin', 'true')

    // Reload the page to reset all reactive state cleanly.
    // We do NOT unregister the Service Worker — that's what was breaking the
    // PWA standalone mode. The SW stays registered so the app remains installable
    // and the standalone layout is preserved across reloads.
    if (!preventReload && import.meta.env.MODE !== 'test') {
      window.location.reload()
    }
  }


  return {
    user,
    loading,
    sessionId,
    sessionConflict,
    sessionMode,
    isOnline,
    connectionLost,
    isBanned,
    checkSession,
    login,
    signup,
    logout,
    localLogin
  }
})
