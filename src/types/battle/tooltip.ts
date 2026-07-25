
export interface ParsedStatusEffectInfo {
  label: string;
  chancePct?: number | null;
  targetLabel?: string;
  isGuaranteed?: boolean;
  isCondition?: boolean;
  isSelf?: boolean;
  targetName?: string;
  direction?: 'up' | 'down';
  details?: string;
  statName?: string;
  stat?: string;
  currentStage?: number;
  finalStage?: number;
  initialStatVal?: number | string;
  finalStatVal?: number | string;
}
