import { describe, it, beforeAll, vi } from 'vitest';
import assert from 'node:assert/strict';
import { Battle } from '@pkmn/sim';
import { getShowdownFormatId } from '../../../src/logic/battle/showdownAdapter.ts';
import { BattleCheatManager } from '../../../src/logic/battle/helpers/battleCheatManager.ts';
import type { CertifiedBattleHistoryEntry } from '../../../scripts/e2e/fuzzer/generators/fuzzer_team_generator.ts';

describe('BattleCheatManager - Unit Tests', () => {
  beforeAll(async () => {
    // Mock self for worker dependencies
    vi.stubGlobal('self', {
      onmessage: null,
      postMessage: () => {}
    });
    await import('../../../src/logic/battle/showdown.worker.ts');
  });

  const pikachuTeam = [
    {
      name: 'Pikachu',
      species: 'Pikachu',
      level: 50,
      gender: 'M',
      item: '',
      ability: 'static',
      nature: 'serious',
      moves: ['thunderbolt']
    }
  ];

  it('debería aplicar el truco de curación pre-turn si hay un Pokémon debilitado en el turno actual', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });
    battle.setPlayer('p1', { name: 'Player 1', team: pikachuTeam as any });
    battle.setPlayer('p2', { name: 'Player 2', team: pikachuTeam as any });

    const cheats: CertifiedBattleHistoryEntry[] = [
      { turnCount: 1, battleTurn: 1, p1Choice: 'move 1', p2Choice: 'move 1', p1PreHeal: true, p1Heal: true }
    ];

    const manager = new BattleCheatManager(cheats);

    // Debilitar manualmente al Pokémon de p1
    const p1Mon = battle.p1.pokemon[0];
    if (!p1Mon) throw new Error('Pokemon not found');
    p1Mon.hp = 0;
    p1Mon.fainted = true;

    // Ejecutar pre-turn cheat
    manager.applyPreTurnCheats(battle);

    // Verificar que fue resucitado y curado
    assert.strictEqual(p1Mon.fainted, false);
    assert.strictEqual(p1Mon.hp, p1Mon.maxhp);
    assert.strictEqual(manager.getAppliedCheatsCount(), 1);
  });

  it('no debería aplicar el truco pre-turn si no hay Pokémon debilitados', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });
    battle.setPlayer('p1', { name: 'Player 1', team: pikachuTeam as any });
    battle.setPlayer('p2', { name: 'Player 2', team: pikachuTeam as any });

    const cheats: CertifiedBattleHistoryEntry[] = [
      { turnCount: 1, battleTurn: 1, p1Choice: 'move 1', p2Choice: 'move 1', p1Heal: true }
    ];

    const manager = new BattleCheatManager(cheats);

    const p1Mon = battle.p1.pokemon[0];
    if (!p1Mon) throw new Error('Pokemon not found');
    assert.strictEqual(p1Mon.fainted, false);

    // Intentar aplicar pre-turn
    manager.applyPreTurnCheats(battle);

    // No debe aplicar el cheat porque no hay fainted
    assert.strictEqual(manager.getAppliedCheatsCount(), 0);
  });

  it('debería aplicar el truco post-turn usando turnBeforeP1 si un Pokémon se debilitó en ese turno', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });
    battle.setPlayer('p1', { name: 'Player 1', team: pikachuTeam as any });
    battle.setPlayer('p2', { name: 'Player 2', team: pikachuTeam as any });

    const cheats: CertifiedBattleHistoryEntry[] = [
      { turnCount: 1, battleTurn: 1, p1Choice: 'move 1', p2Choice: 'move 1', p1Heal: true }
    ];

    const manager = new BattleCheatManager(cheats);

    const p1Mon = battle.p1.pokemon[0];
    if (!p1Mon) throw new Error('Pokemon not found');
    p1Mon.hp = 0;
    p1Mon.fainted = true;

    // Simulamos que el turno del simulador avanzó a 2, pero antes del turno era 1
    manager.applyPostTurnCheats(battle, 1);

    // Debe aplicar el cheat porque ch.turn === turnBeforeP1 (1 === 1) y hay fainted
    assert.strictEqual(p1Mon.fainted, false);
    assert.strictEqual(p1Mon.hp, p1Mon.maxhp);
    assert.strictEqual(manager.getAppliedCheatsCount(), 1);
  });

  it('no debería aplicar un truco repetido', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });
    battle.setPlayer('p1', { name: 'Player 1', team: pikachuTeam as any });
    battle.setPlayer('p2', { name: 'Player 2', team: pikachuTeam as any });

    const cheats: CertifiedBattleHistoryEntry[] = [
      { turnCount: 1, battleTurn: 1, p1Choice: 'move 1', p2Choice: 'move 1', p1Heal: true }
    ];

    const manager = new BattleCheatManager(cheats);

    const p1Mon = battle.p1.pokemon[0];
    if (!p1Mon) throw new Error('Pokemon not found');
    p1Mon.hp = 0;
    p1Mon.fainted = true;

    // Aplicamos primera vez
    manager.applyPostTurnCheats(battle, 1);
    assert.strictEqual(manager.getAppliedCheatsCount(), 1);

    // Forzamos debilitar de nuevo
    p1Mon.hp = 0;
    p1Mon.fainted = true;

    // Intentamos aplicar de nuevo para el mismo turno
    manager.applyPostTurnCheats(battle, 1);

    // No debe haberlo curado de nuevo porque ya fue aplicado
    assert.strictEqual(p1Mon.fainted, true);
    assert.strictEqual(manager.getAppliedCheatsCount(), 1);
  });

  it('does not mutate a terminal battle with a recorded post-turn heal', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });
    battle.setPlayer('p1', { name: 'Player 1', team: pikachuTeam as any });
    battle.setPlayer('p2', { name: 'Player 2', team: pikachuTeam as any });

    const manager = new BattleCheatManager([{ turnCount: 1, battleTurn: 1, p1Choice: 'move 1', p2Choice: 'move 1', p1Heal: true }]);
    const p1Mon = battle.p1.pokemon[0];
    if (!p1Mon) throw new Error('Pokemon not found');
    p1Mon.hp = 1;
    battle.ended = true;

    manager.applyPostTurnCheats(battle, 1);

    assert.strictEqual(p1Mon.hp, 1);
    assert.strictEqual(manager.getAppliedCheatsCount(), 0);
  });

  it('keys certified heals by atomic history step instead of a repeated Showdown turn', () => {
    const formatId = getShowdownFormatId();
    const battle = new Battle({ formatid: formatId });
    battle.setPlayer('p1', { name: 'Player 1', team: pikachuTeam as any });
    battle.setPlayer('p2', { name: 'Player 2', team: pikachuTeam as any });

    const manager = new BattleCheatManager([
      { turnCount: 1, battleTurn: 2, p1Choice: '', p2Choice: '', p1Heal: true },
      { turnCount: 2, battleTurn: 2, p1Choice: '', p2Choice: '' },
    ]);
    const p1Mon = battle.p1.pokemon[0];
    if (!p1Mon) throw new Error('Pokemon not found');
    p1Mon.hp = 1;

    manager.applyPostTurnCheats(battle, { turnCount: 2, battleTurn: 2 });

    assert.strictEqual(p1Mon.hp, 1);
    assert.strictEqual(manager.getAppliedCheatsCount(), 0);
  });

  it('supports all 4 seats (p1, p2, p3, p4) generically for heals and PP refills', () => {
    const manager = new BattleCheatManager([
      { turnCount: 1, battleTurn: 1, p1Choice: '', p2Choice: '', p1Heal: true, p2Heal: true, p3Heal: true, p4Heal: true, p1PpRefill: true, p2PpRefill: true, p3PpRefill: true, p4PpRefill: true }
    ]);

    const healMap = (manager as any).postHealMap as Map<number, Record<string, boolean>>;
    const ppMap = (manager as any).ppMap as Map<number, Record<string, boolean>>;

    const healEntry = healMap.get(1);
    const ppEntry = ppMap.get(1);

    assert.ok(healEntry, 'Heal map entry for turn 1 must exist');
    assert.ok(ppEntry, 'PP map entry for turn 1 must exist');

    assert.strictEqual(healEntry.p1, true);
    assert.strictEqual(healEntry.p2, true);
    assert.strictEqual(healEntry.p3, true);
    assert.strictEqual(healEntry.p4, true);

    assert.strictEqual(ppEntry.p1, true);
    assert.strictEqual(ppEntry.p2, true);
    assert.strictEqual(ppEntry.p3, true);
    assert.strictEqual(ppEntry.p4, true);
  });
});
