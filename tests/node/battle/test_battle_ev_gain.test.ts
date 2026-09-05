import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { processEvGain, processExpGain } from '@/logic/battle/battleRewards';
import { makePokemon, recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import { createDefaultEvs } from '@/logic/pokemon/evMath';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Battle EV Gains & Rewards Distribution (Gen 6-9 Standard)', () => {
  function createMon(species: string, level: number): Pokemon {
    const mon = makePokemon(species, level, { bypassWhitelist: true });
    assert.ok(mon, `Failed to create test pokemon: ${species}`);
    return mon;
  }

  it('awards 100% EVs and full Exp to a living active participant when defeating an enemy Pokemon', () => {
    const playerMon = createMon('charmander', 10);
    playerMon.evs = createDefaultEvs();
    playerMon.hp = playerMon.maxHp;

    const enemyMon = createMon('bulbasaur', 5); // Bulbasaur gives 1 SpA

    const participants = new Set<string>([playerMon.uid]);
    const evResult = processEvGain(playerMon, enemyMon, participants);
    const expResult = processExpGain(playerMon, 100, participants, {
      isActive: true,
      participantsSet: participants,
    });

    assert.ok(evResult !== null);
    assert.strictEqual(evResult.totalGained, 1);
    assert.strictEqual(playerMon.evs.spa, 1);
    assert.strictEqual(evResult.statGains.spa, 1);

    assert.ok(expResult !== null);
    assert.strictEqual(expResult.gained, 100); // 100% for active participant
  });

  it('awards 100% undivided EVs and 50% Exp to a living benched Pokemon without expshare', () => {
    const benchedMon = createMon('charmander', 10);
    benchedMon.evs = createDefaultEvs();
    benchedMon.hp = benchedMon.maxHp;
    benchedMon.heldItem = null;

    const enemyMon = createMon('bulbasaur', 5); // Bulbasaur gives 1 SpA

    const participants = new Set<string>(['other-mon-uid']);
    const evResult = processEvGain(benchedMon, enemyMon, participants);
    const expResult = processExpGain(benchedMon, 100, participants, {
      isActive: false,
      participantsSet: participants,
    });

    // In Gen 6-9, living benched Pokémon get 100% of EVs and 50% shared Exp
    assert.ok(evResult !== null);
    assert.strictEqual(evResult.totalGained, 1);
    assert.strictEqual(benchedMon.evs.spa, 1);

    assert.ok(expResult !== null);
    assert.strictEqual(expResult.gained, 50); // 50% shared Exp
  });

  it('awards 100% EVs and 100% Exp to a living benched Pokemon holding expshare', () => {
    const benchedMon = createMon('squirtle', 10);
    benchedMon.evs = createDefaultEvs();
    benchedMon.hp = benchedMon.maxHp;
    benchedMon.heldItem = 'expshare';

    const enemyMon = createMon('charmander', 5); // Charmander gives 1 Spe

    const participants = new Set<string>(['active-mon-uid']);
    const evResult = processEvGain(benchedMon, enemyMon, participants);
    const expResult = processExpGain(benchedMon, 100, participants, {
      isActive: false,
      participantsSet: participants,
    });

    assert.ok(evResult !== null);
    assert.strictEqual(evResult.totalGained, 1);
    assert.strictEqual(benchedMon.evs.spe, 1);

    assert.ok(expResult !== null);
    assert.strictEqual(expResult.gained, 100); // 100% boosted Exp for expshare holder
  });

  it('does NOT award Exp or EVs to a fainted Pokemon (0 HP) even if it was an active participant', () => {
    const faintedMon = createMon('charmander', 10);
    faintedMon.evs = createDefaultEvs();
    faintedMon.hp = 0; // Fainted!

    const enemyMon = createMon('bulbasaur', 5);

    const participants = new Set<string>([faintedMon.uid]);
    const evResult = processEvGain(faintedMon, enemyMon, participants);
    const expResult = processExpGain(faintedMon, 100, participants, {
      isActive: true,
      participantsSet: participants,
    });

    assert.strictEqual(evResult, null);
    assert.strictEqual(faintedMon.evs.spa, 0);
    assert.strictEqual(expResult, null);
  });

  it('does NOT award Exp or EVs to a fainted Pokemon (0 HP) on the bench holding expshare', () => {
    const faintedBenchMon = createMon('squirtle', 10);
    faintedBenchMon.evs = createDefaultEvs();
    faintedBenchMon.hp = 0; // Fainted!
    faintedBenchMon.heldItem = 'expshare';

    const enemyMon = createMon('charmander', 5);

    const participants = new Set<string>(['active-mon-uid']);
    const evResult = processEvGain(faintedBenchMon, enemyMon, participants);
    const expResult = processExpGain(faintedBenchMon, 100, participants, {
      isActive: false,
      participantsSet: participants,
    });

    assert.strictEqual(evResult, null);
    assert.strictEqual(faintedBenchMon.evs.spe, 0);
    assert.strictEqual(expResult, null);
  });

  it('awards EVs even to Level 100 Pokemon and recalculates stats immediately', () => {
    const maxLevelMon = createMon('charizard', 100);
    maxLevelMon.nature = 'hardy';
    maxLevelMon.evs = createDefaultEvs();
    maxLevelMon.hp = maxLevelMon.maxHp;
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
    pkrsMon.hp = pkrsMon.maxHp;
    pkrsMon.pokerus = 'infected';

    const enemyMon = createMon('alakazam', 50); // Alakazam gives 3 SpA

    const participants = new Set<string>([pkrsMon.uid]);
    const result = processEvGain(pkrsMon, enemyMon, participants);

    assert.ok(result !== null);
    assert.strictEqual(result.totalGained, 6); // 3 * 2 = 6
    assert.strictEqual(pkrsMon.evs.spa, 6);
  });

  it('applies power items (+8 EVs) individually without contaminating teammates', () => {
    const powerMon = createMon('machop', 15);
    powerMon.evs = createDefaultEvs();
    powerMon.hp = powerMon.maxHp;
    powerMon.heldItem = 'powerbracer'; // +8 Atk

    const regularMon = createMon('pidgey', 15);
    regularMon.evs = createDefaultEvs();
    regularMon.hp = regularMon.maxHp;
    regularMon.heldItem = null;

    const enemyMon = createMon('machop', 10); // Machop gives 1 Atk

    const participants = new Set<string>([powerMon.uid]);
    const resPower = processEvGain(powerMon, enemyMon, participants);
    const resRegular = processEvGain(regularMon, enemyMon, participants);

    assert.ok(resPower !== null);
    assert.strictEqual(resPower.totalGained, 9); // 1 base + 8 power item = 9
    assert.strictEqual(powerMon.evs.atk, 9);

    assert.ok(resRegular !== null);
    assert.strictEqual(resRegular.totalGained, 1); // 1 base yield only
    assert.strictEqual(regularMon.evs.atk, 1);
  });
});
