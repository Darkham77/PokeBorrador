import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleDifficulty, BattleState } from '@/types/battle/battle';
import { getItemById, requireItemId } from '@/data/inventory/items';
import { incrementRecordKey } from '@/logic/utils/mapUtils';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { getExpNeededPure } from '@/logic/pokemon/statsMath';

const REMATCH_TM_CHANCE_NORMAL = 0.03;
const REMATCH_TM_CHANCE_HARD = 0.05;
const GYM_REWARD_BASE_EXP_FACTOR = 180;
const GYM_REWARD_BASE_MONEY_FACTOR = 30;

export async function processGymBattleRewards(ctx: BattleContext, active: BattleState) {
  if (!active.isGym || !active.gymId) return;

  const gid = active.gymId;
  const diff = active.difficulty || 'easy';
  const isFirstTimeGym = !ctx.gs.state.defeatedGyms.includes(gid);

  // Registrar victoria global (Medalla)
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
  } else {
    // Rematch TM chance
    const { useGymsStore } = await import('@/stores/gyms');
    const gymsStore = useGymsStore();
    const gym = gymsStore.gyms.find(g => g.id === gid);
    if (gym && gym.rewardTM) {
      const key = diff as BattleDifficulty;
      let tmChance = 0;
      if (key === 'normal') tmChance = REMATCH_TM_CHANCE_NORMAL;
      else if (key === 'hard') tmChance = REMATCH_TM_CHANCE_HARD;

      if (tmChance > 0 && Math.random() < tmChance) {
        const tmId = requireItemId(gym.rewardTM);
        const itemObj = getItemById(tmId);
        incrementRecordKey(ctx.gs.state.inventory, tmId, 1);
        ctx.addLog(`¡Bono de Gimnasio (Rematch): Recibiste la ${itemObj.name}!`, 'log-success', tmId);
        ctx.uiStore.notify(`¡Obtuviste ${itemObj.name}!`, '🎒');
      }
    }
  }

  // Manejo de Revanchas Diarias de Líderes
  if (active.isRematch) {
    const { GYM_REMATCHES, recordGymRematchCompletion } = await import('@/data/world/gymRematches');
    recordGymRematchCompletion(ctx.gs.state, gid);
    const rematchConfig = GYM_REMATCHES[gid];
    if (rematchConfig) {
      for (const reward of rematchConfig.rewardItems) {
        incrementRecordKey(ctx.gs.state.inventory, reward.itemId, reward.quantity);
        const itemObj = getItemById(reward.itemId);
        ctx.addLog(`¡Bono de Revancha: Recibiste x${reward.quantity} ${itemObj.name}!`, 'log-success', reward.itemId);
      }
      ctx.gs.state.battleCoins = (ctx.gs.state.battleCoins || 0) + rematchConfig.rewardBattleCoins;
      ctx.addLog(`¡Bono de Revancha: Recibiste ${rematchConfig.rewardBattleCoins} Battle Coins!`, 'log-success', 'player');
      ctx.uiStore.notify(`¡Victoria en Revancha Diaria! +${rematchConfig.rewardBattleCoins} BC y premios especiales.`, '🔥');
    }
  }

  // Registrar progreso específico por dificultad
  if (!ctx.gs.state.gymProgress[gid] || typeof ctx.gs.state.gymProgress[gid] !== 'object') {
    ctx.gs.state.gymProgress[gid] = { easy: false, normal: false, hard: false, attempts: 0 };
  }
  const prog = ctx.gs.state.gymProgress[gid];
  if (prog) {
    const key = diff as BattleDifficulty;
    if (!prog[key]) {
      prog[key] = true;
      ctx.addLog(`¡Superaste el gimnasio en dificultad ${diff.toUpperCase()}!`, 'log-success', '🏆');

      const { useGymsStore } = await import('@/stores/gyms');
      const gymsStore = useGymsStore();
      const gym = gymsStore.gyms.find(g => g.id === gid);
      if (gym && gym.difficulties) {
        const diffData = gym.difficulties[key];
        if (diffData && diffData.levels) {
          const avgLevel = diffData.levels.reduce((a: number, b: number) => a + b, 0) / diffData.levels.length;
          const mults: Record<string, number> = { easy: 1, normal: 2.2, hard: 4.5 };
          const mult = mults[key] || 1;

          const expReward = Math.floor(avgLevel * GYM_REWARD_BASE_EXP_FACTOR * mult);
          const moneyReward = Math.floor(avgLevel * GYM_REWARD_BASE_MONEY_FACTOR * mult);

          // 1. Award Money
          ctx.gs.state.money += moneyReward;
          ctx.addLog(`¡Bono de Gimnasio: Recibiste ₽${moneyReward}!`, 'log-success', 'player');
          ctx.uiStore.notify(`¡Obtuviste ₽${moneyReward}!`, '💰');

          // 2. Award EXP (distributed)
          const team = ctx.gs.state.team || [];
          if (team.length > 0) {
            const expPerPoke = Math.floor(expReward / team.length);
            const { levelUpPokemon } = await import('@/logic/pokemon/pokemonFactory');
            const { useUIStore } = await import('@/stores/ui');
            const uiStore = useUIStore();
            for (const p of team) {
              if (p.level >= MAX_POKEMON_LEVEL) continue;
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
            ctx.uiStore.notify(`¡Tu equipo ganó ${expReward} EXP de bono!`, '✨');
          }
        }
      }
    }
    prog.attempts++;
  }

  await ctx.gs.save(false);
}
