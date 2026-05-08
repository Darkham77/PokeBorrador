import type { DebugSystem, DebugContext } from '@/stores/debug'

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
      ui.notify(`Debug: Nivel ajustado a ${val}`, '⭐')
      game.saveGame(false)
    },
    description: 'Establece el nivel del entrenador.'
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
    action: (val: number) => {
      game.state.badges = val
      ui.notify(`Debug: Medallas ajustadas a ${val}`, '🏆')
      game.saveGame(false)
    },
    description: 'Establece el número de medallas del entrenador.'
  })


  debug.register({
    id: 'stats-set-faction',
    label: 'SET FACTION',
    command: 'setFaction',
    category: 'stats',
    action: (f: string) => {
      game.state.faction = f
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
}
