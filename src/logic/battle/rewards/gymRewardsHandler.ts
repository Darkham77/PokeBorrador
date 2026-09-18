import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleDifficulty, BattleState } from '@/types/battle/battle';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import { getItemById, requireItemId } from '@/data/inventory/items';
import { GYMS_BY_ID, requireGymId, type GymId } from '@/data/world/gyms';
import { incrementRecordKey } from '@/logic/utils/mapUtils';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getExpNeededPure } from '@/logic/pokemon/statsMath';

const REMATCH_TM_CHANCE_NORMAL = 0.03;
const REMATCH_TM_CHANCE_HARD = 0.05;
const GYM_REWARD_BASE_EXP_FACTOR = 180;
const GYM_REWARD_BASE_MONEY_FACTOR = 30;

const DIFFICULTY_REWARD_MULTIPLIERS: Record<BattleDifficulty, number> = {
  easy: 1,
  normal: 2.2,
  hard: 4.5
};

function handleGymBadgeAndTmAward(
  ctx: BattleContext,
  active: BattleState,
  gid: GymId,
  diff: BattleDifficulty,
  isFirstTimeGym: boolean
): void {
  if (isFirstTimeGym) {
    ctx.gs.state.defeatedGyms.push(gid);
    ctx.gs.state.badges++;
    if (active.rewardTM) {
      const tmId = requireItemId(active.rewardTM);
      const itemObj = getItemById(tmId);
      incrementRecordKey(ctx.gs.state.inventory, tmId, 1);
      ctx.addLog(`¡Recibiste la ${itemObj.name}!`, 'log-info', tmId);
      ctx.uiStore.notify(`¡Obtuviste ${itemObj.name}!`, '🎒');
    }
    ctx.uiStore.notify(`¡Ganaste la medalla del Gimnasio ${gid}!`, '🏆');
    return;
  }

  // Rematch TM chance
  const gym = GYMS_BY_ID[requireGymId(gid)];
  if (!gym || !gym.rewardTM) return;

  let tmChance = 0;
  if (diff === 'normal') tmChance = REMATCH_TM_CHANCE_NORMAL;
  else if (diff === 'hard') tmChance = REMATCH_TM_CHANCE_HARD;

  if (tmChance > 0 && Math.random() < tmChance) {
    const tmId = requireItemId(gym.rewardTM);
    const itemObj = getItemById(tmId);
    incrementRecordKey(ctx.gs.state.inventory, tmId, 1);
    ctx.addLog(`¡Bono de Gimnasio (Rematch): Recibiste la ${itemObj.name}!`, 'log-success', tmId);
    ctx.uiStore.notify(`¡Obtuviste ${itemObj.name}!`, '🎒');
  }
}

async function handleDailyRematchReward(
  ctx: BattleContext,
  gid: GymId
): Promise<void> {
  const { GYM_REMATCHES, recordGymRematchCompletion } = await import('@/data/world/gymRematches');
  recordGymRematchCompletion(ctx.gs.state, gid);
  const rematchConfig = GYM_REMATCHES[gid];
  if (!rematchConfig) return;

  for (const reward of rematchConfig.rewardItems) {
    incrementRecordKey(ctx.gs.state.inventory, reward.itemId, reward.quantity);
    const itemObj = getItemById(reward.itemId);
    ctx.addLog(`¡Bono de Revancha: Recibiste x${reward.quantity} ${itemObj.name}!`, 'log-success', reward.itemId);
  }
  ctx.gs.state.battleCoins = (ctx.gs.state.battleCoins || 0) + rematchConfig.rewardBattleCoins;
  ctx.addLog(`¡Bono de Revancha: Recibiste ${rematchConfig.rewardBattleCoins} Battle Coins!`, 'log-success', 'player');
  ctx.uiStore.notify(`¡Victoria en Revancha Diaria! +${rematchConfig.rewardBattleCoins} BC y premios especiales.`, '🔥');
}

function calculateGymDifficultyRewards(
  gid: GymId,
  diff: BattleDifficulty
): { expReward: number; moneyReward: number } | null {
  const gym = GYMS_BY_ID[requireGymId(gid)];
  if (!gym || !gym.difficulties) return null;

  const diffData = gym.difficulties[diff];
  if (!diffData || !diffData.levels || diffData.levels.length === 0) return null;

  const avgLevel = diffData.levels.reduce((a: number, b: number) => a + b, 0) / diffData.levels.length;
  const mult = DIFFICULTY_REWARD_MULTIPLIERS[diff] ?? 1;

  return {
    expReward: Math.floor(avgLevel * GYM_REWARD_BASE_EXP_FACTOR * mult),
    moneyReward: Math.floor(avgLevel * GYM_REWARD_BASE_MONEY_FACTOR * mult)
  };
}

