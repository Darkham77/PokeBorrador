import { processExpGain, processEvGain } from '../battleRewards.ts';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon, Move, PokemonStatKey } from '@/types/pokemon/pokemon';

import { STAT_SHORT_NAMES_ES as STAT_NAMES_ES } from '@/logic/pokemon/statsMath';

const POKERUS_SPREAD_PROBABILITY = 0.33;

export interface ExpEvDistributorParams {
  combatants: Pokemon[];
  participantsSet: Set<string>;
  classMult: number;
  totalExpMult: number;
  totalExpMultWithoutEvent: number;
  eventExpMultiplier: number;
}

export async function processCombatantExpAndEvs(
  ctx: BattleContext,
  params: ExpEvDistributorParams
): Promise<void> {
  const active = ctx.activeBattle.value;
  if (!active || active.isPvP) return;

  const expGainedMap = new Map<string, number>();
  const eventExpExtraMap = new Map<string, number>();
  const levelUpMap = new Map<string, { levelsGained: number; moves: Move[] }>();
  const { calculateBaseExp } = await import('../battleRewards.ts');
  const maps = { expGainedMap, eventExpExtraMap, levelUpMap };

  for (const combatant of params.combatants) {
    const baseExp = calculateBaseExp(combatant);
    for (const p of ctx.gs.state.team) {
      await processSinglePokemonExp(ctx, active, p, combatant, baseExp, params, maps);
    }

    distributeEvsGains(ctx, active, combatant, params.participantsSet);
  }

  spreadPokerus(ctx);
  await presentTeamExpAndLevelUps(ctx, expGainedMap, eventExpExtraMap, levelUpMap);
}

async function applyLevelUpRewards(
  p: Pokemon,
  levelsGained: number,
  lvlData: { levelsGained: number; moves: Move[] },
  addLog: BattleContext['addLog']
): Promise<void> {
  lvlData.levelsGained += levelsGained;
  const { levelUpPokemon } = await import('@/logic/pokemon/pokemonFactory');
  for (let i = 0; i < levelsGained; i++) {
    const pendingMoves = levelUpPokemon(p);
    if (pendingMoves) {
      lvlData.moves.push(...pendingMoves);
    }
  }

  const { calculateFriendshipLevelUpDelta, applyFriendshipDelta } = await import('@/logic/pokemon/friendshipLogic');
  const hasSootheBell = p.heldItem === 'soothebell';
  const friendshipGain = calculateFriendshipLevelUpDelta(p.friendship ?? 50, hasSootheBell) * levelsGained;
  applyFriendshipDelta(p, friendshipGain, addLog);
}

function recordEventExpExtra(
  pUid: string,
  baseExp: number,
  rewardGained: number,
  isActive: boolean,
  params: ExpEvDistributorParams,
  eventExpExtraMap: Map<string, number>
): void {
  if (params.eventExpMultiplier <= 1) return;
  const share = isActive ? 1 : 0.5;
  const gainedWithoutEvent = Math.floor(baseExp * share * params.classMult * params.totalExpMultWithoutEvent);
  const eventExtra = Math.max(0, rewardGained - gainedWithoutEvent);
  if (eventExtra > 0) {
    eventExpExtraMap.set(pUid, (eventExpExtraMap.get(pUid) || 0) + eventExtra);
  }
}

async function handleLevelUpReward(
  p: Pokemon,
  levelsGained: number,
  levelUpMap: Map<string, { levelsGained: number; moves: Move[] }>,
  addLog: BattleContext['addLog']
): Promise<void> {
  const lvlData = levelUpMap.getOrInsertComputed(p.uid, () => ({ levelsGained: 0, moves: [] }));
  await applyLevelUpRewards(p, levelsGained, lvlData, addLog);
}

async function processSinglePokemonExp(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  p: Pokemon,
  combatant: Pokemon,
  baseExp: number,
  params: ExpEvDistributorParams,
  maps: {
    expGainedMap: Map<string, number>;
    eventExpExtraMap: Map<string, number>;
    levelUpMap: Map<string, { levelsGained: number; moves: Move[] }>;
  }
): Promise<void> {
  if (active.isCapture && p.uid === combatant.uid) return;

  const isActive = p.uid === active.player?.uid;
  const reward = processExpGain(p, baseExp, params.participantsSet, {
    isActive,
    classMult: params.classMult,
    totalExpMult: params.totalExpMult,
    participantsSet: params.participantsSet
  });
  if (!reward) return;

  maps.expGainedMap.set(p.uid, (maps.expGainedMap.get(p.uid) || 0) + reward.gained);
  recordEventExpExtra(p.uid, baseExp, reward.gained, isActive, params, maps.eventExpExtraMap);

  if (reward.levelUp) {
    await handleLevelUpReward(p, reward.levelsGained, maps.levelUpMap, ctx.addLog);
  }
}

