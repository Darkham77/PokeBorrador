import { describe, it, expect } from 'vitest';
import { discoverAuditors } from '../../../scripts/maintenance/auditScanner.ts';
import {
  AUDIT_FAMILIES,
  FAMILY_METADATA,
  type StandardAuditResult
} from '../../../scripts/lib/auditContract.ts';
import {
  renderBanner,
  renderFamilyHeader,
  renderAuditTaskRow,
  renderFindingsDetail,
  renderMarkdownReport,
  formatStatusBadge
} from '../../../scripts/lib/unifiedTheme.ts';
import {
  findSpriteCollisions,
  findMissingSprites
} from '../../../scripts/auditors/assets/audit_item_sprite_collisions.ts';
import { splitSQLStatements, translatePostgresToSqlite } from '../../../src/logic/db/sqlTranslator.ts';
import { Dex, toID } from '@pkmn/sim';
import { ACTIVE_GENERATION, ENABLED_POKEMON_IDS } from '../../../src/data/system/constants.ts';
import { POKEMON_DB } from '../../../src/data/pokemon/pokemonDB.ts';
import { SHOP_ITEMS } from '../../../src/data/inventory/items.ts';
import { MOVE_TRANSLATIONS_ES } from '../../../src/data/battle/moves.ts';
import { ABILITY_TRANSLATIONS_ES } from '../../../src/data/battle/abilities.ts';

