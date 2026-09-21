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
  if (filename.includes('audit_project') || filename.includes('validate_type_check') || filename.includes('validate_eslint')) {
    return HEAVY_TIMEOUT_MS;
  }
  return DEFAULT_TIMEOUT_MS;
}

export const AUDIT_PRESETS = {
  lint: [
    'validate_domain_types',
    'validate_o1_data_structures',
    'validate_component_styles',
    'audit_project',
    'validate_vue_sfc_hygiene',
    'validate_console_cleanliness',
    'validate_audit_headers',
    'validate_type_check',
    'validate_markdown_lint',
    'validate_eslint'
  ],
  md: [
    'validate_markdown_links',
    'validate_markdown_code_references',
    'validate_markdown_lint',
    'validate_markdown_syntax',
    'validate_dox_integrity'
  ]
} as const;

export const AST_DEPENDENT_SUITE_IDS = [
  'validate_pinia_reactivity',
  'validate_client_sim_decoupling',
  'validate_save_persistence_parity',
  'validate_reactive_purity',
  'validate_reactive_leaks',
  'validate_bundle_budget',
  'validate_showdown_parity',
  'validate_duplicate_constants'
] as const;

export type AstDependentSuiteId = (typeof AST_DEPENDENT_SUITE_IDS)[number];

export const AST_DEPENDENT_SUITES: ReadonlySet<string> = new Set(AST_DEPENDENT_SUITE_IDS);

export type AuditPresetName = keyof typeof AUDIT_PRESETS;

export interface DiscoveryOptions {
  baseDir?: string;
  family?: string;
  task?: string;
  suites?: string[];
  preset?: string;
  fastOnly?: boolean;
}

const DEFAULT_PERMISSIONS = [
  '--permission',
  '--experimental-strip-types',
  '--allow-fs-read=*',
  '--allow-fs-write=*',
  '--allow-child-process',
  '--allow-addons'
] as const;

function getPermissionsForTask(filename: string): string[] {
  const perms: string[] = [...DEFAULT_PERMISSIONS]; // no-domain: Non-domain utility collection or data structure
  if (filename.includes('audit_project') || filename.includes('convert_assets')) {
    perms.push('--allow-worker');
  }
  return perms;
}

/** Convert snake_case or kebab-case filename to Title Case */
function formatTaskTitle(filename: string): string {
  if (filename === 'audit_project' || filename === 'audit_project.ts') {
    return 'Project Architecture & Style Rules';
  }
  const base = filename.replace(/\.ts$/, '').replace(/^(validate_|audit_)/, '');
  return base
    .split(/[_-]/)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(' ');
}

export async function discoverAuditors(options: DiscoveryOptions = {}): Promise<AuditTaskDefinition[]> {
  const baseDir = options.baseDir || DEFAULT_AUDITORS_DIR;
  const discovered: AuditTaskDefinition[] = [];

  // Resolve target suites from options.suites, options.task (comma-separated), or options.preset
  let targetSuiteIds: Set<string> | null = null;
  if (options.preset && options.preset in AUDIT_PRESETS) {
    targetSuiteIds = new Set(AUDIT_PRESETS[options.preset as AuditPresetName]);
  }
  if (options.suites && options.suites.length > 0) {
    targetSuiteIds = new Set([...(targetSuiteIds ?? []), ...options.suites]);
  } else if (options.task && options.task.includes(',')) {
    const list = options.task.split(',').map(s => s.trim()).filter(Boolean);
    targetSuiteIds = new Set([...(targetSuiteIds ?? []), ...list]);
  }

  async function scanDirectory(currentDir: string) {
    let entries: string[]; // no-domain: Non-domain utility collection or data structure
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
        // Skip unit tests, spec files, or developer reporting tools
        if (entry.includes('.spec.') || entry.includes('.test.') || entry.startsWith('report_')) continue;

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
        if (targetSuiteIds && !targetSuiteIds.has(id)) continue;
        if (options.family && options.family !== family) continue;
        if (options.task && !options.task.includes(',') && options.task !== id && !filename.includes(options.task)) continue;
        if (options.fastOnly && !isFast) continue;

        const relScriptPath = path.relative(process.cwd(), fullPath).replace(/\\/g, '/');
        const taskPermissions = getPermissionsForTask(filename);
        const taskArgs = [...taskPermissions, relScriptPath, '--json'];

        if (options.preset === 'lint' && id === 'audit_project') {
          taskArgs.push('--rule', 'fallow');
        } else if (options.preset === 'md' && id === 'audit_project') {
          taskArgs.push('--rule', 'dox');
        }

        discovered.push({
          id,
          name,
          family,
          scriptPath: relScriptPath,
          command: 'node',
          args: taskArgs,
          fast: isFast,
          timeoutMs: getTimeoutForTask(filename),
          order: FAMILY_METADATA[family]?.order ?? 99,
          requiresAst: AST_DEPENDENT_SUITES.has(id)
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
