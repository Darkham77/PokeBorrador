import { gameBus } from '@/logic/events/gameBus'
import { useAudioStore } from '@/stores/audio'
import { useBattleStore } from '@/stores/battle/battle'
import type { BattleSide } from '@/types/battle/battle'
import type { MoveCategory } from '@/data/battle/moves'
import type { Pokemon } from '@/types/pokemon/pokemon'
import { MAX_POKEMON_LEVEL } from '@/data/system/constants'
import { levelUpPokemon } from '@/logic/pokemon/pokemonFactory'
import { isWeatherId } from '@/logic/weather/weatherRegistry'
import type { WeatherId } from '@/logic/weather/weatherRegistry'

import type { DebugSystem } from '@/stores/debug'

const DEBUG_FIELD_WEATHER_IDS = ['sun', 'rain', 'hail', 'sandstorm', 'snow', 'fog', 'clear', 'storm', 'blizzard', 'heatwave'] as const satisfies readonly WeatherId[]
type DebugFieldWeatherId = (typeof DEBUG_FIELD_WEATHER_IDS)[number]
const DEBUG_FIELD_WEATHER_IDS_SET: ReadonlySet<string> = new Set(DEBUG_FIELD_WEATHER_IDS)

function isDebugFieldWeatherId(value: WeatherId): value is DebugFieldWeatherId {
  return DEBUG_FIELD_WEATHER_IDS_SET.has(value)
}

