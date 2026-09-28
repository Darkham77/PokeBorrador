import { BaseMapEnvironment, type MapEnvironmentBoundaries } from './baseMapEnvironment.ts';

/**
 * Outdoor route or open city environment.
 * Boundaries (weather, lighting cycles) are governed 100% by the map definition.
 */
export class OutdoorEnvironment extends BaseMapEnvironment {
  readonly environmentKind = 'outdoor' as const;

  constructor(boundaries: MapEnvironmentBoundaries) {
    super(boundaries);
    Object.freeze(this);
  }
}

/**
 * Cave and subterranean cavern environment.
 * Boundaries (weather, lighting cycles) are governed 100% by the map definition.
 */
export class SubterraneanCaveEnvironment extends BaseMapEnvironment {
  readonly environmentKind = 'cave' as const;

  constructor(boundaries: MapEnvironmentBoundaries) {
    super(boundaries);
    Object.freeze(this);
  }
}

/**
 * Interior facility or building environment.
 * Boundaries (weather, lighting cycles) are governed 100% by the map definition.
 */
export class InteriorFacilityEnvironment extends BaseMapEnvironment {
  readonly environmentKind = 'indoor' as const;

  constructor(boundaries: MapEnvironmentBoundaries) {
    super(boundaries);
    Object.freeze(this);
  }
}

/**
 * Stadium and official combat arena environment (e.g. universal generic stadium).
 * Boundaries (weather, lighting cycles) are governed 100% by the map definition.
 */
export class StadiumEnvironment extends BaseMapEnvironment {
  readonly environmentKind = 'stadium' as const;

  constructor(boundaries: MapEnvironmentBoundaries) {
    super(boundaries);
    Object.freeze(this);
  }
}
