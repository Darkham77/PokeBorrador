import { computed, toValue } from 'vue';
import type { MaybeRefOrGetter } from 'vue';
import type { Move, Pokemon } from '@/types/pokemon/pokemon';
import { useBattleStore } from '@/stores/battle/battle';
import { getItemName } from '@/data/inventory/items';
import { getMechanicalWeather } from '@/logic/weather/weatherRegistry';
import { getDayCycle } from '@/logic/utils/timeUtils';
import { getMoveDescription } from '@/logic/pokemon/pokemonUtils';
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
import { calculateDamageForTooltip } from '@/logic/battle/smogonAdapter';

import {
  calculateAttackerStatDisplay,
  calculateDefenderStatDisplay,
  buildTooltipDamageRange,
  buildTooltipSpeedInfo,
  buildTooltipTacticalInfo
} from './moveTooltipCalculator.ts';

type SideConditions = Record<string, { turns: number; [key: string]: unknown }> | undefined;
type TooltipMoveData = Partial<Pick<Move, 'cat' | 'type' | 'power' | 'acc' | 'effect' | 'priority'>>;

/** Compile active field conditions for the tooltip's CONDICIONES section. */
function buildFieldConditionsList(
  playerSC: SideConditions,
  enemySC:  SideConditions,
  terrain:  string | null | undefined
): string[] {
  const list: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (playerSC?.['reflect'])     list.push('Reflect (↓ daño físico enemigo)');
  if (playerSC?.['lightscreen']) list.push('Pantalla de Luz (↓ daño esp. enemigo)');
  if (playerSC?.['auroraveil'])  list.push('Aurora Velo (↓ todo daño enemigo)');
  if (playerSC?.['tailwind'])    list.push('Viento Afín (↑ Velocidad)');
  if (enemySC?.['reflect'])      list.push('Reflect rival (↓ tu daño físico)');
  if (enemySC?.['lightscreen'])  list.push('Pantalla rival (↓ tu daño esp.)');
  if (enemySC?.['auroraveil'])   list.push('Aurora Velo rival (↓ todo tu daño)');
  if (terrain)                   list.push(`Terreno: ${terrain}`);
  return list;
}

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

    if (attacker && attacker.heldItem && (attacker.heldItem === 'choiceband' || attacker.heldItem === 'choicespecs' || attacker.heldItem === 'choicescarf')) {
      const itemKey = attacker.heldItem;
      const itemName = getItemName(itemKey);
      
      const moveIdLookup = move.id || '';
      const moveData = moveIdLookup ? pokemonDataProvider.getMoveData(moveIdLookup) : undefined;
      const md: TooltipMoveData = moveData ? {
        type: moveData.type,
        power: moveData.power,
        acc: moveData.acc,
        cat: moveData.cat,
        priority: moveData.priority,
        effect: moveData.effect
      } : {};
      const category = move.cat || md.cat || 'physical';
      const isPhysical = category === 'physical';
      const isSpecial = category === 'special';

      if (attacker.choiceMove && attacker.choiceMove !== move.id) {
        const choiceMoveName = pokemonDataProvider.getMoveData(attacker.choiceMove)?.name || attacker.choiceMove;
        info = { type: 'penalized', text: `Bloqueado por ${itemName} (Elegiste: ${choiceMoveName}).` };
      } else {
        const hasBoost = (itemKey === 'choiceband' && isPhysical) || (itemKey === 'choicespecs' && isSpecial);
        const boostText = itemKey === 'choiceband' ? '+50% Potencia Física' : itemKey === 'choicespecs' ? '+50% Potencia Especial' : '+50% Velocidad';
        
        if (hasBoost) {
          if (!info) {
            info = { type: 'boosted', text: `Objeto: ${itemName} (${boostText}, bloquea movimiento).` };
          } else {
            info = { ...info, text: `${info.text} | ${itemName} (${boostText}, bloqueo)` };
          }
        } else {
          const boostDesc = itemKey === 'choicescarf' ? ` (+50% Velocidad, bloqueo)` : ' (Bloqueo)';
          if (!info) {
            info = { type: 'boosted', text: `Objeto: ${itemName}${boostDesc}.` };
          } else {
            info = { ...info, text: `${info.text} | ${itemName}${boostDesc}` };
          }
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
    const moveData = moveIdLookup ? pokemonDataProvider.getMoveData(moveIdLookup) : undefined;
    const md: TooltipMoveData = moveData ? {
      type: moveData.type,
      power: moveData.power,
      acc: moveData.acc,
      cat: moveData.cat,
      priority: moveData.priority,
      effect: moveData.effect
    } : {};
    const basePower = move.power !== undefined ? move.power : md.power || 0;
    const isStatus = move.cat === 'status' || md.cat === 'status';
    const moveType = (move.type || md.type || 'normal').toLowerCase();

    // 1. Power details
    const power = calculateMovePower(
      move,
      attacker as PurePokemon, // domain-ok: Open dynamic text or non-domain string payload
      defender as PurePokemon | null, // domain-ok: Open dynamic text or non-domain string payload
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
      attacker as PurePokemon, // domain-ok: Open dynamic text or non-domain string payload
      defender as PurePokemon | null // domain-ok: Open dynamic text or non-domain string payload
    );

    // 4. Effectiveness (type chart) + Damage range via @smogon/calc
    const category = move.cat || md.cat || 'physical';
    const isPhysical = category === 'physical';
    const isSpecial = category === 'special';

    const playerStageFull = battleStore.playerStages ?? { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };
    const enemyStageFull  = battleStore.enemyStages  ?? { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };

    // Keep the legacy effectiveness calc (only used for type matchup display, not damage)
    const playerStagesEff = playerStageFull.atk !== undefined ? { atk: isPhysical ? playerStageFull.atk : playerStageFull.spa } : null;
    const enemyStagesEff  = enemyStageFull.def  !== undefined ? { def: isPhysical ? enemyStageFull.def  : enemyStageFull.spd  } : null;
    const { effectiveness } = calculateMoveEffectivenessAndDamage(
      move, md,
      attacker as PurePokemon, // domain-ok: Open dynamic text or non-domain string payload
      defender as PurePokemon | null, // domain-ok: Open dynamic text or non-domain string payload
      weather ? { type: weather.type, turns: weather.turns } : null,
      cycle, basePower, playerStagesEff, enemyStagesEff
    );

    // Build smogon damage result (null if status or no defender or 0-power move)
    const smogonResult = (!isStatus && defender && basePower > 0)
      ? calculateDamageForTooltip(
          attacker, defender, move,
          {
            weather: isGym ? null : battleStore.state?.weather ?? null,
            terrain: battleStore.state?.terrain,
            playerSideConditions: battleStore.state?.playerSideConditions,
            enemySideConditions:  battleStore.state?.enemySideConditions,
            isGym,
          },
          playerStageFull,
          enemyStageFull
        )
      : null;

    const damageRange = buildTooltipDamageRange(smogonResult);

    // Field conditions active in this battle (for tooltip display)
    const fieldConditions = buildFieldConditionsList(
      battleStore.state?.playerSideConditions,
      battleStore.state?.enemySideConditions,
      battleStore.state?.terrain
    );

    const weatherInfo = weather ? { type: weather.type, turns: weather.turns } : null;
    const attackerStat = calculateAttackerStatDisplay(
      attacker as PurePokemon, // domain-ok: Open dynamic text or non-domain string payload
      defender as PurePokemon | null, // domain-ok: Open dynamic text or non-domain string payload
      isPhysical,
      isSpecial,
      battleStore.playerStages,
      weatherInfo,
      cycle,
      isGym
    );

    const defenderStat = calculateDefenderStatDisplay(
      defender as PurePokemon | null, // domain-ok: Open dynamic text or non-domain string payload
      isPhysical,
      isSpecial,
      battleStore.enemyStages,
      weatherInfo,
      cycle,
      isGym
    );

    return {
      isStatus,
      power: {
        ...power,
        final: isStatus || power.base === 0 ? '-' : power.final,
        class: isStatus || power.base === 0 ? '' : power.class
      },
      accuracy,
      effectiveness,
      critChance,
      damageRange,
      attackerStat,
      defenderStat,
      recovery: smogonResult?.recovery ?? null,
      recoil:   smogonResult?.recoil   ?? null,
      fieldConditions,
      smogonDesc: smogonResult?.smogonDesc ?? '',
      speedInfo: buildTooltipSpeedInfo(smogonResult, move.priority || md.priority || 0),
      tacticalInfo: buildTooltipTacticalInfo(smogonResult),
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
      attacker as PurePokemon, // domain-ok: Open dynamic text or non-domain string payload
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

export type ActiveMoveDetails = NonNullable<ReturnType<typeof useMoveTooltip>['activeDetails']['value']>
