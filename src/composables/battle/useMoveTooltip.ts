import { computed, toValue, type ComputedRef } from 'vue';
import type { MaybeRefOrGetter } from 'vue';

import type { PurePokemon } from '@/logic/battle/battleMath';
import { calculateMoveModifierInfo, parseStatusEffectInfo } from '@/logic/battle/moveTooltipMath';
import { getMoveDescription } from '@/logic/pokemon/pokemonUtils';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { useBattleStore } from '@/stores/battle/battle';
import type { Move, Pokemon } from '@/types/pokemon/pokemon';

import {
  applyChoiceItemModifier,
  createTooltipBattleContext,
  computeMoveActiveDetails
} from './moveTooltipCalculator.ts';

export interface UseMoveTooltipReturn {
  readonly modifierInfo: ComputedRef<ReturnType<typeof calculateMoveModifierInfo> | null>;
  readonly activeDetails: ComputedRef<ReturnType<typeof computeMoveActiveDetails> | null>;
  readonly parsedStatusEffect: ComputedRef<ReturnType<typeof parseStatusEffectInfo> | null>;
  readonly moveDescriptionText: ComputedRef<string>;
}

export function useMoveTooltip(
  moveInput: MaybeRefOrGetter<Move>,
  playerInfoInput?: MaybeRefOrGetter<Pokemon | null | undefined>
): UseMoveTooltipReturn {
  const battleStore = useBattleStore();

  const modifierInfo = computed(() => {
    if (!battleStore.isBattleActive) return null;
    const ctx = createTooltipBattleContext(
      battleStore.state,
      playerInfoInput ? toValue(playerInfoInput) : null
    );
    if (!ctx) return null;

    const move = toValue(moveInput);
    let info = calculateMoveModifierInfo(move, ctx.weather?.type, ctx.cycle);
    if (ctx.attacker.heldItem) {
      info = applyChoiceItemModifier(info, ctx.attacker, move);
    }
    return info;
  });

  const activeDetails = computed(() => {
    if (!battleStore.isBattleActive) return null;

    const ctx = createTooltipBattleContext(
      battleStore.state,
      playerInfoInput ? toValue(playerInfoInput) : null
    );
    if (!ctx) return null;

    const move = toValue(moveInput);
    return computeMoveActiveDetails(
      move,
      ctx,
      battleStore.state,
      battleStore.playerStages,
      battleStore.enemyStages
    );
  });

  const parsedStatusEffect = computed(() => {
    if (!battleStore.isBattleActive) return null;

    const move = toValue(moveInput);
    const attacker = playerInfoInput
      ? toValue(playerInfoInput) || battleStore.state?.player
      : battleStore.state?.player;
    const defender = battleStore.state?.enemy;
    if (!attacker) return null;

    return parseStatusEffectInfo(
      move,
      attacker, // domain-ok: Open dynamic text or non-domain string payload
      defender as PurePokemon | null, // domain-ok: Open dynamic text or non-domain string payload
      battleStore.playerStages,
      battleStore.enemyStages
    );
  });

  const moveDescriptionText = computed(() => {
    const move = toValue(moveInput);
    if (!move || !move.id) return '';
    const moveDataObj = pokemonDataProvider.getMoveData(move.id);
    return getMoveDescription(move.id, moveDataObj);
  });

  return {
    modifierInfo,
    activeDetails,
    parsedStatusEffect,
    moveDescriptionText
  };
}

export type ActiveMoveDetails = NonNullable<
  ReturnType<typeof useMoveTooltip>['activeDetails']['value']
>;
