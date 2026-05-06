export function registerStatsTools(debug, { game, ui, pvp, auth }) {
  debug.register({
    id: 'core-set-money',
    label: 'FIJAR DINERO',
    command: 'setMoney',
    category: 'stats',
    action: (val) => { 
      game.state.money = parseInt(val) || 0
      ui.notify(`Debug: Dinero fijado en ₽${game.state.money}`, '💰')
      game.saveGame(false)
    },
    description: 'Establece el dinero del jugador.'
  })

  debug.register({
    id: 'core-set-level',
    label: 'FIJAR NIVEL',
    command: 'setLevel',
    category: 'stats',
    action: (val) => { 
      game.state.trainerLevel = parseInt(val) || 1
      ui.notify(`Debug: Nivel fijado en ${game.state.trainerLevel}`, '📈')
      game.saveGame(false)
    },
    description: 'Establece el nivel del entrenador.'
  })

  debug.register({
    id: 'core-set-elo',
    label: 'FIJAR ELO',
    command: 'setElo',
    category: 'stats',
    action: (val) => { 
      pvp.elo = parseInt(val) || 1000
      ui.notify(`Debug: ELO fijado en ${pvp.elo}`, '⚔️')
      game.db.from('profiles').update({ elo_rating: pvp.elo }).eq('id', auth.user.id)
    },
    description: 'Establece el ELO de combate.'
  })

  debug.register({
    id: 'core-set-badges',
    label: 'FIJAR MEDALLAS',
    command: 'setBadges',
    category: 'stats',
    action: (val) => { 
      game.state.badges = parseInt(val) || 0
      ui.notify(`Debug: Medallas fijadas en ${game.state.badges}`, '🎖️')
      game.saveGame(false)
    },
    description: 'Establece la cantidad de medallas (0-8).'
  })

  debug.register({
    id: 'core-set-faction',
    label: 'FIJAR BANDO',
    command: 'setFaction',
    category: 'stats',
    action: (f) => {
      game.state.faction = f === 'none' ? null : f
      ui.notify(`Debug: Bando cambiado a ${f ? f.toUpperCase() : 'LIBRE'}`, '🚩')
      game.saveGame(false)
    },
    description: 'Cambia el bando del jugador (poder, union, none).'
  })

  debug.register({
    id: 'core-set-class',
    label: 'FIJAR CLASE',
    command: 'setPlayerClass',
    category: 'stats',
    action: (c) => {
      game.state.playerClass = c === 'none' ? null : c
      ui.notify(`Debug: Clase cambiada a ${c ? c.toUpperCase() : 'RESETEADA'}`, '🎓')
      game.saveGame(false)
    },
    description: 'Cambia la clase del entrenador (entrenador, criador, cazabichos, rocket, none).'
  })
}