function distributeEvsGains(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  combatant: Pokemon,
  participantsSet: Set<string>
): void {
  for (const p of ctx.gs.state.team) {
    if (active.isCapture && p.uid === combatant.uid) continue;

    const evReward = processEvGain(p, combatant, participantsSet);
    if (evReward && evReward.totalGained > 0) {
      recalcPokemonStats(p);
      const statGainParts = Object.entries(evReward.statGains)
        .filter(([, v]) => (v || 0) > 0)
        .map(([k, v]) => `+${v} ${STAT_NAMES_ES[k as PokemonStatKey] || k.toUpperCase()}`)
        .join(', ');
      ctx.addLog(`¡${p.nickname || p.name} ganó ${statGainParts} (EVs)!`, 'log-info', p);
    }
  }
}

async function handleLevelUpEvolution(
  p: Pokemon,
  ctx: BattleContext
): Promise<void> {
  if (p.heldItem === 'everstone') {
    ctx.addLog(`${p.name} evitó evolucionar debido a la Piedra Eterna.`, 'log-info', p);
    return;
  }

  const { checkLevelUpEvolution } = await import('@/logic/evolution/evolutionLogic.ts');
  const targetId = checkLevelUpEvolution(p);
  if (!targetId) return;

  const { postBattleCoordinator } = await import('../postBattleSequenceCoordinator.ts');
  const coordinator = ctx.postBattleCoordinator ?? postBattleCoordinator;
  coordinator.enqueueEvolution(p, targetId, '');
}

async function finalizePokemonLevelUp(
  ctx: BattleContext,
  p: Pokemon,
  lvlData: { levelsGained: number; moves: Move[] }
): Promise<void> {
  ctx.addLog(`¡${p.name} subió al nivel ${p.level}!`, 'log-info', p);

  if (lvlData.moves.length > 0) {
    p.pendingMoves = lvlData.moves;
    const { postBattleCoordinator } = await import('../postBattleSequenceCoordinator.ts');
    const coordinator = ctx.postBattleCoordinator ?? postBattleCoordinator;
    coordinator.enqueueMoveLearning(lvlData.moves.map(m => ({ pokemon: p, move: m })));
  }

  await handleLevelUpEvolution(p, ctx);
}

async function presentTeamExpAndLevelUps(
  ctx: BattleContext,
  expGainedMap: Map<string, number>,
  eventExpExtraMap: Map<string, number>,
  levelUpMap: Map<string, { levelsGained: number; moves: Move[] }>
): Promise<void> {
  for (const p of ctx.gs.state.team) {
    const gained = expGainedMap.get(p.uid) || 0;
    if (gained > 0) {
      const eventExtra = eventExpExtraMap.get(p.uid) || 0;
      const eventExtraText = eventExtra > 0 ? ` (+${eventExtra} EXP evento)` : '';
      ctx.addLog(`${p.name} ganó ${gained} EXP${eventExtraText}.`, 'log-player', p);
    }

    const lvlData = levelUpMap.get(p.uid);
    if (lvlData) {
      await finalizePokemonLevelUp(ctx, p, lvlData);
    }
  }
}

function tryInfectNeighbor(
  neighbor: Pokemon | undefined,
  newlyInfectedNames: string[]
): void {
  if (neighbor && (!neighbor.pokerus || neighbor.pokerus === 'uninfected')) {
    neighbor.pokerus = 'infected';
    newlyInfectedNames.push(neighbor.nickname || neighbor.name);
  }
}

function spreadPokerusFromInfected(
  team: Pokemon[],
  infectedIdx: number,
  newlyInfectedNames: string[]
): void {
  if (Math.random() >= POKERUS_SPREAD_PROBABILITY) {
    return;
  }
  if (infectedIdx > 0) {
    tryInfectNeighbor(team[infectedIdx - 1], newlyInfectedNames);
  }
  if (infectedIdx + 1 < team.length) {
    tryInfectNeighbor(team[infectedIdx + 1], newlyInfectedNames);
  }
}

function spreadPokerus(ctx: BattleContext): void {
  const team = ctx.gs.state.team;
  const infectedMonIndices: number[] = [];
  team.forEach((p, idx) => {
    if (p.pokerus === 'infected') {
      infectedMonIndices.push(idx);
    }
  });

  if (infectedMonIndices.length === 0) return;

  const newlyInfectedNames: string[] = []; // no-domain: Non-domain utility collection or data structure
  for (const idx of infectedMonIndices) {
    spreadPokerusFromInfected(team, idx, newlyInfectedNames);
  }

  if (newlyInfectedNames.length > 0) {
    ctx.addLog(`¡El Pokérus se ha contagiado a ${newlyInfectedNames.join(', ')}!`, 'log-success', 'player');
  }
}
