import type { PlayerClassId } from '@/data/player/playerClasses';
import type { Pokemon, PokemonIVs } from '@/types/pokemon/pokemon';
import type { DeploymentCost, ResolvedDeploymentRewards } from '@/logic/player/classDeploymentEngine';
import { MAX_POKEMON_LEVEL } from '@/data/system/constants';
import { MAX_SINGLE_STAT_IV, MAX_POKEMON_VIGOR } from '@/logic/constants/gameplay.ts';
import { AVATAR_STYLES_BY_ID, isAvatarStyleId } from '@/data/player/cosmeticsData';

const CLASS_TO_AVATAR_STYLE_MAP: Readonly<Record<PlayerClassId, string>> = Object.freeze({
  cazabichos: 'av-class-cazabichos',
  criador: 'av-class-criador',
  rocket: 'av-class-rocket',
  entrenador: 'av-class-entrenador',
});

export function resolveNewClassAvatarStyle(currentAvatar: string, newClassId: PlayerClassId): string | null {
  if (!currentAvatar || !isAvatarStyleId(currentAvatar)) return null;
  const avatarDef = AVATAR_STYLES_BY_ID[currentAvatar];
  if (!avatarDef?.requiredClass) return null;

  const newBaseStyle = CLASS_TO_AVATAR_STYLE_MAP[newClassId];
  if (!newBaseStyle) return null;

  const isSquare = currentAvatar.includes('-sq-');
  return isSquare ? newBaseStyle.replace('av-class-', 'av-sq-') : newBaseStyle;
}

export function releasePokemonFromMissions(team: readonly (Pokemon | null)[], box: readonly (Pokemon | null)[]): void {
  for (const p of [...team, ...box]) {
    if (p && p.onMission) {
      p.onMission = false;
    }
  }
}

export interface CurrencyState {
  money?: number;
  battleCoins?: number;
}

export interface LevelUpChecker {
  checkLevelUp: (poke: Pokemon) => void;
}

export function deductDeploymentCost(
  state: CurrencyState,
  cost: DeploymentCost,
): { success: boolean; errorMsg?: string } {
  if (cost.type === 'money') {
    if ((state.money || 0) < cost.amount) {
      return { success: false, errorMsg: `Necesitas ₽${cost.amount.toLocaleString()} para esta misión.` };
    }
    state.money = (state.money || 0) - cost.amount;
    return { success: true };
  }
  if (cost.type === 'battleCoins') {
    if ((state.battleCoins || 0) < cost.amount) {
      return { success: false, errorMsg: `Necesitas ${cost.amount} Battle Coins para esta misión.` };
    }
    state.battleCoins = (state.battleCoins || 0) - cost.amount;
    return { success: true };
  }
  return { success: true };
}

export function applyPokemonGrowthOutcome(
  gStore: LevelUpChecker,
  rewards: ResolvedDeploymentRewards,
  poke: Pokemon,
): string {
  let outcomeMsg = '';
  if ((rewards.expGained > 0 || rewards.bonusLevels > 0) && poke.level < MAX_POKEMON_LEVEL) {
    if (rewards.expGained > 0) {
      poke.exp = (poke.exp || 0) + rewards.expGained;
      gStore.checkLevelUp(poke);
    }
    for (let i = 0; i < rewards.bonusLevels; i++) {
      if (poke.level < MAX_POKEMON_LEVEL) {
        poke.exp = poke.expNeeded;
        gStore.checkLevelUp(poke);
      }
    }
    outcomeMsg += `¡${poke.name} ganó EXP! `;
  }
  if (rewards.ivIncrements.length > 0) {
    poke.ivs = poke.ivs || { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 };
    for (const stat of rewards.ivIncrements) {
      const ivKey = stat as keyof PokemonIVs;
      poke.ivs[ivKey] = Math.min(MAX_SINGLE_STAT_IV, (poke.ivs[ivKey] || 0) + 1);
    }
    poke.vigor = Math.max(0, (poke.vigor ?? MAX_POKEMON_VIGOR) - rewards.vigorConsumed);
    outcomeMsg += `¡${poke.name} mejoró su genética! `;
  }
  return outcomeMsg;
}
