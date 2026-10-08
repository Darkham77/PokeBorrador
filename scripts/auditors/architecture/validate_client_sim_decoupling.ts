/**
 * scripts/auditors/architecture/validate_client_sim_decoupling.ts
 *
 * CLIENT SHOWDOWN DECOUPLING AUDITOR (Node.js 26+)
 *
 * Enforces the strict architectural isolation of Pokémon Showdown (@pkmn/sim & @pkmn/randoms)
 * to Web Worker execution boundaries only.
 *
 * Immutable rules (ALL SEVERITY = ERROR, ZERO IGNORES PERMITTED):
 *   1. client-sim-value-import: Prohibits runtime value imports of @pkmn/sim in client code.
 *      Only compile-time 'import type { ... } from "@pkmn/sim"' is allowed in src/.
 *   2. client-randoms-value-import: Prohibits any import of @pkmn/randoms in client code.
 *   3. client-sim-chunk-configured: Prohibits vendor-pkmn-sim or vendor-randoms in client manualChunks.
 *   4. client-sim-chunk-present: Prohibits vendor-pkmn-sim or vendor-randoms chunks in dist/assets.
 */

import fs from 'node:fs';
import path from 'node:path';
import ts from 'typescript';
import { enableCompileCache } from 'node:module';
import { BaseAuditor, type SharedAstContext } from '@francogp/auditor';

enableCompileCache();

export const CLIENT_SIM_DECOUPLING_RULES = [
  'client-sim-value-import',
  'client-randoms-value-import',
  'client-sim-chunk-configured',
  'client-sim-chunk-present'
] as const;

export type ClientSimDecouplingRuleId = (typeof CLIENT_SIM_DECOUPLING_RULES)[number];

export const FORBIDDEN_CLIENT_SIM_IMPORTS = [
  'client-sim-value-import',
  'client-randoms-value-import'
] as const;
export type ForbiddenClientSimImport = (typeof FORBIDDEN_CLIENT_SIM_IMPORTS)[number];

export const CLIENT_SIM_DECOUPLING_DESCRIPTIONS: Record<ClientSimDecouplingRuleId, string> = {
  'client-sim-value-import': 'Import de valor de @pkmn/sim',
  'client-randoms-value-import': 'Import de @pkmn/randoms',
  'client-sim-chunk-configured': 'Chunk en cliente Vite',
  'client-sim-chunk-present': 'Chunk presente en dist'
};

export interface SimImportIssue {
  ruleId: ForbiddenClientSimImport;
  line: number;
  message: string;
  snippet: string;
}

/**
 * Checks whether a file path belongs to an isolated Web Worker boundary.
 */
export function isWorkerBoundaryFile(relPath: string): boolean {
  const normalized = relPath.replace(/\\/g, '/');
  return (
    normalized.endsWith('.d.ts') ||
    normalized.endsWith('.worker.ts') ||
    normalized.endsWith('.worker.js') ||
    normalized.includes('/battle/engine/') ||
    normalized.includes('/battle/worker/') ||
    normalized.includes('showdownBattleFactory.ts') ||
    normalized.includes('showdownExecutor.ts')
  );
}

function checkPkmnSimImport(
  node: ts.ImportDeclaration,
  lineNum: number,
  nodeText: string,
  relPath: string
): SimImportIssue | null {
  const clause = node.importClause;
  if (!clause) {
    return {
      ruleId: 'client-sim-value-import',
      line: lineNum,
      message: `Import no tipado o de valor en tiempo de ejecución desde @pkmn/sim en "${relPath}:${lineNum}". Solo se permite "import type".`,
      snippet: nodeText
    };
  }

  if (clause.isTypeOnly) return null;

  if (clause.namedBindings && ts.isNamedImports(clause.namedBindings)) {
    const nonTypeSpecifiers = clause.namedBindings.elements
      .filter(elem => !elem.isTypeOnly)
      .map(elem => elem.name.text);

    if (nonTypeSpecifiers.length === 0) return null;

    return {
      ruleId: 'client-sim-value-import',
      line: lineNum,
      message: `Import de valores en tiempo de ejecución [${nonTypeSpecifiers.join(', ')}] desde @pkmn/sim en "${relPath}:${lineNum}". Use "import type".`,
      snippet: nodeText
    };
  }

  return {
    ruleId: 'client-sim-value-import',
    line: lineNum,
    message: `Import no tipado o de valor en tiempo de ejecución desde @pkmn/sim en "${relPath}:${lineNum}". Solo se permite "import type".`,
    snippet: nodeText
  };
}

