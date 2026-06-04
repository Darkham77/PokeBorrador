import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { Move } from '@/types/pokemon';
import { useBattleStore } from '@/stores/battle';
import { getMechanicalWeather } from '@/logic/weather/weatherRegistry';
import { getDayCycle } from '@/logic/timeUtils';
import { getMoveDescription } from '@/logic/pokemonUtils';
import { MOVE_DATA } from '@/data/moves';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import type { PurePokemon } from '@/logic/battle/battleMath';

import {
  calculateMoveModifierInfo,
  calculateMovePower,
  calculateMoveAccuracy,
  calculateCritChance,
  calculateMoveEffectivenessAndDamage,
  parseStatusEffectInfo
} from '@/logic/battle/moveTooltipMath';

export function useMoveTooltip(moveInput: MaybeRefOrGetter<Move>) {
  const battleStore = useBattleStore();

  const modifierInfo = computed(() => {
    if (!battleStore.isBattleActive) return null;
    const move = toValue(moveInput);
    const weather = battleStore.state?.weather?.type;
    const cycle = getDayCycle();
    return calculateMoveModifierInfo(move, weather, cycle);
  });

  const activeDetails = computed(() => {
    if (!battleStore.isBattleActive) return null;

    const move = toValue(moveInput);
    const attacker = battleStore.state?.player;
    const defender = battleStore.state?.enemy;
    const weather = battleStore.state?.weather;
    const mechWeather = getMechanicalWeather(weather?.type);
    const cycle = getDayCycle();

    if (!attacker) return null;

    const moveIdLookup = move.id || (move.name ? pokemonDataProvider.resolveMoveId(move.name) : '');
    const md = (MOVE_DATA as Record<string, { power?: number; acc?: number; cat?: string; type?: string }>)[moveIdLookup] || {};
    const basePower = move.power !== undefined ? move.power : md.power || 0;
    const isStatus = move.cat === 'status' || md.cat === 'status';
    const moveType = (move.type || md.type || 'normal').toLowerCase();

    // 1. Power details
    const power = calculateMovePower(
      move,
      attacker as unknown as PurePokemon,
      defender as unknown as PurePokemon | null,
      weather ? { type: weather.type, turns: weather.turns } : null,
      mechWeather,
      cycle,
      basePower,
      moveType
    );

    // 2. Accuracy details
    const baseAcc = move.acc !== undefined ? move.acc : md.acc || 0;
    const accStage = battleStore.playerStages?.acc || 0;
    const evaStage = battleStore.enemyStages?.eva || 0;
    const accuracy = calculateMoveAccuracy(
      move,
      weather ? { type: weather.type, turns: weather.turns } : null,
      mechWeather,
      cycle,
      baseAcc,
      accStage,
      evaStage
    );

    // 3. Crit Chance
    const critChance = calculateCritChance(
      attacker as unknown as PurePokemon,
      defender as unknown as PurePokemon | null
    );

    // 4. Effectiveness and Damage range
    const playerStages = battleStore.playerStages ? { atk: battleStore.playerStages.atk } : null;
    const enemyStages = battleStore.enemyStages ? { def: battleStore.enemyStages.def } : null;
    const { effectiveness, damageRange } = calculateMoveEffectivenessAndDamage(
      move,
      md,
      attacker as unknown as PurePokemon,
      defender as unknown as PurePokemon | null,
      weather ? { type: weather.type, turns: weather.turns } : null,
      cycle,
      isStatus,
      basePower,
      playerStages,
      enemyStages
    );

    return {
      isStatus,
      power: {
        ...power,
        final: isStatus ? '-' : power.final
      },
      accuracy,
      effectiveness,
      critChance,
      damageRange
    };
  });

  const parsedStatusEffect = computed(() => {
    if (!battleStore.isBattleActive) return null;

    const move = toValue(moveInput);
    const attacker = battleStore.state?.player;
    const defender = battleStore.state?.enemy;
    if (!attacker) return null;

    return parseStatusEffectInfo(
      move,
      attacker as unknown as PurePokemon,
      defender as unknown as PurePokemon | null,
      battleStore.playerStages,
      battleStore.enemyStages
    );
  });

  const moveDescriptionText = computed(() => {
    const move = toValue(moveInput);
    const moveId = move.id || (move.name ? pokemonDataProvider.resolveMoveId(move.name) : '');
    const moveDataObj = MOVE_DATA[moveId];
    return getMoveDescription(move.name, moveDataObj);
  });

  return {
    modifierInfo,
    activeDetails,
    parsedStatusEffect,
    moveDescriptionText
  };
}
