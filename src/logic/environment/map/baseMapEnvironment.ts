import type { WeatherId } from '@/logic/weather/weatherRegistry';
import type { BattleWeather } from '@/types/battle/battle';
import type { DayPhase } from '@/types/system/time';

export const MAP_ENVIRONMENT_TYPES = ['outdoor', 'cave', 'indoor', 'gym'] as const;
export type MapEnvironmentType = (typeof MAP_ENVIRONMENT_TYPES)[number];

/**
 * Base abstract class encapsulating all immutable environmental, climate,
 * and lighting rules for a map location in Poké Vicio.
 */
export abstract class BaseMapEnvironment {
  abstract readonly id: string;
  abstract readonly name: string;

  /**
   * Governs whether natural map weather can exist in this environment.
   * If false, ambient weather is strictly forbidden and suppressed.
   */
  abstract isWeatherAllowed(): boolean;

  /**
   * Resolves the initial combat weather for battle initialization.
   * Closed environments (gyms, pvp, caves, indoors) MUST return { type: 'none', visual: 'clear', turns: -1 }.
   */
  abstract resolveCombatWeather(incomingWeather?: WeatherId | null): BattleWeather;

  /**
   * Resolves the effective day/night cycle for this environment.
   */
  abstract resolveEffectiveLighting(worldCycle: DayPhase): DayPhase;

  /**
   * Returns the supported lighting cycles for this environment.
   */
  abstract getSupportedCycles(): readonly DayPhase[];

  /**
   * Helper indicating if the environment is a subterranean cave.
   */
  abstract isCave(): boolean;
}
