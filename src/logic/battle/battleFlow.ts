import { getMechanicalWeather, requireWeatherId, WEATHER_MECHANICAL, WEATHER_REGISTRY } from '../weather/weatherRegistry.ts'
import { getWeatherFamily } from '../../data/system/weatherFamilies.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages, LogFn, BattleWeather } from '@/types/battle/battle'
import { tickStatus, tickLeechSeed } from './battleStatus.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { PokemonType } from '@/data/battle/types'

const PARALYSIS_FULL_PARALYZE_CHANCE = 0.25;

export function updateCastformForm(pokemon: Pokemon | null | undefined, weatherType: string | undefined, addLog: LogFn) {
  if (!pokemon) return;
  if (pokemon.id !== 'castform') return;
  if (pokemon.ability !== 'forecast') return;

  const family = weatherType ? getWeatherFamily(weatherType) : null;
  let targetForm = 'normal';
  let targetType: PokemonType = 'normal';

  if (family === WEATHER_MECHANICAL.SUN) {
    targetForm = 'sunny';
    targetType = 'fire';
  } else if (family === WEATHER_MECHANICAL.RAIN) {
    targetForm = 'rainy';
    targetType = 'water';
  } else if (family === WEATHER_MECHANICAL.SNOW || family === WEATHER_MECHANICAL.HAIL) {
    targetForm = 'snowy';
    targetType = 'ice';
  } else {
    // Si no entra en ninguna de las familias (ej: viento, niebla, arena o despejado), vuelve a Normal
    targetForm = 'normal';
    targetType = 'normal';
  }

  const currentForm = pokemon.form || 'normal';

  if (currentForm !== targetForm) {
    pokemon.form = targetForm;
    pokemon.type = targetType;
    pokemon.type2 = undefined; // Las formas de Castform tienen un solo tipo

    const formLabels: Record<string, string> = { sunny: 'Soleada', rainy: 'Lluvia', snowy: 'Nieve' };
    if (targetForm === 'normal') {
      // Solo logueamos si venía de otra forma real y volvió a la normal
      if (currentForm !== 'normal') {
        addLog(`¡La habilidad Predicción de ${pokemon.name} lo devolvió a su forma normal!`, 'log-info', pokemon);
      }
    } else {
      addLog(`¡La habilidad Predicción de ${pokemon.name} lo transformó en su Forma ${formLabels[targetForm]}!`, 'log-info', pokemon);
    }
  }
}

export function handleEntryAbilities(playerPoke: Pokemon, enemyPoke: Pokemon, playerStages: BattleStages, enemyStages: BattleStages, addLog: LogFn, weatherType?: string) {
  if (!playerPoke || !enemyPoke) return // GUARDIA CRÍTICA

  // Actualizar forma de Castform al entrar
  const isAclimatacion = playerPoke.ability === 'cloudnine' || enemyPoke.ability === 'cloudnine';
  const effectiveWeather = isAclimatacion ? undefined : weatherType;
  updateCastformForm(playerPoke, effectiveWeather, addLog);
  updateCastformForm(enemyPoke, effectiveWeather, addLog);

  if (playerPoke.ability === 'intimidate') {
    enemyStages.atk = Math.max(-6, enemyStages.atk - 1)
    addLog(`¡La Intimidación de ${playerPoke.name} bajó el ataque de ${enemyPoke.name}!`, 'log-info', playerPoke)
  }
  if (enemyPoke.ability === 'intimidate') {
    playerStages.atk = Math.max(-6, playerStages.atk - 1)
    addLog(`¡La Intimidación de ${enemyPoke.name} bajó el ataque de ${playerPoke.name}!`, 'log-info', enemyPoke)
  }
}