function applyGymExpToPokemon(
  ctx: BattleContext,
  p: Pokemon,
  expPerPoke: number,
  levelUpPokemon: (pokemon: Pokemon) => Move[] | null,
  uiStore: { addToLearnQueue: (items: { pokemon: Pokemon; move: Move }[]) => void }
): void {
  if (p.level >= MAX_POKEMON_LEVEL) return;
  let incomingExp = p.exp + expPerPoke;
  let levelsGained = 0;

  while (p.level < MAX_POKEMON_LEVEL) {
    const needed = p.expNeeded || getExpNeededPure(p.level);
    if (incomingExp < needed) {
      p.exp = incomingExp;
      p.expNeeded = needed;
      break;
    }
    incomingExp -= needed;
    p.exp = 0;
    const pendingMoves = levelUpPokemon(p);
    if (pendingMoves === null) {
      p.exp = incomingExp;
      break; // Blocked by Everstone
    }
    levelsGained++;
    if (pendingMoves.length > 0) {
      uiStore.addToLearnQueue(pendingMoves.map(m => ({ pokemon: p, move: m })));
    }
  }

  if (p.level >= MAX_POKEMON_LEVEL) {
    p.exp = 0;
    p.expNeeded = 0;
  }

  if (levelsGained > 0) {
    ctx.addLog(`¡Bono de Gimnasio: ${p.name} subió al nivel ${p.level}!`, 'log-success', p);
  }
  ctx.addLog(`¡Bono de Gimnasio: ${p.name} ganó ${expPerPoke} EXP!`, 'log-success', p);
}

async function distributeGymExpToTeam(
  ctx: BattleContext,
  team: Pokemon[],
  expReward: number
): Promise<void> {
  if (team.length === 0) return;
  const expPerPoke = Math.floor(expReward / team.length);
  const { levelUpPokemon } = await import('@/logic/pokemon/pokemonFactory');
  const { useUIStore } = await import('@/stores/ui');
  const uiStore = useUIStore();

  for (const p of team) {
    applyGymExpToPokemon(ctx, p, expPerPoke, levelUpPokemon, uiStore);
  }
  ctx.uiStore.notify(`¡Tu equipo ganó ${expReward} EXP de bono!`, '✨');
}

async function handleGymDifficultyProgression(
  ctx: BattleContext,
  gid: GymId,
  diff: BattleDifficulty
): Promise<void> {
  if (!ctx.gs.state.gymProgress[gid] || typeof ctx.gs.state.gymProgress[gid] !== 'object') {
    ctx.gs.state.gymProgress[gid] = { easy: false, normal: false, hard: false, attempts: 0 };
  }
  const prog = ctx.gs.state.gymProgress[gid];
  if (!prog) return;

  if (!prog[diff]) {
    prog[diff] = true;
    ctx.addLog(`¡Superaste el gimnasio en dificultad ${diff.toUpperCase()}!`, 'log-success', '🏆');

    const rewards = calculateGymDifficultyRewards(gid, diff);
    if (rewards) {
      ctx.gs.state.money += rewards.moneyReward;
      ctx.addLog(`¡Bono de Gimnasio: Recibiste ₽${rewards.moneyReward}!`, 'log-success', 'player');
      ctx.uiStore.notify(`¡Obtuviste ₽${rewards.moneyReward}!`, '💰');

      await distributeGymExpToTeam(ctx, (ctx.gs.state.team || []) as Pokemon[], rewards.expReward);
    }
  }
  prog.attempts++;
}

export async function processGymBattleRewards(ctx: BattleContext, active: BattleState): Promise<void> {
  if (!active.isGym || !active.gymId) return;

  const gid = requireGymId(active.gymId);
  const diff = (active.difficulty || 'easy') as BattleDifficulty;
  const isFirstTimeGym = !ctx.gs.state.defeatedGyms.includes(gid);

  handleGymBadgeAndTmAward(ctx, active, gid, diff, isFirstTimeGym);

  if (active.isRematch) {
    await handleDailyRematchReward(ctx, gid);
  }

  await handleGymDifficultyProgression(ctx, gid, diff);

  await ctx.gs.save(false);
}
