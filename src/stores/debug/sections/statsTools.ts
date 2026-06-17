import type { DebugSystem, DebugContext } from '@/stores/debug'
import { TRAINER_RANKS } from '@/data/player/trainer'


export function registerStatsTools(debug: DebugSystem, { game, ui }: DebugContext) {
  debug.register({
    id: 'stats-set-money',
    label: 'SET MONEY',
    command: 'setMoney',
    category: 'stats',
    action: (val: number) => {
      game.state.money = val
      ui.notify(`Debug: Dinero ajustado a ${val}`, '💰')
      game.saveGame(false)
    },
    description: 'Establece el dinero del jugador.'
  })

  debug.register({
    id: 'stats-set-exp',
    label: 'SET EXP',
    command: 'setExp',
    category: 'stats',
    action: (val: number) => {
      game.state.trainerExp = val
      ui.notify(`Debug: Experiencia ajustada a ${val}`, '📈')
      game.saveGame(false)
    },
    description: 'Establece la experiencia actual del entrenador.'
  })

  debug.register({
    id: 'stats-set-level',
    label: 'SET LEVEL',
    command: 'setLevel',
    category: 'stats',
    action: (val: number) => {
      game.state.trainerLevel = val
      const idx = Math.min(val - 1, TRAINER_RANKS.length - 1)
      const rank = TRAINER_RANKS[idx]
      if (rank) {
        game.state.trainerExpNeeded = rank.expNeeded
      }
      ui.notify(`Debug: Nivel ajustado a ${val}`, '⭐')
      game.saveGame(false)
    },
    description: 'Establece el nivel del entrenador.'
  })

  debug.register({
    id: 'stats-set-class-level',
    label: 'SET CLASS LEVEL',
    command: 'setClassLevel',
    category: 'stats',
    action: (val: number) => {
      game.state.classLevel = val
      ui.notify(`Debug: Nivel de clase ajustado a ${val}`, '🎓')
      game.saveGame(false)
    },
    description: 'Establece el nivel de la clase activa del jugador.'
  })

  debug.register({
    id: 'stats-set-reputation',
    label: 'SET REPUTATION',
    command: 'setReputation',
    category: 'stats',
    action: (val: number) => {
      if (!game.state.classData) {
        game.state.classData = {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0,
          blackMarketDaily: { date: '', items: [], purchased: [] }
        }
      }
      game.state.classData.reputation = val
      ui.notify(`Debug: Reputación ajustada a ${val}`, '🎖️')
      game.saveGame(false)
    },
    description: 'Establece la reputación del jugador.'
  })

  debug.register({
    id: 'stats-set-battle-coins',
    label: 'SET BATTLE COINS',
    command: 'setBattleCoins',
    category: 'stats',
    action: (val: number) => {
      game.state.battleCoins = val
      ui.notify(`Debug: Battle Coins ajustados a ${val}`, '🪙')
      game.saveGame(false)
    },
    description: 'Establece las Battle Coins (BC) del jugador.'
  })

  debug.register({
    id: 'stats-set-war-coins',
    label: 'SET WAR COINS',
    command: 'setWarCoins',
    category: 'stats',
    action: (val: number) => {
      game.state.warCoins = val
      import('@/stores/war').then(({ useWarStore }) => {
        try {
          const warStore = useWarStore()
          warStore.warCoins = val
        } catch (e) {
          console.warn('Failed to update ELO in warStore:', e)
        }
      })
      ui.notify(`Debug: Monedas de Guerra ajustadas a ${val}`, '⚡')
      game.saveGame(false)
    },
    description: 'Establece las Monedas de Guerra del jugador.'
  })

  debug.register({
    id: 'stats-set-elo',
    label: 'SET ELO',
    command: 'setElo',
    category: 'stats',
    action: (val: number) => {
      game.state.eloRating = val
      ui.notify(`Debug: ELO ajustado a ${val}`, '📊')
      game.saveGame(false)
    },
    description: 'Establece el ELO del jugador para PvP.'
  })

  debug.register({
    id: 'stats-set-badges',
    label: 'SET BADGES',
    command: 'setBadges',
    category: 'stats',
    action: (val: number | string | string[]) => {
      const allGymIds = ['pewter', 'cerulean', 'vermilion', 'celadon', 'fuchsia', 'saffron', 'cinnabar', 'viridian']
      if (typeof val === 'number') {
        const count = Math.max(0, Math.min(8, val))
        game.state.defeatedGyms = allGymIds.slice(0, count)
        game.state.badges = count
      } else if (Array.isArray(val)) {
        game.state.defeatedGyms = val.filter(id => allGymIds.includes(id))
        game.state.badges = game.state.defeatedGyms.length
      } else if (typeof val === 'string' && val) {
        const list = val.split(',').map(s => s.trim().toLowerCase()).filter(id => allGymIds.includes(id))
        game.state.defeatedGyms = list
        game.state.badges = list.length
      }
      ui.notify(`Debug: Medallas ajustadas a ${game.state.badges} (${game.state.defeatedGyms.join(', ') || 'ninguna'})`, '🏆')
      game.saveGame(false)
    },
    description: 'Establece el número de medallas del entrenador.'
  })

  debug.register({
    id: 'stats-win-gym',
    label: 'WIN GYM (SIMULATE)',
    command: 'winGym',
    category: 'stats',
    action: async (gymId: string, difficulty: 'easy' | 'normal' | 'hard' = 'easy') => {
      const gymsStore = (await import('@/stores/gyms')).useGymsStore()
      const gym = gymsStore.gyms.find(g => g.id === gymId)
      if (!gym) return
      
      const isFirstWin = !game.state.defeatedGyms.includes(gymId)
      
      if (isFirstWin) {
        game.state.defeatedGyms.push(gymId)
        game.state.badges = game.state.defeatedGyms.length
        
        const tm = gym.rewardTM
        if (tm) {
          import('@/data/inventory/items').then(({ getItemByName, getItemById }) => {
            const itemObj = getItemByName(tm) || getItemById(tm)
            const tmId = itemObj ? itemObj.id : tm.toLowerCase().replace(/\s+/g, '_')
            game.state.inventory[tmId] = (game.state.inventory[tmId] || 0) + 1
          })
        }
      }

      // Guardar progreso específico por dificultad
      if (!game.state.gymProgress[gymId] || typeof game.state.gymProgress[gymId] !== 'object') {
        game.state.gymProgress[gymId] = { easy: false, normal: false, hard: false, attempts: 0 }
      }
      const progress = game.state.gymProgress[gymId]
      progress[difficulty as keyof typeof progress] = true as never
      progress.attempts++

      // Simular recompensas adicionales basadas en dificultad (EXP y Dinero aproximado)
      const diffLevels: Record<string, number> = { easy: 15, normal: 35, hard: 75 }
      const level = diffLevels[difficulty] || 15
      const moneyGained = level * 10 * (difficulty === 'hard' ? 3 : difficulty === 'normal' ? 2 : 1)
      game.state.money += moneyGained
      
      const msg = isFirstWin 
        ? `¡Victoria Simulada (${difficulty.toUpperCase()})! Recibiste la ${gym.badgeName}${gym.rewardTM ? ` y la ${gym.rewardTM}` : ''}. +₱${moneyGained}`
        : `¡Reafirmación Simulada (${difficulty.toUpperCase()})! Ganaste ₱${moneyGained} y experiencia para tu equipo.`;

      ui.notify(msg, '🏆')
      game.saveGame(false)
    },
    description: 'Simula la victoria de un gimnasio y otorga sus recompensas.'
  })

  debug.register({
    id: 'stats-reset-badges',
    label: 'RESET ALL BADGES',
    command: 'resetBadges',
    category: 'stats',
    action: () => {
      game.state.defeatedGyms = []
      game.state.gymProgress = {}
      game.state.badges = 0
      ui.notify('Progreso de gimnasios reseteado.', '🔄')
      game.saveGame(false)
    },
    description: 'Elimina todas las medallas y reinicia el progreso de gimnasios.'
  })


  debug.register({
    id: 'stats-set-faction',
    label: 'SET FACTION',
    command: 'setFaction',
    category: 'stats',
    action: (f: string) => {
      game.state.faction = (f === 'none' || f === 'null') ? null : f
      ui.notify(`Debug: Facción cambiada a ${f}`, '🛡️')
      game.saveGame(false)
    },
    description: 'Cambia la facción del jugador (magma, aqua, rocket, etc).'
  })

  debug.register({
    id: 'stats-set-class',
    label: 'SET PLAYER CLASS',
    command: 'setPlayerClass',
    category: 'stats',
    action: (c: string) => {
      game.state.playerClass = c
      ui.notify(`Debug: Clase cambiada a ${c}`, '🎭')
      game.saveGame(false)
    },
    description: 'Establece la clase activa del jugador.'
  })

  debug.register({
    id: 'stats-clear-cooldowns',
    label: 'CLEAR CLASS COOLDOWNS',
    command: 'clearClassCooldowns',
    category: 'stats',
    action: () => {
      if (game.state.classData) {
        game.state.classData.lastEggScanDate = null
        game.state.classData.extortedRouteId = null
        game.state.classData.extortedRouteTimestamp = null
        game.state.classData.officialRouteId = null
        game.state.classData.officialRouteTimestamp = null
        // Also clear active mission cooldowns if any
        game.state.classData.activeMission = null
      }
      ui.notify('Debug: Cooldowns de clases eliminados con éxito.', '⚡')
      game.saveGame(false)
    },
    description: 'Elimina todos los cooldowns activos de cualquier clase (escaneo de IVs, extorsión, rutas preferidas, misiones).'
  })
}
