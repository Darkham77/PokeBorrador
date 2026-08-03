import { loadBestSave } from '@/logic/auth/loadService'
import { gsap } from 'gsap'
import { saveGame as performSave } from '@/logic/auth/saveService'
import { useLoadingStore } from '@/stores/loading'
import { useUIStore } from '@/stores/ui'
import type { GameState, ClaimItem } from '@/types/system/game'
import type { AuthUser } from '@/types/auth/auth'
import type { Ref } from 'vue'
import { logger } from '@/logic/utils/logger'
import type { DBRouter } from '@/logic/db/dbRouter'

export function useSaveActions(
  state: GameState, 
  authStore: { user: AuthUser | null, logout?: () => Promise<void> }, 
  db: Ref<DBRouter>, 
  updateState: (data: GameState) => void,
  isSandboxActive: Ref<boolean>
) {
  const uiStore = useUIStore()
  const loadingStore = useLoadingStore()
  let sessionStartTime: number | null = null;

  async function loadGame() {
    loadingStore.start('game_data', 'Cargando datos...', 'Leyendo partida guardada', false, '📂')
    
    if (isSandboxActive.value) {
      loadingStore.finish('game_data')
      return { success: true }
    }
    
    if (!authStore.user) {
      return { success: true, guest: true }
    }
    
    let data: GameState | null = null;
    let issues: string[] = []; // no-domain
    let lastSaveId: string | null = null;
    let isNewerThanCloud: boolean | undefined;
    let attempts = 0;
    const maxAttempts = 2;
    let lastError: unknown = null;

    while (attempts < maxAttempts) {
      try {
        const result = await loadBestSave(authStore.user as AuthUser, db.value);
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
        logger.warn('LOAD', `Intento ${attempts} de carga fallido: ${(error as Error).message}`);
        
        if (attempts < maxAttempts) {
          loadingStore.setProgress('game_data', 'Conexión lenta...', `Reintentando (${attempts}/${maxAttempts})...`);
          await new Promise(resolve => gsap.delayedCall(1.5, resolve));
        }
      }
    }
    
    if (!data && lastError) {
      logger.error('LOAD', `Todos los intentos de carga fallaron: ${(lastError as Error).message}`);
      
      const err = lastError as Error;
      const isTimeout = err.message === 'LOAD_TIMEOUT';
      const isNetworkError = err.message && (
        err.message.toLowerCase().includes('fetch') || // text-ok
        err.message.toLowerCase().includes('network') // text-ok
      );
      
      if (isTimeout || isNetworkError || !navigator.onLine) {
        if (!navigator.onLine) {
          loadingStore.setProgress('game_data', 'Sin conexión a Internet', 'Esperando señal para reintentar...');
          window.addEventListener('online', () => { window.location.reload(); }, { once: true });
          return { success: false, offline: true };
        } else {
          const retryCount = typeof sessionStorage !== 'undefined' ? parseInt(sessionStorage.getItem('load_retry_count') || '0') : 0;
          
          if (retryCount >= 9) {
            if (typeof sessionStorage !== 'undefined') {
              sessionStorage.setItem('load_retry_count', '0');
            }
            loadingStore.setProgress('game_data', 'Error de conexión persistente', 'Redireccionando al inicio de sesión...');
            if (authStore.logout) {
              authStore.logout();
            } else {
              window.location.reload();
            }
            return { success: false, error: true };
          }

          if (typeof sessionStorage !== 'undefined') {
            sessionStorage.setItem('load_retry_count', (retryCount + 1).toString());
          }

          if (retryCount < 1) {
            loadingStore.setProgress('game_data', 'Red inestable...', 'Reconectando al servidor...');
            window.location.reload();
            return { success: false, reconnecting: true };
          } else {
            loadingStore.setProgress('game_data', 'Error de conexión', 'La red no responde. Toca en cualquier lugar para reintentar.');
            window.addEventListener('click', () => {
              window.location.reload();
            }, { once: true });
            return { success: false, error: true };
          }
        }
      }
      
      // Abort loading and prevent overwriting the save with a blank state
      loadingStore.finish('game_data');
      return { success: false, error: true };
    }
    
    if (data && authStore.user) {
      if (!data.trainer && authStore.user.user_metadata?.username) {
        data.trainer = authStore.user.user_metadata.username
      }
      updateState(data)
      sessionStartTime = Temporal.Now.instant().epochMilliseconds
      authStore.user.last_save_id = lastSaveId || undefined
      
      if (issues && issues.length > 0) {
        logger.warn('LOAD', 'Saneamiento realizado:', issues)
        uiStore.notify('Partida saneada y cargada', '🛡️')
      } else {
        uiStore.notify(`¡Bienvenido, ${state.trainer || authStore.user.user_metadata?.username}!`, '👋')
      }

      if (authStore.user && (authStore.user.db_version || 0) < 3) {
        authStore.user.db_version = 3
      }

      if (isNewerThanCloud) {
        uiStore.notify('Sincronizando progreso local más reciente...', '🔄')
        gsap.delayedCall(3.0, () => save(false))
      }
    } else if (!data && authStore.user) {
      state.trainer = authStore.user.user_metadata?.username || 'Entrenador'
      state.gender = authStore.user.user_metadata?.gender || 'h'
      sessionStartTime = Temporal.Now.instant().epochMilliseconds
      // Guardar inmediatamente la partida inicial en la base de datos local
      save(false)
    }
    
    loadingStore.finish('game_data')
    return { success: true }
  }

  async function save(showNotif = true) {
    // Security Guard: Prevent writing a blank/corrupted save state
    const pokemonCount = (state.team?.length || 0) + (state.box?.length || 0);
    const isGtsSimulation = typeof window !== 'undefined' && window.__GTS_SIMULATION__ === true;
    if (!isGtsSimulation && (pokemonCount === 0 || !state.starterChosen)) {
      logger.warn('SAVE', `Guardado abortado: El jugador tiene ${pokemonCount} Pokémon y starterChosen es ${state.starterChosen}. Prevenida sobreescritura destructiva.`);
      return { success: false, error: 'Cannot save with 0 Pokémon or unchosen starter' };
    }

    // Guard: Prevent saving during evolution or move learning to prevent state regression/loss
    try {
      const { useModalStore } = await import('@/stores/modals.ts');
      const modalStore = useModalStore();
      if (modalStore.isOpen('Evolution') || modalStore.isOpen('MoveLearning')) {
        logger.warn('SAVE', 'Guardado abortado: El jugador está en medio de una evolución o aprendizaje de movimientos.');
        return { success: false, error: 'Cannot save during evolution or move learning' };
      }
    } catch (e) {
      logger.warn('SAVE', 'No se pudo validar el estado de los modales para el guardado:', e);
    }

    if (isSandboxActive.value) {
      if (typeof window !== 'undefined') {
        localStorage.setItem('pvs_sandbox_save', JSON.stringify(state))
      }
      return { success: true }
    }
    if (!authStore.user) return { success: false }

    if (sessionStartTime !== null) {
      const now = Temporal.Now.instant().epochMilliseconds;
      const elapsedSecs = Math.floor((now - sessionStartTime) / 1000);
      if (elapsedSecs > 0) {
        state.playtime = (state.playtime || 0) + elapsedSecs;
        sessionStartTime = now;
      }
    } else {
      sessionStartTime = Temporal.Now.instant().epochMilliseconds;
    }
    
    // Check session lock (Last-In-Wins)
    const { isSaveLocked } = await import('@/logic/auth/sessionHub')
    const locked = isSaveLocked()
    
    if (locked) {
      logger.warn('SAVE', 'Sesión bloqueada. Solo se realizará guardado LOCAL.')
    }
    const notifyFn = uiStore.notify
    const result = await performSave(state, authStore.user, { 
      showNotif, 
      notifyFn, 
      db: db.value,
      userVersion: authStore.user.db_version,
      lastSaveId: authStore.user.last_save_id,
      skipRemote: locked
    }) as { success: boolean, migrated?: boolean, lastSaveId?: string, rollback?: boolean, outOfSync?: boolean, error?: string, remote?: boolean }

    if (result) {
      if (result.migrated) authStore.user.db_version = 3
      if (result.lastSaveId) authStore.user.last_save_id = result.lastSaveId
      
      if (result.rollback) {
        if (result.outOfSync) notifyFn('Desincronización detectada. Restaurando...', '🔄');
        else notifyFn('Actualización detectada. Cargando partida desde la base de datos...', '📥');
        
        let rollbackData = (result as { serverData?: GameState }).serverData; // domain-ok
        let freshSaveId = result.lastSaveId;
        
        if (!rollbackData && db.value) {
          const freshRes = await db.value.from('game_saves').select('save_data, last_save_id').eq('user_id', authStore.user.id).single();
          const freshSave = freshRes.data as { save_data: GameState; last_save_id: string } | null; // domain-ok
          if (freshSave) {
            rollbackData = freshSave.save_data;
            freshSaveId = freshSave.last_save_id;
          }
        }
        
        if (rollbackData && authStore.user) {
          const user = authStore.user;
          updateState(rollbackData);
          if (freshSaveId) {
            user.last_save_id = freshSaveId;
          }
          // Actualizar localStorage y OPFS para evitar bucles de carga de datos obsoletos
          (async () => {
            try {
              const json = JSON.stringify(rollbackData);
              localStorage.setItem('pokemon_local_save_' + user.id, json);

              const { writeOpfsFile } = await import('@/logic/utils/opfsStorage');
              const { compress } = await import('@/logic/utils/compression');
              const compressed = await compress(json);
              await writeOpfsFile(`save_${user.id}.gz`, compressed);
              logger.info('SAVE', 'Rollback local storage (LS/OPFS) updated successfully');
            } catch (e) {
              logger.warn('SAVE', 'Error al actualizar almacenamiento local (LS/OPFS) durante el rollback:', e);
            } finally {
              await Promise.resolve();
              if (typeof window !== 'undefined') window.location.reload();
            }
          })();
        }
      }
    }
    return result || { success: false }
  }

  async function scheduleSave() {
    await save(false)
  }

  async function claimAsset(claimId: string | number) {
    if (isSandboxActive.value) return false
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
      logger.error('CLAIM', `Error al reclamar activo: ${(e as Error).message}`)
      uiStore.notify('Error al reclamar activo', '❌')
      return false
    }
    return false
  }

  async function fetchClaimQueue() {
    if (isSandboxActive.value) return
    if (!authStore.user || !db.value) return
    const claimRes = await db.value.from('claim_queue')
      .select('*')
      .eq('user_id', authStore.user.id)
      .order('created_at', { ascending: true })
    const data = claimRes.data as ClaimItem[] | null // domain-ok
    const error = claimRes.error
    if (!error) state.claimQueue = data || []
  }

  return { loadGame, save, scheduleSave, claimAsset, fetchClaimQueue }
}
