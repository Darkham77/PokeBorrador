import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleDifficulty, BattleState } from '@/types/battle/battle';
import { getItemById, requireItemId } from '@/data/inventory/items';
import { incrementRecordKey } from '@/logic/utils/mapUtils';

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
            const { getExpNeeded, levelUpPokemon } = await import('@/logic/pokemon/pokemonFactory');
            for (const p of team) {
              if (p.level >= 100) continue;
              p.exp += expPerPoke;

              let leveledUp = false;
              let tempLevel = p.level;
              let tempExpNeeded = p.expNeeded || getExpNeeded(tempLevel);

              while (p.exp >= tempExpNeeded && tempLevel < 100) {
                p.exp -= tempExpNeeded;
                leveledUp = true;
                tempLevel++;
                tempExpNeeded = getExpNeeded(tempLevel);
              }

              if (leveledUp) {
                const diffLevels = tempLevel - p.level;
                p.level = tempLevel;
                p.expNeeded = tempLevel >= 100 ? 0 : tempExpNeeded;
                for (let i = 0; i < diffLevels; i++) {
                  levelUpPokemon(p);
                }
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
