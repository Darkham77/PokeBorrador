import { getMechanicalWeather, WEATHER_MECHANICAL, WEATHER_REGISTRY } from '../weather/weatherRegistry.ts'
import { gameBus } from '@/logic/gameBus'
import type { Pokemon } from '@/types/pokemon'
import type { BattleStages, LogFn, BattleWeather } from '@/types/battle'
import { tickStatus, tickLeechSeed } from './battleStatus.ts'
import { useMapStore } from '@/stores/map.ts'
import type { BattleContext } from '@/types/battleContext'

export function handleEntryAbilities(playerPoke: Pokemon, enemyPoke: Pokemon, playerStages: BattleStages, enemyStages: BattleStages, addLog: LogFn) {
  if (!playerPoke || !enemyPoke) return // GUARDIA CRÍTICA

  if (playerPoke.ability === 'Intimidación') {
    enemyStages.atk = Math.max(-6, enemyStages.atk - 1)
    addLog(`¡La Intimidación de ${playerPoke.name} bajó el ataque de ${enemyPoke.name}!`, 'log-info', playerPoke)
  }
  if (enemyPoke.ability === 'Intimidación') {
    playerStages.atk = Math.max(-6, playerStages.atk - 1)
    addLog(`¡La Intimidación de ${enemyPoke.name} bajó el ataque de ${playerPoke.name}!`, 'log-info', enemyPoke)
  }
}

export function canAttack(pokemon: Pokemon, addLog: LogFn) {
  if (pokemon.mustRecharge) {
    addLog(`¡${pokemon.name} tiene que recargar!`, 'log-info', pokemon)
    pokemon.mustRecharge = false
    return false
  }
  if (pokemon.flinched) {
    addLog(`¡${pokemon.name} retrocedió!`, 'log-info', pokemon)
    pokemon.flinched = false
    return false
  }
  if (pokemon.status === 'sleep') {
    if ((pokemon.sleepTurns || 0) > 0) {
      pokemon.sleepTurns = (pokemon.sleepTurns || 0) - 1
      addLog(`¡${pokemon.name} está profundamente dormido!`, 'log-info', pokemon)
      return false
    } else {
      pokemon.status = null
      addLog(`¡${pokemon.name} se despertó!`, 'log-info', pokemon)
    }
  }
  if (pokemon.status === 'freeze') {
    if (Math.random() < 0.8) {
      addLog(`¡${pokemon.name} está congelado!`, 'log-info', pokemon)
      return false
    } else {
      pokemon.status = null
      addLog(`¡${pokemon.name} se descongeló!`, 'log-info', pokemon)
    }
  }
  if (pokemon.status === 'paralysis') {
    if (Math.random() < 0.25) {
      addLog(`¡${pokemon.name} está paralizado! ¡No puede moverse!`, 'log-info', pokemon)
      return false
    }
  }
  if ((pokemon.confused || 0) > 0) {
    pokemon.confused = (pokemon.confused || 0) - 1
    if ((pokemon.confused || 0) <= 0) {
      addLog(`¡${pokemon.name} ya no está confundido!`, 'log-info', pokemon)
    } else {
      addLog(`¡${pokemon.name} está confundido!`, 'log-info', pokemon)
      if (Math.random() < 0.5) {
        const selfDmg = Math.max(1, Math.floor(((2 * pokemon.level / 5 + 2) * 40 * (pokemon.atk || 10) / (pokemon.def || 10)) / 50) + 2)
        pokemon.hp = Math.max(0, pokemon.hp - selfDmg)
        addLog(`¡Tan confundido que se hirió a sí mismo! (-${selfDmg} HP)`, 'log-info', pokemon)
        gameBus.emit('PLAY_SOUND', 'statusDamage')
        return false
      }
    }
  }
  if (pokemon.attracted) {
    addLog(`¡${pokemon.name} está enamorado!`, 'log-info', pokemon)
    if (Math.random() < 0.5) {
      addLog(`¡La atracción le impide atacar!`, 'log-info', pokemon)
      return false
    }
  }
  return true
}

