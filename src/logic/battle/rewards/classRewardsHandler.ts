import type { BattleContext } from '@/types/battle/battleContext';
import type { BattleState } from '@/types/battle/battle';
import type { Pokemon } from '@/types/pokemon/pokemon';
import type { MapRouteId } from '@/data/world/map-assets';
import { getItemById, type ItemId } from '@/data/inventory/items';
import { incrementRecordKey } from '@/logic/utils/mapUtils';
import { calculateMoneyGain } from '../battleRewards.ts';
import { BUFF_DURATION_30_MIN_SEC } from '@/logic/constants/items';

const RIVAL_DROP_PROB_MAX_PERCENT = 100;
const RIVAL_DROP_PROB_MASTERBALL = 10;
const RIVAL_DROP_PROB_SHINY_TICKET = 25;
const RIVAL_DROP_PROB_SAFARI_TICKET = 40;
const RIVAL_DROP_PROB_CERULEAN_TICKET = 55;
const RIVAL_DROP_PROB_ARTICUNO_TICKET = 70;
const RIVAL_DROP_PROB_MEWTWO_TICKET = 85;

const ROCKET_EXTORTION_WINDOW_MS = 24 * 3600 * 1000;
const ROCKET_EXTORTION_BONUS_PCT_TEXT = '50%';
const LUCKY_EGG_EXP_BONUS_PCT_TEXT = '50%';
const AMULET_COIN_MONEY_MULTIPLIER = 2;
const BATTLE_COINS_PER_LEVEL_FACTOR = 2;
const GYM_EXP_FACTOR_PER_LEVEL = 5;
const TRAINER_EXP_FACTOR_PER_LEVEL = 2;
const SECONDS_TO_MS_MULTIPLIER = 1000;

export function handleRivalSpecialDrops(ctx: BattleContext, active: BattleState) {
  if (!active.isRival && active.trainerArchetype !== 'rival') return;

  const randRec = Math.random() * RIVAL_DROP_PROB_MAX_PERCENT;
  let rewardedItemKey: ItemId;
  if (randRec < RIVAL_DROP_PROB_MASTERBALL) {
    rewardedItemKey = 'masterball';
  } else if (randRec < RIVAL_DROP_PROB_SHINY_TICKET) {
    rewardedItemKey = 'ticketshiny';
  } else if (randRec < RIVAL_DROP_PROB_SAFARI_TICKET) {
    rewardedItemKey = 'ticketsafari';
  } else if (randRec < RIVAL_DROP_PROB_CERULEAN_TICKET) {
    rewardedItemKey = 'ticketcerulean';
  } else if (randRec < RIVAL_DROP_PROB_ARTICUNO_TICKET) {
    rewardedItemKey = 'ticketarticuno';
  } else if (randRec < RIVAL_DROP_PROB_MEWTWO_TICKET) {
    rewardedItemKey = 'ticketmewtwo';
  } else {
    rewardedItemKey = 'ivscanner';
  }

  const itemObj = getItemById(rewardedItemKey);
  const rewardedItemName = itemObj.name;
  incrementRecordKey(ctx.gs.state.inventory, rewardedItemKey, 1);
  ctx.addLog(`¡El Rival dejó caer una ${rewardedItemName}!`, 'log-catch', rewardedItemKey);
  ctx.uiStore.notify(`¡Recibiste ${rewardedItemName}! 🎁`, '🎁');
}

function calculateSingleCombatantEarnings(
  e: Pokemon,
  active: BattleState,
  ctx: BattleContext,
  warMods: { moneyMult: number },
  isGymRematch: boolean
): { money: number; coins: number; exp: number } {
  let money = calculateMoneyGain(e, {
    bcMult: ctx.classStore.getModifier('bcMult', { isGym: active.isGym }),
    totalMoneyMult: warMods.moneyMult + ((ctx.eventStore.globalMultipliers?.money || 1) - 1),
    isTrainer: active.isTrainer,
    isGym: active.isGym
  });

  if ((ctx.gs.state.amuletCoinSecs || 0) > 0) {
    money *= AMULET_COIN_MONEY_MULTIPLIER;
  }

  let coins = 0;
  if ((active.isTrainer || active.isGym) && !isGymRematch) {
    const rawCoins = Math.floor(e.level * BATTLE_COINS_PER_LEVEL_FACTOR);
    const bcMult = ctx.classStore.getModifier('bcMult', { isGym: active.isGym });
    const eventMult = ctx.eventStore.globalMultipliers?.bc || 1;
    coins = Math.floor(rawCoins * bcMult * eventMult);
  }

  const exp = active.isGym ? (e.level * GYM_EXP_FACTOR_PER_LEVEL) : (e.level * TRAINER_EXP_FACTOR_PER_LEVEL);
  return { money, coins, exp };
}

