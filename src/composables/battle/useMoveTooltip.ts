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
import { calculateDamageForTooltip } from '@/logic/battle/smogonAdapter';

/** Format @smogon/calc KO chance as Spanish text for the tooltip badge. */
function buildKoText(ko: { chance: number | undefined; n: number }): string {
  if (!ko.n) return '';
  const { chance, n } = ko;
  const koLabel = n === 1 ? 'OHKO' : n <= 4 ? `${n}HKO` : `KO en ${n} turnos`;
  if (chance === 1)            return `${koLabel} garantizado`;
  if (chance === undefined || chance > 0) {
    const pct = chance !== undefined ? ` (${Math.round(chance * 100)}%)` : '';
    return `${koLabel} posible${pct}`;
  }
  return '';
}

type SideConditions = Record<string, { turns: number; [key: string]: unknown }> | undefined;

/** Compile active field conditions for the tooltip's CONDICIONES section. */
function buildFieldConditionsList(
  playerSC: SideConditions,
  enemySC:  SideConditions,
  terrain:  string | null | undefined
): string[] {
  const list: string[] = [];
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
      const itemName = itemKey === 'choiceband' ? 'Cinta Elegida' : itemKey === 'choicespecs' ? 'Gafas Elegidas' : 'Pañuelo Elegido';
      
      const moveIdLookup = move.id || '';
      const md = (moveIdLookup ? pokemonDataProvider.getMoveData(moveIdLookup) || {} : {}) as { cat?: 'physical' | 'special' | 'status'; type?: string; power?: number; acc?: number };
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
    const md = (moveIdLookup ? pokemonDataProvider.getMoveData(moveIdLookup) || {} : {}) as { cat?: 'physical' | 'special' | 'status'; type?: string; power?: number; acc?: number; effect?: string; priority?: number };
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

    // 4. Effectiveness (type chart) + Damage range via @smogon/calc
    const category = move.cat || md.cat || 'physical';
    const isPhysical = category === 'physical';
    const isSpecial = category === 'special';

    const playerStageFull = battleStore.playerStages ?? { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };
    const enemyStageFull  = battleStore.enemyStages  ?? { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };

    // Keep the legacy effectiveness calc (only used for type matchup display, not damage)
    const playerStagesEff = playerStageFull.atk !== undefined ? { atk: isPhysical ? playerStageFull.atk : playerStageFull.spa } : null;
    const enemyStagesEff  = enemyStageFull.def  !== undefined ? { def: isPhysical ? enemyStageFull.def  : enemyStageFull.spd  } : null;
    const { effectiveness } = calculateMoveEffectivenessAndDamage(
      move, md,
      attacker as unknown as PurePokemon,
      defender as unknown as PurePokemon | null,
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

    const damageRange = smogonResult ? {
      normalMin:    smogonResult.minDmg,
      normalMax:    smogonResult.maxDmg,
      normalPctMin: Math.round(smogonResult.minPercent),
      normalPctMax: Math.round(smogonResult.maxPercent),
      critMin:      smogonResult.critMinDmg,
      critMax:      smogonResult.critMaxDmg,
      critPctMin:   Math.round(smogonResult.critMinPercent),
      critPctMax:   Math.round(smogonResult.critMaxPercent),
      koChanceText: buildKoText(smogonResult.koChance),
    } : null;

    // Field conditions active in this battle (for tooltip display)
    const fieldConditions = buildFieldConditionsList(
      battleStore.state?.playerSideConditions,
      battleStore.state?.enemySideConditions,
      battleStore.state?.terrain
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
      defenderStat,
      recovery: smogonResult?.recovery ?? null,
      recoil:   smogonResult?.recoil   ?? null,
      fieldConditions,
      smogonDesc: smogonResult?.smogonDesc ?? '',
      speedInfo: smogonResult ? {
        attackerSpeed: smogonResult.attackerSpeed,
        defenderSpeed: smogonResult.defenderSpeed,
        outspeeds: smogonResult.outspeeds,
        priority: move.priority || md.priority || 0,
      } : null,
      tacticalInfo: smogonResult ? {
        hasAssaultVest: smogonResult.hasAssaultVest,
        hasEviolite: smogonResult.hasEviolite,
        attackerWeight: smogonResult.attackerWeight,
        defenderWeight: smogonResult.defenderWeight,
        overrideOffensiveStat: smogonResult.overrideOffensiveStat,
        overrideDefensiveStat: smogonResult.overrideDefensiveStat,
        ignoreDefensive: smogonResult.ignoreDefensive,
        breaksProtect: smogonResult.breaksProtect,
        hasCrashDamage: smogonResult.hasCrashDamage,
        terrainReductions: smogonResult.terrainReductions,
        isLeechSeedActive: smogonResult.isLeechSeedActive,
        isForesightActive: smogonResult.isForesightActive,
        attackerTera: smogonResult.attackerTera,
        defenderTera: smogonResult.defenderTera,
      } : null,
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
    return getMoveDescription(moveId || move.name, moveDataObj);
  });

  return {
    modifierInfo,
    activeDetails,
    parsedStatusEffect,
    moveDescriptionText
  };
}
