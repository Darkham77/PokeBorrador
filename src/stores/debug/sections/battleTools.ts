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

import type { DebugSystem } from '@/types/system/debug.ts'
import { CANONICAL_TERRAINS } from '@/logic/constants/gameplay'

const DEBUG_FIELD_WEATHER_IDS = ['sun', 'rain', 'hail', 'sandstorm', 'snow', 'fog', 'clear', 'storm', 'blizzard', 'heatwave'] as const satisfies readonly WeatherId[]
type DebugFieldWeatherId = (typeof DEBUG_FIELD_WEATHER_IDS)[number]
const DEBUG_FIELD_WEATHER_IDS_SET: ReadonlySet<string> = new Set(DEBUG_FIELD_WEATHER_IDS)

function isDebugFieldWeatherId(value: WeatherId): value is DebugFieldWeatherId {
  return DEBUG_FIELD_WEATHER_IDS_SET.has(value)
}

const DEFAULT_SECONDARY_TURNS = 4 as const
const DEFAULT_ATTACK_LOCK_TURNS = 3 as const

interface BattleStatusHolder {
  confused?: number
  disabledTurns?: number
  tauntTurns?: number
  encoreTurns?: number
  perishSongCount?: number
  bound?: number
  substitute?: number
  attracted?: boolean
  cursed?: boolean
  seeded?: boolean
  trapped?: boolean
  ingrain?: boolean
  protect?: boolean
  endure?: boolean
  focusEnergy?: boolean
  lockOn?: boolean
  volatileCounters?: Record<string, number>
}

const DEFAULT_SUBSTITUTE_HP = 25 as const

