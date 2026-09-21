---
name: auditor-framework
description: MANDATORY governance and architectural engine for creating, refactoring, maintaining, and administering ALL static analysis tools, sub-auditors, AST rules, and CLI reporting scripts in Poké Vicio. YOU MUST ALWAYS TRIGGER THIS SKILL whenever the user mentions auditors, audit suites, audit reports, audit tables, Fallow analyzers, report formatting, or modifies ANY file in `scripts/auditors/`, `scripts/maintenance/`, `scripts/lib/auditorBase.ts`, or `scripts/lib/unifiedTheme.ts`, even if they just mention 'auditor', 'auditores', 'auditoría', 'audit', 'fallow', 'reporte', 'tabla', 'resultados en la tabla', 'superclase', 'BaseAuditor', 'report_fallow', 'report_complexity', 'report_audit_findings', or audit scripts ('npm run audit', 'npm run audit:fallow:*', 'npm run audit:lint'). Enforces strict OOP inheritance (BaseAuditor, FileScanAuditor), standardized Box-Drawing table rendering via unifiedTheme (80-col limit, zero wrapping, getVisualWidth emoji alignment), dynamic auto-discovery, zero code duplication, and zero ad-hoc console loggers.
---

# Auditor Framework: Governance, Architecture & Maintenance

This skill defines the immutable standard and architectural contract for creating, administering, refactoring, and maintaining all sub-auditors and reporting scripts across the Poké Vicio repository.

Every sub-auditor and reporter in the project is part of a unified static analysis and verification system orchestrated by `npm run audit`.

---

## 🏛️ Core Principles & Tooling Mandates

1. **Strict OOP Inheritance Mandate**:
   - Every sub-auditor MUST extend either `BaseAuditor<TRuleId>` or `FileScanAuditor<TRuleId>` from [`scripts/lib/auditorBase.ts`](../../scripts/lib/auditorBase.ts).
   - Creating standalone procedural scripts, custom CLI loggers, or ad-hoc result printers is **STRICTLY FORBIDDEN**.
2. **Unified Box-Drawing Table & Terminal Width Mandate (Max 80 Cols, Zero Wrapping)**:
   - ALL terminal tables, whether rendered by sub-auditors (`BaseAuditor`), orchestrators (`audit_full.ts`), or interactive reporters (`report_fallow.ts`, `report_complexity.ts`, `report_audit_findings.ts`), MUST use the shared Box-Drawing utilities from [`scripts/lib/unifiedTheme.ts`](../../scripts/lib/unifiedTheme.ts) (`renderBanner`, `renderBoxTable`, `formatStatusBadge`, `getVisualWidth`).
   - Hardcoding custom ASCII banners (`╔════...` exceeding 80 columns) or ad-hoc bulleted lists (`•`) is **STRICTLY FORBIDDEN**.
   - Tables must fit within the standard 80-column terminal width (`TERMINAL_WIDTH = 80`) and use `getVisualWidth()` for padding so emojis (`✅`, `❌`, `⚠️`) do NOT throw column borders out of alignment.
3. **Dynamic Auto-Discovery Mandate (Zero Hardcoded Lists)**:
   - The master orchestrator (`npm run audit` / [`scripts/maintenance/audit_full.ts`](../../scripts/maintenance/audit_full.ts)) and safe-commit diff gatekeeper ([`scripts/maintenance/audit_for_commit.ts`](../../scripts/maintenance/audit_for_commit.ts)) discover all suites dynamically via [`scripts/maintenance/auditScanner.ts`](../../scripts/maintenance/auditScanner.ts).
   - **Never hardcode an array of auditors or task IDs**. Any `.ts` file placed in `scripts/auditors/<family>/` is automatically discovered, categorized, timed, and executed.
4. **Prohibition of Ad-Hoc File Walkers**:
   - Sub-auditors MUST NEVER implement custom recursive directory traversals (`fs.readdir` loops, `getAllFiles`, `getAllVueFiles`, `getFilesRecursively`, `walkSourceFiles`).
   - File discovery MUST use the centralized, cached, and ignore-aware scanner: `this.context.collectFiles(roots, extensions)` or `collectRepositoryFiles()`.
