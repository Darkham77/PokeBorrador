// scripts/e2e/fuzzer/core/fuzzerMemoryStore.ts
import path from 'node:path';
import { fileWriterQueue } from '../../helpers/fileWriterQueue.ts';

export interface CertifiedCaseStore {
  battle?: unknown[];
  abilities?: unknown[];
  items?: unknown[];
  scenarios?: unknown[];
  breeding?: unknown[];
  missions?: unknown[];
  gyms?: unknown[];
  gts?: unknown[];
  ai?: unknown[];
}

class FuzzerMemoryStore {
  private data: CertifiedCaseStore = {};

  public setSection(section: keyof CertifiedCaseStore, cases: unknown[]): void {
    this.data[section] = cases;
  }

  public getSection(section: keyof CertifiedCaseStore): unknown[] | undefined {
    return this.data[section];
  }

  public getAll(): CertifiedCaseStore {
    return this.data;
  }

  public clear(): void {
    this.data = {};
  }

  public async flushToDisk(): Promise<void> {
    const consolidatorPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
    await fileWriterQueue.safeWriteFile(consolidatorPath, JSON.stringify(this.data, null, 2));
    console.log(`💾 [FuzzerMemoryStore] Almacén de memoria consolidado en disco de forma atómica: ${consolidatorPath}`);
  }
}

export const fuzzerMemoryStore = new FuzzerMemoryStore();