export async function canAttack(pokemon: Pokemon, ctx: BattleContext) {
  const addLog = ctx.addLog
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
  if (pokemon.status === 'slp') {
    if ((pokemon.sleepTurns || 0) > 0) {
      pokemon.sleepTurns = (pokemon.sleepTurns || 0) - 1
      addLog(`¡${pokemon.name} está profundamente dormido!`, 'log-info', pokemon)
      return false
    } else {
      pokemon.status = ''
      addLog(`¡${pokemon.name} se despertó!`, 'log-info', pokemon)
    }
  }
  if (pokemon.status === 'frz') {
    if (Math.random() < 0.8) {
      addLog(`¡${pokemon.name} está congelado!`, 'log-info', pokemon)
      return false
    } else {
      pokemon.status = ''
      addLog(`¡${pokemon.name} se descongeló!`, 'log-info', pokemon)
    }
  }
  if (pokemon.status === 'par') {
    if (Math.random() < PARALYSIS_FULL_PARALYZE_CHANCE) {
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
        
        const side = pokemon.uid === ctx.activeBattle.value?.player?.uid ? 'player' : 'enemy'
        if (ctx.animations?.handleBlinkRequest) {
          await ctx.animations.handleBlinkRequest({ side })
        }
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

async function applyEndTurnWeather(p: Pokemon, e: Pokemon, weather: BattleWeather | null, ctx: BattleContext) {
  if (p?.ability === 'cloudnine' || e?.ability === 'cloudnine') {
    return;
  }
  const mechWeather = getMechanicalWeather(weather?.type);
  const wType = (weather?.visual || weather?.type || '').toLowerCase();
  const weatherLabel = WEATHER_REGISTRY[wType]?.label || 'CLIMA';
  const promises: Promise<void>[] = []

  if (mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    const isSandImmune = (poke: Pokemon) => ['rock', 'ground', 'steel'].includes(poke.type) || ['rock', 'ground', 'steel'].includes(poke.type2 || '')
    if (!isSandImmune(p)) {
      const dmg = Math.max(1, Math.floor(p.maxHp / 16))
      p.hp = Math.max(0, p.hp - dmg)
      ctx.addLog(`¡El efecto de ${weatherLabel} daña a ${p.name}! (-${dmg} HP)`, 'log-player', p)
      if (ctx.animations?.handleBlinkRequest) {
        promises.push(ctx.animations.handleBlinkRequest({ side: 'player' }))
      }
    }
    if (!isSandImmune(e)) {
      const dmg = Math.max(1, Math.floor(e.maxHp / 16))
      e.hp = Math.max(0, e.hp - dmg)
      ctx.addLog(`¡El efecto de ${weatherLabel} daña a ${e.name}! (-${dmg} HP)`, 'log-enemy', e)
      if (ctx.animations?.handleBlinkRequest) {
        promises.push(ctx.animations.handleBlinkRequest({ side: 'enemy' }))
      }
    }
  }

  if (mechWeather === WEATHER_MECHANICAL.HAIL) {
    const isHailImmune = (poke: Pokemon) => poke.type === 'ice' || poke.type2 === 'ice'
    if (!isHailImmune(p)) {
      const dmg = Math.max(1, Math.floor(p.maxHp / 16))
      p.hp = Math.max(0, p.hp - dmg)
      ctx.addLog(`¡El efecto de ${weatherLabel} daña a ${p.name}! (-${dmg} HP)`, 'log-player', p)
      if (ctx.animations?.handleBlinkRequest) {
        promises.push(ctx.animations.handleBlinkRequest({ side: 'player' }))
      }
    }
    if (!isHailImmune(e)) {
      const dmg = Math.max(1, Math.floor(e.maxHp / 16))
      e.hp = Math.max(0, e.hp - dmg)
      ctx.addLog(`¡El efecto de ${weatherLabel} daña a ${e.name}! (-${dmg} HP)`, 'log-enemy', e)
      if (ctx.animations?.handleBlinkRequest) {
        promises.push(ctx.animations.handleBlinkRequest({ side: 'enemy' }))
      }
    }
  }

  // Poder Solar (Solar Power) Recoil
  if (mechWeather === WEATHER_MECHANICAL.SUN) {
    [p, e].forEach(poke => {
      if (poke.ability === 'solarpower' && poke.hp > 0) {
        const dmg = Math.max(1, Math.floor(poke.maxHp / 8));
        poke.hp = Math.max(0, poke.hp - dmg);
        ctx.addLog(`¡${poke.name} sufre por el sol ardiente! (-${dmg} HP)`, 'log-info', poke);
        
        const side = poke.uid === ctx.activeBattle.value?.player?.uid ? 'player' : 'enemy'
        if (ctx.animations?.handleBlinkRequest) {
          promises.push(ctx.animations.handleBlinkRequest({ side }))
        }
      }
    });
  }

  if (promises.length > 0) {
    await Promise.all(promises)
  }
}

export async function applyEndTurnEffects(ctx: BattleContext) {
  const active = ctx.activeBattle.value
  const p = active?.player
  const e = active?.enemy
  if (!p || !e || !active || ctx.fsm.currentState.value !== 'ACTIVE_BATTLE') return

  const { showdownWorker } = await import('./showdownWorkerClient.ts')
  if (showdownWorker || (typeof window !== 'undefined' && (window as Window & { __showdownWorker__?: unknown }).__showdownWorker__)) {
    return
  }

  const { useMapStore } = await import('@/stores/map.ts')
  const mapStore = useMapStore()

  if (active.pendingSlotEffects?.length) {
    const resolved: typeof active.pendingSlotEffects = [];
    for (const effect of active.pendingSlotEffects) {
      effect.turnsLeft--;
      if (effect.turnsLeft <= 0) {
        const fsTarget = effect.side === 'player' ? active.player : active.enemy;
        if (fsTarget && fsTarget.hp > 0) {
          fsTarget.hp = Math.max(0, fsTarget.hp - effect.damage);
          const fromText = effect.sourceName ? ` de ${effect.sourceName}` : '';
          ctx.addLog(`¡Se cumplió la premonición${fromText}! ${fsTarget.name} recibió daño.`, 'log-info', fsTarget);
          const side = effect.side;
          if (ctx.animations?.handleBlinkRequest) {
            await ctx.animations.handleBlinkRequest({ side });
          }
        }
      } else {
        resolved.push(effect);
      }
    }
    active.pendingSlotEffects = resolved;
  }

  await tickStatus(p, ctx, 'player')
  await tickStatus(e, ctx, 'enemy')
  await tickLeechSeed(p, e, ctx)
  await tickLeechSeed(e, p, ctx)
  
  const w = active.weather
  if (w && w.turns > 0) {
    w.turns--
    if (w.turns === 0) {
      ctx.addLog(`¡El efecto de ${w.type} se desvaneció!`, 'log-info')
      w.type = requireWeatherId(mapStore.currentWeather || 'clear')
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

  await applyEndTurnWeather(p, e, active.weather, ctx)
  
  if (p.hp <= 0) await ctx.handleFaint('player')
  if (ctx.isBattleActive.value && e.hp <= 0) await ctx.handleFaint('enemy')
  
  ctx.persistBattle()
  if (active && !active.over) {
    active.turnCount++
  }
}

export { applyEntryHazards } from './battleFlowHazardsHelper.ts'
