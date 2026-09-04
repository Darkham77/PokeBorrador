import type { PurePokemon } from '@/logic/battle/battleMath';
import { SHOWDOWN_BOOST_STAT_KEYS } from '@/types/pokemon/pokemon';
import type { Move, MoveEffectBoosts, ShowdownBoostStatKey, ShowdownSecondaryEffect } from '@/types/pokemon/pokemon';
import type { ParsedStatusEffectInfo, TooltipStageStatId, TooltipStageStatName } from '@/types/battle/tooltip';
import { DEFAULT_ACCURACY_BASE_STAT } from '@/logic/constants/gameplay';

const STAGE_MATH_BASE_ACCURACY = 3;
const STAGE_MATH_BASE_REGULAR = 2;

const TOOLTIP_STAGE_STAT_NAMES = {
  atk: 'Ataque',
  def: 'Defensa',
  spa: 'At. Especial',
  spd: 'Def. Especial',
  spe: 'Velocidad',
  acc: 'Precisión',
  eva: 'Evasión',
  all: 'Todos los Stats',
} as const satisfies Record<TooltipStageStatId, TooltipStageStatName>;

const TOOLTIP_CONDITION_DETAILS = { // no-magic: Explicit mathematical constant or threshold value
  psn: {
    label: 'Envenenamiento',
    effect: 'Estado Alterado (PSN)',
    details: 'El objetivo pierde 1/8 (12.5%) de sus PS máximos al final de cada turno.',
    isSelf: false,
  },
  tox: {
    label: 'Envenenamiento Grave',
    effect: 'Estado Alterado (TÓXICO)',
    details: 'El objetivo pierde PS progresivamente: empieza en 1/16 y aumenta en 1/16 cada turno consecutivo.',
    isSelf: false,
  },
  brn: {
    label: 'Quemadura',
    effect: 'Estado Alterado (BRN)',
    details: 'El objetivo pierde 1/8 (12.5%) de sus PS máximos al final de cada turno. Además, reduce a la mitad (x0.5) su Ataque Físico.',
    isSelf: false,
  },
  par: {
    label: 'Parálisis',
    effect: 'Estado Alterado (PAR)',
    details: 'Reduce la Velocidad del objetivo al 50% (x0.5) y otorga un 25% de probabilidad de no atacar en cada turno.',
    isSelf: false,
  },
  slp: {
    label: 'Sueño',
    effect: 'Estado Alterado (SLP)',
    details: 'El objetivo se duerme durante 1 a 3 turnos, impidiéndole atacar por completo.',
    isSelf: false,
  },
  frz: {
    label: 'Congelación',
    effect: 'Estado Alterado (FRZ)',
    details: 'El objetivo queda congelado e incapaz de moverse. Cada turno tiene un 20% de probabilidad de descongelarse.',
    isSelf: false,
  },
  confusion: {
    label: 'Confusión', // spanish-ok: UI Spanish text localization label
    effect: 'Estado Volátil',
    details: 'El objetivo se confunde durante 1 a 4 turnos. En cada turno, puede golpearse a sí mismo.',
    isSelf: false,
  },
  leechseed: {
    label: 'Semilla Drenadora',
    effect: 'Efecto de Campo Volátil',
    details: 'Al final de cada turno, el objetivo pierde 1/8 de sus PS máximos y se los transfiere al usuario.',
    isSelf: false,
  },
} as const;

type TooltipConditionKey = keyof typeof TOOLTIP_CONDITION_DETAILS;

function isTooltipConditionKey(value: string): value is TooltipConditionKey {
  return value in TOOLTIP_CONDITION_DETAILS;
}

function toTooltipStageStatId(stat: ShowdownBoostStatKey): TooltipStageStatId {
  if (stat === 'accuracy') return 'acc';
  if (stat === 'evasion') return 'eva';
  if (stat === 'atk' || stat === 'def' || stat === 'spa' || stat === 'spd' || stat === 'spe') return stat;
  throw new Error(`[moveTooltipMath] Unsupported boost stat for tooltip: ${stat}`);
}

function getPokemonStageBaseStat(pokemon: PurePokemon, stat: TooltipStageStatId): number {
  if (stat === 'acc' || stat === 'eva' || stat === 'all') return DEFAULT_ACCURACY_BASE_STAT;
  return pokemon[stat] || DEFAULT_ACCURACY_BASE_STAT;
}

