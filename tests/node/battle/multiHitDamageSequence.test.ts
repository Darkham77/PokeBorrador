import { describe, it, expect, vi } from 'vitest';
import { parseShowdownLogLine } from '@/logic/battle/showdownBridge';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Multi-Hit Damage Sequence - Unit Tests', () => {
  it('garantiza que el daño de Ataque Óseo (Bone Rush) reduce el HP de manera monótonamente decreciente sin saltos ni curación espuria', async () => {
    const marowak: Pokemon = {
      uid: 'marowak-p1-uid',
      id: 'marowak',
      species: 'marowak',
      name: 'Marowak',
      level: 50,
      hp: 133,
      maxHp: 133,
      atk: 100,
      def: 130,
      spa: 70,
      spd: 100,
      spe: 65,
      type: 'ground',
      moves: [],
      status: '',
      sleepTurns: 0,
      friendship: 100,
      vigor: 100,
      maxVigor: 100,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      nature: 'adamant',
      ability: 'rockhead',
      gender: 'm',
      tags: [],
      obtainedAt: Date.now(),
      obtainedMethod: 'wild',
      isShiny: false,
      catchRate: 75,
      exp: 0,
      expNeeded: 1000
    };

    const golem: Pokemon = {
      uid: 'golem-p2-uid',
      id: 'golem',
      species: 'golem',
      name: 'Golem',
      level: 50,
      hp: 155,
      maxHp: 155,
      atk: 130,
      def: 150,
      spa: 75,
      spd: 85,
      spe: 65,
      type: 'rock',
      type2: 'ground',
      moves: [],
      status: '',
      sleepTurns: 0,
      friendship: 100,
      vigor: 100,
      maxVigor: 100,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      nature: 'impish',
      ability: 'sturdy',
      gender: 'm',
      tags: [],
      obtainedAt: Date.now(),
      obtainedMethod: 'wild',
      isShiny: false,
      catchRate: 45,
      exp: 0,
      expNeeded: 1000
    };

    const activeBattleRef = {
      value: {
        player: marowak,
        enemy: golem,
        playerTeam: [marowak],
        enemyTeam: [golem],
        isPvP: true
      }
    };

    const logs: string[] = [];
    const mockStore: Partial<BattleContext> = {
      activeBattle: activeBattleRef as any,
      addLog: (msg: string) => { logs.push(msg); },
      animations: {
        handleShakeRequest: vi.fn().mockResolvedValue(undefined)
      } as any
    };

    const hpHistory: number[] = [golem.hp];

    // Simular secuencia de logs de Showdown para Bone Rush con 3 golpes
    const showdownLines = [
      '|move|p1a: Marowak|Bone Rush|p2a: Golem|[uids]p1a:Marowak=marowak-p1-uid,p2a:Golem=golem-p2-uid',
      '|-supereffective|p2a: Golem|[uids]p2a:Golem=golem-p2-uid',
      '|-damage|p2a: Golem|115/155|[uids]p2a:Golem=golem-p2-uid',
      '|-supereffective|p2a: Golem|[uids]p2a:Golem=golem-p2-uid',
      '|-damage|p2a: Golem|70/155|[uids]p2a:Golem=golem-p2-uid',
      '|-supereffective|p2a: Golem|[uids]p2a:Golem=golem-p2-uid',
      '|-damage|p2a: Golem|25/155|[uids]p2a:Golem=golem-p2-uid',
      '|-hitcount|p2a: Golem|3|[uids]p2a:Golem=golem-p2-uid'
    ];

    for (const line of showdownLines) {
      await parseShowdownLogLine(mockStore as BattleContext, line, showdownLines);
      if (line.startsWith('|-damage|')) {
        hpHistory.push(golem.hp);
      }
    }

    expect(hpHistory).toEqual([155, 115, 70, 25]);
    // Comprobar que en cada paso el HP siempre fue estrictamente menor que el anterior
    for (let i = 1; i < hpHistory.length; i++) {
      expect(hpHistory[i]!).toBeLessThan(hpHistory[i - 1]!);
    }
  });
});
