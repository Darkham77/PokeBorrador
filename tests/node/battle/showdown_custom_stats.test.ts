import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';
import { Battle } from '@pkmn/sim';
import { getShowdownFormatId } from '../../../src/logic/battle/showdownAdapter.ts';

describe('Showdown Custom Stats Injection Unit Tests', () => {
  before(async () => {
    // Mock self to allow importing the worker file in Node environment
    (globalThis as any).self = {
      onmessage: null,
      postMessage: () => {}
    };
    await import('../../../src/logic/battle/showdown.worker.ts');
  });

  it('TestCase 1: Normal calculation when stats field is absent', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });

    const p1Team = [
      {
        name: 'Pikachu',
        species: 'Pikachu',
        level: 50,
        gender: 'M',
        item: '',
        ability: 'static',
        nature: 'serious',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: ['thunderbolt']
      }
    ];

    battle.setPlayer('p1', { name: 'Player 1', team: p1Team as any });
    const pikachu = battle.p1.pokemon[0];
    assert.ok(pikachu);
    
    // El HP estándar de un Pikachu L50 con IVs perfectos sin EVs es 110
    assert.strictEqual(pikachu.maxhp, 110);
    // El Ataque estándar es 75
    assert.strictEqual(pikachu.storedStats.atk, 75);
  });

  it('TestCase 2: Custom stats injection from client set (adventure/biome/medal bonuses)', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });

    // Definimos un Pikachu con estadísticas infladas (por ejemplo, con medallas o un bioma específico)
    const customStats = {
      hp: 150,
      atk: 120,
      def: 80,
      spa: 110,
      spd: 90,
      spe: 200
    };

    const p1Team = [
      {
        name: 'Pikachu',
        species: 'Pikachu',
        level: 50,
        gender: 'M',
        item: '',
        ability: 'static',
        nature: 'serious',
        ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
        evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
        moves: ['thunderbolt'],
        stats: customStats // Inyectado
      }
    ];

    battle.setPlayer('p1', { name: 'Player 1', team: p1Team as any });
    const pikachu = battle.p1.pokemon[0];
    assert.ok(pikachu);

    // Debe usar exactamente los stats personalizados indicados
    assert.strictEqual(pikachu.maxhp, customStats.hp);
    assert.strictEqual(pikachu.hp, customStats.hp);
    assert.strictEqual(pikachu.storedStats.atk, customStats.atk);
    assert.strictEqual(pikachu.storedStats.def, customStats.def);
    assert.strictEqual(pikachu.storedStats.spa, customStats.spa);
    assert.strictEqual(pikachu.storedStats.spd, customStats.spd);
    assert.strictEqual(pikachu.storedStats.spe, customStats.spe);
  });
});
