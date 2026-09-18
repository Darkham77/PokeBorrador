import { getMechanicalWeather, requireWeatherId, resolveCurrentWeather, WEATHER_MECHANICAL, WEATHER_REGISTRY } from '../weather/weatherRegistry.ts'
import { getWeatherFamily } from '../../data/system/weatherFamilies.ts'
import type { Pokemon } from '@/types/pokemon/pokemon'
import type { BattleStages, LogFn, BattleWeather, BattleState, BattleSide } from '@/types/battle/battle'
import { tickStatus, tickLeechSeed } from './battleStatus.ts'
import type { BattleContext } from '@/types/battle/battleContext'
import type { PokemonType } from '@/data/battle/types'

export function updateCastformForm(pokemon: Pokemon | null | undefined, weatherType: string | undefined, addLog: LogFn) {
  if (!pokemon) return;
  if (pokemon.id !== 'castform') return;
  if (pokemon.ability !== 'forecast') return;

  const family = weatherType ? getWeatherFamily(weatherType) : null;
  let targetForm: string;
  let targetType: PokemonType;

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

const SAND_IMMUNE_TYPES_SET: ReadonlySet<string> = new Set(['rock', 'ground', 'steel']) // runtime-set: Fast O(1) membership lookup set
const WEATHER_CHIP_DAMAGE_DIVISOR = 16
const SOLAR_POWER_DAMAGE_DIVISOR = 8

function isSandImmune(poke: Pokemon): boolean {
  return SAND_IMMUNE_TYPES_SET.has(poke.type) || (poke.type2 ? SAND_IMMUNE_TYPES_SET.has(poke.type2) : false)
}

function isHailImmune(poke: Pokemon): boolean {
  return poke.type === 'ice' || poke.type2 === 'ice'
}

function applyWeatherDamage(
  poke: Pokemon,
  weatherLabel: string,
  side: BattleSide,
  ctx: BattleContext,
  promises: Promise<void>[]
) {
  const dmg = Math.max(1, Math.floor(poke.maxHp / WEATHER_CHIP_DAMAGE_DIVISOR))
  poke.hp = Math.max(0, poke.hp - dmg)
  const logType = side === 'player' ? 'log-player' : 'log-enemy'
  ctx.addLog(`¡El efecto de ${weatherLabel} daña a ${poke.name}! (-${dmg} HP)`, logType, poke)
  if (ctx.animations?.handleBlinkRequest) {
    promises.push(ctx.animations.handleBlinkRequest({ side }))
  }
}

function applySandstormWeather(p: Pokemon, e: Pokemon, weatherLabel: string, ctx: BattleContext, promises: Promise<void>[]) {
  if (!isSandImmune(p)) applyWeatherDamage(p, weatherLabel, 'player', ctx, promises)
  if (!isSandImmune(e)) applyWeatherDamage(e, weatherLabel, 'enemy', ctx, promises)
}

function applyHailWeather(p: Pokemon, e: Pokemon, weatherLabel: string, ctx: BattleContext, promises: Promise<void>[]) {
  if (!isHailImmune(p)) applyWeatherDamage(p, weatherLabel, 'player', ctx, promises)
  if (!isHailImmune(e)) applyWeatherDamage(e, weatherLabel, 'enemy', ctx, promises)
}

function applySolarPowerRecoil(poke: Pokemon, side: BattleSide, ctx: BattleContext, promises: Promise<void>[]) {
  if (poke.ability !== 'solarpower' || poke.hp <= 0) return
  const dmg = Math.max(1, Math.floor(poke.maxHp / SOLAR_POWER_DAMAGE_DIVISOR))
  poke.hp = Math.max(0, poke.hp - dmg)
  ctx.addLog(`¡${poke.name} sufre por el sol ardiente! (-${dmg} HP)`, 'log-info', poke)
  if (ctx.animations?.handleBlinkRequest) {
    promises.push(ctx.animations.handleBlinkRequest({ side }))
  }
}

async function applyEndTurnWeather(p: Pokemon, e: Pokemon, weather: BattleWeather | null, ctx: BattleContext) {
  if (p?.ability === 'cloudnine' || e?.ability === 'cloudnine') {
    return
  }
  const mechWeather = getMechanicalWeather(weather?.type)
  const wType = (weather?.visual || weather?.type || '').toLowerCase()
  const weatherLabel = WEATHER_REGISTRY[wType]?.label || 'CLIMA'
  const promises: Promise<void>[] = []

  if (mechWeather === WEATHER_MECHANICAL.SANDSTORM) {
    applySandstormWeather(p, e, weatherLabel, ctx, promises)
  } else if (mechWeather === WEATHER_MECHANICAL.HAIL) {
    applyHailWeather(p, e, weatherLabel, ctx, promises)
  } else if (mechWeather === WEATHER_MECHANICAL.SUN) {
    applySolarPowerRecoil(p, 'player', ctx, promises)
    applySolarPowerRecoil(e, 'enemy', ctx, promises)
  }

  if (promises.length > 0) {
    await Promise.all(promises)
  }
}

async function processPendingSlotEffects(active: BattleState, ctx: BattleContext): Promise<void> {
  if (!active.pendingSlotEffects?.length) return;
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

function processEndTurnWeatherFade(w: BattleWeather | undefined, ctx: BattleContext): void {
  if (w && w.turns > 0) {
    w.turns--;
    if (w.turns === 0) {
      ctx.addLog(`¡El efecto de ${w.type} se desvaneció!`, 'log-info');
      w.type = requireWeatherId(resolveCurrentWeather() || 'clear');
      w.turns = -1;
    }
  }
}

function processFieldScreensDecay(ctx: BattleContext): void {
  const fieldEffects = ['reflect', 'lightScreen', 'safeguard', 'mist'] as const;
  const sides = [
    { stages: ctx.playerStages, name: 'Jugador', log: 'log-player' as const },
    { stages: ctx.enemyStages, name: 'Enemigo', log: 'log-enemy' as const }
  ];
  sides.forEach(side => {
    fieldEffects.forEach(effect => {
      const stages = side.stages.value;
      if (stages[effect] > 0) {
        stages[effect]--;
        if (stages[effect] === 0) {
          const effectLabel = effect === 'reflect' ? 'Reflejo' : effect === 'lightScreen' ? 'Pantalla Luz' : effect; // spanish-ok: UI Spanish text localization label
          ctx.addLog(`¡El efecto de ${effectLabel} del ${side.name} se desvaneció!`, side.log);
        }
      }
    });
  });
}

export async function applyEndTurnEffects(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  const p = active?.player;
  const e = active?.enemy;
  if (!p || !e || !active || ctx.fsm.currentState.value !== 'ACTIVE_BATTLE') return;

  const { getShowdownWorker } = await import('./showdownWorkerClient.ts');
  if (getShowdownWorker()) {
    return;
  }

  await processPendingSlotEffects(active, ctx);

  await tickStatus(p, ctx, 'player');
  await tickStatus(e, ctx, 'enemy');
  await tickLeechSeed(p, e, ctx);
  await tickLeechSeed(e, p, ctx);
  
  processEndTurnWeatherFade(active.weather, ctx);
  processFieldScreensDecay(ctx);

  await applyEndTurnWeather(p, e, active.weather, ctx);
  
  if (p.hp <= 0) await ctx.handleFaint('player');
  if (ctx.isBattleActive.value && e.hp <= 0) await ctx.handleFaint('enemy');
  
  ctx.persistBattle();
  if (active && !active.over) {
    active.turnCount++;
  }
}

export { applyEntryHazards } from './battleFlowHazardsHelper.ts'
