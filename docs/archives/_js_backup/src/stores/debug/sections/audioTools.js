import { gameBus } from '@/logic/gameBus'
import { useAudioStore } from '@/stores/audio'

export function registerAudioTools({ register }, context) {
  const audio = useAudioStore()

  register({
    id: 'play_sound',
    command: 'playSound',
    description: 'Reproducir un sonido del sistema.',
    action: (type) => {
      audio.play(type)
      return `Reproduciendo sonido: ${type}`
    }
  })

  register({
    id: 'trigger_anim',
    command: 'triggerAnim',
    description: 'Disparar una animación de combate via Bus.',
    action: (type, side = 'enemy', options = {}) => {
      const eventMap = {
        'release': 'PLAY_RELEASE_ENERGY',
        'catch': 'PLAY_CATCH_ENERGY',
        'shake': 'CATCH_SHAKE',
        'success': 'CATCH_SUCCESS',
        'faint': 'POKEMON_FAINT',
        'attack': 'PLAY_ATTACK_ANIM',
        'emergence': 'START_BATTLE',
        'reveal': 'START_BATTLE'
      }
      
      const event = eventMap[type] || type
      let payload = { side, ...options }
      
      // Manejo especial para START_BATTLE (Introducciones)
      if (type === 'emergence') payload.animationPhase = 1
      if (type === 'reveal') payload.animationPhase = 3

      gameBus.emit(event, payload)
      return `Evento emitido: ${event} para ${side}`
    }
  })

  register({
    id: 'set_status',
    command: 'setStatus',
    description: 'Cambiar estado de un pokemon (burn, poison, paralyze, freeze, sleep, null). Toggle si ya lo tiene.',
    action: (side, status) => {
      import('@/stores/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const poke = side === 'player' ? battle.state?.player : (battle.upcomingPokemon || battle.state?.enemy)
        if (poke) {
          if (status === 'null') {
            poke.status = null
          } else {
            // Toggle logic
            poke.status = poke.status === status ? null : status
            if (poke.status === 'sleep') poke.sleepTurns = 3
          }
        }
      })
      return `Comando setStatus(${side}, ${status}) enviado.`
    }
  })

  register({
    id: 'set_secondary_status',
    command: 'setSecondaryStatus',
    description: 'Cambiar estados secundarios (confused, attracted, cursed, seeded). Toggle automático.',
    action: (side, type) => {
      import('@/stores/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const poke = side === 'player' ? battle.state?.player : (battle.upcomingPokemon || battle.state?.enemy)
        if (poke) {
          if (type === 'confused') poke.confused = poke.confused > 0 ? 0 : 4
          if (type === 'attracted') poke.attracted = !poke.attracted
          if (type === 'cursed') poke.cursed = !poke.cursed
          if (type === 'seeded') poke.seeded = !poke.seeded
          if (type === 'trapped') poke.trapped = !poke.trapped
          if (type === 'ingrain') poke.ingrain = !poke.ingrain
          if (type === 'protect') poke.protect = !poke.protect
          if (type === 'endure') poke.endure = !poke.endure
          if (type === 'focus_energy') poke.focusEnergy = !poke.focusEnergy
          if (type === 'lock_on') poke.lockOn = !poke.lockOn
        }
      })
      return `Comando setSecondaryStatus(${side}, ${type}) enviado.`
    }
  })

  register({
    id: 'set_stat_stage',
    command: 'setStatStage',
    description: 'Cambiar nivel de estadística (-6 a +6).',
    action: (side, stat, val) => {
      import('@/stores/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const stages = side === 'player' ? battle.playerStages : battle.enemyStages
        if (stages && stages[stat] !== undefined) {
          stages[stat] = Math.max(-6, Math.min(6, parseInt(val)))
        }
      })
      return `setStatStage(${side}, ${stat}, ${val})`
    }
  })

  register({
    id: 'modify_stat_stage',
    command: 'modifyStatStage',
    description: 'Modificar nivel de estadística relativo (ej: +1, -1).',
    action: (side, stat, delta) => {
      import('@/stores/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const stages = side === 'player' ? battle.playerStages : battle.enemyStages
        if (stages && stages[stat] !== undefined) {
          stages[stat] = Math.max(-6, Math.min(6, (stages[stat] || 0) + parseInt(delta)))
        }
      })
      return `modifyStatStage(${side}, ${stat}, ${delta})`
    }
  })

  register({
    id: 'set_field_effect',
    command: 'setFieldEffect',
    description: 'Activar efecto de campo (screens, weather). Toggle automático.',
    action: (side, effect, val) => {
      import('@/stores/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const stages = side === 'player' ? battle.playerStages : battle.enemyStages
        
        // Screens & Hazards (Stage based)
        const isStageEffect = ['reflect', 'lightScreen', 'safeguard', 'mist', 'spikes'].includes(effect)
        if (isStageEffect && stages) {
          // Lógica FLIP: si ya tiene el efecto (>0), lo quitamos (0). Si no, lo ponemos (val o 5).
          stages[effect] = stages[effect] > 0 ? 0 : (parseInt(val) || 5)
        }
        
        // Weather (Context based)
        const ALL_WEATHER = ['sun', 'rain', 'hail', 'sandstorm', 'snow', 'fog', 'clear', 'storm', 'blizzard', 'heatwave']
        if (ALL_WEATHER.includes(effect)) {
          if (battle.state) {
            const current = battle.state.weather?.type
            // Lógica FLIP: si el clima actual es el mismo que tocamos, lo limpiamos.
            if (current === effect && effect !== 'clear') {
              battle.state.weather = { type: 'clear', visual: 'clear', turns: -1 }
            } else {
              battle.state.weather = { 
                type: effect, 
                visual: effect,
                turns: effect === 'clear' ? -1 : (parseInt(val) || 5) 
              }
            }
          }
        }
      })
      return `setFieldEffect(${side}, ${effect}, ${val})`
    }
  })
}
