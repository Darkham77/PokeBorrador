
export interface MoveTooltipModifierInfo {
  power: number;
  accuracy: number;
  critChancePct: number;
  powerMultiplier: number;
  accuracyMultiplier: number;
  hasWeatherPowerBoost: boolean;
  hasWeatherPowerNerf: boolean;
  hasWeatherAccBoost: boolean;
  hasWeatherAccNerf: boolean;
  hasCyclePowerBoost: boolean;
  hasCycleAccBoost: boolean;
  hasCycleAccNerf: boolean;
  notes: string[];
}

export interface MoveTooltipDetailsInfo {
  effectiveness: { class?: string; value?: number } | number;
  effectivenessLabel: string;
  effectivenessClass: string;
  stabApplied: boolean;
  statModifiersList: string[];
  damageRange: {
    normalMin?: number;
    normalMax?: number;
    normalPctMin?: number;
    normalPctMax?: number;
    critMin?: number;
    critMax?: number;
    critPctMin?: number;
    critPctMax?: number;
    koChanceText?: string;
  } | string | null;
  minDamagePct: number;
  maxDamagePct: number;
  koText: string;
  koColorClass: string;
  fieldConditions: string[];
  tacticalNotes: string[];
  power?: { base: number; final: number | string; list: unknown[]; class: string };
  accuracy?: { base: number; final: number; list: unknown[]; class: string };
  isStatus?: boolean;
  critChance?: { value: number; class: string };
  attackerStat?: { name: string; base: number; final: number; stage: number; class: string };
  defenderStat?: { name: string; base: number; final: number; stage: number; class: string };
  speedMatchup: {
    playerSpeed: number;
    enemySpeed: number;
    playerFirst: boolean;
    tie: boolean;
    trickRoomActive: boolean;
  };
}

export interface ParsedStatusEffectInfo {
  label: string;
  chancePct?: number | null;
  targetLabel?: string;
  isGuaranteed?: boolean;
  isCondition?: boolean;
  isSelf?: boolean;
  targetName?: string;
  direction?: 'up' | 'down' | string;
  details?: string;
  statName?: string;
  stat?: string;
  currentStage?: number;
  finalStage?: number;
  initialStatVal?: number | string;
  finalStatVal?: number | string;
}
