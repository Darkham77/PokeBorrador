import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { processEvGain } from '@/logic/battle/battleRewards';
import { makePokemon, recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import { createDefaultEvs } from '@/logic/pokemon/evMath';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Battle EV Gains & Rewards Distribution', () => {
  function createMon(species: string, level: number): Pokemon {
    const mon = makePokemon(species, level, { bypassWhitelist: true });
    assert.ok(mon, `Failed to create test pokemon: ${species}`);
    return mon;
  }

  it('awards EVs to a participant when defeating an enemy Pokemon', () => {
    const playerMon = createMon('charmander', 10);
    playerMon.evs = createDefaultEvs();

    const enemyMon = createMon('bulbasaur', 5); // Bulbasaur gives 1 SpA

    const participants = new Set<string>([playerMon.uid]);
    const result = processEvGain(playerMon, enemyMon, participants);

    assert.ok(result !== null);
    assert.strictEqual(result.totalGained, 1);
    assert.strictEqual(playerMon.evs.spa, 1);
    assert.strictEqual(result.statGains.spa, 1);
  });

  it('does NOT award EVs to a non-participating Pokemon without expshare', () => {
    const playerMon = createMon('charmander', 10);
    playerMon.evs = createDefaultEvs();
    playerMon.heldItem = null;

    const enemyMon = createMon('bulbasaur', 5);

    const participants = new Set<string>(['different-mon-uid']);
    const result = processEvGain(playerMon, enemyMon, participants);

    assert.strictEqual(result, null);
    assert.strictEqual(playerMon.evs.spa, 0);
  });

  it('awards EVs to non-participating Pokemon if holding expshare', () => {
    const benchedMon = createMon('squirtle', 10);
    benchedMon.evs = createDefaultEvs();
    benchedMon.heldItem = 'expshare';

    const enemyMon = createMon('charmander', 5); // Charmander gives 1 Spe

    const participants = new Set<string>(['active-mon-uid']);
    const result = processEvGain(benchedMon, enemyMon, participants);

    assert.ok(result !== null);
    assert.strictEqual(result.totalGained, 1);
    assert.strictEqual(benchedMon.evs.spe, 1);
  });

  it('awards EVs even to Level 100 Pokemon and recalculates stats immediately', () => {
    const maxLevelMon = createMon('charizard', 100);
    maxLevelMon.nature = 'hardy';
    maxLevelMon.evs = createDefaultEvs();
    recalcPokemonStats(maxLevelMon, true);

    const prevSpa = maxLevelMon.spa;
    const enemyMon = createMon('alakazam', 50); // Alakazam gives 3 SpA

    const participants = new Set<string>([maxLevelMon.uid]);
    const result = processEvGain(maxLevelMon, enemyMon, participants);

    assert.ok(result !== null);
    assert.strictEqual(result.totalGained, 3);
    assert.strictEqual(maxLevelMon.evs.spa, 3);

    // After getting 4 EVs, stats at level 100 will increase by 1 point! Let's test with 4 EVs
    const enemy2 = createMon('gengar', 50); // Gengar gives 3 SpA
    processEvGain(maxLevelMon, enemy2, participants); // Now 6 SpA EVs
    recalcPokemonStats(maxLevelMon, true);

    assert.strictEqual(maxLevelMon.spa, prevSpa + 1); // 6 / 4 = 1 stat point gained!
  });

  it('doubles EV rewards in battle when Pokemon is infected with Pokérus', () => {
    const pkrsMon = createMon('pikachu', 20);
    pkrsMon.evs = createDefaultEvs();
    pkrsMon.pokerus = 'infected';

    const enemyMon = createMon('alakazam', 50); // Alakazam gives 3 SpA

    const participants = new Set<string>([pkrsMon.uid]);
    const result = processEvGain(pkrsMon, enemyMon, participants);

    assert.ok(result !== null);
    assert.strictEqual(result.totalGained, 6); // 3 * 2 = 6
    assert.strictEqual(pkrsMon.evs.spa, 6);
  });
});
