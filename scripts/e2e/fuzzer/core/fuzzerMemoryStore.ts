// scripts/e2e/fuzzer/core/fuzzerMemoryStore.ts
import path from 'node:path';
import { fileWriterQueue } from '../../helpers/fileWriterQueue.ts';
import type { CertifiedBattleCase, CertifiedBattleCaseDocument } from '../generators/fuzzer_team_generator.ts';

export interface FuzzerAuxiliaryCaseStore {
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
  private battle: CertifiedBattleCase[] = [];
  private auxiliary: FuzzerAuxiliaryCaseStore = {};

  public appendBattleCases(cases: CertifiedBattleCase[]): void {
    this.battle.push(...cases);
  }

  public setAuxiliarySection(section: keyof FuzzerAuxiliaryCaseStore, cases: unknown[]): void {
    this.auxiliary[section] = cases;
  }

  public getAuxiliarySection(section: keyof FuzzerAuxiliaryCaseStore): unknown[] | undefined {
    return this.auxiliary[section];
  }

  public clear(): void {
    this.battle = [];
    this.auxiliary = {};
  }

  public async flushToDisk(): Promise<void> {
    const certifiedPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_certified_cases.json');
    const auxiliaryPath = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_auxiliary_cases.json');
    const certifiedDocument: CertifiedBattleCaseDocument = { battle: this.battle };
    await fileWriterQueue.safeWriteFile(certifiedPath, JSON.stringify(certifiedDocument, null, 2));
    await fileWriterQueue.safeWriteFile(auxiliaryPath, JSON.stringify(this.auxiliary, null, 2));
    console.log(`💾 [FuzzerMemoryStore] Wrote terminal certified battles to ${certifiedPath} and auxiliary artifacts to ${auxiliaryPath}.`);
  }
}

export const fuzzerMemoryStore = new FuzzerMemoryStore();
