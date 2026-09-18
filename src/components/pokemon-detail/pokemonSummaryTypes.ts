import type { PokemonType } from '@/data/battle/types'

export interface SpeciesSummaryData {
  nationalId?: string; // domain-ok: Formatted national dex display string "#001"
  name: string;
  type?: string[];
  height?: number | [number, number] | null;
  weight?: number | [number, number] | null;
  description?: string;
}

export interface DetailSpeciesHeaderData {
  nationalId: string;
  name: string;
  type: PokemonType[];
}