5. **Unified Dual Output Standard (`StandardAuditResult`)**:
   - **Console (stdout)**: Emits formatted progress lines (`🔍 [X/N]`) followed by clean visual Box-Drawing tables (`[ ✅ PASS ]`, `[ ❌ FAIL ]`, `[ ⚠️ WARN ]`), runtimes in ms, and domain metrics via [`scripts/lib/unifiedTheme.ts`](../../scripts/lib/unifiedTheme.ts).
   - **Scratch Disk (`scratch/audits/`)**: ALWAYS saves 100% complete structured JSON conforming to `StandardAuditResult` to `scratch/audits/<family>/<id>.json` (and `scratch/audits/latest_audit.json` for global runs).
6. **Zero Double-Reporting Anti-Pattern**:
   - NEVER pass string arrays (`errors`, `warnings`) to `context.finish(...)` if violations were already registered with `this.addViolation(...)` or `context.addError()`. Doing so causes duplicate violation listings in the terminal summary table.
7. **Zero Runtime Data Auto-Heal in Tooling**:
   - Auditors verify structural and data integrity. They must never silently patch, mock, or auto-heal corrupt data or invalid structures. Failures must be detected loudly with clear, actionable context.
8. **Mandatory Identity & Human-Friendly Description Mandate (Max 60 chars, 1 line)**:
   - Every sub-auditor MUST declare via inheritance:
     - `id: string`: Unique canonical auditor ID (e.g. `validate_my_feature`).
     - `name: string`: Formal suite name (e.g. `My Feature Validator`).
     - `description: string`: Human-friendly Spanish explanation (strictly max 60 characters, single line, no `\n`) of what the suite verifies.
     - `ruleDescriptions: Record<TRuleId, string>`: Human-friendly Spanish explanation (strictly max 60 characters, single line, no `\n`) for each rule ID.
   - Raw unexplained slugs without human context in console output are strictly forbidden.
9. **Absolute Prohibition of Homebrew SLOC Counters Mandate**:
   - Sub-auditors must NEVER implement manual line-counting loops, regex line filters, or ad-hoc SLOC checkers (`checkSloc`, line counting loops).
   - Fallow is the Single Source of Truth (SSoT) for all AST metrics, cognitive and cyclomatic complexity, function unit size, maintainability, dead code, and duplication detection across the codebase.
10. **Human-Friendly Descriptions & Category Breakdown Mandate (Zero Code Slugs & Zero Family Grouping)**:
   - The master audit orchestrator (`npm run audit`) and warnings reporter (`npm run audit:warnings`) MUST render results desglosados strictly by category/rule in an official Box-Drawing table.
   - The table MUST display **100% human-friendly Spanish descriptions** (`finding.ruleDescription` or `suite.description`) defined via inheritance in `BaseAuditor` (`ruleDescriptions: Record<TRuleId, string>`). Displaying raw code slugs, identifiers, or technical keys (e.g. displaying `sprite-missing-asset` instead of `'Sprite no encontrado en assets de Pokémon'`) is **STRICTLY FORBIDDEN**.
   - Following the table, they MUST output ONLY an illustrative sample of the last 5 errors (`❌ Muestra de errores detectados (últimos 5 de N)`).
   - Listing the full set of warnings or dumping all errors in console output is **STRICTLY FORBIDDEN**.
   - Grouping console results under opaque "FAMILIAS" headers is permanently eradicated. Full machine-readable findings reside in `scratch/audits/latest_audit.json`.
11. **Shared AST Engine & Zero Duplicate Parse Mandate (`SharedAstContext`)**:
   - Whenever a sub-auditor performs TypeScript AST analysis or inspects Vue SFC `<script>` blocks, it MUST declare `requiresAst: true` in its constructor configuration (`BaseAuditor` or `FileScanAuditor`).
   - Sub-auditors MUST NEVER instantiate isolated AST parsers or call `ts.createProgram` / `ts.createSourceFile` inside ad-hoc file loops.
   - Sub-auditors MUST consume the centralized `astContext: SharedAstContext` passed to `runAudit(astContext?: SharedAstContext)` or receive the pre-compiled `sourceFile?: ts.SourceFile` directly in `FileScanAuditor.scanFile(relPath, content, sourceFile)`.
   - All AST-dependent sub-auditors MUST be registered in `AST_DEPENDENT_SUITE_IDS` inside [`scripts/maintenance/auditScanner.ts`](../../scripts/maintenance/auditScanner.ts). This ensures the master orchestrator (`audit_full.ts`) initializes and preheats a single AST cache before running suites.
   - For standalone CLI execution (`BaseAuditor.runCli`), `execute()` automatically provisions a fallback `SharedAstContext` on demand if `requiresAst: true`.

---

## 📂 Canonical Directory Structure & Domain Families

