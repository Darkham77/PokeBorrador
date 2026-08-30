// fallow-ignore-file security-sink
/**
 * scripts/maintenance/auditScanner.ts
 * 
 * AUDITOR SCANNER & AUTO-DISCOVERY ENGINE (Node.js 26+)
 * Scans scripts/auditors/ recursively, infers families, generates canonical task definitions,
 * and guarantees that ZERO auditors are ever left behind from the orchestrator.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import {
  type AuditFamily,
  type AuditTaskDefinition,
  AUDIT_FAMILIES,
  FAMILY_METADATA
} from '../lib/auditContract.ts';

const DEFAULT_AUDITORS_DIR = path.resolve(process.cwd(), 'scripts/auditors');
const DEFAULT_TIMEOUT_MS = 60000;
const HEAVY_TIMEOUT_MS = 180000; // 3 minutes for full repo AST / DB migration validation

function getTimeoutForTask(filename: string): number {
  if (filename.includes('audit_project') || filename.includes('validate_save_migrations')) {
    return HEAVY_TIMEOUT_MS;
  }
  return DEFAULT_TIMEOUT_MS;
}

export interface DiscoveryOptions {
  baseDir?: string;
  family?: string;
  task?: string;
  fastOnly?: boolean;
}

const DEFAULT_PERMISSIONS = [
  '--permission',
  '--experimental-strip-types',
  '--allow-fs-read=*',
  '--allow-fs-write=*'
] as const;

function getPermissionsForTask(filename: string): string[] {
  const perms: string[] = [...DEFAULT_PERMISSIONS]; // no-domain
  if (filename.includes('audit_project') || filename.includes('validate_fsm_all') || filename.includes('validate_build_tools')) {
    perms.push('--allow-child-process');
  }
  if (filename.includes('audit_project') || filename.includes('convert_assets')) {
    perms.push('--allow-worker');
  }
  return perms;
}

/** Convert snake_case or kebab-case filename to Title Case */
function formatTaskTitle(filename: string): string {
  const base = filename.replace(/\.ts$/, '').replace(/^(validate_|audit_)/, '');
  return base
    .split(/[_-]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function discoverAuditors(options: DiscoveryOptions = {}): Promise<AuditTaskDefinition[]> {
  const baseDir = options.baseDir || DEFAULT_AUDITORS_DIR;
  const discovered: AuditTaskDefinition[] = [];

  async function scanDirectory(currentDir: string) {
    let entries: string[] = []; // no-domain
    try {
      entries = await fs.readdir(currentDir);
    } catch {
      return;
    }

    for (const entry of entries) {
      const fullPath = path.join(currentDir, entry);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        if (!entry.startsWith('_') && entry !== 'node_modules' && entry !== 'lib') {
          await scanDirectory(fullPath);
        }
      } else if (stat.isFile() && entry.endsWith('.ts') && !entry.startsWith('_')) {
        // Skip unit tests or spec files if present inside auditors
        if (entry.includes('.spec.') || entry.includes('.test.')) continue;

        // Relative path from baseDir to infer family
        const relPath = path.relative(baseDir, fullPath).replace(/\\/g, '/');
        const segments = relPath.split('/');
        
        let family: AuditFamily = 'architecture';
        if (segments.length > 1 && AUDIT_FAMILIES.includes(segments[0] as AuditFamily)) {
          family = segments[0] as AuditFamily;
        }

        const filename = path.basename(entry, '.ts');
        const id = filename;
        const name = formatTaskTitle(filename);
        const isFast = family === 'architecture' || filename.includes('domain_types');

        // Check if filter matches
        if (options.family && options.family !== family) continue;
        if (options.task && options.task !== id && !filename.includes(options.task)) continue;
        if (options.fastOnly && !isFast) continue;

        const relScriptPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
        const taskPermissions = getPermissionsForTask(filename);

        discovered.push({
          id,
          name,
          family,
          scriptPath: relScriptPath,
          command: 'node',
          args: [...taskPermissions, relScriptPath, '--json'],
          fast: isFast,
          timeoutMs: getTimeoutForTask(filename),
          order: FAMILY_METADATA[family]?.order ?? 99
        });
      }
    }
  }

  await scanDirectory(baseDir);

  // Sort discovered tasks deterministically by family order, then by filename
  discovered.sort((a, b) => {
    const familyDiff = (a.order ?? 99) - (b.order ?? 99);
    if (familyDiff !== 0) return familyDiff;
    return a.id.localeCompare(b.id);
  });

  return discovered;
}
