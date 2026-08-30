import { toValue } from 'vue';
import { gsapSleep } from '@/logic/utils/gsapHelpers';
import { processExpGain } from './battleRewards.ts';
import { getBattleRewardModifiers } from '@/logic/war/bonusEngine';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon, Move } from '@/types/pokemon/pokemon';
import { useUIStore } from '@/stores/ui';
import { useModalStore } from '@/stores/modals';
import type { BattleState } from '@/types/battle/battle.ts';
import { processGymBattleRewards } from './rewards/gymRewardsHandler.ts';
import { processCombatantExpAndEvs } from './rewards/combatantExpEvProcessor.ts';
import { handleRivalSpecialDrops, processCurrencyAndTrainerExp } from './rewards/classRewardsHandler.ts';
import { handleNpcBabyEggReward } from './rewards/npcEggRewardsHandler.ts';

export function registerRewardCombatant(active: BattleState | null) {
  if (!active) return;
  if (!active._rewardCombatants) {
    active._rewardCombatants = [];
  }
  const e = active.enemy || active._initialEnemy;
  if (e && !active._rewardCombatants.some((p: Pokemon) => p.uid === e.uid)) {
    active._rewardCombatants.push(e);
  }
}

/**
 * Calculates and distributes XP, money, EV, and item rewards at the end of a battle.
 */
export async function calculateBattleRewards(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  if (!active) return;

  const combatants = active._rewardCombatants && active._rewardCombatants.length > 0 
    ? active._rewardCombatants 
    : (active.enemy || active._initialEnemy ? [active.enemy || active._initialEnemy] : []).filter(Boolean) as Pokemon[];
  
  if (combatants.length === 0) return;

  const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx;
  const fsm = ctx.fsm;
  
  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.DISTRIBUTE_XP);
  
  const isTr = active.isTrainer || active.isGym || active.isPvP;
  const locId = active.locationId;

  // 1. Update general statistics
  if (!ctx.gs.state.stats) {
    ctx.gs.state.stats = {};
  }
  if (isTr) {
    ctx.gs.state.stats.trainersDefeated = (Number(ctx.gs.state.stats.trainersDefeated) || 0) + 1;
  } else {
    ctx.gs.state.stats.wins = (Number(ctx.gs.state.stats.wins) || 0) + 1;
  }

  // 2. Faction points claim
  const primaryEnemy = combatants[0];
  if (primaryEnemy?.isGuardian) {
    await ctx.warStore.claimGuardian(locId, !active.isCapture);
  } else {
    await ctx.warStore.addPoints(locId, isTr ? 'trainer_win' : 'wild_win', true);
  }

  // 3. Rival drops
  handleRivalSpecialDrops(ctx, active);

  // 4. NPC Baby Egg drops
  handleNpcBabyEggReward(ctx, active);

  // 5. Gym specific rewards & badges
  await processGymBattleRewards(ctx, active);

  // 5. Multipliers & Modifiers
  const warMods = getBattleRewardModifiers(active.locationId, ctx.gs.state.faction, ctx.warStore.mapDominance);
  const globalMults = toValue(ctx.eventStore?.globalMultipliers) as { exp?: number } | undefined;
  const eventExpMultiplier = globalMults?.exp || 1;
  let totalExpMult = warMods.expMult + (eventExpMultiplier - 1);
  let totalExpMultWithoutEvent = warMods.expMult;
  
  if ((ctx.gs.state.luckyEggSecs || 0) > 0) {
    totalExpMult *= 1.5;
    totalExpMultWithoutEvent *= 1.5;
  }

  const classMult = ctx.classStore.getModifier('expMult', { isTrainer: active.isTrainer });
  const participantsSet = new Set(active.participants);

  // 6. Process EXP, EVs, and Level Ups
  await processCombatantExpAndEvs(ctx, {
    combatants,
    participantsSet,
    classMult,
    totalExpMult,
    totalExpMultWithoutEvent,
    eventExpMultiplier
  });

  // 7. Process Money, Battle Coins, and Trainer EXP
  processCurrencyAndTrainerExp(ctx, active, combatants, warMods);

  // 8. Synchronize player active stats
  if (active.player) {
    const teamPoke = ctx.gs.state.team.find((tp: Pokemon) => tp && tp.uid === active.player?.uid);
    if (teamPoke) {
      active.player.level = teamPoke.level;
      active.player.exp = teamPoke.exp;
      active.player.expNeeded = teamPoke.expNeeded;
      active.player.maxHp = teamPoke.maxHp;
      active.player.hp = teamPoke.hp;
      active.player.atk = teamPoke.atk;
      active.player.def = teamPoke.def;
      active.player.spa = teamPoke.spa;
      active.player.spd = teamPoke.spd;
      active.player.spe = teamPoke.spe;
      active.player.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : [];
    }
  }

  await fsm.transition(BATTLE_STATES.REWARDS_PHASE, BATTLE_SUBSTATES.EMPTY_WAIT);
}

