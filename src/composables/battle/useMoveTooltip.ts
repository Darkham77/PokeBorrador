import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { Move, Pokemon } from '@/types/pokemon/pokemon';
import { useBattleStore } from '@/stores/battle/battle';
import { getMechanicalWeather } from '@/logic/weather/weatherRegistry';
import { getDayCycle } from '@/logic/utils/timeUtils';
import { getMoveDescription } from '@/logic/pokemon/pokemonUtils';
import { pokemonDataProvider } from '@/logic/providers/pokemonDataProvider';
import { getEffectiveStatPure, type PurePokemon } from '@/logic/battle/battleMath';
import {
  calculateMoveModifierInfo,
  calculateMovePower,
  calculateMoveAccuracy,
  calculateCritChance,
  calculateMoveEffectivenessAndDamage,
  parseStatusEffectInfo
} from '@/logic/battle/moveTooltipMath';

export function useMoveTooltip(
  moveInput: MaybeRefOrGetter<Move>,
  playerInfoInput?: MaybeRefOrGetter<Pokemon | null | undefined>
) {
  const battleStore = useBattleStore();

  const modifierInfo = computed(() => {
    if (!battleStore.isBattleActive) return null;
    const move = toValue(moveInput);
    const isGym = !!battleStore.state?.isGym;
    const weather = isGym ? undefined : battleStore.state?.weather?.type;
    const cycle = getDayCycle();
    const attacker = playerInfoInput ? (toValue(playerInfoInput) || battleStore.state?.player) : battleStore.state?.player;

    let info = calculateMoveModifierInfo(move, weather, cycle);

    if (attacker && attacker.heldItem === 'choice_band') {
      const moveIdLookup = move.id || '';
      const md = (moveIdLookup ? pokemonDataProvider.getMoveData(moveIdLookup) || {} : {}) as { cat?: 'physical' | 'special' | 'status'; type?: string; power?: number; acc?: number };
      const category = move.cat || md.cat || 'physical';
      const isPhysical = category === 'physical';

      if (attacker.choiceMove && attacker.choiceMove !== move.name) {
        info = { type: 'penalized', text: `Bloqueado por Cinta Elegida (Elegiste: ${attacker.choiceMove}).` };
      } else if (isPhysical) {
        if (!info) {
          info = { type: 'boosted', text: 'Objeto: Cinta Elegida (+50% Potencia Física, bloquea movimiento).' };
        } else {
          info = { ...info, text: `${info.text} | Cinta Elegida (+50% Potencia, bloqueo)` };
        }
      } else {
        if (!info) {
          info = { type: 'boosted', text: 'Objeto: Cinta Elegida (Bloquea a este movimiento si se selecciona).' };
        } else {
          info = { ...info, text: `${info.text} | Cinta Elegida (Bloqueo)` };
        }
      }
    }

    return info;
  });

  const activeDetails = computed(() => {
    if (!battleStore.isBattleActive) return null;

    const move = toValue(moveInput);
    const attacker = playerInfoInput ? (toValue(playerInfoInput) || battleStore.state?.player) : battleStore.state?.player;
    const defender = battleStore.state?.enemy;
    const isGym = !!battleStore.state?.isGym;
    const weather = isGym ? null : battleStore.state?.weather;
    const mechWeather = getMechanicalWeather(weather?.type);
    const cycle = getDayCycle();

    if (!attacker) return null;

    const moveIdLookup = move.id || '';
    const md = (moveIdLookup ? pokemonDataProvider.getMoveData(moveIdLookup) || {} : {}) as { cat?: 'physical' | 'special' | 'status'; type?: string; power?: number; acc?: number; effect?: string };
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
    const category = move.cat || md.cat || 'physical';
    const isPhysical = category === 'physical';
    const isSpecial = category === 'special';

    const playerStages = battleStore.playerStages ? { 
      atk: isPhysical ? battleStore.playerStages.atk : battleStore.playerStages.spa 
    } : null;
    const enemyStages = battleStore.enemyStages ? { 
      def: isPhysical ? battleStore.enemyStages.def : battleStore.enemyStages.spd 
    } : null;

    const { effectiveness, damageRange } = calculateMoveEffectivenessAndDamage(
      move,
      md,
      attacker as unknown as PurePokemon,
      defender as unknown as PurePokemon | null,
      weather ? { type: weather.type, turns: weather.turns } : null,
      cycle,
      basePower,
      playerStages,
      enemyStages
    );

    // Calculate actual attacker and defender stats with stages applied
    let attackerStat = null;
    if (isPhysical || isSpecial) {
      const statKey = isPhysical ? 'atk' : 'spa';
      const stage = isPhysical ? (battleStore.playerStages.atk || 0) : (battleStore.playerStages.spa || 0);
      const rawVal = attacker[statKey] || 0;
      const finalVal = defender ? getEffectiveStatPure(
        attacker as unknown as PurePokemon,
        statKey,
        { [statKey]: stage },
        weather ? { type: weather.type, turns: weather.turns } : null,
        cycle,
        isGym
      ) : rawVal;
      
      attackerStat = {
        name: isPhysical ? 'ATAQUE' : 'AT. ESP',
        base: rawVal,
        final: finalVal,
        stage,
        class: stage > 0 ? 'boosted' : (stage < 0 ? 'penalized' : '')
      };
    }

    let defenderStat = null;
    if (defender && (isPhysical || isSpecial)) {
      const statKey = isPhysical ? 'def' : 'spd';
      const stage = isPhysical ? (battleStore.enemyStages.def || 0) : (battleStore.enemyStages.spd || 0);
      const rawVal = defender[statKey] || 0;
      const finalVal = getEffectiveStatPure(
        defender as unknown as PurePokemon,
        statKey,
        { [statKey]: stage },
        weather ? { type: weather.type, turns: weather.turns } : null,
        cycle,
        isGym
      );

      defenderStat = {
        name: isPhysical ? 'DEFENSA RIVAL' : 'DEF. ESP RIVAL',
        base: rawVal,
        final: finalVal,
        stage,
        class: stage > 0 ? 'penalized' : (stage < 0 ? 'boosted' : '')
      };
    }

    return {
      isStatus,
      power: {
        ...power,
        final: isStatus ? '-' : power.final
      },
      accuracy,
      effectiveness,
      critChance,
      damageRange,
      attackerStat,
      defenderStat
    };
  });

  const parsedStatusEffect = computed(() => {
    if (!battleStore.isBattleActive) return null;

    const move = toValue(moveInput);
    const attacker = playerInfoInput ? (toValue(playerInfoInput) || battleStore.state?.player) : battleStore.state?.player;
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
    const moveId = move.id || '';
    const moveDataObj = moveId ? pokemonDataProvider.getMoveData(moveId) : null;
    return getMoveDescription(move.name, moveDataObj);
  });

  return {
    modifierInfo,
    activeDetails,
    parsedStatusEffect,
    moveDescriptionText
  };
}
