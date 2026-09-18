import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';

import { BundleBudgetAuditor } from '../../../scripts/auditors/architecture/validate_bundle_budget.ts';
import { CombatInvariantsAuditor } from '../../../scripts/auditors/fsm/validate_combat_invariants.ts';
import { auditComponentStyles } from '../../../scripts/auditors/architecture/validate_component_styles.ts';
import { DeadCssAuditor } from '../../../scripts/auditors/architecture/validate_dead_css.ts';
import { SavePersistenceParityAuditor } from '../../../scripts/auditors/persistence/validate_save_persistence_parity.ts';
import { SchemaParityAuditor } from '../../../scripts/auditors/persistence/validate_schema_parity.ts';
import { ShowdownParityAuditor, CANONICAL_SHOWDOWN_PROTOCOL_TOKENS } from '../../../scripts/auditors/fsm/validate_showdown_parity.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, filePath: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(filePath, code);

describe('Auditors Conformance Domain Suite', () => {
  describe('Validate Asset Usage Auditor Test', () => {
    const auditorPath = path.resolve(process.cwd(), 'scripts/auditors/assets/validate_asset_usage.ts');
    const doxPath = path.resolve(process.cwd(), 'scripts/auditors/assets/AGENTS.md');

    it('exists and is registered in scripts/auditors/assets/AGENTS.md', () => {
      expect(fs.existsSync(auditorPath)).toBe(true);
      const doxContent = fs.readFileSync(doxPath, 'utf-8');
      expect(doxContent).toContain('validate_asset_usage.ts');
    });

    it('is discoverable by auditScanner under assets family', async () => {
      const { discoverAuditors } = await import('../../../scripts/maintenance/auditScanner');
      const tasks = await discoverAuditors({ family: 'assets' });
      const taskIds = tasks.map(t => t.id);
      expect(taskIds).toContain('validate_asset_usage');
    });
  });

  describe('BundleBudgetAuditor', () => {
    it('instantiates with correct metadata', () => {
      const auditor = new BundleBudgetAuditor();
      expect(auditor.id).toBe('validate_bundle_budget');
      expect(auditor.family).toBe('architecture');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('runs audit against project without crashing and produces valid findings or metrics', async () => {
      const auditor = new BundleBudgetAuditor();
      await auditor.runAudit();
      expect(auditor.getFilesScanned()).toBeGreaterThan(0);
      const errorCount = auditor.getCountsByRule().get('bundle-runtime-leak') ?? 0;
      expect(errorCount).toBe(0);
    });
  });

  describe('CombatInvariantsAuditor', () => {
    it('instantiates with correct metadata', () => {
      const auditor = new CombatInvariantsAuditor();
      expect(auditor.id).toBe('validate_combat_invariants');
      expect(auditor.family).toBe('fsm');
    });

    it('detects status = null assignments', () => {
      const auditor = new CombatInvariantsAuditor();
      const badCode = `
        function cureStatus(pokemon: any) {
          pokemon.status = null;
        }
      `;

      scan(auditor, 'src/logic/battle/statusManager.ts', badCode);
      expect(auditor.getCountsByRule().get('showdown-healthy-status-null-prohibition')!).toBeGreaterThan(0);
    });

    it('allows status = "" assignments', () => {
      const auditor = new CombatInvariantsAuditor();
      const goodCode = `
        function cureStatus(pokemon: any) {
          pokemon.status = '';
        }
      `;

      scan(auditor, 'src/logic/battle/statusManager.ts', goodCode);
      expect(auditor.getCountsByRule().get('showdown-healthy-status-null-prohibition') ?? 0).toBe(0);
    });

    it('detects binary seat hardcoding', () => {
      const auditor = new CombatInvariantsAuditor();
      const badCode = `
        const opponentSeat = seat === 'p1' ? 'p2' : 'p1';
      `;

      scan(auditor, 'src/logic/battle/battleActions.ts', badCode);
      expect(auditor.getCountsByRule().get('battle-multi-seat-hardcoding')!).toBeGreaterThan(0);
    });
  });

  describe('validate_component_styles (Vue Component Style Linkage & SCSS Orphan Auditor)', () => {
    it('validates the entire codebase with 0 broken style links, 0 unstyled components, and 0 orphaned SCSS files', () => {
      const result = auditComponentStyles();
      expect(result.vueComponentsScanned).toBeGreaterThan(50);
      expect(result.scssFilesScanned).toBeGreaterThan(20);
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
    });
  });

  describe('DeadCssAuditor', () => {
    it('instantiates with correct metadata', () => {
      const auditor = new DeadCssAuditor();
      expect(auditor.id).toBe('validate_dead_css');
      expect(auditor.family).toBe('architecture');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('runs audit against project components and collects metrics', async () => {
      const auditor = new DeadCssAuditor();
      await auditor.runAudit();
      expect(auditor.getFilesScanned()).toBeGreaterThan(0);
    });
  });

  describe('SavePersistenceParityAuditor', () => {
    it('instantiates with correct metadata and requiredFiles', () => {
      const auditor = new SavePersistenceParityAuditor();
      expect(auditor.id).toBe('validate_save_persistence_parity');
      expect(auditor.family).toBe('persistence');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
      expect(auditor.requiredFiles.length).toBe(4);
    });

    it('runs audit against persistence contracts and collects metrics', async () => {
      const auditor = new SavePersistenceParityAuditor();
      await auditor.runAudit();
      expect(auditor.getFilesScanned()).toBe(4);
    });
  });

  describe('SchemaParityAuditor', () => {
    it('instantiates with correct metadata', () => {
      const auditor = new SchemaParityAuditor();
      expect(auditor.id).toBe('validate_schema_parity');
      expect(auditor.family).toBe('persistence');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('runs audit comparing PostgreSQL and SQLite schemas and achieves 100% parity', async () => {
      const auditor = new SchemaParityAuditor();
      await auditor.runAudit();
      expect(auditor.getFilesScanned()).toBeGreaterThan(0);

      const missingTables = auditor.getCountsByRule().get('schema-parity-missing-table') ?? 0;
      const missingColumns = auditor.getCountsByRule().get('schema-parity-missing-column') ?? 0;
      expect(missingTables).toBe(0);
      expect(missingColumns).toBe(0);
    });
  });

  describe('ShowdownParityAuditor', () => {
    it('instantiates with correct metadata', () => {
      const auditor = new ShowdownParityAuditor();
      expect(auditor.id).toBe('validate_showdown_parity');
      expect(auditor.family).toBe('fsm');
      expect(auditor.description.length).toBeLessThanOrEqual(60);
    });

    it('declares canonical protocol token categories with valid entries', () => {
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('move');
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('-damage');
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.CORE_ACTIONS).toContain('faint');
      expect(CANONICAL_SHOWDOWN_PROTOCOL_TOKENS.LIFECYCLE_FLOW).toContain('turn');
    });

    it('runs audit against showdownBridge source files and collects metrics', async () => {
      const auditor = new ShowdownParityAuditor();
      await auditor.runAudit();
      expect(auditor.getFilesScanned()).toBeGreaterThan(0);
    });
  });
});
