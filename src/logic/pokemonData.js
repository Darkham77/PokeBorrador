export const POKEMON_DB = {
  bulbasaur: {
    name: 'Bulbasaur', emoji: '🌿', type: 'grass', hp: 45, atk: 49, def: 49, spa: 65, spd: 65, spe: 45,
    learnset: [{ lv: 1, name: 'Placaje', pp: 35 }, { lv: 4, name: 'Gruñido', pp: 40 }, { lv: 7, name: 'Drenadoras', pp: 10 }, { lv: 10, name: 'Látigo Cepa', pp: 25 }, { lv: 15, name: 'Polvo Veneno', pp: 35 }, { lv: 15, name: 'Somnífera', pp: 15 }, { lv: 20, name: 'Derribo', pp: 20 }, { lv: 25, name: 'Hoja Afilada', pp: 25 }, { lv: 32, name: 'Dulce Aroma', pp: 20 }, { lv: 39, name: 'Desarrollo', pp: 40 }, { lv: 46, name: 'Rayo Solar', pp: 10 }]
  },
  // ... rest of the database
}

export function getSpeciesHistory(id, EVOLUTION_TABLE) {
  const history = [id];
  let current = id;
  
  const findPreEvo = (speciesId) => {
    if (!EVOLUTION_TABLE) return null;
    for (const [from, data] of Object.entries(EVOLUTION_TABLE)) {
      if (data.to === speciesId) return from;
    }
    return null;
  };

  let pre;
  while ((pre = findPreEvo(current))) {
    if (history.includes(pre)) break;
    history.unshift(pre);
    current = pre;
  }
  return history;
}

export function getMovesAtLevel(id, level, EVOLUTION_TABLE, MOVE_DATA) {
  const history = getSpeciesHistory(id, EVOLUTION_TABLE);
  let allPotentialMoves = [];
  const seenNames = new Set();

  history.forEach(spId => {
    const db = POKEMON_DB[spId];
    if (db && db.learnset) {
      db.learnset.forEach(m => {
        if (m.lv <= level) {
          allPotentialMoves.push(m);
        }
      });
    }
  });

  allPotentialMoves.sort((a, b) => a.lv - b.lv);

  const uniqueMoves = [];
  for (let i = allPotentialMoves.length - 1; i >= 0; i--) {
    const m = allPotentialMoves[i];
    if (!seenNames.has(m.name)) {
      uniqueMoves.unshift(m);
      seenNames.add(m.name);
    }
  }

  const last4 = uniqueMoves.slice(-4);
  return last4.map(m => {
    const moveData = MOVE_DATA ? (MOVE_DATA[m.name] || {}) : {};
    return { 
      name: m.name, 
      pp: m.pp || moveData.pp || 35, 
      maxPP: m.pp || moveData.pp || 35,
      type: moveData.type || 'normal',
      power: moveData.power || 0
    };
  });
}
