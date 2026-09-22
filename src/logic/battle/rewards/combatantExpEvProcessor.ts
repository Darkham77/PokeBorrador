import { processExpGain, processEvGain } from '../battleRewards.ts';
import { recalcPokemonStats } from '@/logic/pokemon/pokemonFactory';
import { clampFriendship } from '@/logic/pokemon/friendshipLogic.ts';
import type { BattleContext } from '@/types/battle/battleContext';
import { POKEMON_STAT_KEYS, type Pokemon, type Move, type PokemonStatKey } from '@/types/pokemon/pokemon';

const POKERUS_SPREAD_PROBABILITY = 0.33;

const COMPACT_STAT_NAMES_ES: Record<PokemonStatKey, string> = {
  hp: 'PS',
  atk: 'Atk',
  def: 'Def',
  spa: 'At.Esp',
  spd: 'Def.Esp',
  spe: 'Vel',
};

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
  const evGainsMap = new Map<string, Partial<Record<PokemonStatKey, number>>>();
  const { calculateBaseExp } = await import('../battleRewards.ts');
  const maps = { expGainedMap, eventExpExtraMap, levelUpMap };

  for (const combatant of params.combatants) {
    const baseExp = calculateBaseExp(combatant);
    for (const p of ctx.gs.state.team) {
      await processSinglePokemonExp(ctx, active, p, combatant, baseExp, params, maps);
    }

    recordEvGains(ctx, active, combatant, params.participantsSet, evGainsMap);
  }

  spreadPokerus(ctx);
  await presentTeamExpAndLevelUps(ctx, active, expGainedMap, eventExpExtraMap, levelUpMap, evGainsMap);
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
  const friendshipGain = calculateFriendshipLevelUpDelta(clampFriendship(p.friendship), hasSootheBell) * levelsGained;
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

function recordEvGains(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  combatant: Pokemon,
  participantsSet: Set<string>,
  evGainsMap: Map<string, Partial<Record<PokemonStatKey, number>>>
): void {
  for (const p of ctx.gs.state.team) {
    if (active.isCapture && p.uid === combatant.uid) continue;

    const evReward = processEvGain(p, combatant, participantsSet);
    if (evReward && evReward.totalGained > 0) {
      recalcPokemonStats(p);
      const pokeEvs = evGainsMap.getOrInsertComputed(p.uid, () => ({}));
      for (const [statKey, gain] of Object.entries(evReward.statGains)) {
        if (gain && gain > 0) {
          const key = statKey as PokemonStatKey;
          pokeEvs[key] = (pokeEvs[key] || 0) + gain;
        }
      }
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
  if (lvlData.moves.length > 0) {
    p.pendingMoves = lvlData.moves;
    const { postBattleCoordinator } = await import('../postBattleSequenceCoordinator.ts');
    const coordinator = ctx.postBattleCoordinator ?? postBattleCoordinator;
    coordinator.enqueueMoveLearning(lvlData.moves.map(m => ({ pokemon: p, move: m })));
  }

  await handleLevelUpEvolution(p, ctx);
}

function buildPrimaryRewardLine(
  pokeName: string,
  level: number,
  lvlData: { levelsGained: number; moves: Move[] } | undefined,
  expGained: number,
  eventExtra: number
): string {
  let lvlText = '';
  if (lvlData && lvlData.levelsGained > 0) {
    if (lvlData.levelsGained > 1) {
      const prevLvl = level - lvlData.levelsGained;
      lvlText = ` <span class="reward-lvl">¡Nv. ${prevLvl} → ${level}!</span>`;
    } else {
      lvlText = ` <span class="reward-lvl">¡Nv. ${level}!</span>`;
    }
  } else {
    lvlText = ` <span class="reward-lvl">(Nv. ${level})</span>`;
  }

  let expText = '';
  if (expGained > 0) {
    const eventExtraText = eventExtra > 0 ? ` (+${eventExtra} evento)` : '';
    expText = ` • <span class="reward-exp">+${expGained} EXP${eventExtraText}</span>`;
  }

  return `<div class="reward-line-primary"><strong>${pokeName}</strong>${lvlText}${expText}</div>`;
}

function buildSecondaryRewardLine(
  pokeEvs: Partial<Record<PokemonStatKey, number>>,
  friendshipDelta: number
): string {
  const parts: string[] = [];
  for (const stat of POKEMON_STAT_KEYS) {
    const gain = pokeEvs[stat] || 0;
    if (gain > 0) {
      parts.push(`+${gain} ${COMPACT_STAT_NAMES_ES[stat]}`);
    }
  }

  const evText = parts.length > 0 ? `<span class="reward-evs">EVs: ${parts.join(', ')}</span>` : '';

  let friendshipText = '';
  if (friendshipDelta > 0) {
    friendshipText = `<span class="reward-friendship">❤️ +${friendshipDelta}</span>`;
  } else if (friendshipDelta < 0) {
    friendshipText = `<span class="reward-friendship">💔 ${friendshipDelta}</span>`;
  }

  const entries = [evText, friendshipText].filter(Boolean);
  if (entries.length === 0) return '';
  return `<div class="reward-line-secondary">${entries.join(' • ')}</div>`;
}

async function presentTeamExpAndLevelUps(
  ctx: BattleContext,
  active: NonNullable<BattleContext['activeBattle']['value']>,
  expGainedMap: Map<string, number>,
  eventExpExtraMap: Map<string, number>,
  levelUpMap: Map<string, { levelsGained: number; moves: Move[] }>,
  evGainsMap: Map<string, Partial<Record<PokemonStatKey, number>>>
): Promise<void> {
  const initialFriendships = active.initialFriendships || {};

  for (const p of ctx.gs.state.team) {
    const expGained = expGainedMap.get(p.uid) || 0;
    const eventExtra = eventExpExtraMap.get(p.uid) || 0;
    const lvlData = levelUpMap.get(p.uid);
    const pokeEvs = evGainsMap.get(p.uid) || {};

    const currentFriendship = clampFriendship(p.friendship);
    const initialFriendship = initialFriendships[p.uid] ?? currentFriendship;
    const friendshipDelta = currentFriendship - initialFriendship;

    const hasExp = expGained > 0;
    const hasLevelUp = Boolean(lvlData && lvlData.levelsGained > 0);
    const hasEvGains = Object.values(pokeEvs).some((v) => (v || 0) > 0);
    const hasFriendshipDelta = friendshipDelta !== 0;

    // Strict Zero-Change Omission Mandate
    if (!hasExp && !hasLevelUp && !hasEvGains && !hasFriendshipDelta) {
      continue;
    }

    const pokeName = p.nickname || p.name;
    const renglon1 = buildPrimaryRewardLine(pokeName, p.level, lvlData, expGained, eventExtra);
    const renglon2 = buildSecondaryRewardLine(pokeEvs, friendshipDelta);

    const unifiedMsg = `<div class="reward-entry-unified">${renglon1}${renglon2}</div>`;
    ctx.addLog(unifiedMsg, 'log-player', p);

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