function getStageMultiplier(stat: TooltipStageStatId, stage: number): number {
  if (stat === 'acc' || stat === 'eva') {
    if (stage >= 0) return (STAGE_MATH_BASE_ACCURACY + stage) / STAGE_MATH_BASE_ACCURACY;
    return STAGE_MATH_BASE_ACCURACY / (STAGE_MATH_BASE_ACCURACY - stage);
  }
  if (stage >= 0) return (STAGE_MATH_BASE_REGULAR + stage) / STAGE_MATH_BASE_REGULAR;
  return STAGE_MATH_BASE_REGULAR / (STAGE_MATH_BASE_REGULAR - stage);
}

function firstBoostEntry(effect: { boosts?: MoveEffectBoosts } | undefined): readonly [ShowdownBoostStatKey, number] | null {
  if (!effect?.boosts) return null;
  for (const stat of SHOWDOWN_BOOST_STAT_KEYS) {
    const stages = effect.boosts[stat];
    if (stages !== undefined && stages !== 0) return [stat, stages] as const;
  }
  return null;
}

function firstShowdownSecondary(move: Move): ShowdownSecondaryEffect | undefined {
  if (move.secondary) return move.secondary;
  return move.secondaries?.[0];
}

function buildConditionInfo(conditionKey: TooltipConditionKey, isSelfOverride?: boolean): ParsedStatusEffectInfo {
  const condition = TOOLTIP_CONDITION_DETAILS[conditionKey];
  const isSelf = isSelfOverride ?? condition.isSelf;
  return {
    isCondition: true,
    isSelf,
    direction: isSelf ? 'up' : 'down',
    targetName: isSelf ? 'Usuario (Tú)' : 'Rival',
    label: condition.label,
    effect: condition.effect,
    details: condition.details,
  };
}

function buildBoostInfo(
  rawStat: ShowdownBoostStatKey,
  stages: number,
  isSelf: boolean,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  playerStages: Partial<Record<TooltipStageStatId, number>> | null | undefined,
  enemyStages: Partial<Record<TooltipStageStatId, number>> | null | undefined
): ParsedStatusEffectInfo | null {
  const stat = toTooltipStageStatId(rawStat);
  const targetPokemon = isSelf ? attacker : defender;
  if (!targetPokemon) return null;

  const isUp = stages > 0;
  const amount = Math.abs(stages);
  const targetStages = isSelf ? playerStages : enemyStages;
  const currentStage = targetStages?.[stat] ?? 0;
  const finalStage = Math.max(-6, Math.min(6, currentStage + stages));
  const baseStatVal = getPokemonStageBaseStat(targetPokemon, stat);
  const suffix = stat === 'acc' || stat === 'eva' ? '%' : '';
  const initialStatVal = `${Math.round(baseStatVal * getStageMultiplier(stat, currentStage))}${suffix}`;
  const finalStatVal = `${Math.round(baseStatVal * getStageMultiplier(stat, finalStage))}${suffix}`;
  const statName = TOOLTIP_STAGE_STAT_NAMES[stat];

  return {
    isCondition: false,
    isSelf,
    direction: isUp ? 'up' : 'down',
    stat,
    statName,
    amount,
    targetName: isSelf ? 'Usuario (Tú)' : 'Rival',
    currentStage,
    finalStage,
    initialStatVal,
    finalStatVal,
    label: `${isUp ? 'Aumenta' : 'Reduce'} ${statName} en ${amount} ${amount === 1 ? 'nivel' : 'niveles'}`,
  };
}

export function parseStatusEffectInfo(
  move: Move,
  attacker: PurePokemon,
  defender: PurePokemon | null,
  playerStages: Partial<Record<TooltipStageStatId, number>> | null | undefined,
  enemyStages: Partial<Record<TooltipStageStatId, number>> | null | undefined
): ParsedStatusEffectInfo | null {
  const directBoost = firstBoostEntry(move);
  if (directBoost) {
    const [stat, stages] = directBoost;
    return buildBoostInfo(stat, stages, false, attacker, defender, playerStages, enemyStages);
  }

  const selfBoost = firstBoostEntry(move.self);
  if (selfBoost) {
    const [stat, stages] = selfBoost;
    return buildBoostInfo(stat, stages, true, attacker, defender, playerStages, enemyStages);
  }

  const secondary = firstShowdownSecondary(move);
  const secondaryBoost = firstBoostEntry(secondary);
  if (secondaryBoost) {
    const [stat, stages] = secondaryBoost;
    return buildBoostInfo(stat, stages, secondary?.self !== undefined, attacker, defender, playerStages, enemyStages);
  }

  const statusKey = move.status || secondary?.status;
  if (statusKey) {
    return buildConditionInfo(statusKey);
  }

  const volatileKey = move.volatileStatus || secondary?.volatileStatus;
  if (volatileKey && isTooltipConditionKey(volatileKey)) {
    return buildConditionInfo(volatileKey);
  }

  return null;
}
