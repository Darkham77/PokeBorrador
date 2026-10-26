import type { DisplayText } from '@francogp/auditor';

const _TOOLTIP_STAGE_STAT_IDS = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva', 'all'] as const;
export type TooltipStageStatId = (typeof _TOOLTIP_STAGE_STAT_IDS)[number];
export type TooltipStageStatName =
  | 'Ataque'
  | 'Defensa'
  | 'At. Especial'
  | 'Def. Especial'
  | 'Velocidad'
  | 'Precisión'
  | 'Evasión'
  | 'Todos los Stats';

export const STAT_MODIFIER_DIRECTIONS = ['up', 'down'] as const;
export type StatModifierDirection = (typeof STAT_MODIFIER_DIRECTIONS)[number];

export const STAT_MODIFIER_STATUS_CLASSES = ['boosted', 'penalized'] as const;
export type StatModifierStatusClass = (typeof STAT_MODIFIER_STATUS_CLASSES)[number];

export interface ParsedStatusEffectInfo {
  label: DisplayText;
  chancePct?: number | null;
  targetLabel?: DisplayText;
  isGuaranteed?: boolean;
  isCondition?: boolean;
  isSelf?: boolean;
  targetName?: DisplayText;
  direction?: StatModifierDirection;
  details?: DisplayText;
  effect?: DisplayText;
  statName?: TooltipStageStatName;
  stat?: TooltipStageStatId;
  amount?: number;
  currentStage?: number;
  finalStage?: number;
  initialStatVal?: DisplayText | number;
  finalStatVal?: DisplayText | number;
}