All sub-auditors MUST reside under `scripts/auditors/` grouped into one of the 6 canonical domain families:

```text
scripts/auditors/
├── architecture/      # AST rules, Fallow intelligence, Z-Index, CSS orphans, emoji typography
├── domain_data/       # Canonical databases (Pokemon, Moves, Items, Abilities, Spawns, Types)
├── persistence/       # SQLite/PostgreSQL migrations, SQL anti-patterns, payload casing
├── fsm/               # Battle State Machine (Mermaid diagrams, flow parity, state coverage)
├── assets/            # Sprites coverage, item sprite collisions, centralized asset usage
└── documentation/     # Markdown relative links, DOX hierarchy (AGENTS.md), syntax standards
```

### File Naming Conventions:
- **Active Sub-Auditor**: `validate_<topic>.ts` or `audit_<topic>.ts` (auto-discovered by `auditScanner.ts`).
- **Private Helper**: `_<helper_name>.ts` (ignored by `auditScanner.ts`).
- **Interactive Developer Reporter**: `report_<topic>.ts` (e.g., `report_fallow.ts`, `report_complexity.ts`, excluded from automated batch runs).

---

## 🛠️ Step-by-Step Guide: How to Create a New Sub-Auditor

### 📦 Bundled Boilerplate Templates (`assets/templates/`)
Pre-formatted, production-ready templates conforming to all project standards are bundled directly within this skill for instant scaffolding:
- **Line-by-Line Scanner**: [`assets/templates/file_scan_auditor_template.ts`](./assets/templates/file_scan_auditor_template.ts)
- **Composite / Database / Asset Auditor**: [`assets/templates/base_auditor_template.ts`](./assets/templates/base_auditor_template.ts)
- **AST-Driven Auditor**: [`assets/templates/ast_auditor_template.ts`](./assets/templates/ast_auditor_template.ts)
- **Dedicated Vitest Unit Test**: [`assets/templates/auditor_unit_test_template.test.ts`](./assets/templates/auditor_unit_test_template.test.ts)

### Option A: File-Scanning Auditor (`FileScanAuditor`)
Use `FileScanAuditor` when the audit inspects files line-by-line across specific directories (e.g. searching for regex patterns, forbidden tokens, or syntax rules).

```typescript
/**
 * scripts/auditors/architecture/validate_my_feature.ts
 *
 * MY FEATURE AUDITOR (Node.js 26+ Native)
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor, FileScanAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type MyFeatureRuleId =
  | 'my-feature-forbidden-token'
  | 'my-feature-missing-attribute';

export const MY_FEATURE_RULES: readonly MyFeatureRuleId[] = [
  'my-feature-forbidden-token',
  'my-feature-missing-attribute'
];

export class MyFeatureAuditor extends FileScanAuditor<MyFeatureRuleId> {
  constructor(roots: readonly string[] = ['src']) {
    super({
      id: 'validate_my_feature',
      name: 'My Feature Validator',
      description: 'Valida tokens prohibidos y atributos de la característica X',
      family: 'architecture',
      ruleIds: MY_FEATURE_RULES,
      ruleDescriptions: {
        'my-feature-forbidden-token': 'Token prohibido detectado en archivo fuente',
        'my-feature-missing-attribute': 'Atributo obligatorio faltante en componente'
      },
      roots,
      allowedExtensions: new Set(['.vue', '.ts'])
    });
  }

  protected override scanFile(relPath: string, content: string): void {
    const lines = content.split(/\r?\n/);
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]!;
      const lineNum = i + 1;

      // Check escape hatches: // domain-ok, // my-feature-ok
      if (this.isLineIgnored(line, ['my-feature-ok'])) continue;

      if (line.includes('bannedToken')) {
        this.addViolation({
          ruleId: 'my-feature-forbidden-token',
          severity: 'error',
          file: relPath,
          line: lineNum,
          message: `Forbidden token 'bannedToken' detected. Use canonical helper instead.`,
          context: line.trim()
        });
      }
    }
  }
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new MyFeatureAuditor());
}
```

### Option B: Composite / Data Auditor (`BaseAuditor`)
Use `BaseAuditor` when the audit performs multi-source comparisons, AST graphs, database schema validations, or dataset integrity checks.