function applyClassRouteBonuses(ctx: BattleContext, locationId: MapRouteId, baseMoney: number): number {
  let totalMoney = baseMoney;
  const now = Temporal.Now.instant().epochMilliseconds;

  if (ctx.gs.state.playerClass === 'rocket' && ctx.gs.state.classData?.extortedRouteId === locationId) {
    const extTimestamp = Number(ctx.gs.state.classData?.extortedRouteTimestamp || 0);
    if (now - extTimestamp <= ROCKET_EXTORTION_WINDOW_MS) {
      const bonusMoney = Math.floor(totalMoney * 0.5);
      totalMoney += bonusMoney;
      ctx.addLog(`¡Extorsión activa (+${ROCKET_EXTORTION_BONUS_PCT_TEXT} ₽)! +₽${bonusMoney}`, 'log-info', 'player');
    }
  }

  if (ctx.gs.state.playerClass === 'entrenador' && ctx.gs.state.classData?.officialRouteId === locationId) {
    const offTimestamp = Number(ctx.gs.state.classData?.officialRouteTimestamp || 0);
    if (now - offTimestamp <= BUFF_DURATION_30_MIN_SEC * SECONDS_TO_MS_MULTIPLIER) {
      if (!ctx.gs.state.classData) {
        ctx.gs.state.classData = {
          captureStreak: 0,
          longestStreak: 0,
          reputation: 0,
          blackMarketSales: 0,
          criminality: 0,
          blackMarketDaily: { date: '', items: [], purchased: [] }
        };
      }
      ctx.gs.state.classData.reputation = (Number(ctx.gs.state.classData.reputation) || 0) + 1;
      ctx.addLog('¡Ruta Oficial activa! Ganaste +1 de Reputación.', 'log-success', 'player');
    }
  }

  return totalMoney;
}

export function processCurrencyAndTrainerExp(
  ctx: BattleContext,
  active: BattleState,
  combatants: Pokemon[],
  warMods: { moneyMult: number }
) {
  const isGymRematch = Boolean(active.isGym && active.gymId && ctx.gs.state.defeatedGyms.includes(active.gymId));
  let totalMoneyGained = 0;
  let totalCoinsGained = 0;
  let totalTrainerExpGained = 0;

  for (const e of combatants) {
    const earnings = calculateSingleCombatantEarnings(e, active, ctx, warMods, isGymRematch);
    totalMoneyGained += earnings.money;
    totalCoinsGained += earnings.coins;
    totalTrainerExpGained += earnings.exp;
  }

  totalMoneyGained = applyClassRouteBonuses(ctx, active.locationId, totalMoneyGained);

  // Award consolidated rewards
  ctx.gs.state.money += totalMoneyGained;
  if ((ctx.gs.state.amuletCoinSecs || 0) > 0) {
    ctx.addLog('¡Moneda Amuleto duplicó el dinero obtenido!', 'log-success', 'player');
  }
  if ((ctx.gs.state.luckyEggSecs || 0) > 0) {
    ctx.addLog(`¡Huevo Suerte aumentó un ${LUCKY_EGG_EXP_BONUS_PCT_TEXT} la EXP obtenida!`, 'log-success', 'player');
  }
  ctx.addLog(`¡Ganaste ₽${totalMoneyGained} en total!`, 'log-info', 'player');

  if (totalCoinsGained > 0) {
    ctx.gs.state.battleCoins = (ctx.gs.state.battleCoins || 0) + totalCoinsGained;
    ctx.addLog(`¡Obtuviste ${totalCoinsGained} Battle Coins en total!`, 'log-info', 'player');
  }

  if (totalTrainerExpGained > 0) {
    ctx.gs.addTrainerExp(totalTrainerExpGained);
    ctx.addLog(`¡Ganaste ${totalTrainerExpGained} EXP de entrenador!`, 'log-info', 'player');
  }
}
