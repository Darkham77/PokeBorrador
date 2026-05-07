import { loadBestSave } from '@/logic/auth/loadService'
import { saveGame as performSave } from '@/logic/auth/saveService'
import { useLoadingStore } from '@/stores/loading'
import { useUIStore } from '@/stores/ui'
import type { GameState, ClaimItem } from '@/types/game'
import type { AuthUser } from '@/types/auth'
import type { Ref } from 'vue'

export function useSaveActions(
  state: GameState, 
  authStore: { user: AuthUser | null }, 
  db: Ref<any>, 
  updateState: (data: GameState) => void
) {
  async function loadGame() {
    const loadingStore = useLoadingStore()
    loadingStore.start('game_data', 'Cargando datos...', 'Leyendo partida guardada', false)
    
    if (!authStore.user) {
      return { success: true, guest: true }
    }
    
    const uiStore = useUIStore()
    let data: GameState | null = null;
    let issues: string[] = [];
    let lastSaveId: string | null = null;
    let isNewerThanCloud: boolean | undefined;
    let attempts = 0;
    const maxAttempts = 2;
    let lastError: any = null;

    while (attempts < maxAttempts) {
      try {
        const loadPromise = loadBestSave(authStore.user as any, db.value)
        const timeoutPromise = new Promise((_, reject) => 
          setTimeout(() => reject(new Error('LOAD_TIMEOUT')), 8000)
        );
        
        const result = await Promise.race([loadPromise, timeoutPromise]) as { data: GameState, issues: string[], lastSaveId: string | null, isNewerThanCloud: boolean };
        data = result.data;
        issues = result.issues;
        lastSaveId = result.lastSaveId;
        isNewerThanCloud = result.isNewerThanCloud;
        
        if (typeof sessionStorage !== 'undefined') {
          sessionStorage.setItem('load_retry_count', '0');
        }
        break;
      } catch (error) {
        attempts++
        lastError = error;
        console.warn(`[LOAD] Intento ${attempts} de carga fallido:`, error);
        
        if (attempts < maxAttempts) {
          loadingStore.setProgress('game_data', 'Conexión lenta...', `Reintentando (${attempts}/${maxAttempts})...`);
          await new Promise(resolve => setTimeout(resolve, 1500));
        }
      }
    }
    
    if (!data && lastError) {
      console.error('[LOAD] Todos los intentos de carga fallaron.', lastError);
      
      const isTimeout = lastError.message === 'LOAD_TIMEOUT';
      const isNetworkError = lastError.message && (
        lastError.message.toLowerCase().includes('fetch') ||
        lastError.message.toLowerCase().includes('network')
      );
      
      if (isTimeout || isNetworkError || !navigator.onLine) {
        if (!navigator.onLine) {
          loadingStore.setProgress('game_data', 'Sin conexión a Internet', 'Esperando señal para reintentar...');
          window.addEventListener('online', () => { window.location.reload(); }, { once: true });
          return { success: false, offline: true };
        } else {
          const retryCount = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('load_retry_count') || '0') : 0;
          if (retryCount < 1) {
            if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('load_retry_count', (retryCount + 1).toString());
            loadingStore.setProgress('game_data', 'Red inestable...', 'Reconectando al servidor...');
            window.location.reload();
            return { success: false, reconnecting: true };
          } else {
            loadingStore.setProgress('game_data', 'Error de conexión', 'La red no responde. Toca en cualquier lugar para reintentar.');
            window.addEventListener('click', () => {
              if (typeof sessionStorage !== 'undefined') sessionStorage.setItem('load_retry_count', '0');
              window.location.reload();
            }, { once: true });
            return { success: false, error: true };
          }
        }
      }
    }
    
    if (data && authStore.user) {
      updateState(data)
      authStore.user.last_save_id = lastSaveId || undefined
      
      if (issues && issues.length > 0) {
        console.warn('[LOAD] Saneamiento realizado:', issues)
        uiStore.notify('Partida saneada y cargada', '🛡️')
      } else {
        uiStore.notify(`¡Bienvenido, ${state.trainer || authStore.user.user_metadata?.username}!`, '👋')
      }

      if (authStore.user.db_version < 2) authStore.user.db_version = 2

      if (isNewerThanCloud) {
        uiStore.notify('Sincronizando progreso local más reciente...', '🔄')
        setTimeout(() => save(false), 3000)
      }
    }
    
    loadingStore.finish('game_data')
    return { success: true }
  }

  async function save(showNotif = true) {
    if (!authStore.user) return
    
    const uiStore = useUIStore()
    const notifyFn = uiStore.notify
    const result = await performSave(state, authStore.user, { 
      showNotif, 
      notifyFn, 
      db: db.value,
      userVersion: authStore.user.db_version,
      lastSaveId: authStore.user.last_save_id
    }) as { success: boolean, migrated?: boolean, lastSaveId?: string, rollback?: boolean, outOfSync?: boolean, error?: string }

    if (result) {
      if (result.migrated) authStore.user.db_version = 2
      if (result.lastSaveId) authStore.user.last_save_id = result.lastSaveId
      
      if (result.rollback && db.value) {
        if (result.outOfSync) notifyFn('Desincronización detectada. Restaurando...', '🔄')
        const { data: freshSave } = await db.value.from('game_saves').select('save_data, last_save_id').eq('user_id', authStore.user.id).single()
        if (freshSave) {
          updateState(freshSave.save_data)
          authStore.user.last_save_id = freshSave.last_save_id
        }
      }
    }
  }

  async function scheduleSave() {
    await save(false)
  }

  async function claimAsset(claimId: string) {
    if (!authStore.user || !db.value) return false
    try {
      const { data, error } = await db.value.rpc('claim_asset_v2', { p_claim_id: claimId })
      if (error) throw error
      if (data) {
        updateState(data as GameState)
        state.claimQueue = state.claimQueue.filter((c: ClaimItem) => c.id !== claimId)
        return true
      }
    } catch (e) {
      console.error('[CLAIM ERROR]', e)
      useUIStore().notify('Error al reclamar activo', '❌')
      return false
    }
    return false
  }

  async function fetchClaimQueue() {
    if (!authStore.user || !db.value) return
    const { data, error } = await db.value.from('claim_queue')
      .select('*')
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: true })
    if (!error) state.claimQueue = data || []
  }

  return { loadGame, save, scheduleSave, claimAsset, fetchClaimQueue }
}
