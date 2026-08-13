// scripts/e2e/fuzzer/core/fuzzerMemoryStore.ts
import path from 'node:path';
import { fileWriterQueue } from '../../helpers/fileWriterQueue.ts';
import type { CertifiedBattleCase } from '../generators/fuzzer_team_generator.ts';

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

  public getBattleCases(): readonly CertifiedBattleCase[] {
    return this.battle;
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
    let existingDoc: { battle?: unknown[]; items?: unknown[] } = {};
    try {
      const fs = await import('node:fs');
      if (fs.existsSync(certifiedPath)) {
        existingDoc = JSON.parse(fs.readFileSync(certifiedPath, 'utf8')) as { battle?: unknown[]; items?: unknown[] };
      }
    } catch {
      // ignore
    }
    const certifiedDocument = {
      battle: this.battle.length > 0 ? this.battle : (existingDoc.battle || []),
      items: this.auxiliary.items && this.auxiliary.items.length > 0 ? this.auxiliary.items : (existingDoc.items || [])
    };
    await fileWriterQueue.safeWriteFile(certifiedPath, JSON.stringify(certifiedDocument, null, 2));
    await fileWriterQueue.safeWriteFile(auxiliaryPath, JSON.stringify(this.auxiliary, null, 2));
    console.log(`💾 [FuzzerMemoryStore] Wrote terminal certified battles to ${certifiedPath} and auxiliary artifacts to ${auxiliaryPath}.`);
  }
}

export const fuzzerMemoryStore = new FuzzerMemoryStore();
