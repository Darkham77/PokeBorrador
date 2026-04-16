/**
 * Battle Status and Passive Effect logic.
 */

export function checkAbilityImmunity(attacker, defender, move, MOVE_DATA, addLogFn, options = {}) {
  const ab = defender.ability;
  const md = MOVE_DATA[move.name] || {};
  const { enemyStages, playerStages, b } = options;

  if (ab === 'Pararrayos' && md.type === 'electric') {
    addLogFn(`¡El Pararrayos de ${defender.name} absorbió el ataque!`, 'log-info');
    const stages = (b && b.enemy === defender) ? enemyStages : playerStages;
    if (stages) {
      stages.spa = Math.min(6, (stages.spa || 0) + 1);
      addLogFn(`¡Subió el At. Esp de ${defender.name}!`, 'log-info');
    }
    return true;
  }
  
  if (ab === 'Absorbe Agua' && md.type === 'water') {
    addLogFn(`¡El Absorbe Agua de ${defender.name} absorbió el ataque!`, 'log-info');
    const heal = Math.floor(defender.maxHp / 4);
    defender.hp = Math.min(defender.maxHp, defender.hp + heal);
    addLogFn(`¡${defender.name} recuperó HP!`, 'log-info');
    return true;
  }

  if (ab === 'Absorbe Voltio' && md.type === 'electric') {
    addLogFn(`¡El Absorbe Voltio de ${defender.name} absorbió el ataque!`, 'log-info');
    const heal = Math.floor(defender.maxHp / 4);
    defender.hp = Math.min(defender.maxHp, defender.hp + heal);
    addLogFn(`¡${defender.name} recuperó HP!`, 'log-info');
    return true;
  }

  if (ab === 'Absorbe Fuego' && md.type === 'fire') {
    addLogFn(`¡El Absorbe Fuego de ${defender.name} absorbió el ataque!`, 'log-info');
    return true;
  }

  if (ab === 'Insonorizar' && md.sound) {
    addLogFn(`¡El Insonorizar de ${defender.name} bloqueó el ataque de sonido!`, 'log-info');
    return true;
  }

  if (ab === 'Levitación' && md.type === 'ground' && md.cat !== 'status') {
    addLogFn(`¡${defender.name} levita y evita el ataque!`, 'log-info');
    return true;
  }
  
  if (ab === 'Humedad' && (move.name === 'Autodestrucción' || move.name === 'Explosión')) {
    addLogFn(`¡La Humedad de ${defender.name} impide la explosión!`, 'log-info');
    return true;
  }

  return false;
}

export function tickStatus(pokemon, addLogFn, role) {
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

  if (!pokemon.status) return false;
  const logCls = role === 'player' ? 'log-enemy' : role === 'enemy' ? 'log-player' : 'log-info';
  
  switch (pokemon.status) {
    case 'burn':
      pokemon.hp = Math.max(0, pokemon.hp - Math.max(1, Math.floor(pokemon.maxHp / 8)));
      addLogFn(`¡${pokemon.name} sufre quemaduras! (-${Math.max(1, Math.floor(pokemon.maxHp / 8))} HP)`, logCls);
      return true;
    case 'poison': {
      let dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
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

export function tickLeechSeed(pokemon, role, b, addLogFn, state) {
  if (!pokemon.seeded || pokemon.hp <= 0 || !b) return false;

  const dmg = Math.max(1, Math.floor(pokemon.maxHp / 8));
  pokemon.hp = Math.max(0, pokemon.hp - dmg);
  addLogFn(`¡Drenadoras resta salud a ${pokemon.name}! (-${dmg} HP)`, 'log-enemy');

  const opponent = (role === 'player') ? b.enemy : b.player;
  if (opponent && opponent.hp > 0) {
    const heal = dmg;
    opponent.hp = Math.min(opponent.maxHp, opponent.hp + heal);
    addLogFn(`¡${opponent.name} recuperó salud!`, 'log-info');

    // Sync player heal to team
    if (role === 'enemy') { // Opponent is player
      const tm = state.team.find(p => p.name === b.player.name);
      if (tm) tm.hp = b.player.hp;
    }
  }
  return true;
}