export function applyEndTurnWeather(p: Pokemon, e: Pokemon, weather: BattleWeather | null, addLog: LogFn) {
  const mechWeather = getMechanicalWeather(weather?.type);
  const wType = (weather?.visual || weather?.type || '').toLowerCase();
  const weatherLabel = WEATHER_REGISTRY[wType]?.label || 'CLIMA';

  if (mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    const isSandImmune = (poke: Pokemon) => ['rock', 'ground', 'steel'].includes(poke.type) || ['rock', 'ground', 'steel'].includes(poke.type2 || '')
    if (!isSandImmune(p)) {
      const dmg = Math.max(1, Math.floor(p.maxHp / 16))
      p.hp = Math.max(0, p.hp - dmg)
      addLog(`¡El efecto de ${weatherLabel} daña a ${p.name}! (-${dmg} HP)`, 'log-player', p)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
    if (!isSandImmune(e)) {
      const dmg = Math.max(1, Math.floor(e.maxHp / 16))
      e.hp = Math.max(0, e.hp - dmg)
      addLog(`¡El efecto de ${weatherLabel} daña a ${e.name}! (-${dmg} HP)`, 'log-enemy', e)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
  }

  if (mechWeather === WEATHER_MECHANICAL.HAIL) {
    const isHailImmune = (poke: Pokemon) => poke.type === 'ice' || poke.type2 === 'ice'
    if (!isHailImmune(p)) {
      const dmg = Math.max(1, Math.floor(p.maxHp / 16))
      p.hp = Math.max(0, p.hp - dmg)
      addLog(`¡El efecto de ${weatherLabel} daña a ${p.name}! (-${dmg} HP)`, 'log-player', p)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
    if (!isHailImmune(e)) {
      const dmg = Math.max(1, Math.floor(e.maxHp / 16))
      e.hp = Math.max(0, e.hp - dmg)
      addLog(`¡El efecto de ${weatherLabel} daña a ${e.name}! (-${dmg} HP)`, 'log-enemy', e)
      gameBus.emit('PLAY_SOUND', 'statusDamage')
    }
  }

  if (mechWeather === WEATHER_MECHANICAL.SNOW) {
    // La nieve normal NO hace daño residual (Gen 9)
  }

  // Poder Solar (Solar Power) Recoil
  if (mechWeather === WEATHER_MECHANICAL.SUN) {
    [p, e].forEach(poke => {
      if (poke.ability === 'Poder solar' && poke.hp > 0) {
        const dmg = Math.max(1, Math.floor(poke.maxHp / 8));
        poke.hp = Math.max(0, poke.hp - dmg);
        addLog(`¡${poke.name} sufre por el sol ardiente! (-${dmg} HP)`, 'log-info', poke);
        gameBus.emit('PLAY_SOUND', 'statusDamage');
      }
    });
  }
}

export async function applyEndTurnEffects(ctx: BattleContext) {
  const active = ctx.activeBattle.value
  const p = active?.player
  const e = active?.enemy
  if (!p || !e || !active) return

  const mapStore = useMapStore()

  if (active.futureSightTurns && active.futureSightTurns > 0) {
    active.futureSightTurns--
    if (active.futureSightTurns === 0) {
      const fsTarget = active.futureSightTarget
      if (fsTarget && fsTarget.hp > 0) {
        const dmg = Math.max(10, Math.floor(fsTarget.maxHp * 0.15))
        fsTarget.hp = Math.max(0, fsTarget.hp - dmg)
        ctx.addLog(`¡Se cumplió la premonición! ${fsTarget.name} recibió daño.`, 'log-info', fsTarget)
        gameBus.emit('PLAY_SOUND', 'statusDamage')
      }
    }
  }

  tickStatus(p, ctx.addLog, 'player')
  tickStatus(e, ctx.addLog, 'enemy')
  tickLeechSeed(p, e, ctx.addLog)
  tickLeechSeed(e, p, ctx.addLog)
  
  const w = active.weather
  if (w && w.turns > 0) {
    w.turns--
    if (w.turns === 0) {
      ctx.addLog(`¡El efecto de ${w.type} se desvaneció!`, 'log-info')
      w.type = mapStore.currentWeather || 'clear'
      w.turns = -1
    }
  }

  const fieldEffects = ['reflect', 'lightScreen', 'safeguard', 'mist'] as const
  const sides = [
    { stages: ctx.playerStages, name: 'Jugador', log: 'log-player' as const },
    { stages: ctx.enemyStages, name: 'Enemigo', log: 'log-enemy' as const }
  ]
  sides.forEach(side => {
    fieldEffects.forEach(effect => {
      const stages = side.stages.value
      if (stages[effect] > 0) {
        stages[effect]--
        if (stages[effect] === 0) {
          const effectLabel = effect === 'reflect' ? 'Reflejo' : effect === 'lightScreen' ? 'Pantalla Luz' : effect
          ctx.addLog(`¡El efecto de ${effectLabel} del ${side.name} se desvaneció!`, side.log)
        }
      }
    })
  })

  applyEndTurnWeather(p, e, active.weather, ctx.addLog)
  
  if (p.hp <= 0) await ctx.handleFaint('player')
  if (ctx.isBattleActive.value && e.hp <= 0) await ctx.handleFaint('enemy')
  
  ctx.persistBattle()
  if (active && !active.over) {
    active.turnCount++
  }
}