describe('Audit System & Dynamic Auto-Discovery Engine', () => {
  it('should have parity between AUDIT_FAMILIES and FAMILY_METADATA', () => {
    expect(AUDIT_FAMILIES.length).toBeGreaterThan(0);
    for (const family of AUDIT_FAMILIES) {
      expect(FAMILY_METADATA[family]).toBeDefined();
      expect(FAMILY_METADATA[family].key).toBe(family);
      expect(FAMILY_METADATA[family].title).toBeTruthy();
      expect(FAMILY_METADATA[family].order).toBeGreaterThan(0);
    }
  });

  it('should discover all sub-auditors in scripts/auditors without omission', async () => {
    const tasks = await discoverAuditors();
    expect(tasks.length).toBeGreaterThanOrEqual(15);

    // Verify all tasks have valid family, id, command, and existing scriptPath
    for (const task of tasks) {
      expect(AUDIT_FAMILIES).toContain(task.family);
      expect(task.id).toBeTruthy();
      expect(task.name).toBeTruthy();
      expect(task.command).toBe('node');
      expect(task.args).toContain('--permission');
      expect(task.scriptPath).toMatch(/^scripts\/auditors\//);
    }
  });

  it('should filter tasks by family correctly', async () => {
    const domainTasks = await discoverAuditors({ family: 'domain_data' });
    expect(domainTasks.length).toBeGreaterThanOrEqual(5);
    for (const task of domainTasks) {
      expect(task.family).toBe('domain_data');
    }

    const fsmTasks = await discoverAuditors({ family: 'fsm' });
    expect(fsmTasks.length).toBeGreaterThanOrEqual(3);
    for (const task of fsmTasks) {
      expect(task.family).toBe('fsm');
    }

    const assetTasks = await discoverAuditors({ family: 'assets' });
    expect(assetTasks.length).toBeGreaterThanOrEqual(2);
    for (const task of assetTasks) {
      expect(task.family).toBe('assets');
    }
  });

  it('should filter tasks by specific task ID', async () => {
    const pokemonTasks = await discoverAuditors({ task: 'pokemon' });
    expect(pokemonTasks.length).toBe(1);
    expect(pokemonTasks[0]?.id).toBe('validate_pokemon');
    expect(pokemonTasks[0]?.family).toBe('domain_data');
  });

  it('should filter fast tasks correctly', async () => {
    const fastTasks = await discoverAuditors({ fastOnly: true });
    expect(fastTasks.length).toBeGreaterThan(0);
    for (const task of fastTasks) {
      expect(task.fast).toBe(true);
    }
  });
});

describe('Unified Theme Presentation Engine', () => {
  it('should render box banners with borders and titles', () => {
    const banner = renderBanner('POKE VICIO - TEST SUITE', 'Subtitle test');
    expect(banner).toContain('POKE VICIO - TEST SUITE');
    expect(banner).toContain('Subtitle test');
    expect(banner).toContain('╔═');
    expect(banner).toContain('╚═');
  });

  it('should render family headers with order and icons', () => {
    const meta = FAMILY_METADATA.domain_data;
    const header = renderFamilyHeader(meta);
    expect(header).toContain('[FAMILIA 2]');
    expect(header).toContain(meta.title);
    expect(header).toContain(meta.icon);
  });

  it('should render status badges consistently', () => {
    expect(formatStatusBadge('passed')).toContain('PASS');
    expect(formatStatusBadge('failed')).toContain('FAIL');
    expect(formatStatusBadge('warning')).toContain('WARN');
    expect(formatStatusBadge('info')).toContain('INFO');
  });

  it('should render audit task rows with aligned columns', () => {
    const dummyResult: StandardAuditResult = {
      id: 'validate_items',
      name: 'Item Database Integrity',
      family: 'domain_data',
      status: 'passed',
      durationMs: 42,
      metrics: { 'Items Scanned': 215 },
      findings: [],
      summary: { errors: 0, warnings: 0, info: 0 }
    };

    const row = renderAuditTaskRow(dummyResult);
    expect(row).toContain('Item Database Integrity');
    expect(row).toContain('42ms');
    expect(row).toContain('215 Items');
    expect(row).toContain('0 ❌');
    expect(row).toContain('0 ⚠️');
  });

  it('should safely render task rows with missing metrics or summary', () => {
    const incompleteResult = {
      id: 'test_task',
      name: 'Fallback Incomplete Task',
      family: 'assets',
      status: 'failed',
      durationMs: 120,
      metrics: {},
      findings: [{ severity: 'error', message: 'Something broke' }]
    } as unknown as StandardAuditResult;

    const row = renderAuditTaskRow(incompleteResult);
    expect(row).toContain('Fallback Incomplete Task');
    expect(row).toContain('120ms');
    expect(row).toContain('FAIL');
  });

  it('should render detailed findings grouped by file and handle edge cases', () => {
    const findings = [
      { severity: 'error' as const, message: 'Invalid property value', file: 'src/data/items.ts', line: 12, ruleId: 'rule-test', context: 'bad_val' },
      { severity: 'warning' as const, message: 'Consider using constant', file: 'src/data/items.ts', line: 24 }
    ];

    const detail = renderFindingsDetail(findings);
    expect(detail).toContain('items.ts');
    expect(detail).toContain('L12');
    expect(detail).toContain('L24');
    expect(detail).toContain('Invalid property value');
    expect(detail).toContain('[rule-test]');

    // Graceful handling of empty or non-array inputs
    expect(renderFindingsDetail([])).toBe('');
    expect(renderFindingsDetail(null as unknown as [])).toBe('');
  });

  it('should generate valid Markdown reports with tables and metrics', () => {
    const results: StandardAuditResult[] = [
      {
        id: 'validate_items',
        name: 'Item Database Integrity',
        family: 'domain_data',
        status: 'passed',
        durationMs: 15,
        metrics: { 'Items Scanned': 200 },
        findings: [],
        summary: { errors: 0, warnings: 0, info: 0 }
      }
    ];

    const md = renderMarkdownReport(results, 1, 15);
    expect(md).toContain('# 🛡️ Reporte Consolidado de Auditoría Global');
    expect(md).toContain('| Estado | Auditoría | Duración | Métrica Principal | Errores | Advertencias |');
    expect(md).toContain('Item Database Integrity');
    expect(md).toContain('`15ms`');
    expect(md).toContain('✅ Pass');
  });
});

describe('Integrity & False-Positive Prevention Tests for Sub-Auditors', () => {
  describe('Sprite Collision & Missing Asset Detector', () => {
    it('detects sprite collisions when distinct items share the same sprite path', () => {
      const dummyItems = [
        { id: 'item_a', name: 'Item A', sprite: 'crafting/tier3/choicescarf' },
        { id: 'item_b', name: 'Item B', sprite: 'crafting/tier3/choicescarf' },
        { id: 'item_c', name: 'Item C', sprite: 'items/unique_sprite' }
      ];

      const collisions = findSpriteCollisions(dummyItems);
      expect(collisions).toHaveLength(1);
      expect(collisions[0]!.sprite).toBe('crafting/tier3/choicescarf');
      expect(collisions[0]!.count).toBe(2);
      expect(collisions[0]!.items.map(i => i.id)).toEqual(['item_a', 'item_b']);
    });

    it('does NOT report collisions when each item has a unique sprite', () => {
      const dummyItems = [
        { id: 'item_1', name: 'Item 1', sprite: 'items/potion' },
        { id: 'item_2', name: 'Item 2', sprite: 'items/superpotion' }
      ];

      const collisions = findSpriteCollisions(dummyItems);
      expect(collisions).toHaveLength(0);
    });

    it('detects missing sprite properties accurately', () => {
      const itemsWithMissing = [
        { id: 'item_no_sprite', name: 'Broken Item' },
        { id: 'item_empty_sprite', name: 'Empty Sprite Item', sprite: '   ' }
      ];

      const missing = findMissingSprites(itemsWithMissing);
      expect(missing).toHaveLength(2);
      expect(missing[0]!.reason).toBe('missing_property');
      expect(missing[1]!.reason).toBe('missing_property');
    });
  });

  describe('SQL Statement Splitter & Dollar-Quote Parser', () => {
    it('preserves PostgreSQL function blocks with $$ dollar-quotes without splitting them', () => {
      const sqlWithFunction = `
        ALTER TABLE profiles ADD COLUMN role TEXT DEFAULT 'user';
        CREATE OR REPLACE FUNCTION test_func(p_id UUID) RETURNS BOOLEAN AS $$
        DECLARE
          v_val TEXT;
        BEGIN
          SELECT val INTO v_val FROM config WHERE id = p_id;
          IF v_val IS NULL THEN
            RETURN FALSE;
          END IF;
          RETURN TRUE;
        END;
        $$ LANGUAGE plpgsql;
        INSERT INTO system_config (key, value) VALUES ('k', 'v');
      `;

      const statements = splitSQLStatements(sqlWithFunction);
      expect(statements.length).toBe(3);
      expect(statements[0]).toContain('ALTER TABLE profiles');
      expect(statements[1]).toContain('CREATE OR REPLACE FUNCTION test_func');
      expect(statements[1]).toContain('LANGUAGE plpgsql');
      expect(statements[2]).toContain('INSERT INTO system_config');
    });

    it('translates PostgreSQL comments and strips plpgsql functions cleanly for SQLite', () => {
      const plpgsqlBlock = `
        CREATE OR REPLACE FUNCTION execute_something(p_id UUID) RETURNS VOID AS $$
        BEGIN
          NULL;
        END;
        $$ LANGUAGE plpgsql;
      `;
      const translated = translatePostgresToSqlite(plpgsqlBlock);
      expect(translated.trim()).toBe('');
    });
  });

  describe('Canonical Showdown Dex Lookups & Parity Integrity', () => {
    it('verifies enabled Pokemon exist in Showdown Dex Gen 3', () => {
      const gen = Dex.forGen(ACTIVE_GENERATION);
      for (const pokeId of ENABLED_POKEMON_IDS) {
        const cleanId = toID(pokeId);
        const species = gen.species.get(cleanId);
        expect(species.exists).toBe(true);
        expect(species.baseStats).toBeDefined();
      }
    });

    it('verifies move translations in Spanish map to valid Showdown move IDs for enabled Pokemon learnsets', () => {
      const gen = Dex.forGen(ACTIVE_GENERATION);
      const learnsetMoves = new Set<string>();
      for (const [pokeId, poke] of Object.entries(POKEMON_DB)) {
        if (!((ENABLED_POKEMON_IDS as readonly string[]).includes(pokeId))) continue;
        if (poke.learnset && Array.isArray(poke.learnset)) {
          for (const m of poke.learnset) {
            if (m.id) learnsetMoves.add(toID(m.id));
          }
        }
      }

      expect(learnsetMoves.size).toBeGreaterThan(100);
      for (const moveId of learnsetMoves) {
        const move = gen.moves.get(moveId);
        expect(move.exists).toBe(true);
        expect(MOVE_TRANSLATIONS_ES[moveId as keyof typeof MOVE_TRANSLATIONS_ES]).toBeDefined();
      }
    });

    it('verifies ability translations in Spanish map to valid Showdown ability IDs for enabled Pokemon', () => {
      const abilityIds = new Set<string>();
      for (const pokeId of ENABLED_POKEMON_IDS) {
        const species = Dex.species.get(pokeId);
        if (species && species.exists) {
          Object.values(species.abilities).forEach(abiName => {
            abilityIds.add(toID(abiName));
          });
        }
      }

      expect(abilityIds.size).toBeGreaterThan(20);
      for (const abilityId of abilityIds) {
        const ability = Dex.abilities.get(abilityId);
        expect(ability.exists).toBe(true);
        expect(ABILITY_TRANSLATIONS_ES[abilityId as keyof typeof ABILITY_TRANSLATIONS_ES]).toBeDefined();
      }
    });

    it('verifies items in shop have valid categories and non-empty IDs', () => {
      expect(SHOP_ITEMS.length).toBeGreaterThan(0);
      for (const item of SHOP_ITEMS) {
        expect(item.id).toBeTruthy();
        expect(item.name).toBeTruthy();
        expect(item.cat).toBeTruthy();
      }
    });
  });

  describe('Scratch JSON Persistence Engine', () => {
    it('automatically persists complete structured JSON to scratch/audits/<family>/<id>.json', async () => {
      const fs = await import('node:fs/promises');
      const path = await import('node:path');
      const { setupAuditor } = await import('../../../scripts/lib/auditorBase.ts');

      process.env.AUDIT_SUBPROCESS = 'true';
      const testAuditor = setupAuditor({
        id: 'test_sample_auditor',
        name: 'Sample Unit Test Auditor',
        family: 'architecture'
      });

      testAuditor.setMetric('Test Items', 99);
      testAuditor.addWarning('Minor deprecation warning', 'src/test.ts', 10);
      const res = await testAuditor.finish();

      expect(res.status).toBe('passed');
      expect(res.summary.warnings).toBe(1);

      const targetPath = path.resolve(process.cwd(), 'scratch/audits/architecture/test_sample_auditor.json');
      const fileData = await fs.readFile(targetPath, 'utf-8');
      const parsed = JSON.parse(fileData) as StandardAuditResult;

      expect(parsed.id).toBe('test_sample_auditor');
      expect(parsed.family).toBe('architecture');
      expect(parsed.metrics['Test Items']).toBe(99);
      expect(parsed.findings).toHaveLength(1);
      expect(parsed.findings[0]!.message).toBe('Minor deprecation warning');
      delete process.env.AUDIT_SUBPROCESS;
    });
  });
});

