/**
 * scripts/validation/validate_markdown_links.ts
 *
 * RELATIVE MARKDOWN LINK & DOX INTEGRITY AUDITOR (Node.js 26+ Native)
 *
 * Scans all documentation (.md), skill manuals (SKILL.md), reference guides,
 * and DOX index files (AGENTS.md) across the codebase.
 *
 * Validates that:
 *   1. All relative links point to existent files/directories on disk.
 *   2. No broken links, miscalculated folder depths, or nonexistent targets exist.
 *   3. Excludes code blocks, inline code snippets, and external protocols.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=. scripts/validation/validate_markdown_links.ts
 *   npm run validate:markdown-links
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';

enableCompileCache();

export interface BrokenMarkdownLink {
  readonly sourceFile: string;
  readonly linkText: string;
  readonly rawUrl: string;
  readonly resolvedPath: string;
  readonly error: string;
}

export interface MarkdownLinkAuditResult {
  readonly filesScanned: number;
  readonly linksChecked: number;
  readonly violations: readonly BrokenMarkdownLink[];
  readonly passed: boolean;
}

export interface MarkdownLinkAuditOptions {
  readonly rootDir?: string;
  readonly scanPaths?: readonly string[];
  readonly summaryOnly?: boolean;
  readonly errorsOnly?: boolean;
  readonly outputFile?: string;
}

const DEFAULT_ROOT = path.resolve(import.meta.dirname, '../../..');

export const DEFAULT_SCAN_DIRECTORIES = [
  '.agents/skills',
  'AGENTS.md',
  'README.md',
  'src',
  'tests',
  'database',
  'scripts',
  'supabase',
] as const;

const SKIP_NAMES = [
  'node_modules',
  '.git',
  'dist',
  'dev-dist',
  'coverage',
  'scratch',
  'results',
  'external',
] as const;

/**
 * Strips code fences and inline backticks so syntax examples are not parsed as active links.
 */
export function stripCodeBlocksAndInlineCode(markdown: string): string {
  let clean = markdown.replace(/```[\s\S]*?```/g, '');
  clean = clean.replace(/`[^`\n]+`/g, '');
  return clean;
}

/**
 * Collects all relevant markdown files (.md) recursively.
 */
export function collectMarkdownFiles(targetPath: string, rootDir: string): string[] {
  const fullPath = path.isAbsolute(targetPath) ? targetPath : path.join(rootDir, targetPath);
  if (!fs.existsSync(fullPath)) return [];

  const stat = fs.statSync(fullPath);
  if (stat.isFile()) {
    return fullPath.endsWith('.md') ? [fullPath] : [];
  }

  const results: string[] = [];
  const entries = fs.readdirSync(fullPath, { withFileTypes: true });

  for (const entry of entries) {
    if ((SKIP_NAMES as readonly string[]).includes(entry.name)) continue; // no-domain: Non-domain utility collection or data structure

    const childPath = path.join(fullPath, entry.name);
    if (entry.isDirectory()) {
      results.push(...collectMarkdownFiles(childPath, rootDir));
    } else if (entry.isFile() && entry.name.endsWith('.md')) {
      results.push(childPath);
    }
  }

  return results;
}

/**
 * Parses all markdown links in a file and returns broken references.
 */
export function checkMarkdownLinksInContent(
  content: string,
  filePath: string,
  rootDir: string,
): { linksChecked: number; brokenLinks: BrokenMarkdownLink[] } {
  const cleanContent = stripCodeBlocksAndInlineCode(content);
  const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const brokenLinks: BrokenMarkdownLink[] = [];
  let linksChecked = 0;
  let match: RegExpExecArray | null;

  while ((match = linkRegex.exec(cleanContent)) !== null) {
    const linkText = match[1]!.trim();
    const rawUrl = match[2]!.trim();

    // Skip external protocols and app schemes
    if (
      rawUrl.startsWith('http://') ||
      rawUrl.startsWith('https://') ||
      rawUrl.startsWith('mailto:') ||
      rawUrl.startsWith('conversation://') ||
      rawUrl.startsWith('file://')
    ) {
      continue;
    }

    linksChecked++;
    const [urlPath] = rawUrl.split('#');

    let resolvedTarget = filePath;
    if (urlPath && urlPath.length > 0) {
      if (urlPath.startsWith('/')) {
        resolvedTarget = path.join(rootDir, urlPath);
      } else {
        resolvedTarget = path.resolve(path.dirname(filePath), urlPath);
      }
    }

    // Check if target file or directory exists
    if (!fs.existsSync(resolvedTarget)) {
      brokenLinks.push({
        sourceFile: path.relative(rootDir, filePath).replace(/\\/g, '/'),
        linkText,
        rawUrl,
        resolvedPath: path.relative(rootDir, resolvedTarget).replace(/\\/g, '/'),
        error: 'Target path does not exist on disk',
      });
    }
  }

  return { linksChecked, brokenLinks };
}

/**
 * Runs the full markdown link audit.
 */
export function auditMarkdownLinks(options: MarkdownLinkAuditOptions = {}): MarkdownLinkAuditResult {
  const root = options.rootDir ?? DEFAULT_ROOT;
  const scanDirs = options.scanPaths ?? DEFAULT_SCAN_DIRECTORIES;

  const fileSet = new Set<string>();
  for (const dir of scanDirs) {
    const files = collectMarkdownFiles(dir, root);
    for (const f of files) fileSet.add(f);
  }

  const allFiles = Array.from(fileSet);
  let totalLinks = 0;
  const violations: BrokenMarkdownLink[] = [];

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const { linksChecked, brokenLinks } = checkMarkdownLinksInContent(content, filePath, root);
    totalLinks += linksChecked;
    violations.push(...brokenLinks);
  }

  return {
    filesScanned: allFiles.length,
    linksChecked: totalLinks,
    violations,
    passed: violations.length === 0,
  };
}

import { BaseAuditor } from '../../lib/auditorBase.ts';

export type MarkdownLinkRuleId = 'markdown-broken-relative-link';

export const MARKDOWN_LINK_RULES: readonly MarkdownLinkRuleId[] = [
  'markdown-broken-relative-link'
] as const;

export class MarkdownLinkAuditor extends BaseAuditor<MarkdownLinkRuleId> {
  private readonly scanRoots: readonly string[];

  constructor(scanRoots: readonly string[] = DEFAULT_SCAN_DIRECTORIES) {
    super({
      id: 'validate_markdown_links',
      name: 'Markdown & DOX Relative Links Auditor',
      description: 'Enlaces relativos rotos en documentación markdown',
      family: 'documentation',
      ruleIds: MARKDOWN_LINK_RULES,
      ruleDescriptions: {
        'markdown-broken-relative-link': 'Enlace relativo roto en archivo markdown'
      }
    });
    this.scanRoots = scanRoots;
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Collecting markdown files...');
    const result = auditMarkdownLinks({ scanPaths: this.scanRoots, rootDir: process.cwd() });
    this.filesScannedCount = result.filesScanned;

    this.context.logStep(2, 2, 'Verifying relative links...');
    for (const v of result.violations) {
      this.addViolation({
        ruleId: 'markdown-broken-relative-link',
        severity: 'error',
        file: v.sourceFile,
        line: 1,
        message: `Broken relative link "${v.linkText}" -> target "${v.resolvedPath}" does not exist on disk`,
        context: v.rawUrl
      });
    }

    this.context.setMetric('Markdown files scanned', result.filesScanned);
    this.context.setMetric('Relative links verified', result.linksChecked);
    this.context.setMetric('Broken link violations', result.violations.length);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new MarkdownLinkAuditor());
}

