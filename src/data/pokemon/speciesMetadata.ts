import type { SpeciesMetadata } from '@/types/system/database';
import metadataJson from './speciesMetadata.json' with { type: 'json' };

export const SPECIES_METADATA = metadataJson satisfies Record<keyof typeof metadataJson, SpeciesMetadata>;
export type PokemonSpeciesId = keyof typeof SPECIES_METADATA;
