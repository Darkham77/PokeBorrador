/**
 * scripts/auditors/architecture/validate_build_tools.ts
 *
 * Verifies native build tools and binaries (e.g. css-checker-kit).
 */

import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

const isWin = process.platform === 'win32';

export function findCssCheckerBinary(): boolean {
  try {
    if (isWin) {
      execFileSync('where.exe', ['css-checker.exe'], { stdio: 'ignore' });
    } else {
      execFileSync('which', ['css-checker'], { stdio: 'ignore' });
    }
    return true;
  } catch {
    // continue checking local node_modules
  }

  const staticRelativeCandidates: string[] = [
    'node_modules/.bin/css-checker.cmd',
    'node_modules/.bin/css-checker.exe',
    'node_modules/.bin/css-checker',
    'node_modules/css-checker-kit/bin/css-checker.exe',
    'node_modules/css-checker-kit/bin/css-checker',
  ];

  for (const relPath of staticRelativeCandidates) {
    if (fs.existsSync(relPath)) {
      return true;
    }
  }

  if (isWin && process.env.APPDATA) {
    const cleanAppData = process.env.APPDATA.replace(/[^a-zA-Z0-9_:\\\-\s.]/g, '');
    if (fs.existsSync(path.join(cleanAppData, 'npm', 'css-checker.exe'))) return true;
    if (fs.existsSync(path.join(cleanAppData, 'npm', 'css-checker.cmd'))) return true;
  }

  const nodeDir = process.execPath ? path.dirname(process.execPath) : '';
  if (nodeDir && isWin) {
    if (fs.existsSync(path.join(nodeDir, 'bin', 'css-checker.exe'))) return true;
    if (fs.existsSync(path.join(nodeDir, 'css-checker.exe'))) return true;
  }

  return false;
}

export type BuildToolsRuleId = 'build-tools-binary-missing';

export const BUILD_TOOLS_RULES: readonly BuildToolsRuleId[] = [
  'build-tools-binary-missing'
] as const;

export class BuildToolsAuditor extends BaseAuditor<BuildToolsRuleId> {
  constructor() {
    super({
      id: 'validate_build_tools',
      name: 'Build Tools & Binaries Validator',
      description: 'Verifica binarios nativos y herramientas de build',
      family: 'architecture',
      ruleIds: BUILD_TOOLS_RULES,
      ruleDescriptions: {
        'build-tools-binary-missing': 'Binario nativo o herramienta de build no disponible'
      }
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 1, 'Verifying native binaries and build tools (css-checker-kit)...');
    this.filesScannedCount = 1;

    let ready = findCssCheckerBinary();

    if (!ready) {
      try {
        const pkgDir = 'node_modules/css-checker-kit';
        const nodeDir = process.execPath ? path.dirname(process.execPath) : '';
        const npmCli = nodeDir ? path.join(nodeDir, 'node_modules', 'npm', 'bin', 'npm-cli.js') : '';

        if (npmCli && fs.existsSync(npmCli)) {
          if (!fs.existsSync(pkgDir)) {
            execFileSync(process.execPath, [npmCli, 'install', '--save-dev', 'css-checker-kit', '--ignore-scripts=false'], { cwd: process.cwd() });
          }
          execFileSync(process.execPath, [npmCli, 'run', 'postinstall', '--ignore-scripts=false'], { cwd: pkgDir });
        } else {
          const npmCmd = isWin ? 'npm.cmd' : 'npm';
          if (!fs.existsSync(pkgDir)) {
            execFileSync(npmCmd, ['install', '--save-dev', 'css-checker-kit', '--ignore-scripts=false'], { cwd: process.cwd(), shell: isWin });
          }
          execFileSync(npmCmd, ['run', 'postinstall', '--ignore-scripts=false'], { cwd: pkgDir, shell: isWin });
        }
        ready = findCssCheckerBinary();
      } catch (err) {
        this.context.logProgress(`Auto-build of css-checker binary failed: ${err instanceof Error ? err.message : String(err)}`);
      }
    }

    if (!ready) {
      this.addViolation({
        ruleId: 'build-tools-binary-missing',
        severity: 'error',
        file: 'package.json',
        line: 1,
        message: 'css-checker-kit binary could not be found or built.',
        context: 'css-checker'
      });
    }

    this.context.setMetric('Build tools ready', ready ? 1 : 0);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new BuildToolsAuditor());
}