const SECONDARY_STATUS_TOGGLERS: Record<string, (poke: BattleStatusHolder) => void> = {
  confusion: (p) => {
    const active = (Number(p.confused) || 0) > 0
    p.confused = active ? 0 : DEFAULT_SECONDARY_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.confusion = active ? 0 : DEFAULT_SECONDARY_TURNS
  },
  confused: (p) => {
    const active = (Number(p.confused) || 0) > 0
    p.confused = active ? 0 : DEFAULT_SECONDARY_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.confusion = active ? 0 : DEFAULT_SECONDARY_TURNS
  },
  taunt: (p) => {
    const active = (Number(p.tauntTurns) || 0) > 0
    p.tauntTurns = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.taunt = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
  },
  tauntTurns: (p) => {
    const active = (Number(p.tauntTurns) || 0) > 0
    p.tauntTurns = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.taunt = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
  },
  substitute: (p) => {
    const active = (Number(p.substitute) || 0) > 0
    p.substitute = active ? 0 : DEFAULT_SUBSTITUTE_HP
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.substitute = active ? 0 : DEFAULT_SUBSTITUTE_HP
  },
  disable: (p) => {
    const active = (Number(p.disabledTurns) || 0) > 0
    p.disabledTurns = active ? 0 : DEFAULT_SECONDARY_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.disable = active ? 0 : DEFAULT_SECONDARY_TURNS
  },
  disabledTurns: (p) => {
    const active = (Number(p.disabledTurns) || 0) > 0
    p.disabledTurns = active ? 0 : DEFAULT_SECONDARY_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.disable = active ? 0 : DEFAULT_SECONDARY_TURNS
  },
  encore: (p) => {
    const active = (Number(p.encoreTurns) || 0) > 0
    p.encoreTurns = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.encore = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
  },
  encoreTurns: (p) => {
    const active = (Number(p.encoreTurns) || 0) > 0
    p.encoreTurns = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.encore = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
  },
  perishsong: (p) => {
    const active = (Number(p.perishSongCount) || 0) > 0
    p.perishSongCount = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.perishsong = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
  },
  perishSongCount: (p) => {
    const active = (Number(p.perishSongCount) || 0) > 0
    p.perishSongCount = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.perishsong = active ? 0 : DEFAULT_ATTACK_LOCK_TURNS
  },
  bound: (p) => {
    const active = (Number(p.bound) || 0) > 0
    p.bound = active ? 0 : DEFAULT_SECONDARY_TURNS
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.bound = active ? 0 : DEFAULT_SECONDARY_TURNS
    p.volatileCounters.partiallytrapped = active ? 0 : DEFAULT_SECONDARY_TURNS
  },
  attract: (p) => {
    p.attracted = !p.attracted
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.attract = p.attracted ? 1 : 0
  },
  attracted: (p) => {
    p.attracted = !p.attracted
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.attract = p.attracted ? 1 : 0
  },
  curse: (p) => {
    p.cursed = !p.cursed
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.curse = p.cursed ? 1 : 0
  },
  cursed: (p) => {
    p.cursed = !p.cursed
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.curse = p.cursed ? 1 : 0
  },
  leechseed: (p) => {
    p.seeded = !p.seeded
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.leechseed = p.seeded ? 1 : 0
  },
  seeded: (p) => {
    p.seeded = !p.seeded
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.leechseed = p.seeded ? 1 : 0
  },
  trapped: (p) => {
    p.trapped = !p.trapped
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.trapped = p.trapped ? 1 : 0
  },
  ingrain: (p) => {
    p.ingrain = !p.ingrain
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.ingrain = p.ingrain ? 1 : 0
  },
  protect: (p) => {
    p.protect = !p.protect
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.protect = p.protect ? 1 : 0
  },
  endure: (p) => {
    p.endure = !p.endure
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.endure = p.endure ? 1 : 0
  },
  focusenergy: (p) => {
    p.focusEnergy = !p.focusEnergy
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.focusenergy = p.focusEnergy ? 1 : 0
  },
  focus_energy: (p) => {
    p.focusEnergy = !p.focusEnergy
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.focusenergy = p.focusEnergy ? 1 : 0
  },
  lockon: (p) => {
    p.lockOn = !p.lockOn
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.lockon = p.lockOn ? 1 : 0
  },
  lock_on: (p) => {
    p.lockOn = !p.lockOn
    if (!p.volatileCounters) p.volatileCounters = {}
    p.volatileCounters.lockon = p.lockOn ? 1 : 0
  }
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

const DEBUG_ANIM_EVENT_MAP: Readonly<Record<string, string>> = {
  release: 'PLAY_RELEASE_ENERGY',
  catch: 'PLAY_CATCH_ENERGY',
  critical_capture_fx: 'CRITICAL_CAPTURE_FX',
  shake: 'CATCH_SHAKE',
  shake_damage: 'PLAY_DAMAGE',
  recoil_rebound: 'PLAY_RECOIL',
  blink: 'PLAY_BLINK',
  heal: 'PLAY_HEAL',
  success: 'CATCH_SUCCESS',
  faint: 'POKEMON_FAINT',
  attack: 'PLAY_ATTACK_ANIM',
  emergence: 'START_BATTLE',
  reveal: 'START_BATTLE',
  encounter: 'ENCOUNTER_ANIM',
  bush_wiggle: 'WIGGLE_BUSH'
} as const;

const DEBUG_UI_ANIM_TYPES = ['trainer_in', 'trainer_out', 'levelUp'] as const;
type DebugUiAnimType = typeof DEBUG_UI_ANIM_TYPES[number];
const DEBUG_UI_ANIM_TYPES_SET: ReadonlySet<DebugUiAnimType> = new Set(DEBUG_UI_ANIM_TYPES);

function handleDebugAttackAnim(side: string, options: Record<string, unknown>): string {
  const battle = useBattleStore();
  battle.attackerSide = side as BattleSide;
  battle.activeMove = {
    name: options.cat === 'selfKO' ? 'Autodestrucción' : (options.cat === 'recoil' ? 'Retroceso' : 'Ataque Debug'), // spanish-ok: UI Spanish text localization label
    cat: options.cat === 'selfKO' ? 'special' : ((options.cat as MoveCategory | undefined) || 'physical'),
    selfKO: options.cat === 'selfKO',
    recoil: options.cat === 'recoil' ? true : undefined,
    pp: 5,
    maxPP: 5
  };

  if (battle.animations?.awaitTween) {
    battle.animations.awaitTween(`attack-${side}`).then(() => {
      battle.attackerSide = null;
      battle.activeMove = null;
    });
  } else {
    battle.attackerSide = null;
    battle.activeMove = null;
  }
  return `Animación de ataque debug iniciada para ${side}.`;
}

function handleDebugEscapeAnim(side: string, type: string): string {
  const escapeType = type === 'escape_teleport' ? 'teleport' : 'flee';
  const battle = useBattleStore();
  const pokemon = side === 'player'
    ? (battle.state?.player as Pokemon | null | undefined)
    : (battle.state?.enemy as Pokemon | null | undefined);
  gameBus.emit('TRIGGER_COMBATANT_ESCAPE', { side, pokemon, type: escapeType });
  return `Efecto de escape ${escapeType} emitido para ${side}`;
}

function handleDebugUiAnim(side: string, type: string): string {
  const battle = useBattleStore();
  if (type === 'trainer_in') battle.trainerAnimState = 'in';
  if (type === 'trainer_out') battle.trainerAnimState = 'out';
  if (type === 'levelUp') {
    const p = side === 'player' ? battle.state?.player : battle.state?.enemy;
    if (p && p.level < MAX_POKEMON_LEVEL) {
      levelUpPokemon(p);
    }
  }
  return `Animación de UI ${type} disparada.`;
}

  debug.register({
    id: 'trigger_anim',
    command: 'triggerAnim',
    description: 'Disparar una animación de combate via Bus.',
    action: (type: string, side = 'enemy', options: Record<string, unknown> = {}) => {
      if (typeof window !== 'undefined' && window.__VITE_DEBUG__?.triggerAnim && (type === 'full_catch_normal' || type === 'full_catch_critical')) {
        window.__VITE_DEBUG__.triggerAnim(type, side, options);
        return;
      }
      if (type === 'attack') {
        return handleDebugAttackAnim(side, options);
      }
      if (type === 'escape_teleport' || type === 'escape_flee') {
        return handleDebugEscapeAnim(side, type);
      }
      if (DEBUG_UI_ANIM_TYPES_SET.has(type as DebugUiAnimType)) {
        return handleDebugUiAnim(side, type);
      }

      const event = DEBUG_ANIM_EVENT_MAP[type] || type;
      const payload: Record<string, unknown> = { side, ...options };
      if (type === 'emergence') payload.animationPhase = 1;
      if (type === 'reveal') payload.animationPhase = 3;

      gameBus.emit(event, payload);
      return `Evento emitido: ${event} para ${side}`;
    }
  });

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
          : battle.state?.enemy) as (Pokemon & BattleStatusHolder) | undefined

        if (poke) {
          const toggler = SECONDARY_STATUS_TOGGLERS[type]
          if (toggler) {
            toggler(poke)
          }

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

const DEFAULT_STAGE_EFFECT_DURATION = 5 as const
const INFINITE_WEATHER_TURNS = -1 as const
const MIN_STAT_STAGE = -6 as const
const MAX_STAT_STAGE = 6 as const
const RADIX_DECIMAL = 10 as const
const STAGE_EFFECT_KEYS = ['reflect', 'lightScreen', 'safeguard', 'mist', 'spikes', 'stealthrock', 'toxicspikes'] as const
const STAGE_EFFECT_SET: ReadonlySet<string> = new Set(STAGE_EFFECT_KEYS)

const CANONICAL_TERRAINS_SET: ReadonlySet<string> = new Set(CANONICAL_TERRAINS)

function clampStatStage(current: number, val: number, isAbsolute: boolean): number {
  const target = isAbsolute ? val : current + val
  return Math.max(MIN_STAT_STAGE, Math.min(MAX_STAT_STAGE, target))
}

function applyBattleStageEffect(stages: Record<string, number> | undefined, effect: string, val: string): void {
  if (!stages) return
  const stageKey = effect === 'lightscreen' ? 'lightScreen' : effect
  if (!STAGE_EFFECT_SET.has(stageKey as (typeof STAGE_EFFECT_KEYS)[number])) return
  // Lógica FLIP: si ya tiene el efecto (>0), lo quitamos (0). Si no, lo ponemos (val o 5).
  stages[stageKey] = (stages[stageKey] || 0) > 0 ? 0 : (parseInt(val, RADIX_DECIMAL) || DEFAULT_STAGE_EFFECT_DURATION)
}

function applyBattleWeatherEffect(battleState: ReturnType<typeof useBattleStore>['state'], effect: string, val: string): void {
  if (!battleState || !isWeatherId(effect) || !isDebugFieldWeatherId(effect)) return
  const current = battleState.weather?.type
  // Lógica FLIP: si el clima actual es el mismo que tocamos, lo limpiamos.
  if (current === effect && effect !== 'clear') {
    battleState.weather = { type: 'clear', visual: 'clear', turns: INFINITE_WEATHER_TURNS }
  } else {
    battleState.weather = {
      type: effect,
      visual: effect,
      turns: effect === 'clear' ? INFINITE_WEATHER_TURNS : (parseInt(val, RADIX_DECIMAL) || DEFAULT_STAGE_EFFECT_DURATION)
    }
  }
}

function applyBattleTerrainOrFieldEffect(battleState: ReturnType<typeof useBattleStore>['state'], effect: string, val: string): void {
  if (!battleState) return
  const updatedConditions: Record<string, { turns: number }> = { ...(battleState.fieldConditions || {}) }
  const isTerrain = CANONICAL_TERRAINS_SET.has(effect)
  let newTerrain: string | null = battleState.terrain ?? null

  if (updatedConditions[effect]) {
    delete updatedConditions[effect]
    if (isTerrain && newTerrain === effect) {
      newTerrain = null
    }
  } else {
    if (isTerrain) {
      CANONICAL_TERRAINS.forEach(t => {
        delete updatedConditions[t]
      })
      newTerrain = effect
    }
    updatedConditions[effect] = { turns: parseInt(val, RADIX_DECIMAL) || DEFAULT_STAGE_EFFECT_DURATION }
  }

  battleState.fieldConditions = updatedConditions
  battleState.terrain = newTerrain
}

  debug.register({
    id: 'set_stat_stage',
    command: 'setStatStage',
    description: 'Cambiar nivel de estadística (-6 a +6).',
    action: (side: string, stat: string, val: string) => {
      import('@/stores/battle/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const stages = (side === 'player' ? battle.playerStages : battle.enemyStages) as Record<string, number> // open-record: Generic key-value data dictionary container
        const sKey = stat
        if (stages && stages[sKey] !== undefined) {
          stages[sKey] = clampStatStage(stages[sKey], parseInt(val, RADIX_DECIMAL), true)
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
        const stages = (side === 'player' ? battle.playerStages : battle.enemyStages) as Record<string, number> // open-record: Generic key-value data dictionary container
        const sKey = stat
        if (stages && stages[sKey] !== undefined) {
          stages[sKey] = clampStatStage(stages[sKey] || 0, parseInt(delta, RADIX_DECIMAL), false)
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
    description: 'Activar efecto de campo (screens, weather, terrains). Toggle automático.',
    action: (side: string, effect: string, val: string) => {
      import('@/stores/battle/battle').then(({ useBattleStore }) => {
        const battle = useBattleStore()
        const stages = (side === 'player' ? battle.playerStages : battle.enemyStages) as Record<string, number> // open-record: Generic key-value data dictionary container
        applyBattleStageEffect(stages, effect, val)
        applyBattleWeatherEffect(battle.state, effect, val)
        applyBattleTerrainOrFieldEffect(battle.state, effect, val)
        if (battle.state) {
          const sideConds = side === 'player'
            ? (battle.state.playerSideConditions ??= {})
            : (battle.state.enemySideConditions ??= {})
          const stageKey = effect === 'lightscreen' ? 'lightScreen' : effect
          const turnsVal = stages[stageKey]
          if ((turnsVal || 0) > 0) {
            sideConds[effect as import('@/types/battle/battle').BattleConditionKey] = { turns: turnsVal || 1 }
          } else {
            delete sideConds[effect as import('@/types/battle/battle').BattleConditionKey]
          }
          battle.state = { ...battle.state }
        }
        if (side === 'player') battle.playerStages = { ...battle.playerStages }
        else battle.enemyStages = { ...battle.enemyStages }
      })
      return `setFieldEffect(${side}, ${effect}, ${val})`
    }
  })
}
