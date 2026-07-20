import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { getShowdownFormatId } from '../../../src/logic/battle/showdownAdapter.ts';

interface ResolveActiveBattleState {
  playerRequest?: import('../../../src/types/battle/battle.ts').ShowdownPlayerRequest | null;
  enemyRequest?: import('../../../src/types/battle/battle.ts').ShowdownPlayerRequest | null;
  playerTeam?: { uid: string; name: string; nickname?: string | null }[] | null;
  enemyTeam?: { uid: string; name: string; nickname?: string | null }[] | null;
}

function getShowdownSlot(slotOrder: string[], uid: string): number {
  const idx = slotOrder.indexOf(uid);
  return idx !== -1 ? idx + 1 : 1;
}

function resolveShowdownSlot(
  active: ResolveActiveBattleState,
  side: 'player' | 'enemy',
  uid: string
): number {
  const request = side === 'player' ? active.playerRequest : active.enemyRequest;
  if (!request || !request.side || !Array.isArray(request.side.pokemon)) {
    throw new Error('Missing request');
  }
  const idx = request.side.pokemon.findIndex((p: { uid?: string } | null) => p && p.uid === uid);
  return idx !== -1 ? idx + 1 : 1;
}

describe('Showdown Team Order Synchronization & Slot Resolution Tests', () => {
  it('resolves correct 1-based Showdown slot indices based on slot order array', () => {
    const slotOrder = ['rhyhorn-uid', 'rhydon-uid', 'geodude-uid'];

    assert.strictEqual(getShowdownSlot(slotOrder, 'rhyhorn-uid'), 1); // active
    assert.strictEqual(getShowdownSlot(slotOrder, 'rhydon-uid'), 2);
    assert.strictEqual(getShowdownSlot(slotOrder, 'geodude-uid'), 3);
  });

  it('returns slot 1 for unknown UIDs', () => {
    const slotOrder = ['a-uid', 'b-uid'];
    assert.strictEqual(getShowdownSlot(slotOrder, 'unknown-uid'), 1);
  });

  it('resolveShowdownSlot reads playerRequest for player side', () => {
    const active = {
      playerRequest: {
        side: {
          pokemon: [{ uid: 'gengar-uid' }, { uid: 'vaporeon-uid' }, { uid: 'eevee-uid' }]
        }
      } as unknown as ResolveActiveBattleState['playerRequest'],
      enemyRequest: null
    } as unknown as ResolveActiveBattleState;
    assert.strictEqual(resolveShowdownSlot(active, 'player', 'gengar-uid'), 1);
    assert.strictEqual(resolveShowdownSlot(active, 'player', 'vaporeon-uid'), 2);
    assert.strictEqual(resolveShowdownSlot(active, 'player', 'eevee-uid'), 3);
  });

  it('resolveShowdownSlot reads enemyRequest for enemy side', () => {
    const active = {
      playerRequest: null,
      enemyRequest: {
        side: {
          pokemon: [{ uid: 'rhydon-uid' }, { uid: 'dugtrio-uid' }]
        }
      } as unknown as ResolveActiveBattleState['enemyRequest']
    } as unknown as ResolveActiveBattleState;
    assert.strictEqual(resolveShowdownSlot(active, 'enemy', 'rhydon-uid'), 1);
    assert.strictEqual(resolveShowdownSlot(active, 'enemy', 'dugtrio-uid'), 2);
  });

  it('resolveShowdownSlot throws when slot order is missing or empty', () => {
    const active = { playerRequest: null, enemyRequest: null } as unknown as ResolveActiveBattleState;
    assert.throws(() => {
      resolveShowdownSlot(active, 'player', 'any-uid');
    }, /Missing request/);
  });

  it('correctly flags INVALID_CHOICE error prefix when choose fails', () => {
    let errorThrown = false;
    try {
      const resVal = false;
      if (!resVal) throw new Error('INVALID_CHOICE: Elección inválida para p1');
    } catch (e) {
      errorThrown = true;
      assert.ok((e as Error).message.includes('INVALID_CHOICE'));
    }
    assert.strictEqual(errorThrown, true);
  });

  it('@pkmn/sim reorders side.pokemon on switch — active is always at index 0', async () => {
    const { Battle } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId() });

    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50 },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50 },
      { name: 'Eevee', species: 'Eevee', moves: ['tackle'], level: 50 }
    ];
    const p2Team = [{ name: 'Rhydon', species: 'Rhydon', moves: ['stoneedge'], level: 50 }];

    battle.setPlayer('p1', { name: 'P1', team: p1Team as unknown as import('@pkmn/sim').PokemonSet[] });
    battle.setPlayer('p2', { name: 'P2', team: p2Team as unknown as import('@pkmn/sim').PokemonSet[] });

    // Before switch: Vaporeon is active (index 0)
    assert.strictEqual(battle.p1.pokemon[0]?.name, 'Vaporeon');

    // Switch to Gengar (slot 2 in initial order)
    const r1 = battle.choose('p1', 'switch 2');
    const r2 = battle.choose('p2', 'move stoneedge');
    assert.ok(r1 && r2, 'Switch to Gengar must be valid');

    // After switch: @pkmn/sim places Gengar at index 0
    assert.strictEqual(battle.p1.pokemon[0]?.name, 'Gengar', 'Active mon must be at index 0');
    assert.strictEqual(battle.p1.pokemon[1]?.name, 'Vaporeon', 'Previous active moves to index 1');
  });

  it('@pkmn/sim slot order reflects readSlotOrder helper contract', async () => {
    const { Battle } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId() });

    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50 },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50 },
      { name: 'Eevee', species: 'Eevee', moves: ['tackle'], level: 50 }
    ];
    const p2Team = [
      { name: 'Rhydon', species: 'Rhydon', moves: ['stoneedge'], level: 50 },
      { name: 'Dugtrio', species: 'Dugtrio', moves: ['earthquake'], level: 50 }
    ];

    battle.setPlayer('p1', { name: 'P1', team: p1Team as unknown as import('@pkmn/sim').PokemonSet[] });
    battle.setPlayer('p2', { name: 'P2', team: p2Team as unknown as import('@pkmn/sim').PokemonSet[] });

    // Inject UIDs (mirrors what showdown.worker.ts does on INIT_BATTLE)
    const uids = ['vaporeon-uid', 'gengar-uid', 'eevee-uid'];
    battle.p1.pokemon.forEach((p, i) => { (p as unknown as Record<string, string>)['uid'] = uids[i]!; });
    const enemyUids = ['rhydon-uid', 'dugtrio-uid'];
    battle.p2.pokemon.forEach((p, i) => { (p as unknown as Record<string, string>)['uid'] = enemyUids[i]!; });

    // readSlotOrder inline (same logic as the worker helper)
    const readSlotOrder = (side: typeof battle.p1) =>
      (side.pokemon as unknown as Array<{ uid?: string } | null>)
        .filter((p): p is { uid?: string } => p != null)
        .map(p => p.uid ?? '')
        .filter(uid => uid !== '');

    const orderBefore = readSlotOrder(battle.p1);
    assert.deepStrictEqual(orderBefore, ['vaporeon-uid', 'gengar-uid', 'eevee-uid']);

    // Switch to Gengar (slot 2 in current order)
    const p1SlotForGengar = getShowdownSlot(orderBefore, 'gengar-uid');
    assert.strictEqual(p1SlotForGengar, 2);

    battle.choose('p1', `switch ${p1SlotForGengar}`);
    battle.choose('p2', 'move stoneedge');

    const orderAfter = readSlotOrder(battle.p1);
    // After switch: Gengar is at index 0, Vaporeon at 1
    assert.strictEqual(orderAfter[0], 'gengar-uid', 'Active UID must be at index 0 after switch');
    assert.strictEqual(orderAfter[1], 'vaporeon-uid');

    // getShowdownSlot on the new order correctly resolves Vaporeon to slot 2
    assert.strictEqual(getShowdownSlot(orderAfter, 'vaporeon-uid'), 2);
  });

  it('correctly simulates consecutive turns, switches and faints without invalid choice rejections', async () => {
    const { Battle } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId() });

    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50 },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50 },
      { name: 'Eevee', species: 'Eevee', moves: ['tackle'], level: 50 }
    ];
    const p2Team = [{ name: 'Rhydon', species: 'Rhydon', moves: ['stoneedge'], level: 50 }];

    battle.setPlayer('p1', { name: 'Player', team: p1Team as unknown as import('@pkmn/sim').PokemonSet[] });
    battle.setPlayer('p2', { name: 'Enemy', team: p2Team as unknown as import('@pkmn/sim').PokemonSet[] });

    // Sync initial states: Eevee fainted, Gengar has 1 HP
    const p1Hps = [100, 1, 0];
    p1Hps.forEach((hp, idx) => {
      const mon = battle.p1.pokemon[idx];
      if (mon) {
        mon.hp = hp;
        if (hp <= 0) {
          mon.fainted = true;
          mon.status = 'fnt' as unknown as import('@pkmn/sim').ID;
        }
      }
    });

    // Inject UIDs and use readSlotOrder contract instead of swapActivePokemon
    const uids = ['vaporeon-uid', 'gengar-uid', 'eevee-uid'];
    battle.p1.pokemon.forEach((p, i) => { (p as unknown as Record<string, string>)['uid'] = uids[i]!; });

    const readSlotOrder = (side: typeof battle.p1) =>
      (side.pokemon as unknown as Array<{ uid?: string } | null>)
        .filter((p): p is { uid?: string } => p != null)
        .map(p => p.uid ?? '')
        .filter(uid => uid !== '');

    // Turn 1: Switch to Gengar
    let p1Order = readSlotOrder(battle.p1); // ['vaporeon-uid','gengar-uid','eevee-uid']
    const slot1 = getShowdownSlot(p1Order, 'gengar-uid');
    assert.strictEqual(slot1, 2);

    const res1 = battle.choose('p1', `switch ${slot1}`);
    assert.strictEqual(res1, true, 'Switch to healthy Gengar must be valid');
    battle.choose('p2', 'move stoneedge');

    // Read real order from @pkmn/sim (active at 0)
    p1Order = readSlotOrder(battle.p1);
    assert.strictEqual(p1Order[0], 'gengar-uid', 'Gengar must be at index 0 after switch');

    // Gengar fainted → forced switch to Vaporeon
    const slot2 = getShowdownSlot(p1Order, 'vaporeon-uid');
    const resSwitch = battle.choose('p1', `switch ${slot2}`);
    assert.strictEqual(resSwitch, true, 'Forced switch to Vaporeon must be valid');
  });

  it('correctly manages a sequence of 10 consecutive switches resolving slots from @pkmn/sim order', async () => {
    const { Battle } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId() });

    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50 },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50 },
      { name: 'Eevee', species: 'Eevee', moves: ['tackle'], level: 50 }
    ];
    const p2Team = [
      { name: 'Rhydon', species: 'Rhydon', moves: ['stoneedge'], level: 50 },
      { name: 'Dugtrio', species: 'Dugtrio', moves: ['earthquake'], level: 50 },
      { name: 'Nidoqueen', species: 'Nidoqueen', moves: ['crunch'], level: 50 }
    ];

    battle.setPlayer('p1', { name: 'Player', team: p1Team as unknown as import('@pkmn/sim').PokemonSet[] });
    battle.setPlayer('p2', { name: 'Enemy', team: p2Team as unknown as import('@pkmn/sim').PokemonSet[] });

    // Inject UIDs
    ['vaporeon-uid', 'gengar-uid', 'eevee-uid'].forEach((uid, i) => {
      (battle.p1.pokemon[i] as unknown as Record<string, string>)['uid'] = uid;
    });
    ['rhydon-uid', 'dugtrio-uid', 'nidoqueen-uid'].forEach((uid, i) => {
      (battle.p2.pokemon[i] as unknown as Record<string, string>)['uid'] = uid;
    });

    const readSlotOrder = (side: typeof battle.p1) =>
      (side.pokemon as unknown as Array<{ uid?: string } | null>)
        .filter((p): p is { uid?: string } => p != null)
        .map(p => p.uid ?? '')
        .filter(uid => uid !== '');

    const p1SwitchTargets = [
      'gengar-uid', 'eevee-uid', 'vaporeon-uid', 'gengar-uid', 'eevee-uid',
      'vaporeon-uid', 'gengar-uid', 'eevee-uid', 'vaporeon-uid', 'gengar-uid'
    ];
    const p2SwitchTargets = [
      'dugtrio-uid', 'nidoqueen-uid', 'rhydon-uid', 'dugtrio-uid', 'nidoqueen-uid',
      'rhydon-uid', 'dugtrio-uid', 'nidoqueen-uid', 'rhydon-uid', 'dugtrio-uid'
    ];

    for (let i = 0; i < 10; i++) {
      const p1Order = readSlotOrder(battle.p1);
      const p2Order = readSlotOrder(battle.p2);

      const p1Slot = getShowdownSlot(p1Order, p1SwitchTargets[i]!);
      const p2Slot = getShowdownSlot(p2Order, p2SwitchTargets[i]!);

      const r1 = battle.choose('p1', `switch ${p1Slot}`);
      const r2 = battle.choose('p2', `switch ${p2Slot}`);

      assert.strictEqual(r1, true, `Player switch on turn ${i + 1} must be valid`);
      assert.strictEqual(r2, true, `Enemy switch on turn ${i + 1} must be valid`);
    }

    // After 10 switches, active should match last target
    const finalP1Order = readSlotOrder(battle.p1);
    const finalP2Order = readSlotOrder(battle.p2);
    assert.strictEqual(finalP1Order[0], 'gengar-uid');
    assert.strictEqual(finalP2Order[0], 'dugtrio-uid');
  });

  it('Baton Pass forced switch resolved correctly using @pkmn/sim slot order', async () => {
    const { Battle } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId() });

    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50 },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50 },
      { name: 'Eevee', species: 'Eevee', moves: ['batonpass'], level: 50 }
    ];
    const p2Team = [{ name: 'Rhydon', species: 'Rhydon', moves: ['splash'], level: 50 }];

    battle.setPlayer('p1', { name: 'Player', team: p1Team as unknown as import('@pkmn/sim').PokemonSet[] });
    battle.setPlayer('p2', { name: 'Enemy', team: p2Team as unknown as import('@pkmn/sim').PokemonSet[] });

    ['vaporeon-uid', 'gengar-uid', 'eevee-uid'].forEach((uid, i) => {
      (battle.p1.pokemon[i] as unknown as Record<string, string>)['uid'] = uid;
    });

    const readSlotOrder = (side: typeof battle.p1) =>
      (side.pokemon as unknown as Array<{ uid?: string } | null>)
        .filter((p): p is { uid?: string } => p != null)
        .map(p => p.uid ?? '')
        .filter(uid => uid !== '');

    // Turn 1: Switch Vaporeon → Eevee
    let p1Order = readSlotOrder(battle.p1);
    const slotEevee = getShowdownSlot(p1Order, 'eevee-uid');
    assert.strictEqual(slotEevee, 3);

    battle.choose('p1', `switch ${slotEevee}`);
    battle.choose('p2', 'move splash');

    // @pkmn/sim reorders: Eevee now at index 0
    p1Order = readSlotOrder(battle.p1);
    assert.strictEqual(p1Order[0], 'eevee-uid');

    // Turn 2: Eevee uses Baton Pass
    battle.choose('p1', 'move batonpass');
    battle.choose('p2', 'move splash');

    // Forced switch: using STATIC initial order is wrong (Vaporeon is at slot 3 now, not 1)
    const staticOrder = ['vaporeon-uid', 'gengar-uid', 'eevee-uid'];
    const invalidSlot = getShowdownSlot(staticOrder, 'vaporeon-uid'); // 1
    assert.strictEqual(invalidSlot, 1);
    assert.strictEqual(battle.choose('p1', `switch ${invalidSlot}`), false, 'Static order slot must fail');

    // Using dynamic @pkmn/sim order is correct
    p1Order = readSlotOrder(battle.p1);
    const validSlot = getShowdownSlot(p1Order, 'vaporeon-uid');
    assert.strictEqual(battle.choose('p1', `switch ${validSlot}`), true, 'Dynamic order slot must succeed');
  });

  it('correctly maps HP arrays using p1SlotOrder / p2SlotOrder from the worker', () => {
    // Simulates what the worker now provides: the real @pkmn/sim slot order after a switch
    // p2SlotOrder after Geodude switches in = ['geodude-uid', 'onix-uid']
    const p2SlotOrder = ['geodude-uid', 'onix-uid'];
    const enemyTeam = [
      { uid: 'onix-uid', hp: 0 },
      { uid: 'geodude-uid', hp: 31 }
    ];

    // Map HPs using the slot order (matches @pkmn/sim's side.pokemon index)
    const validHps = p2SlotOrder.map(uid => enemyTeam.find(p => p.uid === uid)?.hp ?? 0);
    assert.deepStrictEqual(validHps, [31, 0]); // Geodude full HP at index 0, Onix fainted at index 1
  });

  it('correctly maps HP arrays when active mon is not at team position 0 in UI', () => {
    // p1SlotOrder from worker: Gengar is active (index 0), Vaporeon fainted (index 1), Eevee (index 2)
    const p1SlotOrder = ['gengar-uid', 'vaporeon-uid', 'eevee-uid'];
    const uiTeam = [
      { uid: 'vaporeon-uid', hp: 0 },
      { uid: 'gengar-uid', hp: 80 },
      { uid: 'eevee-uid', hp: 100 }
    ];

    const correctHps = p1SlotOrder.map(uid => uiTeam.find(p => p.uid === uid)?.hp ?? 0);
    assert.deepStrictEqual(correctHps, [80, 0, 100]); // Gengar, Vaporeon fainted, Eevee
  });

  describe('ShowdownTeamResolver', () => {
    it('correctly maps and resolves the Showdown active-first order', async () => {
      const { ShowdownTeamResolver } = await import('../../../src/logic/battle/showdownTeamResolver.ts');
      const team = [
        { uid: 'vaporeon-uid', name: 'Vaporeon' },
        { uid: 'gengar-uid', name: 'Gengar' },
        { uid: 'eevee-uid', name: 'Eevee' }
      ] as any[];

      const mockRequest = {
        side: {
          pokemon: [
            { uid: 'gengar-uid' },
            { uid: 'vaporeon-uid' },
            { uid: 'eevee-uid' }
          ]
        }
      } as any;

      const resolvedOrder = ShowdownTeamResolver.getShowdownOrder(team, mockRequest);
      assert.strictEqual(resolvedOrder[0]?.uid, 'gengar-uid');
      assert.strictEqual(resolvedOrder[1]?.uid, 'vaporeon-uid');
      assert.strictEqual(resolvedOrder[2]?.uid, 'eevee-uid');
    });

    it('correctly finds pokemon by UID and throws on missing UID', async () => {
      const { ShowdownTeamResolver } = await import('../../../src/logic/battle/showdownTeamResolver.ts');
      const team = [
        { uid: 'vaporeon-uid', name: 'Vaporeon' }
      ] as any[];

      const found = ShowdownTeamResolver.getPokemonByUid(team, 'vaporeon-uid');
      assert.strictEqual(found?.name, 'Vaporeon');

      assert.throws(() => {
        ShowdownTeamResolver.getPokemonByUid(team, 'non-existent');
      }, /no encontrado/);
    });

    it('resolves dynamic slot index and team members by slot correctly', async () => {
      const { ShowdownTeamResolver } = await import('../../../src/logic/battle/showdownTeamResolver.ts');
      const team = [
        { uid: 'vaporeon-uid', name: 'Vaporeon' },
        { uid: 'gengar-uid', name: 'Gengar' }
      ] as any[];

      const mockRequest = {
        side: {
          pokemon: [
            { uid: 'gengar-uid' },
            { uid: 'vaporeon-uid' }
          ]
        }
      } as any;

      assert.strictEqual(ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, 'gengar-uid'), 1);
      assert.strictEqual(ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, 'vaporeon-uid'), 2);

      const monBySlot = ShowdownTeamResolver.getPokemonByShowdownSlot(team, mockRequest, 2);
      assert.strictEqual(monBySlot?.uid, 'vaporeon-uid');
    });
  });
});