export function registerBattleTools(debug: DebugSystem) {
  const audio = useAudioStore()

  debug.register({
    id: 'audio-play-sound',
    label: 'REPRODUCIR SONIDO',
    command: 'playSound',
    description: 'Reproducir un sonido del sistema.',
    action: (type: string) => {
      audio.play(type)
      return `Reproduciendo sonido: ${type}`
    }
  })

  debug.register({
    id: 'audio-play-victory-trainer',
    label: 'SONIDO VICTORIA',
    command: 'playVictoryTrainer',
    description: 'Probar el sonido 8-bit de victoria contra entrenadores.',
    action: () => {
      audio.play('victoryTrainer')
      return 'Sonido de victoria reproducido.'
    }
  })

  debug.register({
    id: 'audio-play-defeat-sound',
    label: 'SONIDO DERROTA',
    command: 'playDefeat',
    description: 'Probar el sonido 8-bit de derrota.',
    action: () => {
      audio.play('defeat')
      return 'Sonido de derrota reproducido.'
    }
  })

  debug.register({
    id: 'audio-stop-all',
    label: 'DETENER AUDIO',
    command: 'stopAllAudio',
    description: 'Detener todos los sonidos y música.',
    action: () => {
      // audio.stopAll()
      return 'Comando stopAll no disponible en este store'
    }
  })

  debug.register({
    id: 'audio-set-volume',
    label: 'FIJAR VOLUMEN',
    command: 'setVolume',
    description: 'Ajustar el volumen maestro.',
    action: (val: number) => {
      // audio.setVolume(val)
      return `Comando setVolume(${val}) no disponible en este store`
    }
  })

  debug.register({
    id: 'trigger_anim',
    command: 'triggerAnim',
    description: 'Disparar una animación de combate via Bus.',
    action: (type: string, side = 'enemy', options: Record<string, unknown> = {}) => {
      const eventMap: Record<string, string> = {
        'release': 'PLAY_RELEASE_ENERGY',
        'catch': 'PLAY_CATCH_ENERGY',
        'shake': 'CATCH_SHAKE',
        'shake_damage': 'PLAY_DAMAGE',
        'recoil_rebound': 'PLAY_RECOIL',
        'blink': 'PLAY_BLINK',
        'heal': 'PLAY_HEAL',
        'success': 'CATCH_SUCCESS',
        'faint': 'POKEMON_FAINT',
        'attack': 'PLAY_ATTACK_ANIM',
        'emergence': 'START_BATTLE',
        'reveal': 'START_BATTLE',
        'encounter': 'ENCOUNTER_ANIM',
        'bush_wiggle': 'WIGGLE_BUSH'
      }
      
      const event = eventMap[type] || type
      const payload: Record<string, unknown> = { side, ...options }
      
      // Manejo especial para animación de ataque (incluyendo physical, special, status, selfKO y recoil)
      if (type === 'attack') {
        const battle = useBattleStore()
        battle.attackerSide = side as BattleSide
        battle.activeMove = {
          name: options.cat === 'selfKO' ? 'Autodestrucción' : (options.cat === 'recoil' ? 'Retroceso' : 'Ataque Debug'), // spanish-ok
          cat: options.cat === 'selfKO' ? 'special' : ((options.cat as MoveCategory | undefined) || 'physical'),
          selfKO: options.cat === 'selfKO',
          recoil: options.cat === 'recoil' ? true : undefined,
          pp: 5,
          maxPP: 5
        }
        
        if (battle.animations?.awaitTween) {
          battle.animations.awaitTween(`attack-${side}`).then(() => {
            battle.attackerSide = null
            battle.activeMove = null
          })
        } else {
          battle.attackerSide = null
          battle.activeMove = null
        }
        return `Animación de ataque debug iniciada para ${side}.`
      }

      // Manejo especial para escape de pokemon (teleport y flee)
      if (type === 'escape_teleport' || type === 'escape_flee') {
        const escapeType = type === 'escape_teleport' ? 'teleport' : 'flee'
        const battle = useBattleStore()
        const pokemon = side === 'player'
          ? (battle.state?.player as Pokemon | null | undefined)
          : (battle.state?.enemy as Pokemon | null | undefined)
        gameBus.emit('TRIGGER_COMBATANT_ESCAPE', { side, pokemon, type: escapeType })
        return `Efecto de escape ${escapeType} emitido para ${side}`
      }

      // Manejo especial para START_BATTLE (Introducciones)
      if (type === 'emergence') payload.animationPhase = 1
      if (type === 'reveal') payload.animationPhase = 3

      // Manejo especial para animaciones de UI / Store
      if (['trainer_in', 'trainer_out', 'levelUp'].includes(type)) {
        const battle = useBattleStore()
        if (type === 'trainer_in') battle.trainerAnimState = 'in'
        if (type === 'trainer_out') battle.trainerAnimState = 'out'
        if (type === 'levelUp') {
          const p = side === 'player' ? battle.state?.player : battle.state?.enemy
          if (p && p.level < MAX_POKEMON_LEVEL) {
            levelUpPokemon(p)
          }
        }
        return `Animación de UI ${type} disparada.`
      }

      gameBus.emit(event, payload)
      return `Evento emitido: ${event} para ${side}`
    }
  })

  debug.register({
    id: 'toggle_silhouette',
    command: 'toggleSilhouette',
    description: 'Alternar modo silueta del Pokémon enemigo.',
    action: () => {
      const battle = useBattleStore()
      battle.isSilhouetteMode = !battle.isSilhouetteMode
      return 'Modo silueta alternado.'
    }
  })

  debug.register({
    id: 'set_status',
    command: 'setStatus',
    description: 'Cambiar estado de un pokemon (burn, poison, paralysis, freeze, sleep, null). Toggle si ya lo tiene.',
    action: (side: string, status: string) => {
      import('@/stores/battle/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const poke = side === 'player' 
          ? battle.state?.player 
          : battle.state?.enemy

        if (poke) {
          if (status === 'null' || status === '') {
            poke.status = ''
          } else {
            // Toggle logic
            poke.status = poke.status === (status as Pokemon['status']) ? '' : (status as Pokemon['status'])
            if (poke.status === 'slp') poke.sleepTurns = 3
          }

          // Force Reactivity
          if (side === 'player' && battle.state) {
            battle.state.player = { ...poke }
          } else if (battle.state?.enemy && poke === battle.state.enemy) {
            battle.state.enemy = { ...battle.state.enemy }
          }
        }
      })
      return `Comando setStatus(${side}, ${status}) enviado.`
    }
  })

  debug.register({
    id: 'set_secondary_status',
    command: 'setSecondaryStatus',
    description: 'Cambiar estados secundarios (confused, attracted, cursed, seeded). Toggle automático.',
    action: (side: string, type: string) => {
      import('@/stores/battle/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const poke = (side === 'player' 
          ? battle.state?.player 
          : battle.state?.enemy) as (Pokemon & Record<string, unknown>) | undefined

        if (poke) {
          if (type === 'confused') poke.confused = (poke.confused || 0) > 0 ? 0 : 4
          if (type === 'disabledTurns') poke.disabledTurns = (poke.disabledTurns || 0) > 0 ? 0 : 4
          if (type === 'tauntTurns') poke.tauntTurns = (poke.tauntTurns || 0) > 0 ? 0 : 3
          if (type === 'encoreTurns') poke.encoreTurns = (poke.encoreTurns || 0) > 0 ? 0 : 3
          if (type === 'perishSongCount') poke.perishSongCount = (poke.perishSongCount || 0) > 0 ? 0 : 3
          if (type === 'bound') poke.bound = (poke.bound || 0) > 0 ? 0 : 4
          if (type === 'attracted') poke.attracted = !poke.attracted
          if (type === 'cursed') poke.cursed = !poke.cursed
          if (type === 'seeded') poke.seeded = !poke.seeded
          if (type === 'trapped') (poke as Pokemon & { trapped: boolean }).trapped = !(poke as Pokemon & { trapped: boolean }).trapped
          if (type === 'ingrain') poke.ingrain = !poke.ingrain
          if (type === 'protect') poke.protect = !poke.protect
          if (type === 'endure') poke.endure = !poke.endure
          if (type === 'focus_energy') poke.focusEnergy = !poke.focusEnergy
          if (type === 'lock_on') poke.lockOn = !poke.lockOn

          // Force Reactivity
          if (side === 'player' && battle.state) {
            battle.state.player = { ...poke }
          } else if (battle.state?.enemy && poke === battle.state.enemy) {
            battle.state.enemy = { ...battle.state.enemy }
          }
        }
      })
      return `Comando setSecondaryStatus(${side}, ${type}) enviado.`
    }
  })

  debug.register({
    id: 'set_stat_stage',
    command: 'setStatStage',
    description: 'Cambiar nivel de estadística (-6 a +6).',
    action: (side: string, stat: string, val: string) => {
      import('@/stores/battle/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const stages = (side === 'player' ? battle.playerStages : battle.enemyStages) as Record<string, number> // open-record
        const sKey = stat
        if (stages && stages[sKey] !== undefined) {
          stages[sKey] = Math.max(-6, Math.min(6, parseInt(val)))
          // Force reactivity for ref objects
          if (side === 'player') battle.playerStages = { ...battle.playerStages }
          else battle.enemyStages = { ...battle.enemyStages }
        }
      })
      return `setStatStage(${side}, ${stat}, ${val})`
    }
  })

  debug.register({
    id: 'modify_stat_stage',
    command: 'modifyStatStage',
    description: 'Modificar nivel de estadística relativo (ej: +1, -1).',
    action: (side: string, stat: string, delta: string) => {
      import('@/stores/battle/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const stages = (side === 'player' ? battle.playerStages : battle.enemyStages) as Record<string, number> // open-record
        const sKey = stat
        if (stages && stages[sKey] !== undefined) {
          stages[sKey] = Math.max(-6, Math.min(6, (stages[sKey] || 0) + parseInt(delta)))
          // Force reactivity for ref objects
          if (side === 'player') battle.playerStages = { ...battle.playerStages }
          else battle.enemyStages = { ...battle.enemyStages }
        }
      })
      return `modifyStatStage(${side}, ${stat}, ${delta})`
    }
  })

  debug.register({
    id: 'set_field_effect',
    command: 'setFieldEffect',
    description: 'Activar efecto de campo (screens, weather). Toggle automático.',
    action: (side: string, effect: string, val: string) => {
      import('@/stores/battle/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const stages = (side === 'player' ? battle.playerStages : battle.enemyStages) as Record<string, number> // open-record
        
        // Screens & Hazards (Stage based)
        const isStageEffect = (['reflect', 'lightScreen', 'safeguard', 'mist', 'spikes'] as const).includes(effect as 'reflect')
        if (isStageEffect && stages) {
          // Lógica FLIP: si ya tiene el efecto (>0), lo quitamos (0). Si no, lo ponemos (val o 5).
          stages[effect] = (stages[effect] || 0) > 0 ? 0 : (parseInt(val) || 5)
        }
        
        // Weather (Context based)
        if (isWeatherId(effect) && isDebugFieldWeatherId(effect)) {
          if (battle.state) {
            const current = battle.state?.weather?.type
            // Lógica FLIP: si el clima actual es el mismo que tocamos, lo limpiamos.
            if (current === effect && effect !== 'clear') {
              if (battle.state) battle.state.weather = { type: 'clear', visual: 'clear', turns: -1 }
            } else {
              if (battle.state) {
                battle.state.weather = { 
                  type: effect, 
                  visual: effect,
                  turns: effect === 'clear' ? -1 : (parseInt(val) || 5) 
                }
              }
            }
          }
        }
      })
      return `setFieldEffect(${side}, ${effect}, ${val})`
    }
  })
}
