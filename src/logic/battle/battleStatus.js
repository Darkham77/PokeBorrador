/**
 * Módulo de gestión de Estados Alterados y Efectos de Turno
 * Portado de js/07_battle.js para cumplir con el estándar modular v6.
 */

export function getStatusIcon(status) {
  if (!status) return '';
  const icons = {
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
export function tickStatus(pokemon, addLogFn, role = 'info') {
  // 1. Efectos de control temporal
  if (pokemon.disabledTurns > 0) {
    pokemon.disabledTurns--;
    if (pokemon.disabledTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya puede usar ${pokemon.disabledMove || 'su movimiento'} de nuevo!`, 'log-info');
      pokemon.disabledMove = null;
    }
  }

  if (pokemon.encoreTurns > 0) {
    pokemon.encoreTurns--;
    if (pokemon.encoreTurns <= 0) {
      addLogFn(`¡${pokemon.name} ya no está bajo el efecto de Otra Vez!`, 'log-info');
      pokemon.encoreMove = null;
    }
  }

  // 2. Estados alterados persistentes (Daño)
  if (!pokemon.status) return false;

  const logCls = role === 'player' ? 'log-enemy' : role === 'enemy' ? 'log-player' : 'log-info';
  
  switch (pokemon.status) {
    case 'burn': {
      const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre quemaduras! (-${dmg} HP)`, logCls);
      return true;
    }
    case 'poison': {
      let dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
      // Soporte para Veneno Grave (Bad Poison / Toxic)
      if (pokemon.badPoison) {
        dmg = Math.max(1, Math.floor((pokemon.maxHp * pokemon.badPoison) / 16));
        pokemon.badPoison++;
      }
      pokemon.hp = Math.max(0, pokemon.hp - dmg);
      addLogFn(`¡${pokemon.name} sufre el veneno! (-${dmg} HP)`, logCls);
      return true;
    }
  }

  return false;
}

/**
 * Procesa efectos de campo como Drenadoras.
 */
export function tickLeechSeed(pokemon, opponent, addLogFn) {
  if (!pokemon.seeded || pokemon.hp <= 0) return false;

  const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
  pokemon.hp = Math.max(0, pokemon.hp - dmg);
  addLogFn(`¡Drenadoras resta salud a ${pokemon.name}! (-${dmg} HP)`, 'log-enemy');

  if (opponent && opponent.hp > 0) {
    const heal = dmg;
    opponent.hp = Math.min(opponent.maxHp, opponent.hp + heal);
    addLogFn(`¡${opponent.name} recuperó salud!`, 'log-info');
  }
  
  return true;
}