```typescript
/**
 * scripts/auditors/domain_data/validate_my_data.ts
 *
 * MY DATA INTEGRITY AUDITOR (Node.js 26+ Native)
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { MY_DATA } from '../../../src/data/myData.ts';

enableCompileCache();

export type MyDataRuleId = 'my-data-key-missing' | 'my-data-value-invalid';

export const MY_DATA_RULES: readonly MyDataRuleId[] = [
  'my-data-key-missing',
  'my-data-value-invalid'
];

export class MyDataAuditor extends BaseAuditor<MyDataRuleId> {
  constructor() {
    super({
      id: 'validate_my_data',
      name: 'My Data Validator',
      description: 'Valida integridad y campos obligatorios en base de datos',
      family: 'domain_data',
      ruleIds: MY_DATA_RULES,
      ruleDescriptions: {
        'my-data-key-missing': 'Clave requerida faltante en registro de datos',
        'my-data-value-invalid': 'Valor no válido en propiedad requerida'
      },
      requiredFiles: [
        path.resolve(process.cwd(), 'src/data/myData.ts')
      ]
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Validating my data keys...');
    for (const [key, value] of Object.entries(MY_DATA)) {
      this.filesScannedCount++;
      if (!value.requiredField) {
        this.addViolation({
          ruleId: 'my-data-key-missing',
          severity: 'error',
          file: 'src/data/myData.ts',
          line: 1,
          message: `Entry '${key}' is missing 'requiredField'.`,
          context: key
        });
      }
    }

    this.context.setMetric('Total Entries Checked', Object.keys(MY_DATA).length);
  }
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new MyDataAuditor());
}
```

### Option C: AST-Driven Sub-Auditor (`requiresAst: true` & `SharedAstContext`)
Use `BaseAuditor` with `requiresAst: true` (or `FileScanAuditor` with `sourceFile`) when the audit inspects TypeScript syntax trees, imports, exports, decorators, types, or Vue SFC script blocks across codebase files.

```typescript
/**
 * scripts/auditors/architecture/validate_my_ast_rule.ts
 *
 * AST-DRIVEN AUDITOR (Node.js 26+ Native)
 */

import path from 'node:path';
import ts from 'typescript';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';
import { SharedAstContext } from '../../lib/astContext.ts';

enableCompileCache();

export type MyAstRuleId = 'my-ast-forbidden-call';

export const MY_AST_RULES: readonly MyAstRuleId[] = [
  'my-ast-forbidden-call'
] as const;

export class MyAstAuditor extends BaseAuditor<MyAstRuleId> {
  constructor() {
    super({
      id: 'validate_my_ast_rule',
      name: 'My AST Rule Validator',
      description: 'Valida llamadas prohibidas en el AST de TypeScript',
      family: 'architecture',
      ruleIds: MY_AST_RULES,
      ruleDescriptions: {
        'my-ast-forbidden-call': 'Llamada prohibida detectada en el árbol sintáctico'
      },
      requiresAst: true,
      roots: ['src'],
      allowedExtensions: new Set(['.ts', '.vue'])
    });
  }

  public override async runAudit(astContext?: SharedAstContext): Promise<void> {
    this.context.logStep(1, 1, 'Analizando AST con contexto compartido...');

    const astEngine = astContext ?? new SharedAstContext();
    const relFiles = await this.context.collectFiles(['src'], new Set(['.ts', '.vue']));

    for (const relFile of relFiles) {
      this.filesScannedCount++;
      const absPath = path.resolve(this.projectRoot, relFile);
      const sourceFile = astEngine.getSourceFile(absPath);

      ts.forEachChild(sourceFile, (node) => {
        if (ts.isCallExpression(node)) {
          // Inspect AST node properties...
        }
      });
    }

    this.context.setMetric('Files Scanned with AST', this.filesScannedCount);
  }
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new MyAstAuditor());
}
```

---

## ⚡ Integrating with `package.json`

Every sub-auditor MUST have a dedicated script declared in `package.json`:

```json
"validate:my-feature": "node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/architecture/validate_my_feature.ts"
```

Because `discoverAuditors()` in `scripts/maintenance/auditScanner.ts` auto-discovers all `.ts` files in `scripts/auditors/`, **no registration in runner files is needed**. Running `npm run audit` will automatically discover and execute the new suite.

---

## 🛡️ Testing & Conformance Verification

Every sub-auditor must be paired with:
1. **Dedicated Unit Test**: In `tests/node/auditors/validate_<name>.test.ts`, verifying that clean inputs pass, violations trigger in RED, and `isLineIgnored` works properly.
2. **Conformity Rule**: The master test `tests/node/auditors/auditor_architecture_conformance.test.ts` validates that 100% of sub-auditors in `scripts/auditors/` inherit from `BaseAuditor` and conform to the project standard.
