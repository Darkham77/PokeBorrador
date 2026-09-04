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

export interface ParsedStatusEffectInfo {
  label: string; // domain-ok: Open dynamic text or non-domain string payload
  chancePct?: number | null;
  targetLabel?: string; // domain-ok: Open dynamic text or non-domain string payload
  isGuaranteed?: boolean;
  isCondition?: boolean;
  isSelf?: boolean;
  targetName?: string; // domain-ok: Open dynamic text or non-domain string payload
  direction?: 'up' | 'down';
  details?: string; // domain-ok: Open dynamic text or non-domain string payload
  effect?: string; // domain-ok: localized display text
  statName?: TooltipStageStatName;
  stat?: TooltipStageStatId;
  amount?: number;
  currentStage?: number;
  finalStage?: number;
  initialStatVal?: string | number; // domain-ok: formatted display value
  finalStatVal?: string | number; // domain-ok: formatted display value
}
