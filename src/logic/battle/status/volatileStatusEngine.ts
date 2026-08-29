import { requireVolatileStatusKey, type Pokemon } from '@/types/pokemon/pokemon';
import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleSide } from '@/types/battle/battle';

export async function processVolatileCounters(
  pokemon: Pokemon,
  ctx: BattleContext,
  role: BattleSide | 'info' = 'info'
) {
  if (!pokemon.volatileCounters) return;

  const addLogFn = ctx.addLog;
  const side = role === 'player' ? 'player' : 'enemy';

  for (const [key, val] of Object.entries(pokemon.volatileCounters)) {
    if (val === undefined || key === 'twoturnmove' || key === 'lockedmove') continue;
    if (val > 0) {
      const volatileKey = requireVolatileStatusKey(key);
      const newVal = val - 1;
      pokemon.volatileCounters[volatileKey] = newVal;

      if (key === 'partiallytrapped' && newVal > 0) {
        const dmg = Math.max(1, Math.floor(pokemon.maxHp / 16));
        pokemon.hp = Math.max(0, pokemon.hp - dmg);
        addLogFn(`¡${pokemon.name} sufre por el atrapamiento! (-${dmg} HP)`, 'log-info', pokemon);
        if (ctx.animations?.handleBlinkRequest) {
          await ctx.animations.handleBlinkRequest({ side });
        }
      }

      if (newVal === 0) {
        if (key === 'yawn') {
          delete pokemon.volatileCounters[volatileKey];
          if (!pokemon.status) {
            if (pokemon.ability === 'insomnia' || pokemon.ability === 'vitalspirit') {
              addLogFn(`¡La habilidad de ${pokemon.name} evitó quedarse dormido!`, 'log-info', pokemon);
            } else {
              pokemon.status = 'slp';
              pokemon.sleepTurns = 1 + Math.floor(Math.random() * 3);
              addLogFn(`¡${pokemon.name} se quedó dormido por el Bostezo!`, 'log-info', pokemon);
              if (ctx.animations?.handleBlinkRequest) {
                await ctx.animations.handleBlinkRequest({ side });
              }
            }
          }
        } else if (key === 'lockedmove') {
          delete pokemon.volatileCounters[volatileKey];
          if (!pokemon.confused) {
            if (pokemon.ability === 'owntempo') {
              addLogFn(`¡El Ritmo Propio de ${pokemon.name} evitó la confusión!`, 'log-info', pokemon);
            } else {
              pokemon.confused = 2 + Math.floor(Math.random() * 3);
              addLogFn(`¡${pokemon.name} se calmó, pero terminó confundido!`, 'log-info', pokemon);
            }
          }
        } else if (key === 'partiallytrapped') {
          delete pokemon.volatileCounters[key];
          addLogFn(`¡${pokemon.name} se liberó del atrapamiento!`, 'log-info', pokemon);
        }
      }
    }
  }
}

export function processControlTurns(pokemon: Pokemon, addLogFn: BattleContext['addLog']) {
  if ((pokemon.disabledTurns ?? 0) > 0) {
    pokemon.disabledTurns = (pokemon.disabledTurns ?? 0) - 1;
    if (pokemon.disabledTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya puede usar ${pokemon.disabledMove || 'su movimiento'} de nuevo!`, 'log-info', pokemon);
      pokemon.disabledMove = null;
    }
  }

  if ((pokemon.encoreTurns ?? 0) > 0) {
    pokemon.encoreTurns = (pokemon.encoreTurns ?? 0) - 1;
    if (pokemon.encoreTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya no está bajo el efecto de Otra Vez!`, 'log-info', pokemon);
      pokemon.encoreMove = null;
    }
  }

  if ((pokemon.tauntTurns ?? 0) > 0) {
    pokemon.tauntTurns = (pokemon.tauntTurns ?? 0) - 1;
    if (pokemon.tauntTurns <= 0) {
      addLogFn(`¡La mofa sobre ${pokemon.name} ha terminado!`, 'log-info', pokemon);
    }
  }

  if ((pokemon.thrashTurns ?? 0) > 0) {
    pokemon.thrashTurns = (pokemon.thrashTurns ?? 0) - 1;
    if (pokemon.thrashTurns <= 0) {
      addLogFn(`¡${pokemon.name} se calmó, pero terminó confundido!`, 'log-info', pokemon);
      pokemon.confused = 2 + Math.floor(Math.random() * 3);
    }
  }
}

export async function processVolatileDamageAndHeal(
  pokemon: Pokemon,
  ctx: BattleContext,
  role: BattleSide | 'info' = 'info'
) {
  const addLogFn = ctx.addLog;
  const side = role === 'player' ? 'player' : 'enemy';

  // Daño por atadura
  if ((pokemon.bound ?? 0) > 0) {
    pokemon.bound = (pokemon.bound ?? 0) - 1;
    if (pokemon.bound <= 0) {
      addLogFn(`¡${pokemon.name} se libró de la atadura!`, 'log-info', pokemon);
    } else {
      const dmg = Math.max(1, Math.floor(pokemon.maxHp / 16));
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre por la atadura! (-${dmg} HP)`, 'log-info', pokemon);
      if (ctx.animations?.handleBlinkRequest) {
        await ctx.animations.handleBlinkRequest({ side });
      }
    }
  }

  // Arraigo (Ingrain)
  if (pokemon.ingrain && pokemon.hp > 0 && pokemon.hp < pokemon.maxHp) {
    const heal = Math.max(1, Math.floor(pokemon.maxHp / 16));
    pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + heal);
    addLogFn(`¡${pokemon.name} recuperó salud por sus raíces!`, 'log-info', pokemon);
    if (ctx.animations?.handleHealRequest) {
      await ctx.animations.handleHealRequest({ side });
    }
  }

  // Canto Mortal (Perish Song)
  if ((pokemon.perishSongCount ?? 0) > 0) {
    pokemon.perishSongCount = (pokemon.perishSongCount ?? 0) - 1;
    addLogFn(`¡La cuenta de Canto Mortal de ${pokemon.name} bajó a ${pokemon.perishSongCount}!`, 'log-info', pokemon);
    if (pokemon.perishSongCount === 0) {
      pokemon.hp = 0;
      addLogFn(`¡El destino de ${pokemon.name} se cumplió!`, 'log-info', pokemon);
    }
  }

  // Maldición (Ghost Curse)
  if (pokemon.cursed && pokemon.hp > 0) {
    const dmg = Math.max(1, Math.floor(pokemon.maxHp / 4));
    pokemon.hp = Math.max(0, pokemon.hp - dmg);
    addLogFn(`¡${pokemon.name} sufre por la maldición! (-${dmg} HP)`, 'log-info', pokemon);
    if (ctx.animations?.handleBlinkRequest) {
      await ctx.animations.handleBlinkRequest({ side });
    }
  }
}
