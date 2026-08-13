import type { PokemonSet } from '@pkmn/sim';
import { useItemOnPokemon } from '../../../../src/logic/providers/itemProvider.ts';
import { ShowdownBattleEngine } from '../../../../src/logic/battle/engine/showdownBattleEngine.ts';
import { createShowdownBattle } from '../../../../src/logic/battle/helpers/showdownBattleFactory.ts';
import { ACTIVE_SHOWDOWN_FORMAT } from '../../../../src/data/system/constants.ts';
import type { Pokemon } from '../../../../src/types/pokemon/pokemon.ts';
import type { ItemId } from '../../../../src/data/inventory/items.ts';
import { certifyBattleCase } from './certifiedBattleCase.ts';
import { fuzzerMemoryStore } from './fuzzerMemoryStore.ts';
import type { CertifiedBattleHistoryEntry, FuzzerPokemonSet, TestBatch } from '../generators/fuzzer_team_generator.ts';

interface MedicineScenario {
  readonly itemId: ItemId;
  readonly enemyTriggerChoice: 'move 1' | 'move 2';
  readonly seed: [number, number, number, number];
}

const MEDICINE_SCENARIOS: readonly MedicineScenario[] = [
  { itemId: 'potion' as ItemId, enemyTriggerChoice: 'move 2', seed: [101, 102, 103, 104] },
  { itemId: 'antidote' as ItemId, enemyTriggerChoice: 'move 1', seed: [201, 202, 203, 204] },
  { itemId: 'revive' as ItemId, enemyTriggerChoice: 'move 2', seed: [301, 302, 303, 304] },
];

