import { describe, it, expect, vi } from 'vitest';
import { parseShowdownLogLine } from '@/logic/battle/showdownBridge';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { ref } from 'vue';

describe('Showdown Protocol Coverage (-cant & flinch) - Unit Tests', () => {
  it('parses |-cant|...|flinch lines without unhandled visual parser warnings and triggers flinch animation', async () => {
    const alakazam: Pokemon = {
      uid: 'alakazam-uid-1',
      id: 'alakazam',
      species: 'alakazam',
      name: 'Alakazam',
      level: 50,
      hp: 120,
      maxHp: 120,
      atk: 50,
      def: 60,
      spa: 135,
      spd: 95,
      spe: 120,
      type: 'psychic',
      moves: [],
      status: '',
      sleepTurns: 0,
      friendship: 100,
      vigor: 100,
      maxVigor: 100,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      nature: 'timid',
      ability: 'synchronize',
      gender: 'm',
      tags: [],
      obtainedAt: Date.now(),
      obtainedMethod: 'wild',
      isShiny: false,
      catchRate: 50,
      exp: 0,
      expNeeded: 1000,
      volatileCounters: {}
    };

    const triggerFlinchAnim = vi.fn().mockResolvedValue(undefined);
    const addLog = vi.fn();

    const ctx = {
      activeBattle: ref({
        player: alakazam,
        enemy: null,
        playerTeam: [alakazam]
      }),
      player: ref(alakazam),
      enemy: ref(null),
      animations: {
        triggerFlinchAnim
      },
      addLog
    } as unknown as BattleContext;

    // Parse Showdown's official |-cant| line for flinch
    await parseShowdownLogLine(ctx, '|-cant|p1a: Alakazam|flinch');

    // Assert flinch volatile was set
    expect(alakazam.volatileCounters?.['flinch']).toBe(1);

    // Assert flinch animation was triggered for player
    expect(triggerFlinchAnim).toHaveBeenCalledWith('player');

    // Assert descriptive battle log was added
    expect(addLog).toHaveBeenCalledWith(
      expect.stringContaining('¡Alakazam retrocedió!'),
      'log-player',
      alakazam
    );
  });

  it('also handles legacy |cant| lines for status conditions like paralysis', async () => {
    const alakazam: Pokemon = {
      uid: 'alakazam-uid-1',
      id: 'alakazam',
      species: 'alakazam',
      name: 'Alakazam',
      level: 50,
      hp: 120,
      maxHp: 120,
      atk: 50,
      def: 60,
      spa: 135,
      spd: 95,
      spe: 120,
      type: 'psychic',
      moves: [],
      status: 'par',
      sleepTurns: 0,
      friendship: 100,
      vigor: 100,
      maxVigor: 100,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      nature: 'timid',
      ability: 'synchronize',
      gender: 'm',
      tags: [],
      obtainedAt: Date.now(),
      obtainedMethod: 'wild',
      isShiny: false,
      catchRate: 50,
      exp: 0,
      expNeeded: 1000
    };

    const addLog = vi.fn();
    const ctx = {
      activeBattle: ref({
        player: alakazam,
        enemy: null,
        playerTeam: [alakazam]
      }),
      player: ref(alakazam),
      enemy: ref(null),
      addLog
    } as unknown as BattleContext;

    await parseShowdownLogLine(ctx, '|cant|p1a: Alakazam|par');

    expect(addLog).toHaveBeenCalledWith(
      expect.stringContaining('¡Alakazam está paralizado y no puede moverse!'),
      'log-player',
      alakazam
    );
  });
});
