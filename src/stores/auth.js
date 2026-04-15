import { defineStore } from 'pinia'
import { ref } from 'vue'
import { supabase } from '@/logic/supabase'

export const useAuthStore = defineStore('auth', () => {
  const user = ref(null)
  const session = ref(null)
  const loading = ref(true)

  const SUPABASE_URL = 'https://wakrkvizmoqdlrtnxcth.supabase.co'
  const LOCAL_URL = 'http://localhost:3000'

  async function checkSession() {
    // 0. Respetar bloqueo manual de auto-login
    if (sessionStorage.getItem('block_autologin') === 'true') {
      console.log('[AuthStore] Auto-login bloqueado por sesión cerrada manualmente.');
      sessionStorage.removeItem('block_autologin');
      await logout();
      loading.value = false;
      return;
    }

    loading.value = true;
    try {
      const { data } = await supabase.auth.getSession()
      session.value = data.session
      
      if (data.session?.user) {
        user.value = data.session.user
      } else {
        // Buscar sesión local
        const localUser = localStorage.getItem('pokevicio_local_user')
        if (localUser) {
          user.value = JSON.parse(localUser)
          if (typeof supabase.setOfflineMode === 'function') {
            supabase.setOfflineMode(true)
          }
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
    
    // Persistir servidor para motor legacy
    localStorage.setItem('currentServer', SUPABASE_URL)
    if (typeof window !== 'undefined') window.currentServer = SUPABASE_URL
    if (typeof supabase.setOfflineMode === 'function') supabase.setOfflineMode(false)

    session.value = data.session
    user.value = data.user
    return data
  }

  async function logout() {
    console.log('[AuthStore] Iniciando cierre de sesión profundo...');
    try {
      await supabase.auth.signOut();
    } catch (e) {
      console.warn('SignOut error:', e);
    }

    // Limpieza agresiva de localStorage
    const sbKey = Object.keys(localStorage).find(k => k.startsWith('sb-') && k.endsWith('-auth-token'));
    if (sbKey) localStorage.removeItem(sbKey);
    
    localStorage.removeItem('pokevicio_local_user');
    localStorage.removeItem('isOffline');
    localStorage.removeItem('currentServer');
    
    user.value = null;
    session.value = null;
    
    // Asegurar que el flag de bloqueo esté presente para el próximo ciclo
    sessionStorage.setItem('block_autologin', 'true');
    
    console.log('[AuthStore] Sesión cerrada. Redirigiendo...');
    // Redirigir al inicio para limpiar el estado completo de la SPA
    window.location.href = '/?logout=' + Date.now();
  }

  async function localLogin(name) {
    loading.value = true
    try {
      // Persistir servidor para motor legacy
      localStorage.setItem('currentServer', LOCAL_URL)
      if (typeof window !== 'undefined') window.currentServer = LOCAL_URL
      if (typeof supabase.setOfflineMode === 'function') {
        supabase.setOfflineMode(true)
      }
      
      const userData = {
        id: 'local_' + name.toLowerCase(),
        email: name + '@local', // Formato consistente con legacy
        user_metadata: { full_name: name, username: name }
      }
      user.value = userData
      localStorage.setItem('pokevicio_local_user', JSON.stringify(userData))
    } finally {
      loading.value = false
    }
  }

  return {
    user,
    session,
    loading,
    checkSession,
    login,
    logout,
    localLogin
  }
})
