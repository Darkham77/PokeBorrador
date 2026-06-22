import type { SpeciesMetadata } from '@/types/system/database';
import metadataJson from './speciesMetadata.json' with { type: 'json' };

export const SPECIES_METADATA = metadataJson as Record<string, SpeciesMetadata>;