/**
 * Simulates a standard experience reward in battle for testing purposes.
 */
export async function awardDebugExp(ctx: BattleContext) {
  const active = ctx.activeBattle.value;
  if (!active || !active.player) return;

  const p = active.player;
  const teamPoke = ctx.gs.state.team.find((tp: Pokemon) => tp && tp.uid === p.uid);
  if (!teamPoke) return;

  const needed = teamPoke.expNeeded - teamPoke.exp;
  if (needed <= 0) return;

  ctx.addLog(`DEBUG: Añadiendo ${needed} EXP para subir de nivel...`, 'log-info', p);

  const participantsSet = new Set([p.uid]); // runtime-set
  const reward = processExpGain(teamPoke, needed, participantsSet, {
    isActive: true,
    classMult: 1,
    totalExpMult: 1,
    participantsSet
  });

  if (reward) {
    ctx.addLog(`${teamPoke.name} ganó ${reward.gained} EXP.`, 'log-player', teamPoke);
    
    if (reward.levelUp) {
      const { BATTLE_STATES, BATTLE_SUBSTATES } = ctx;
      const fsm = ctx.fsm;
      const prevState = fsm.currentState.value;
      const prevSubState = fsm.currentSubState.value;

      await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.CHECK_PENDING);
      
      const allPendingMoves: Move[] = [];
      const { levelUpPokemon } = await import('@/logic/pokemon/pokemonFactory');
      for (let i = 0; i < reward.levelsGained; i++) {
        const pendingMoves = levelUpPokemon(teamPoke);
        if (pendingMoves) {
          allPendingMoves.push(...pendingMoves);
        }
      }
      
      ctx.addLog(`¡${teamPoke.name} subió al nivel ${teamPoke.level}!`, 'log-info', teamPoke);

      // Sync active player copy stats
      p.level = teamPoke.level;
      p.exp = teamPoke.exp;
      p.expNeeded = teamPoke.expNeeded;
      p.maxHp = teamPoke.maxHp;
      p.hp = teamPoke.hp;
      p.atk = teamPoke.atk;
      p.def = teamPoke.def;
      p.spa = teamPoke.spa;
      p.spd = teamPoke.spd;
      p.spe = teamPoke.spe;
      p.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : [];

      if (allPendingMoves.length > 0) {
        await fsm.transition(BATTLE_STATES.LEVEL_UP_MODAL, BATTLE_SUBSTATES.SHOW_CHOICE);
        teamPoke.pendingMoves = allPendingMoves;
        
        const uiStore = useUIStore();
        uiStore.addToLearnQueue(allPendingMoves.map(m => ({ pokemon: teamPoke, move: m })));

        while (uiStore.learnQueue.length > 0 || uiStore.currentMoveToLearn) {
          await gsapSleep(100);
        }
      }

      // Sincronizar evolución por nivel en debug
      if (teamPoke.heldItem === 'everstone') {
        ctx.addLog(`${teamPoke.name} evitó evolucionar debido a la Piedra Eterna.`, 'log-info', teamPoke);
      } else {
        const { checkLevelUpEvolution } = await import('@/logic/evolution/evolutionLogic.ts');
        const targetId = checkLevelUpEvolution(teamPoke);
        if (targetId) {
          const uiStore = useUIStore();
          uiStore.startEvolution(teamPoke, targetId, '');
          const modalStore = useModalStore();
          while (modalStore.isOpen('Evolution')) {
            await gsapSleep(100);
          }
        }
      }

      // Sync active player copy stats
      p.level = teamPoke.level;
      p.exp = teamPoke.exp;
      p.expNeeded = teamPoke.expNeeded;
      p.maxHp = teamPoke.maxHp;
      p.hp = teamPoke.hp;
      p.atk = teamPoke.atk;
      p.def = teamPoke.def;
      p.spa = teamPoke.spa;
      p.spd = teamPoke.spd;
      p.spe = teamPoke.spe;
      p.moves = teamPoke.moves ? teamPoke.moves.map(m => m ? ({ ...m }) : null) : [];

      await fsm.transition(prevState, prevSubState);
    }
  }
}
