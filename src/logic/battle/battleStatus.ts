
/**
 * Módulo de gestión de Estados Alterados y Efectos de Turno
 * Portado de js/07_battle.js para cumplir con el estándar modular v6.
 */

import { gameBus } from '@/logic/gameBus'

export function getStatusIcon(status: any) {
  if (!status) return '';
  const icons: any = {
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
export function tickStatus(pokemon: any, addLogFn: any, role = 'info') {
  if (!pokemon) return false;
  // 1. Efectos de control temporal
  if (pokemon.disabledTurns > 0) {
    pokemon.disabledTurns--;
    if (pokemon.disabledTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya puede usar ${pokemon.disabledMove || 'su movimiento'} de nuevo!`, 'log-info', pokemon);
      pokemon.disabledMove = null;
    }
  }

  if (pokemon.encoreTurns > 0) {
    pokemon.encoreTurns--;
    if (pokemon.encoreTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya no está bajo el efecto de Otra Vez!`, 'log-info', pokemon);
      pokemon.encoreMove = null;
    }
  }

  if (pokemon.tauntTurns > 0) {
    pokemon.tauntTurns--;
    if (pokemon.tauntTurns <= 0) {
      addLogFn(`¡La mofa sobre ${pokemon.name} ha terminado!`, 'log-info', pokemon);
    }
  }

  if (pokemon.thrashTurns > 0) {
    pokemon.thrashTurns--;
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
      gameBus.emit('PLAY_SOUND', 'statusDamage');
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
      gameBus.emit('PLAY_SOUND', 'statusDamage');
      return true;
    }
  }

  // 3. Daño por atadura
  if (pokemon.bound > 0) {
    pokemon.bound--;
    if (pokemon.bound <= 0) {
      addLogFn(`¡${pokemon.name} se libró de la atadura!`, 'log-info', pokemon);
    } else {
      const dmg = Math.max(1, Math.floor(pokemon.maxHp / 16));
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre por la atadura! (-${dmg} HP)`, 'log-info', pokemon);
      gameBus.emit('PLAY_SOUND', 'statusDamage');
    }
  }

  // 4. Arraigo (Ingrain)
  if (pokemon.ingrain && pokemon.hp > 0 && pokemon.hp < pokemon.maxHp) {
    const heal = Math.max(1, Math.floor(pokemon.maxHp / 16));
    pokemon.hp = Math.min(pokemon.maxHp, pokemon.hp + heal);
    addLogFn(`¡${pokemon.name} recuperó salud por sus raíces!`, 'log-info', pokemon);
    gameBus.emit('PLAY_SOUND', 'heal');
  }

  // 5. Canto Mortal (Perish Song)
  if (pokemon.perishSongCount > 0) {
    pokemon.perishSongCount--;
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
    gameBus.emit('PLAY_SOUND', 'statusDamage');
  }

  return false;
}

/**
 * Procesa efectos de campo como Drenadoras.
 */
export function tickLeechSeed(pokemon: any, opponent: any, addLogFn: any) {
  if (!pokemon || !pokemon.seeded || pokemon.hp <= 0) return false;

  const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
  pokemon.hp = Math.max(0, pokemon.hp - dmg);
  addLogFn(`¡Drenadoras resta salud a ${pokemon.name}! (-${dmg} HP)`, 'log-enemy', pokemon);
  gameBus.emit('PLAY_SOUND', 'statusDamage');

  if (opponent && opponent.hp > 0) {
    const heal = dmg;
    opponent.hp = Math.min(opponent.maxHp, opponent.hp + heal);
    addLogFn(`¡${opponent.name} recuperó salud!`, 'log-info', opponent);
    gameBus.emit('PLAY_SOUND', 'heal');
  }
  
  return true;
}

/**
 * Limpia todos los estados temporales/volátiles de un Pokémon al salir o entrar en combate.
 */
export function clearVolatileStatus(poke: any) {
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
}