function makePlayer(): FuzzerPokemonSet {
  const p: FuzzerPokemonSet = {
    name: 'MedicinePlayer', species: 'mew', level: 100, gender: 'M', item: '', ability: 'synchronize', nature: 'serious',
    evs: { hp: 252, atk: 252, def: 0, spa: 0, spd: 0, spe: 4 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ['splash', 'closecombat'], uid: 'medicine-player',
  };
  return p;
}

function makeEnemy(): FuzzerPokemonSet {
  const e: FuzzerPokemonSet = {
    name: 'MedicineEnemy', species: 'blissey', level: 100, gender: 'F', item: '', ability: 'naturalcure', nature: 'serious',
    evs: { hp: 252, atk: 0, def: 252, spa: 0, spd: 0, spe: 0 },
    ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
    moves: ['toxic', 'seismictoss'], uid: 'medicine-enemy',
  };
  return e;
}

function snapshotSide(side: { pokemon: Array<{ name: string; hp: number; maxhp: number; fainted: boolean }> }) {
  return side.pokemon.map((pokemon) => ({ name: pokemon.name, hp: pokemon.fainted ? 0 : pokemon.hp, maxHp: pokemon.maxhp, fainted: pokemon.fainted }));
}

function winnerSeat(battle: { winner?: string; p1: { name: string }; p2: { name: string } }): 'p1' | 'p2' | 'tie' { // type-ok
  return battle.winner === battle.p1.name ? 'p1' : battle.winner === battle.p2.name ? 'p2' : 'tie';
}

function syncGamePokemonFromShowdown(gamePokemon: { hp: number; maxHp: number; status: string }, showdownPokemon: { hp: number; maxhp: number; status: string }): void { // type-ok
  gamePokemon.hp = showdownPokemon.hp;
  gamePokemon.maxHp = showdownPokemon.maxhp;
  gamePokemon.status = showdownPokemon.status;
}

function appendHistory(history: CertifiedBattleHistoryEntry[], p1Choice: string, p2Choice: string, battleTurn: number, turnCount: number, itemId?: MedicineScenario['itemId']): void {
  history.push(itemId
    ? { turnCount, p1Choice, p2Choice, battleTurn, p1GameAction: { kind: 'bag-item', itemId, targetSlot: 1 } }
    : { turnCount, p1Choice, p2Choice, battleTurn });
}

function runScenario(scenario: MedicineScenario): TestBatch {
  const player = makePlayer();
  const faintTarget = scenario.itemId === 'revive'
    ? { ...makePlayer(), name: 'MedicineFaintTarget', uid: 'medicine-faint-target', level: 1 }
    : null;
  const enemy = makeEnemy();
  const battle = createShowdownBattle(ACTIVE_SHOWDOWN_FORMAT, scenario.seed);
  const playerTeam = faintTarget ? [faintTarget, player] : [player];
  battle.setPlayer('p1', { name: 'P1', team: playerTeam as PokemonSet[] });
  battle.setPlayer('p2', { name: 'P2', team: [enemy as PokemonSet] });
  const playerUid = player.uid;
  const enemyUid = enemy.uid;
  const showdownPlayer = battle.p1.pokemon[0];
  const showdownEnemy = battle.p2.pokemon[0];
  if (!playerUid || !showdownPlayer) throw new Error('[FUZZER-MEDICINE] Player UID mapping is incomplete.');
  if (!enemyUid || !showdownEnemy) throw new Error('[FUZZER-MEDICINE] Enemy UID mapping is incomplete.');
  Reflect.set(showdownPlayer, 'uid', playerUid);
  Reflect.set(showdownEnemy, 'uid', enemyUid);
  if (faintTarget) {
    const showdownFaintTarget = battle.p1.pokemon[0];
    const faintTargetUid = faintTarget.uid;
    if (!showdownFaintTarget || !faintTargetUid) throw new Error('[FUZZER-MEDICINE] Revive target UID mapping is incomplete.');
    Reflect.set(showdownFaintTarget, 'uid', faintTargetUid);
    const showdownBench = battle.p1.pokemon[1];
    if (!showdownBench) throw new Error('[FUZZER-MEDICINE] Revive bench Pokémon is missing.');
    Reflect.set(showdownBench, 'uid', playerUid);
  }
  const medicineTargetUid = faintTarget?.uid ?? playerUid;
  const gamePlayer: { hp: number; maxHp: number; status: string } = { hp: 1, maxHp: 1, status: '' };
  const history: CertifiedBattleHistoryEntry[] = [];
  const engine = new ShowdownBattleEngine({ mode: 'fuzzer' });
  Reflect.set(engine, 'battle', battle);

  engine.executeTurn({ p1Choice: 'move 1', p2Choice: scenario.enemyTriggerChoice });
  appendHistory(history, 'move 1', scenario.enemyTriggerChoice, battle.turn, 1);
  const active = battle.p1.active[0];
  if (!active) throw new Error('[FUZZER-MEDICINE] Player active Pokémon is missing after the trigger turn.');
  if (faintTarget) {
    if (!active.fainted) throw new Error('[FUZZER-MEDICINE] Revive objective did not produce a legal faint.');
    engine.executeTurn({ p1Choice: 'switch 2', p2Choice: '' });
    appendHistory(history, 'switch 2', '', battle.turn, 2);
    syncGamePokemonFromShowdown(gamePlayer, active);
  } else {
    syncGamePokemonFromShowdown(gamePlayer, active);
  }
  const used = useItemOnPokemon(scenario.itemId, gamePlayer as Pokemon);
  if (!used) throw new Error(`[FUZZER-MEDICINE] ${scenario.itemId} had no legal effect after its objective trigger.`);
  engine.executeTurn({
    p1Choice: '', p2Choice: 'move 2', p1Skip: true, p1UsedBattleItem: true,
    p1Hps: { [medicineTargetUid]: gamePlayer.hp }, p1Statuses: { [medicineTargetUid]: gamePlayer.status },
  });
  const medicineHistoryTurn = faintTarget ? 3 : 2;
  appendHistory(history, '', 'move 2', battle.turn, medicineHistoryTurn, scenario.itemId);

  let turnCount = medicineHistoryTurn;
  while (!battle.ended && turnCount < 8) {
    turnCount++;
    engine.executeTurn({ p1Choice: 'move 2', p2Choice: 'move 2' });
    appendHistory(history, 'move 2', 'move 2', battle.turn, turnCount);
  }
  if (!battle.ended) throw new Error(`[FUZZER-MEDICINE] ${scenario.itemId} case did not end organically.`);
  const winner = winnerSeat(battle);
  return {
    playerTeam, enemyTeam: [enemy], movesToTest: [], abilitiesToTest: [], seed: scenario.seed,
    playerChoices: history.flatMap((entry) => entry.p1Choice === '' ? [] : [entry.p1Choice]),
    enemyChoices: history.flatMap((entry) => entry.p2Choice === '' ? [] : [entry.p2Choice]),
    history, steps: [`Certified ${scenario.itemId} objective replay`], ended: true, winner,
    finalState: { isOver: true, winner, p1: snapshotSide(battle.p1), p2: snapshotSide(battle.p2) },
  };
}

export function getMedicineCase(itemId: ItemId): TestBatch {
  const scenario = MEDICINE_SCENARIOS.find((s) => s.itemId === itemId);
  if (!scenario) {
    throw new Error(`[FUZZER-MEDICINE] Unknown medicine scenario for ${itemId}.`);
  }
  return runScenario(scenario);
}

export async function runMedicineFuzzer(): Promise<{ label: string; passed: number; failed: number; untested: number; total: number }[]> {
  const cases = MEDICINE_SCENARIOS.map(runScenario).map((batch, index) => certifyBattleCase(batch, index + 1));
  fuzzerMemoryStore.appendBattleCases(cases);
  return [{ label: 'Bag medicines', passed: cases.length, failed: 0, untested: 0, total: cases.length }];
}