function checkSimImportDeclaration(
  node: ts.ImportDeclaration,
  sf: ts.SourceFile,
  relPath: string
): SimImportIssue | null {
  const moduleSpec = node.moduleSpecifier;
  if (!ts.isStringLiteral(moduleSpec)) return null;
  const modName = moduleSpec.text;

  const { line } = sf.getLineAndCharacterOfPosition(node.getStart());
  const lineNum = line + 1;
  const nodeText = node.getText(sf).trim();

  if (modName === '@pkmn/randoms') {
    return {
      ruleId: 'client-randoms-value-import',
      line: lineNum,
      message: `Import de @pkmn/randoms detectado en código cliente "${relPath}:${lineNum}". Debe ejecutarse en Web Worker.`,
      snippet: nodeText
    };
  }

  if (modName === '@pkmn/sim') {
    return checkPkmnSimImport(node, lineNum, nodeText, relPath);
  }

  return null;
}

/**
 * Scans a source code string for forbidden @pkmn/sim and @pkmn/randoms imports.
 */
export function scanSourceForSimImports(
  content: string,
  relPath: string,
  sourceFile?: ts.SourceFile
): SimImportIssue[] {
  if (isWorkerBoundaryFile(relPath)) {
    return [];
  }

  // Fast O(1) string pre-filter to skip non-matching files immediately
  if (!content.includes('@pkmn/sim') && !content.includes('@pkmn/randoms')) {
    return [];
  }

  const sf = sourceFile ?? ts.createSourceFile(
    path.basename(relPath),
    content,
    ts.ScriptTarget.Latest,
    true,
    relPath.endsWith('.vue') ? ts.ScriptKind.TS : undefined
  );

  const issues: SimImportIssue[] = [];

  ts.forEachChild(sf, (node) => {
    if (ts.isImportDeclaration(node)) {
      const issue = checkSimImportDeclaration(node, sf, relPath);
      if (issue) issues.push(issue);
    }
  });

  return issues;
}

/**
 * Checks vite.config.ts to ensure vendor-pkmn-sim and vendor-randoms are not configured in client manualChunks.
 */
export function checkViteConfigForSimChunks(viteConfigContent: string): SimImportIssue[] {
  const issues: SimImportIssue[] = [];

  // Look for client manualChunks (outside of `worker:` configuration block)
  // Client manualChunks typically occurs under `build.rollupOptions.output.manualChunks`
  const workerBlockMatch = viteConfigContent.indexOf('worker:');
  const clientConfigPortion = workerBlockMatch !== -1
    ? viteConfigContent.slice(workerBlockMatch + 7)
    : viteConfigContent;

  const lines = clientConfigPortion.split(/\r?\n/);
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    if (line.includes("return 'vendor-pkmn-sim'") || line.includes('return "vendor-pkmn-sim"')) {
      issues.push({
        ruleId: 'client-sim-value-import' as const,
        line: i + 1,
        message: 'vite.config.ts define un chunk de cliente para vendor-pkmn-sim. @pkmn/sim no debe existir en el hilo principal.',
        snippet: line.trim()
      });
    }
    if (line.includes("return 'vendor-randoms'") || line.includes('return "vendor-randoms"')) {
      issues.push({
        ruleId: 'client-randoms-value-import' as const,
        line: i + 1,
        message: 'vite.config.ts define un chunk de cliente para vendor-randoms. @pkmn/randoms no debe existir en el hilo principal.',
        snippet: line.trim()
      });
    }
  }

  return issues;
}

/**
 * Checks dist/assets for any compiled client chunks of Showdown.
 */
export function checkDistAssetsForSimChunks(distDir: string): { chunkName: string; sizeKB: string }[] {
  if (!fs.existsSync(distDir)) return [];
  const files = fs.readdirSync(distDir);
  const forbidden: { chunkName: string; sizeKB: string }[] = [];

  for (const file of files) {
    // Only flag client-side chunks (not worker chunks like worker-vendor-pkmn-sim-*)
    if (file.startsWith('vendor-pkmn-sim-') || file.startsWith('vendor-randoms-')) {
      if (file.endsWith('.js') && !file.endsWith('.br') && !file.endsWith('.gz')) {
        const stat = fs.statSync(path.join(distDir, file));
        forbidden.push({
          chunkName: file,
          sizeKB: (stat.size / 1024).toFixed(1)
        });
      }
    }
  }

  return forbidden;
}

