
import { logger } from '@/logic/utils/logger'
import { gsap } from 'gsap'
import type { DebugSystem, DebugContext } from '@/stores/debug'

export function registerSystemTools(debug: DebugSystem, { game, ui, modalStore, errorStore, eventStoreModule }: DebugContext) {
  // MODALS
  debug.register({
    id: 'modal-test-stack',
    label: 'TEST MODAL STACK',
    command: 'testModalStack',
    category: 'modals',
    action: async (count: number = 5) => {
      for (let i = 1; i <= count; i++) {
        modalStore.open('DebugStackTest', { number: i })
        if (i < count) await new Promise(resolve => gsap.delayedCall(0.5, resolve))
      }
    },
    description: 'Abre múltiples ventanas modales secuencialmente para probar el sistema de capas.'
  })

  debug.register({
    id: 'modal-close-all',
    label: 'CERRAR TODO',
    command: 'closeAllModals',
    category: 'modals',
    action: () => {
      modalStore.closeAll()
      ui.notify('Todas las ventanas cerradas', '🚪')
    },
    description: 'Cierra todas las ventanas modales activas.'
  })

  debug.register({
    id: 'modal-test-pos',
    label: 'TEST MODAL POS',
    command: 'openTestModal',
    category: 'modals',
    action: (type: string = 'center') => {
      modalStore.open('DebugStackTest', { 
        number: Math.floor(Math.random() * 100),
        type 
      })
    },
    description: 'Abre un modal de prueba con el posicionamiento especificado (top, down, left, right, fullscreen, center).'
  })

  debug.register({
    id: 'core-trigger-error',
    label: 'DISPARAR ERROR',
    command: 'triggerTestError',
    category: 'modals',
    action: () => {
      errorStore.setError(new Error('Error de prueba desde CLI Debug'), {
        type: 'CLI Test Error',
        source: 'debugStore.js'
      })
    },
    description: 'Simula un error global para probar el sistema de logs y notificaciones.'
  })

  // ADMIN
  debug.register({
    id: 'admin-save-event',
    label: 'SAVE EVENT',
    command: 'saveEvent',
    category: 'admin',
    action: async (eventData: Record<string, unknown>) => {
      const { error } = await game.db.from('events_config').upsert(eventData)
      if (error) throw error
      ui.notify('Evento guardado (CLI)', '✅')
      const mod = eventStoreModule as { useEventStore?: () => { fetchEvents: () => Promise<void> } } | undefined;
      if (mod?.useEventStore) {
        const eventStore = mod.useEventStore()
        await eventStore.fetchEvents()
      }
    },
    description: 'Guarda o actualiza la configuración de un evento.'
  })

  debug.register({
    id: 'admin-save-ranked-rules',
    label: 'SAVE RANKED RULES',
    command: 'saveRankedRules',
    category: 'admin',
    action: async (rules: Record<string, unknown>) => {
      const { error } = await game.db.from('ranked_rules_config').upsert({
        id: 'current',
        season_name: rules.seasonName,
        config: { ...rules },
        updated_at: Temporal.Now.instant().toString()
      })
      if (error) throw error
      ui.notify('Reglas Ranked guardadas (CLI)', '🏆')
    },
    description: 'Guarda las reglas actuales de la temporada Ranked.'
  })

  debug.register({
    id: 'admin-close-season',
    label: 'CLOSE RANKED SEASON',
    command: 'closeRankedSeason',
    category: 'admin',
    action: async (seasonName: string) => {
      const { data, error } = await game.db.rpc('fn_award_ranked_season_automated', {
        target_season_name: seasonName
      })
      if (error) throw error
      const result = data as { players_count: number }
      ui.notify(`Temporada cerrada: ${result.players_count} premiados`, '🏆')
    },
    description: 'Cierra la temporada Ranked actual y entrega premios automáticamente.'
  })

  // EMERGENCY
  debug.register({
    id: 'emergency-factory-reset',
    label: 'FACTORY RESET LOCAL',
    command: 'factoryResetLocal',
    category: 'emergency',
    action: () => {
      localStorage.clear()
      sessionStorage.clear()
      window.location.reload()
    },
    description: 'Limpia todo el estado local (localStorage/sessionStorage) y reinicia la página.'
  })

  debug.register({
    id: 'emergency-force-sync',
    label: 'FORCE SYNC CLOUD',
    command: 'forceSyncCloud',
    category: 'emergency',
    action: async () => {
      await game.save(true)
      ui.notify('Sincronización forzada completada', '🔄')
    },
    description: 'Fuerza el guardado inmediato en la nube saltándose el debounce.'
  })

  // NAVIGATION
  debug.register({
    id: 'nav-tab',
    label: 'NAVEGAR A TABS',
    command: 'navigate',
    category: 'navigation',
    action: (tabId: string) => {
      ui.activeTab = tabId
      ui.notify(`Navegando a: ${tabId.toUpperCase()}`, '🚀')
    },
    description: 'Cambia la pestaña principal activa (map, pc, battle, etc).'
  })

  debug.register({
    id: 'nav-modal-open',
    label: 'ABRIR MODAL',
    command: 'openModal',
    category: 'navigation',
    action: (name: string, props: Record<string, unknown> = {}) => {
      ui.open(name, props)
    },
    description: 'Abre cualquier ventana modal por su nombre.'
  })

  debug.register({
    id: 'nav-modal-close',
    label: 'CERRAR MODAL',
    command: 'closeModal',
    category: 'navigation',
    action: (name?: string) => {
      if (name) ui.close(name)
      else ui.closeModal()
    },
    description: 'Cierra una modal específica o la de más arriba.'
  })

  debug.register({
    id: 'nav-library-tab',
    label: 'TABS DE LIBRERÍA',
    command: 'setLibraryTab',
    category: 'navigation',
    action: (tabId: string) => {
      ui.libraryTab = tabId
    },
    description: 'Cambia la pestaña activa dentro de la Librería/Pokedex.'
  })

  debug.register({
    id: 'nav-inspect-poke',
    label: 'INSPECCIONAR POKE',
    command: 'inspectPokemon',
    category: 'navigation',
    action: (index: number, context: 'team' | 'box' = 'team') => {
      const pokes = context === 'team' ? game.state.team : game.state.box
      const p = pokes[index]
      if (p) ui.openPokemonDetail(p, index, context)
      else logger.warn('DEBUG', `No hay pokemon en ${context}[${index}]`)
    },
    description: 'Abre el detalle de un pokemon específico por índice y contexto.'
  })

  debug.register({
    id: 'nav-social-center',
    label: 'ABRIR CENTRO SOCIAL',
    command: 'openSocialCenter',
    category: 'navigation',
    action: () => {
      ui.open('SocialCenter')
    },
    description: 'Abre directamente el menú del Centro Social.'
  })

  debug.register({
    id: 'nav-hud-group',
    label: 'TOGGLE HUD GROUP',
    command: 'toggleHud',
    category: 'navigation',
    action: (group: string) => {
      ui.toggleHudGroup(group)
    },
    description: 'Alterna la visibilidad de grupos del HUD (MARKET, POKEMON, etc).'
  })

  // CORE
  debug.register({
    id: 'core-get-game-store',
    label: 'OBTENER GAME STORE',
    command: 'getGameStore',
    category: 'core',
    action: () => game,
    description: 'Retorna la instancia reactiva del game store para inspección.'
  })
}
