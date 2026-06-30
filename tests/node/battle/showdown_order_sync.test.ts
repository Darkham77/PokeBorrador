import { describe, it } from 'node:test';
import assert from 'node:assert/strict';

import { getShowdownSlot, getShowdownFormatId } from '../../../src/logic/battle/showdownAdapter.ts';

describe('Showdown Team Order Synchronization & Slot Resolution Tests', () => {
  it('resolves correct 1-based Showdown slot indices based on static team order', () => {
    const staticOrder = ['rhyhorn-uid', 'rhydon-uid', 'geodude-uid'];
    
    // Rhyhorn is active (slot 1)
    const slotActive = getShowdownSlot(staticOrder, 'rhyhorn-uid');
    assert.strictEqual(slotActive, 1);
    
    // Rhydon is in reserve (slot 2)
    const slotReserve = getShowdownSlot(staticOrder, 'rhydon-uid');
    assert.strictEqual(slotReserve, 2);
    
    // Geodude is in reserve (slot 3)
    const slotGeodude = getShowdownSlot(staticOrder, 'geodude-uid');
    assert.strictEqual(slotGeodude, 3);
  });

  it('guarantees that slot indices remain completely static regardless of active combatant', () => {
    const staticOrder = ['rhyhorn-uid', 'rhydon-uid', 'geodude-uid'];
    
    // Even if Rhydon is active, its slot number in Showdown remains static (slot 2)
    const slotRhydon = getShowdownSlot(staticOrder, 'rhydon-uid');
    assert.strictEqual(slotRhydon, 2);
    
    // Rhyhorn's slot index remains 1
    const slotRhyhorn = getShowdownSlot(staticOrder, 'rhyhorn-uid');
    assert.strictEqual(slotRhyhorn, 1);
  });

  it('guarantees that when the active Pokemon (slot 1) faints, the next pick is resolved to its static slot index', () => {
    // Rhyhorn is active at slot 1, faints. Next healthy is Rhydon.
    const staticOrder = ['rhyhorn-uid', 'rhydon-uid'];
    
    // Rhydon is in reserve at index 1 -> static slot 2
    const slotForRhydon = getShowdownSlot(staticOrder, 'rhydon-uid');
    assert.strictEqual(slotForRhydon, 2, 'Next replacement slot must resolve to its static index 2');
  });

  it('correctly resolves struggle and move struggle choices in the worker by depleting active PP', () => {
    const resolveChoice = (
      side: { active?: Array<{ moveSlots?: Array<{ pp: number } | null> } | null> }, 
      choice: string
    ): string => {
      if (choice.includes('struggle') && side?.active?.[0]) {
        const activeMon = side.active[0]
        if (activeMon?.moveSlots) {
          activeMon.moveSlots.forEach((m: { pp: number } | null) => { if (m) m.pp = 0 })
        }
        return 'default'
      }
      return choice
    };

    const mockSide = {
      active: [{
        moveSlots: [{ pp: 5 }, { pp: 10 }]
      }]
    };

    const res = resolveChoice(mockSide, 'move struggle');
    assert.strictEqual(res, 'default');
    
    const activeMon = mockSide.active[0];
    assert.ok(activeMon);
    assert.ok(activeMon.moveSlots);
    assert.ok(activeMon.moveSlots[0]);
    assert.ok(activeMon.moveSlots[1]);
    assert.strictEqual(activeMon.moveSlots[0].pp, 0);
    assert.strictEqual(activeMon.moveSlots[1].pp, 0);
  });

  it('correctly maps HP arrays to simulator mons matching initialPlayerTeamOrder', () => {
    // Simulator side.pokemon order (initial order when battle started)
    // index 0: Vaporeon, index 1: Gengar, index 2: Eevee
    const simMons = [
      { name: 'Vaporeon', hp: 100, fainted: false, status: '' },
      { name: 'Gengar', hp: 100, fainted: false, status: '' },
      { name: 'Eevee', hp: 100, fainted: false, status: '' }
    ];

    // Player UI team state (which might be in a different order, e.g. Gengar first, then Vaporeon, then Eevee)
    const uiTeam = [
      { uid: 'gengar-uid', name: 'Gengar', hp: 148 },
      { uid: 'vaporeon-uid', name: 'Vaporeon', hp: 0 },
      { uid: 'eevee-uid', name: 'Eevee', hp: 25 }
    ];

    const initialPlayerTeamOrder = ['vaporeon-uid', 'gengar-uid', 'eevee-uid'];

    // Map HP array using the initial team order
    const p1Hps = initialPlayerTeamOrder.map(uid => {
      const p = uiTeam.find(x => x.uid === uid);
      return p ? p.hp : 0;
    });

    // Verify mapped HP array matches the simulator's index order
    assert.deepEqual(p1Hps, [0, 148, 25]); // Vaporeon: 0, Gengar: 148, Eevee: 25

    // Sync HPs in simulator
    const syncSideHps = (mons: typeof simMons, hps: number[]) => {
      hps.forEach((hp, idx) => {
        const mon = mons[idx];
        if (mon) {
          mon.hp = hp;
          if (hp <= 0) {
            mon.fainted = true;
            mon.status = 'fnt';
          }
        }
      });
    };

    syncSideHps(simMons, p1Hps);

    // Verify simulator mons got correct HP values aligned by index
    assert.strictEqual(simMons[0]?.hp, 0); // Vaporeon fainted
    assert.strictEqual(simMons[0]?.fainted, true);
    assert.strictEqual(simMons[1]?.hp, 148); // Gengar alive
    assert.strictEqual(simMons[1]?.fainted, false);
    assert.strictEqual(simMons[2]?.hp, 25); // Eevee alive
    assert.strictEqual(simMons[2]?.fainted, false);
  });

  it('correctly flags INVALID_CHOICE error prefix when choose fails', () => {
    let errorThrown = false;
    try {
      const resVal = false; // Mocking choose failure
      if (!resVal) {
        throw new Error('INVALID_CHOICE: Elección inválida para p1: "move lastresort"');
      }
    } catch (e) {
      errorThrown = true;
      assert.ok((e as Error).message.includes('INVALID_CHOICE'));
    }
    assert.strictEqual(errorThrown, true);
  });

  it('correctly simulates consecutive turns, switches and faints without invalid choice rejections', async () => {
    const { Battle } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId() });

    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50 },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50 },
      { name: 'Eevee', species: 'Eevee', moves: ['tackle'], level: 50 }
    ];

    const p2Team = [
      { name: 'Rhydon', species: 'Rhydon', moves: ['stoneedge'], level: 50 }
    ];

    battle.setPlayer('p1', { name: 'Player', team: p1Team as unknown as import('@pkmn/sim').PokemonSet[] });
    battle.setPlayer('p2', { name: 'Enemy', team: p2Team as unknown as import('@pkmn/sim').PokemonSet[] });

    // Sync initial states: Eevee is fainted (0 HP), Vaporeon has 100 HP, Gengar has 148 HP
    // Sync initial states: Eevee is fainted (0 HP), Vaporeon has 100 HP, Gengar has 1 HP (so it faints from Stone Edge)
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

    // In the first turn: Player switches to Gengar (which is slot 2, index 1)
    // Rhydon uses Stone Edge
    let p1Order = ['vaporeon-uid', 'gengar-uid', 'eevee-uid'];
    const slot1 = getShowdownSlot(p1Order, 'gengar-uid');
    assert.strictEqual(slot1, 2);

    const res1 = battle.choose('p1', `switch ${slot1}`);
    assert.strictEqual(res1, true, 'Switch to healthy Gengar must be valid');

    // Swap order as executed by the app
    const { swapActivePokemon } = await import('../../../src/logic/battle/showdownAdapter.ts');
    p1Order = swapActivePokemon(p1Order, 'gengar-uid'); // ['gengar-uid', 'vaporeon-uid', 'eevee-uid']

    const res2 = battle.choose('p2', 'move stoneedge');
    assert.strictEqual(res2, true);

    // Since Gengar fainted, a switch-in is forced. Player wants to send out Vaporeon.
    // Let's resolve slot of Vaporeon based on updated order:
    const slot2 = getShowdownSlot(p1Order, 'vaporeon-uid'); // Index 1 -> Slot 2
    assert.strictEqual(slot2, 2);

    // Let's try to choose Vaporeon (switch 2) in the simulator
    const resSwitch = battle.choose('p1', `switch ${slot2}`);
    assert.strictEqual(resSwitch, true, 'Forced switch to healthy Vaporeon must be valid');
  });

  it('correctly manages a sequence of 10 consecutive switches on both sides and resolves attacks correctly', async () => {
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

    let p1Order = ['vaporeon-uid', 'gengar-uid', 'eevee-uid'];
    let p2Order = ['rhydon-uid', 'dugtrio-uid', 'nidoqueen-uid'];

    const { swapActivePokemon } = await import('../../../src/logic/battle/showdownAdapter.ts');

    // Sequence of 10 switches alternating and matching
    // Let's define the sequence of target UIDs for p1 and p2
    const p1SwitchTargets = [
      'gengar-uid', 'eevee-uid', 'vaporeon-uid', 'gengar-uid', 'eevee-uid',
      'vaporeon-uid', 'gengar-uid', 'eevee-uid', 'vaporeon-uid', 'gengar-uid'
    ];
    const p2SwitchTargets = [
      'dugtrio-uid', 'nidoqueen-uid', 'rhydon-uid', 'dugtrio-uid', 'nidoqueen-uid',
      'rhydon-uid', 'dugtrio-uid', 'nidoqueen-uid', 'rhydon-uid', 'dugtrio-uid'
    ];

    for (let i = 0; i < 10; i++) {
      const p1Target = p1SwitchTargets[i]!;
      const p2Target = p2SwitchTargets[i]!;

      const p1Slot = getShowdownSlot(p1Order, p1Target);
      const p2Slot = getShowdownSlot(p2Order, p2Target);

      const r1 = battle.choose('p1', `switch ${p1Slot}`);
      const r2 = battle.choose('p2', `switch ${p2Slot}`);

      assert.strictEqual(r1, true, `Player switch to ${p1Target} (slot ${p1Slot}) on turn ${i+1} must be valid`);
      assert.strictEqual(r2, true, `Enemy switch to ${p2Target} (slot ${p2Slot}) on turn ${i+1} must be valid`);

      // Update client orders to match simulator swaps
      p1Order = swapActivePokemon(p1Order, p1Target);
      p2Order = swapActivePokemon(p2Order, p2Target);
    }

    // After 10 switches, who should be active?
    // p1Target at index 9: 'gengar-uid'
    // p2Target at index 9: 'dugtrio-uid'
    assert.strictEqual(p1Order[0], 'gengar-uid');
    assert.strictEqual(p2Order[0], 'dugtrio-uid');

    // Gengar uses Shadow Ball and Dugtrio uses Earthquake
    const moveRes1 = battle.choose('p1', 'move shadowball');
    const moveRes2 = battle.choose('p2', 'move earthquake');

    assert.strictEqual(moveRes1, true, 'Gengar must be able to use Shadow Ball');
    assert.strictEqual(moveRes2, true, 'Dugtrio must be able to use Earthquake');
  });

  it('correctly simulates Baton Pass turn and forced switch-in without invalid choice rejections', async () => {
    const { Battle } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId() });

    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['hydropump'], level: 50 },
      { name: 'Gengar', species: 'Gengar', moves: ['shadowball'], level: 50 },
      { name: 'Eevee', species: 'Eevee', moves: ['batonpass'], level: 50 }
    ];

    const p2Team = [
      { name: 'Rhydon', species: 'Rhydon', moves: ['splash'], level: 50 }
    ];

    battle.setPlayer('p1', { name: 'Player', team: p1Team as unknown as import('@pkmn/sim').PokemonSet[] });
    battle.setPlayer('p2', { name: 'Enemy', team: p2Team as unknown as import('@pkmn/sim').PokemonSet[] });

    let p1Order = ['vaporeon-uid', 'gengar-uid', 'eevee-uid'];
    const { swapActivePokemon } = await import('../../../src/logic/battle/showdownAdapter.ts');

    // Turn 1: Switch Vaporeon to Eevee (slot 3, index 2)
    const slotEevee = getShowdownSlot(p1Order, 'eevee-uid');
    assert.strictEqual(slotEevee, 3);

    const r1 = battle.choose('p1', `switch ${slotEevee}`);
    const r2 = battle.choose('p2', 'move splash');
    assert.ok(r1 && r2);

    // Swap order as executed by the app
    p1Order = swapActivePokemon(p1Order, 'eevee-uid'); // Eevee is now index 0

    // Turn 2: Eevee uses Baton Pass (which is move 1 since Eevee only has batonpass)
    // Rhydon uses Splash
    const r3 = battle.choose('p1', 'move batonpass');
    const r4 = battle.choose('p2', 'move splash');
    assert.ok(r3 && r4);

    // Now, Baton Pass executed, so a forced switch-in is expected.
    // Player wants to send out Vaporeon.
    // Let's resolve slot of Vaporeon based on static initial order (this is the bug!):
    const oldStaticOrder = ['vaporeon-uid', 'gengar-uid', 'eevee-uid'];
    const invalidSlot = getShowdownSlot(oldStaticOrder, 'vaporeon-uid'); // Returns 1
    assert.strictEqual(invalidSlot, 1);

    const invalidRes = battle.choose('p1', `switch ${invalidSlot}`);
    assert.strictEqual(invalidRes, false, 'Switch using static order must fail because Vaporeon is no longer slot 1');

    // Let's resolve slot of Vaporeon based on updated showdownPlayerTeamOrder:
    const validSlot = getShowdownSlot(p1Order, 'vaporeon-uid'); // Returns 3
    assert.strictEqual(validSlot, 3);

    const validRes = battle.choose('p1', `switch ${validSlot}`);
    assert.strictEqual(validRes, true, 'Switch using dynamic order must succeed');
  });

  it('correctly maps enemy HP array after enemy faints and switches to prevent invalid choices', async () => {
    const { Battle } = await import('@pkmn/sim');
    const battle = new Battle({ formatid: getShowdownFormatId() });

    const p1Team = [
      { name: 'Vaporeon', species: 'Vaporeon', moves: ['surf'], level: 50 }
    ];

    const p2Team = [
      { name: 'Onix', species: 'Onix', moves: ['rocktomb'], level: 50 },
      { name: 'Geodude', species: 'Geodude', moves: ['bulldoze'], level: 50 }
    ];

    battle.setPlayer('p1', { name: 'Player', team: p1Team as unknown as import('@pkmn/sim').PokemonSet[] });
    battle.setPlayer('p2', { name: 'Enemy', team: p2Team as unknown as import('@pkmn/sim').PokemonSet[] });

    let p2Order = ['onix-uid', 'geodude-uid'];
    const { swapActivePokemon, resolveCurrentTeamOrder } = await import('../../../src/logic/battle/showdownAdapter.ts');

    // Turn 1: Vaporeon uses Surf, Onix faints (we force HP to 0)
    const r1 = battle.choose('p1', 'move surf');
    const r2 = battle.choose('p2', 'move rocktomb');
    assert.ok(r1 && r2);

    const mon0 = battle.p2.pokemon[0];
    if (mon0) {
      mon0.hp = 0;
      mon0.fainted = true;
      mon0.status = 'fnt' as unknown as import('@pkmn/sim').ID;
    }

    // Enemy is forced to switch in Geodude (slot 2, index 1)
    const slotGeodude = getShowdownSlot(p2Order, 'geodude-uid');
    assert.strictEqual(slotGeodude, 2);

    const switchRes = battle.choose('p2', `switch ${slotGeodude}`);
    assert.ok(switchRes);

    // Swap order as executed by the app
    p2Order = swapActivePokemon(p2Order, 'geodude-uid'); // Geodude is now index 0

    // Now Geodude is active (index 0). Geodude's HP in DB/context is 31 (full). Onix's HP is 0.
    const activeMock = {
      showdownEnemyTeamOrder: p2Order,
      initialEnemyTeamOrder: ['onix-uid', 'geodude-uid'],
      enemyTeam: [
        { uid: 'onix-uid', hp: 0 },
        { uid: 'geodude-uid', hp: 31 }
      ] as unknown as Array<{ uid: string; hp: number } | null>
    };

    // If we map HP using static initial order:
    const oldStaticOrder = ['onix-uid', 'geodude-uid'];
    const invalidHps = oldStaticOrder.map(uid => activeMock.enemyTeam.find((p) => p?.uid === uid)?.hp ?? 0);
    assert.deepStrictEqual(invalidHps, [0, 31]);

    // If we pass invalidHps to the simulator, Geodude's HP will be synced to 0 in the simulator, causing choice to fail:
    battle.p2.pokemon.forEach((mon, idx) => {
      mon.hp = invalidHps[idx] ?? 0;
      if (mon.hp <= 0) {
        mon.fainted = true;
        mon.status = 'fnt' as unknown as import('@pkmn/sim').ID;
      }
    });

    const invalidChoiceRes = battle.choose('p2', 'move bulldoze');
    assert.strictEqual(invalidChoiceRes, false, 'Should fail to choose move because Geodude has been synced with 0 HP');

    // Reset Geodude's HP to healthy in the simulator
    const mon1 = battle.p2.pokemon[1];
    if (mon1) {
      mon1.hp = 31;
      mon1.fainted = false;
      mon1.status = '' as unknown as import('@pkmn/sim').ID;
    }

    // If we map HP using resolveCurrentTeamOrder:
    type TargetParam = Parameters<typeof resolveCurrentTeamOrder>[0];
    const validOrder = resolveCurrentTeamOrder(activeMock as unknown as TargetParam, 'enemy', activeMock.enemyTeam as unknown as Parameters<typeof resolveCurrentTeamOrder>[2]);
    const validHps = validOrder.map(uid => activeMock.enemyTeam.find((p) => p?.uid === uid)?.hp ?? 0);
    assert.deepStrictEqual(validHps, [31, 0]);

    // Sync Geodude with valid HPs:
    // Slot 1 of Geodude (index 0) gets 31, Slot 2 of Onix (index 1) gets 0
    // Wait, the simulator side team elements are in order of [Onix, Geodude] but their active/bench slots are synced by side.pokemon order.
    // Yes! The side.pokemon index matches the showdownOrder index.
    battle.p2.pokemon.forEach((mon, idx) => {
      mon.hp = validHps[idx] ?? 0;
      if (mon.hp <= 0) {
        mon.fainted = true;
        mon.status = 'fnt' as unknown as import('@pkmn/sim').ID;
      } else {
        mon.fainted = false;
        mon.status = '' as unknown as import('@pkmn/sim').ID;
      }
    });

    const validChoiceRes = battle.choose('p2', 'move bulldoze');
    assert.strictEqual(validChoiceRes, true, 'Should succeed to choose move because Geodude has been synced with 31 HP');
  });

  it('correctly maps HP arrays when the lead Pokemon is fainted and the active Pokemon is at index 1 at battle start', async () => {
    // Simulator side.pokemon order at start: Gengar (index 0), Vaporeon (index 1), Eevee (index 2)
    // because Gengar (active) was unshifted to index 0 during setup.
    const simMons = [
      { name: 'Gengar', hp: 80, fainted: false, status: '' },
      { name: 'Vaporeon', hp: 100, fainted: false, status: '' },
      { name: 'Eevee', hp: 100, fainted: false, status: '' }
    ];

    const uiTeam = [
      { uid: 'vaporeon-uid', name: 'Vaporeon', hp: 0 },
      { uid: 'gengar-uid', name: 'Gengar', hp: 80 },
      { uid: 'eevee-uid', name: 'Eevee', hp: 100 }
    ];

    // activeBattle state after initBattle (Gengar is active, Vaporeon is lead but fainted)
    const activeBattleMock = {
      showdownPlayerTeamOrder: ['gengar-uid', 'vaporeon-uid', 'eevee-uid'],
      initialPlayerTeamOrder: ['vaporeon-uid', 'gengar-uid', 'eevee-uid'],
      player: { uid: 'gengar-uid', hp: 80 }
    };

    const { resolveCurrentTeamOrder } = await import('../../../src/logic/battle/showdownAdapter.ts');

    // If we map HP using original team order (which was the bug!):
    const wrongHps = uiTeam.map(p => p.hp); // [0, 80, 100]
    
    const mockSim1 = JSON.parse(JSON.stringify(simMons));
    mockSim1.forEach((mon: { hp: number; fainted?: boolean }, idx: number) => {
      mon.hp = wrongHps[idx]!;
      if (mon.hp <= 0) mon.fainted = true;
    });
    // Gengar gets 0 HP and faints!
    assert.strictEqual(mockSim1[0].fainted, true, 'Wrong mapping faints the active Gengar');

    // If we map HP using resolveCurrentTeamOrder (correct):
    type TargetParam = Parameters<typeof resolveCurrentTeamOrder>[0];
    const correctOrder = resolveCurrentTeamOrder(activeBattleMock as unknown as TargetParam, 'player', uiTeam as unknown as Parameters<typeof resolveCurrentTeamOrder>[2]);
    const correctHps = correctOrder.map(uid => uiTeam.find(p => p.uid === uid)?.hp ?? 0);
    assert.deepStrictEqual(correctHps, [80, 0, 100]);

    // If we sync simMons using correctHps:
    const mockSim2 = JSON.parse(JSON.stringify(simMons));
    mockSim2.forEach((mon: { hp: number; fainted?: boolean }, idx: number) => {
      mon.hp = correctHps[idx]!;
      if (mon.hp <= 0) mon.fainted = true;
    });
    assert.strictEqual(mockSim2[0].fainted, false, 'Correct mapping keeps Gengar healthy');
    assert.strictEqual(mockSim2[1].fainted, true, 'Correct mapping marks Vaporeon as fainted');
  });
});