export class ValidateClientSimDecouplingAuditor extends BaseAuditor<ClientSimDecouplingRuleId> {
  constructor() {
    super({
      id: 'validate_client_sim_decoupling',
      configKey: 'architecture.clientSimDecoupling',
      defaultConfig: {
        enabled: true
      },
      name: 'Client Showdown Decoupling Auditor',
      description: 'Verifica desacoplamiento total de Showdown en cliente',
      icon: '🔌',
      family: 'architecture',
      packageName: 'Showdown',
      ruleIds: CLIENT_SIM_DECOUPLING_RULES,
      ruleDescriptions: CLIENT_SIM_DECOUPLING_DESCRIPTIONS,
      requiresAst: true,
      coverage: {
        include: ['src/**/*.{ts,vue,js}', 'vite.config.ts']
      }
    });
  }

  public override async runAudit(astContext?: SharedAstContext): Promise<void> {
    const cwd = process.cwd();

    this.context.logStep(1, 3, 'Escaneando imports de @pkmn/sim y @pkmn/randoms en src/...');
    const files = await this.context.collectFiles(['src'], new Set(['.ts', '.vue', '.js']));
    let filesScanned = 0;
    let totalIssuesFound = 0;

    for (const file of files) {
      const relPath = path.relative(cwd, file).replace(/\\/g, '/');
      if (isWorkerBoundaryFile(relPath)) {
        continue;
      }

      filesScanned++;
      this.recordScanned(relPath);
      this.markRuleEvaluated('client-sim-value-import');
      this.markRuleEvaluated('client-randoms-value-import');

      const content = fs.readFileSync(file, 'utf8');
      const sf = astContext?.getSourceFile(file, content);
      const issues = scanSourceForSimImports(content, relPath, sf);

      for (const issue of issues) {
        totalIssuesFound++;
        this.addViolation({
          ruleId: issue.ruleId,
          file: relPath,
          line: issue.line,
          message: issue.message,
          severity: 'error',
          context: issue.snippet
        });
      }
    }

    this.context.logStep(2, 3, 'Verificando configuración de manualChunks en vite.config.ts...');
    const viteConfigPath = path.resolve(cwd, 'vite.config.ts');
    if (fs.existsSync(viteConfigPath)) {
      this.recordScanned('vite.config.ts');
      this.markRuleEvaluated('client-sim-chunk-configured');
      const viteContent = fs.readFileSync(viteConfigPath, 'utf8');
      const configIssues = checkViteConfigForSimChunks(viteContent);
      for (const ci of configIssues) {
        totalIssuesFound++;
        this.addViolation({
          ruleId: 'client-sim-chunk-configured',
          file: 'vite.config.ts',
          line: ci.line,
          message: ci.message,
          severity: 'error',
          context: ci.snippet
        });
      }
    } else {
      this.markRuleNotApplicable('client-sim-chunk-configured', 'vite.config.ts no existe en el proyecto');
    }

    this.context.logStep(3, 3, 'Comprobando existencia de chunks de Showdown en dist/assets/...');
    const distAssetsDir = path.resolve(cwd, 'dist/assets');
    if (fs.existsSync(distAssetsDir)) {
      this.markRuleEvaluated('client-sim-chunk-present');
      const distChunks = checkDistAssetsForSimChunks(distAssetsDir);
      for (const chunk of distChunks) {
        totalIssuesFound++;
        this.addViolation({
          ruleId: 'client-sim-chunk-present',
          file: `dist/assets/${chunk.chunkName}`,
          line: 1,
          message: `Chunk indebido detectado en dist/assets: "${chunk.chunkName}" (${chunk.sizeKB} KB). Showdown debe eliminarse del cliente.`,
          severity: 'error',
          context: chunk.chunkName
        });
      }
    } else {
      this.markRuleNotApplicable('client-sim-chunk-present', 'El directorio dist/assets no existe antes del build');
    }

    this.context.setMetric('Archivos de Cliente Escaneados', filesScanned);
    this.context.setMetric('Infracciones Detectadas', totalIssuesFound);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new ValidateClientSimDecouplingAuditor());
}
