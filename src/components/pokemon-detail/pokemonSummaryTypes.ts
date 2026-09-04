export interface SpeciesSummaryData {
  nationalId?: string; // domain-ok: Formatted national dex display string "#001"
  name: string;
  type?: string[];
  height?: number | [number, number] | null;
  weight?: number | [number, number] | null;
  description?: string;
}
