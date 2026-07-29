export const TOOLTIP_STAGE_STAT_IDS = ['atk', 'def', 'spa', 'spd', 'spe', 'acc', 'eva', 'all'] as const;
export type TooltipStageStatId = (typeof TOOLTIP_STAGE_STAT_IDS)[number];
export type TooltipStageStatName =
  | 'Ataque'
  | 'Defensa'
  | 'At. Especial'
  | 'Def. Especial'
  | 'Velocidad'
  | 'Precisión'
  | 'Evasión'
  | 'Todos los Stats';

export interface ParsedStatusEffectInfo {
  label: string; // domain-ok
  chancePct?: number | null;
  targetLabel?: string; // domain-ok
  isGuaranteed?: boolean;
  isCondition?: boolean;
  isSelf?: boolean;
  targetName?: string; // domain-ok
  direction?: 'up' | 'down';
  details?: string; // domain-ok
  effect?: string; // domain-ok: localized display text
  statName?: TooltipStageStatName;
  stat?: TooltipStageStatId;
  amount?: number;
  currentStage?: number;
  finalStage?: number;
  initialStatVal?: string | number; // domain-ok: formatted display value
  finalStatVal?: string | number; // domain-ok: formatted display value
}
