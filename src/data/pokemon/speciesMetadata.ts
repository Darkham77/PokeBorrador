/**
 * src/data/pokemon/speciesMetadata.ts
 *
 * Wrapper to export SPECIES_METADATA loaded from JSON.
 */
import metadataJson from './speciesMetadata.json' with { type: 'json' };

export interface SpeciesMetadata {
  readonly category: string;
  readonly description: string;
  readonly catchRate: number;
}

export const SPECIES_METADATA = metadataJson as Record<string, SpeciesMetadata>;
