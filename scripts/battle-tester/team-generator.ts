// scripts/battle-tester/team-generator.ts
import { Dex, toID } from '@pkmn/sim';
import type { PokemonSet } from '@pkmn/sim';

export interface TestBatch {
  playerTeam: PokemonSet[];
  enemyTeam: PokemonSet[];
  movesToTest: string[];
  abilitiesToTest: string[];
}

export function generateTestBatches(batchSize: number = 6): TestBatch[] {
  const dexGen = Dex.forGen(9);
  
  // Obtener todos los movimientos estándar de Gen 9
  const allMoves = dexGen.moves.all()
    .filter(m => m.exists && !m.isNonstandard && m.id !== 'struggle');
  
  // Obtener todas las habilidades de Gen 9
  const allAbilities = dexGen.abilities.all()
    .filter(a => a.exists && !a.isNonstandard);

  const movePool = allMoves.map(m => m.name);
  const abilityPool = allAbilities.map(a => a.name);

  const batches: TestBatch[] = [];

  let moveIdx = 0;
  let abilityIdx = 0;

  while (moveIdx < movePool.length || abilityIdx < abilityPool.length) {
    const playerTeam: PokemonSet[] = [];
    const enemyTeam: PokemonSet[] = [];
    
    const batchMoves: string[] = [];
    const batchAbilities: string[] = [];

    // Llenar equipo del jugador (6 Pokémon)
    for (let p = 0; p < batchSize; p++) {
      if (moveIdx >= movePool.length && abilityIdx >= abilityPool.length) break;

      const pMoves: string[] = [];
      for (let m = 0; m < 4; m++) {
        if (moveIdx < movePool.length) {
          const moveName = movePool[moveIdx]!;
          pMoves.push(moveName);
          batchMoves.push(toID(moveName));
          moveIdx++;
        }
      }

      let abilityName = 'No Ability';
      if (abilityIdx < abilityPool.length) {
        abilityName = abilityPool[abilityIdx]!;
        batchAbilities.push(toID(abilityName));
        abilityIdx++;
      }

      // Determinar item útil para disparar la habilidad
      let item = '';
      const abilityId = toID(abilityName);
      if (['guts', 'marvelscale', 'quickfeet', 'flareboost'].includes(abilityId)) {
        item = 'Flame Orb';
      } else if (['poisonheal', 'toxicboost'].includes(abilityId)) {
        item = 'Toxic Orb';
      }

      // Creamos un Mew que puede aprender todo en customgame
      playerTeam.push({
        name: `P-Poke${p + 1}`,
        species: 'Mew',
        level: 100,
        gender: '',
        item: item,
        ability: abilityName,
        nature: 'Serious',
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: pMoves.length > 0 ? pMoves : ['Tackle']
      });
    }

    // Llenar equipo del enemigo con sacos de arena (Blissey) con movimientos de estado, clima y terreno variados
    const weathers = ['Rain Dance', 'Sunny Day', 'Sandstorm', 'Snowscape', 'Electric Terrain', 'Grassy Terrain'];
    const statuses = ['Toxic', 'Thunder Wave', 'Will-O-Wisp', 'Yawn', 'Toxic', 'Thunder Wave'];

    for (let e = 0; e < batchSize; e++) {
      const weatherMove = weathers[e % weathers.length]!;
      const statusMove = statuses[e % statuses.length]!;

      enemyTeam.push({
        name: `E-Poke${e + 1}`,
        species: 'Blissey',
        level: 100,
        gender: '',
        item: '',
        ability: 'Natural Cure',
        nature: 'Serious',
        evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 4, spe: 0 },
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        moves: ['Soft-Boiled', 'Seismic Toss', weatherMove, statusMove]
      });
    }

    if (playerTeam.length > 0) {
      batches.push({
        playerTeam,
        enemyTeam,
        movesToTest: batchMoves,
        abilitiesToTest: batchAbilities
      });
    }
  }

  return batches;
}
