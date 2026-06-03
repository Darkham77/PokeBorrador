/**
 * Módulo de gestión de Estados Alterados y Efectos de Turno
 * Portado de js/07_battle.js para cumplir con el estándar modular v6.
 */

import type { Pokemon, PokemonStatus } from '@/types/pokemon'
import type { BattleContext } from '@/types/battleContext'

export function getStatusIcon(status: PokemonStatus): string {
  if (!status) return '';
  const icons: Record<string, string> = {
    burn: '🔥',
    poison: '☠️',
    paralyze: '⚡',
    sleep: '💤',
    freeze: '🧊'
  };
  return icons[status] || '';
}

/**
 * Procesa los efectos permanentes y temporales al final del turno.
 * @returns {boolean} True si el Pokémon sigue en combate, False si se debilitó (aunque las funciones de daño usualmente no despachan muerte aquí)
 */
export async function tickStatus(pokemon: Pokemon, ctx: BattleContext, role: 'player' | 'enemy' | 'info' = 'info') {
  if (!pokemon) return false;
  const addLogFn = ctx.addLog;
  const side = role === 'player' ? 'player' : 'enemy';

  // 1. Efectos de control temporal
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
  
  // 2. Estados alterados persistentes (Daño)
  if (!pokemon.status) return false;

  const logCls = role === 'player' ? 'log-enemy' : role === 'enemy' ? 'log-player' : 'log-info';
  
  switch (pokemon.status) {
    case 'burn': {
      const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre quemaduras! (-${dmg} HP)`, logCls, pokemon);
      if (ctx.animations?.handleBlinkRequest) {
        await ctx.animations.handleBlinkRequest({ side });
      }
      return true;
    }
    case 'poison': {
      let dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
      if (pokemon.badPoison) {
        dmg = Math.max(1, Math.floor((pokemon.maxHp * pokemon.badPoison) / 16));
        pokemon.badPoison++;
      }
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre el veneno! (-${dmg} HP)`, logCls, pokemon);
      if (ctx.animations?.handleBlinkRequest) {
        await ctx.animations.handleBlinkRequest({ side });
      }
      return true;
    }
  }

  // 3. Daño por atadura
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

  // 4. Arraigo (Ingrain)
  if (pokemon.ingrain && pokemon.hp > 0 && pokemon.hp < pokemon.maxHp) {
    const heal = Math.max(1, Math.floor(pokemon.maxHp / 16));
    pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + heal);
    addLogFn(`¡${pokemon.name} recuperó salud por sus raíces!`, 'log-info', pokemon);
    if (ctx.animations?.handleHealRequest) {
      await ctx.animations.handleHealRequest({ side });
    }
  }

  // 5. Canto Mortal (Perish Song)
  if ((pokemon.perishSongCount ?? 0) > 0) {
    pokemon.perishSongCount = (pokemon.perishSongCount ?? 0) - 1;
    addLogFn(`¡La cuenta de Canto Mortal de ${pokemon.name} bajó a ${pokemon.perishSongCount}!`, 'log-info', pokemon);
    if (pokemon.perishSongCount === 0) {
      pokemon.hp = 0;
      addLogFn(`¡El destino de ${pokemon.name} se cumplió!`, 'log-info', pokemon);
    }
  }

  // 6. Maldición (Ghost Curse)
  if (pokemon.cursed && pokemon.hp > 0) {
    const dmg = Math.max(1, Math.floor(pokemon.maxHp / 4));
    pokemon.hp = Math.max(0, pokemon.hp - dmg);
    addLogFn(`¡${pokemon.name} sufre por la maldición! (-${dmg} HP)`, 'log-info', pokemon);
    if (ctx.animations?.handleBlinkRequest) {
      await ctx.animations.handleBlinkRequest({ side });
    }
  }

  return false;
}

/**
 * Procesa efectos de campo como Drenadoras.
 */
export async function tickLeechSeed(pokemon: Pokemon, opponent: Pokemon, ctx: BattleContext) {
  if (!pokemon || !pokemon.seeded || pokemon.hp <= 0) return false;

  const sideSelf = pokemon.uid === ctx.activeBattle.value?.player?.uid ? 'player' : 'enemy';
  const sideOpp = opponent.uid === ctx.activeBattle.value?.player?.uid ? 'player' : 'enemy';

  const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
  pokemon.hp = Math.max(0, pokemon.hp - dmg);
  ctx.addLog(`¡Drenadoras resta salud a ${pokemon.name}! (-${dmg} HP)`, 'log-enemy', pokemon);

  const blinkPromise = ctx.animations?.handleBlinkRequest
    ? ctx.animations.handleBlinkRequest({ side: sideSelf })
    : Promise.resolve();

  if (opponent && opponent.hp > 0) {
    const heal = dmg;
    opponent.hp = Math.min(opponent.maxHp, opponent.hp + heal);
    ctx.addLog(`¡${opponent.name} recuperó salud!`, 'log-info', opponent);
    
    const healPromise = ctx.animations?.handleHealRequest
      ? ctx.animations.handleHealRequest({ side: sideOpp })
      : Promise.resolve();
      
    await Promise.all([blinkPromise, healPromise]);
  } else {
    await blinkPromise;
  }
  
  return true;
}

/**
 * Limpia todos los estados temporales/volátiles de un Pokémon al salir o entrar en combate.
 */
export function clearVolatileStatus(poke: Pokemon) {
  if (!poke) return;
  poke.confused = 0
  poke.flinched = false
  poke.substitute = 0
  poke.seeded = false
  poke.attracted = false
  poke.cursed = false
  poke.protect = false
  poke.detect = false
  poke.destinyBond = false
  poke.perishSongCount = 0
  poke.tauntTurns = 0
  poke.disabledTurns = 0
  poke.disabledMove = null
  poke.encoreTurns = 0
  poke.encoreMove = null
  poke.focusEnergy = false
  poke.lockOn = false
  poke.ingrain = false
  poke.futureSightTurns = 0
  poke.futureSightDmg = 0
  poke.badPoison = 0
  poke.chargingMove = null
}
