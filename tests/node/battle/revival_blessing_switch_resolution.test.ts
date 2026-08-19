import { describe, it, expect } from 'vitest';
import { ShowdownBattleAgent } from '../../../src/logic/battle/helpers/showdownBattleAgent.ts';
import { ShowdownTeamResolver } from '../../../src/logic/battle/showdownTeamResolver.ts';
import type { ShowdownPlayerRequest } from '../../../src/types/battle/battle.ts';

describe('Revival Blessing & Dynamic Forced Switch Resolution', () => {
  it('should select only fainted candidate when reviving flag is true', () => {
    class TestAgent extends ShowdownBattleAgent {
      public testDecideForcedSwitch(req: Parameters<ShowdownBattleAgent['decideForcedSwitch']>[0]) {
        return this.decideForcedSwitch(req);
      }
    }

    const agent = new TestAgent('p1');
    const req = {
      forceSwitch: [true],
      side: {
        id: 'p1',
        name: 'Player',
        pokemon: [
          { ident: 'p1: d04aa40b', details: 'Mew', condition: '342/342', active: true, reviving: true, uid: 'uid-1' },
          { ident: 'p1: ce026eb8', details: 'Mew', condition: '342/342', active: false, reviving: false, uid: 'uid-2' },
          { ident: 'p1: 66f24984', details: 'Mew', condition: '342/342', active: false, reviving: false, uid: 'uid-3' },
          { ident: 'p1: 00dd3e02', details: 'Mew', condition: '0 fnt', active: false, reviving: false, uid: 'uid-4' },
          { ident: 'p1: 0cf1f553', details: 'Mew', condition: '342/342', active: false, reviving: false, uid: 'uid-5' },
        ]
      }
    };

    const choice = agent.testDecideForcedSwitch(req as any);
    expect(choice).toBe('switch 4');
  });

  it('should resolve correct Showdown 1-based slot by UID dynamically', () => {
    const request: ShowdownPlayerRequest = {
      side: {
        pokemon: [
          { ident: 'p2: a2df7e53', details: 'Blissey', condition: '0 fnt', active: true, uid: 'uid-1' },
          { ident: 'p2: cfa419df', details: 'Blissey', condition: '0 fnt', active: false, uid: 'uid-2' },
          { ident: 'p2: 0ba7b97a', details: 'Blissey', condition: '0 fnt', active: false, uid: 'uid-3' },
          { ident: 'p2: 80e7b1f2', details: 'Blissey', condition: '651/651', active: false, uid: 'uid-4' },
        ]
      }
    };

    const slot = ShowdownTeamResolver.getShowdownSlotForUid(request, 'uid-4');
    expect(slot).toBe(4);
  });
});
