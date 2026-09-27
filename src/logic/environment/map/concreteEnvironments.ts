import { BaseMapEnvironment } from './baseMapEnvironment.ts';
import { requireWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry.ts';
import { mapVisualToOfficialWeather } from '@/logic/weather/weatherGenerationProvider.ts';
import { ACTIVE_GENERATION } from '@/data/system/constants.ts';
import { getAvailableCyclesForMap, isMapRouteId } from '@/data/world/map-assets.ts';
import type { BattleWeather } from '@/types/battle/battle.ts';
import { DAY_PHASES, type DayPhase } from '@/types/system/time.ts';
import type { GymId } from '@/data/world/gyms.ts';
import type { PokemonType } from '@/data/battle/types.ts';

const INDOOR_SUPPORTED_CYCLES: readonly DayPhase[] = ['day'] as const;
const CAVE_SUPPORTED_CYCLES: readonly DayPhase[] = ['night'] as const;

export interface OutdoorEnvironmentOptions {
  readonly id: string;
  readonly name: string;
  readonly supportedCycles?: readonly DayPhase[];
}

/**
 * Outdoor route or open city environment.
 * Weather is permitted and dynamic lighting follows the world clock or available assets.
 */
export class OutdoorRouteEnvironment extends BaseMapEnvironment {
  readonly id: string;
  readonly name: string;
  private readonly supportedCycles: readonly DayPhase[];

  constructor(options: OutdoorEnvironmentOptions) {
    super();
    this.id = options.id;
    this.name = options.name;
    const available = isMapRouteId(options.id) ? getAvailableCyclesForMap(options.id) : [];
    this.supportedCycles = options.supportedCycles && options.supportedCycles.length > 0
      ? options.supportedCycles
      : (available.length > 0 ? available : DAY_PHASES);
    Object.freeze(this);
  }

  isWeatherAllowed(): boolean {
    return true;
  }

  resolveCombatWeather(incomingWeather?: WeatherId | null): BattleWeather {
    if (!incomingWeather || incomingWeather === 'none' || incomingWeather === 'clear' || incomingWeather === 'null') {
      return { type: 'none', visual: 'clear', turns: -1 };
    }
    const cleanWeather = requireWeatherId(incomingWeather);
    const official = mapVisualToOfficialWeather(cleanWeather, ACTIVE_GENERATION);
    return {
      type: requireWeatherId(official),
      visual: cleanWeather,
      turns: -1
    };
  }

  resolveEffectiveLighting(worldCycle: DayPhase): DayPhase {
    return this.supportedCycles.includes(worldCycle) ? worldCycle : (this.supportedCycles[0] || 'day');
  }

  getSupportedCycles(): readonly DayPhase[] {
    return this.supportedCycles;
  }

  isCave(): boolean {
    return false;
  }
}

export interface CaveEnvironmentOptions {
  readonly id: string;
  readonly name: string;
}

/**
 * Cave and subterranean cavern environment.
 * Natural ambient weather is strictly forbidden. Lighting is fixed to darkness ('night').
 */
export class CaveEnvironment extends BaseMapEnvironment {
  readonly id: string;
  readonly name: string;
  private readonly supportedCycles: readonly DayPhase[];

  constructor(options: CaveEnvironmentOptions) {
    super();
    this.id = options.id;
    this.name = options.name;
    const available = isMapRouteId(options.id) ? getAvailableCyclesForMap(options.id) : [];
    this.supportedCycles = available.length > 1 ? available : CAVE_SUPPORTED_CYCLES;
    Object.freeze(this);
  }

  isWeatherAllowed(): boolean {
    return false;
  }

  resolveCombatWeather(): BattleWeather {
    return { type: 'none', visual: 'clear', turns: -1 };
  }

  resolveEffectiveLighting(worldCycle: DayPhase): DayPhase {
    if (this.supportedCycles.length > 1) {
      return this.supportedCycles.includes(worldCycle) ? worldCycle : (this.supportedCycles[0] || 'night');
    }
    return 'night';
  }

  getSupportedCycles(): readonly DayPhase[] {
    return this.supportedCycles;
  }

  isCave(): boolean {
    return true;
  }
}

export interface IndoorEnvironmentOptions {
  readonly id: string;
  readonly name: string;
  readonly supportedCycles?: readonly DayPhase[];
}

/**
 * Indoor building, tower, or enclosed facility environment.
 * Natural weather is strictly forbidden. Lighting follows available indoor assets or daytime ('day').
 */
export class IndoorEnvironment extends BaseMapEnvironment {
  readonly id: string;
  readonly name: string;
  private readonly supportedCycles: readonly DayPhase[];

  constructor(options: IndoorEnvironmentOptions) {
    super();
    this.id = options.id;
    this.name = options.name;
    const available = isMapRouteId(options.id) ? getAvailableCyclesForMap(options.id) : [];
    this.supportedCycles = options.supportedCycles && options.supportedCycles.length > 0
      ? options.supportedCycles
      : (available.length > 0 ? available : INDOOR_SUPPORTED_CYCLES);
    Object.freeze(this);
  }

  isWeatherAllowed(): boolean {
    return false;
  }

  resolveCombatWeather(): BattleWeather {
    return { type: 'none', visual: 'clear', turns: -1 };
  }

  resolveEffectiveLighting(worldCycle: DayPhase): DayPhase {
    return this.supportedCycles.includes(worldCycle) ? worldCycle : (this.supportedCycles[0] || 'day');
  }

  getSupportedCycles(): readonly DayPhase[] {
    return this.supportedCycles;
  }

  isCave(): boolean {
    return false;
  }
}

export interface GymEnvironmentOptions {
  readonly id: string;
  readonly name: string;
  readonly gymId?: GymId;
  readonly leaderName?: string;
  readonly gymType?: PokemonType;
  readonly fixedCycle?: DayPhase;
  readonly fixedWeather?: WeatherId;
  readonly weatherEnabled?: boolean;
  readonly isIndoors?: boolean;
  readonly supportedCycles?: readonly DayPhase[];
}

/**
 * Official Gym Arena and Stadium environment.
 * Configuration is 100% data-driven: can support closed stadiums (default),
 * open-air arenas, or custom elemental gym environments with fixed weather.
 */
export class GymEnvironment extends BaseMapEnvironment {
  readonly id: string;
  readonly name: string;
  readonly gymId?: GymId;
  readonly leaderName?: string;
  readonly gymType?: PokemonType;
  readonly fixedCycle?: DayPhase;
  readonly fixedWeather?: WeatherId;
  private readonly weatherEnabled: boolean;
  private readonly supportedCycles: readonly DayPhase[];

  constructor(options: GymEnvironmentOptions) {
    super();
    this.id = options.id;
    this.name = options.name;
    this.gymId = options.gymId;
    this.leaderName = options.leaderName;
    this.gymType = options.gymType;
    this.fixedCycle = options.fixedCycle;
    this.fixedWeather = options.fixedWeather;
    this.weatherEnabled = options.weatherEnabled ?? false;
    this.supportedCycles = options.supportedCycles && options.supportedCycles.length > 0
      ? options.supportedCycles
      : (this.fixedCycle ? [this.fixedCycle] : INDOOR_SUPPORTED_CYCLES);
    Object.freeze(this);
  }

  isWeatherAllowed(): boolean {
    return this.weatherEnabled;
  }

  resolveCombatWeather(incomingWeather?: WeatherId | null): BattleWeather {
    if (this.fixedWeather) {
      const cleanWeather = requireWeatherId(this.fixedWeather);
      const official = mapVisualToOfficialWeather(cleanWeather, ACTIVE_GENERATION);
      return {
        type: requireWeatherId(official),
        visual: cleanWeather,
        turns: -1
      };
    }
    if (this.weatherEnabled && incomingWeather && incomingWeather !== 'none' && incomingWeather !== 'clear' && incomingWeather !== 'null') {
      const cleanWeather = requireWeatherId(incomingWeather);
      const official = mapVisualToOfficialWeather(cleanWeather, ACTIVE_GENERATION);
      return {
        type: requireWeatherId(official),
        visual: cleanWeather,
        turns: -1
      };
    }
    return { type: 'none', visual: 'clear', turns: -1 };
  }

  resolveEffectiveLighting(worldCycle: DayPhase): DayPhase {
    if (this.fixedCycle) return this.fixedCycle;
    if (this.supportedCycles.length > 1) {
      return this.supportedCycles.includes(worldCycle) ? worldCycle : (this.supportedCycles[0] || 'day');
    }
    return 'day';
  }

  getSupportedCycles(): readonly DayPhase[] {
    return this.supportedCycles;
  }

  isCave(): boolean {
    return false;
  }
}

