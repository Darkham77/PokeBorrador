/**
 * scripts/auditors/architecture/validate_component_styles.ts
 *
 * VUE COMPONENT STYLE LINKAGE & SCSS ORPHAN AUDITOR (Node.js 26+ Native)
 *
 * Enforces component-level style governance across the Poké Vicio codebase:
 *   1. Broken style link verification: All `<style src="...">` in `.vue` files
 *      and `@use`/`@import`/`@forward` must resolve to existent files on disk.
 *   2. Missing style linkage verification: Every `.vue` component with custom
 *      template classes must have an associated `<style>` block, explicit link,
 *      or `// style-inherited` marker.
 *   3. SCSS orphan detection: All stylesheets in `src/styles/components/` must be
 *      actively linked or imported in the dependency graph rooted at `src/styles/_index.scss`
 *      or directly inside Vue components.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=. --allow-fs-write=. scripts/auditors/architecture/validate_component_styles.ts
 *   npm run validate:component-styles
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

export interface ComponentStyleViolation {
  readonly file: string;
  readonly type: 'broken_style_link' | 'missing_style_tag' | 'orphaned_scss';
  readonly message: string;
}

export interface ComponentStyleAuditResult {
  readonly vueComponentsScanned: number;
  readonly scssFilesScanned: number;
  readonly violations: readonly ComponentStyleViolation[];
  readonly passed: boolean;
}

const GLOBAL_UTILITY_CLASSES = new Set([ // runtime-set
  'pixelated', 'clickable', 'flex', 'hidden', 'active', 'disabled', 'legacy-ui',
  'legacy-panel', 'legacy-confirm-btn', 'retro-btn', 'pulse', 'gold', 'silver', 'bronze',
  'w-full', 'h-full', 'truncate', 'pointer-events-none', 'pointer-events-auto', 'select-none',
  'custom-scrollbar', 'empty-state', 'scrollable-content', 'modal-footer', 'm-type-tag'
]);

function getAllFiles(dir: string, ext: string): string[] {
  let results: string[] = []; // no-domain
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllFiles(filePath, ext));
    } else if (filePath.endsWith(ext)) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Standard SASS candidate resolution
 */
function resolveSassPath(importPath: string, fromFile: string, srcDir: string): string | null {
  let baseDir = path.dirname(fromFile);
  let cleanImport = importPath;

  if (cleanImport.startsWith('@/')) {
    baseDir = srcDir;
    cleanImport = cleanImport.slice(2);
  } else if (cleanImport.startsWith('~')) {
    cleanImport = cleanImport.slice(1);
  }

  const dirPart = path.dirname(cleanImport);
  const baseName = path.basename(cleanImport);

  const candidates = [
    path.resolve(baseDir, cleanImport),
    path.resolve(baseDir, `${cleanImport}.scss`),
    path.resolve(baseDir, `${cleanImport}.css`),
    path.resolve(baseDir, dirPart, `_${baseName}.scss`),
    path.resolve(baseDir, cleanImport, '_index.scss'),
    path.resolve(baseDir, cleanImport, 'index.scss')
  ];

  for (const cand of candidates) {
    if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
      return cand;
    }
  }

  return null;
}

export function auditComponentStyles(rootDir: string = process.cwd()): ComponentStyleAuditResult {
  const srcDir = path.join(rootDir, 'src');
  const vueFiles = getAllFiles(srcDir, '.vue');
  const scssFiles = getAllFiles(srcDir, '.scss');

  const violations: ComponentStyleViolation[] = [];
  const importedScssFiles = new Set<string>();

  function trackScssFile(filePath: string) {
    const normalized = path.normalize(filePath);
    if (importedScssFiles.has(normalized)) return;
    importedScssFiles.add(normalized);

    if (fs.existsSync(normalized)) {
      const content = fs.readFileSync(normalized, 'utf-8');
      const matches = content.matchAll(/@(?:use|import|forward)\s+["']([^"']+)["']/g);
      for (const m of matches) {
        const importTarget = m[1]!;
        const resolved = resolveSassPath(importTarget, normalized, srcDir);
        if (resolved) {
          trackScssFile(resolved);
        }
      }
    }
  }

  // 1. Seed root SCSS graph (src/styles/_index.scss, main styles)
  const rootScss = path.join(srcDir, 'styles', '_index.scss');
  if (fs.existsSync(rootScss)) {
    trackScssFile(rootScss);
  }

  // 2. Audit Vue components
  for (const file of vueFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');

    const hasStyleTag = /<style[\s>]/i.test(content);
    const styleSrcMatch = content.match(/<style[^>]*src=["']([^"']+)["']/i);

    // Track all SCSS imports in Vue component
    const scssMatches = content.matchAll(/@(?:use|import|forward)\s+["']([^"']+)["']|src=["']([^"']+\.scss)["']/g);
    for (const m of scssMatches) {
      const importTarget = m[1] || m[2];
      if (importTarget) {
        const resolved = resolveSassPath(importTarget, file, srcDir);
        if (resolved) {
          trackScssFile(resolved);
        }
      }
    }

    // Check broken style links in <style src="...">
    if (styleSrcMatch) {
      const srcPath = styleSrcMatch[1]!;
      const resolved = resolveSassPath(srcPath, file, srcDir);

      if (!resolved) {
        violations.push({
          file: relPath,
          type: 'broken_style_link',
          message: `Style src points to non-existent file: ${srcPath}`
        });
      } else {
        trackScssFile(resolved);
      }
    }

    // Check missing style tag on component defining custom template classes
    if (!hasStyleTag && !content.includes('// style-inherited')) {
      const classMatches = content.matchAll(/class=["']([^"']+)["']/g);
      const customClasses: string[] = []; // no-domain

      for (const m of classMatches) {
        const clsList = m[1]!.split(/\s+/).filter(Boolean);
        for (const c of clsList) {
          if (
            !c.startsWith('var(') &&
            !c.includes('{') &&
            !c.includes('}') &&
            !c.startsWith(':') &&
            !c.includes('[') &&
            !c.includes(']') &&
            !c.includes('(') &&
            !c.includes(')') &&
            !GLOBAL_UTILITY_CLASSES.has(c)
          ) {
            customClasses.push(c);
          }
        }
      }

      if (customClasses.length > 0) {
        violations.push({
          file: relPath,
          type: 'missing_style_tag',
          message: `Defines ${customClasses.length} custom template classes (${customClasses.slice(0, 3).join(', ')}...) without an associated <style> block or // style-inherited marker`
        });
      }
    }
  }

  // 3. Detect orphaned SCSS files in src/styles/components/
  const componentScssDir = path.join(srcDir, 'styles', 'components');
  const componentScssFiles = getAllFiles(componentScssDir, '.scss');

  for (const file of componentScssFiles) {
    const normalized = path.normalize(file);

    if (!importedScssFiles.has(normalized)) {
      const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
      violations.push({
        file: relPath,
        type: 'orphaned_scss',
        message: `SCSS component stylesheet is never imported by any Vue component or SCSS root`
      });
    }
  }

  return {
    vueComponentsScanned: vueFiles.length,
    scssFilesScanned: scssFiles.length,
    violations,
    passed: violations.length === 0
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) {
  const validator = setupValidation({
    title: 'VUE COMPONENT STYLE LINKAGE & SCSS ORPHAN AUDITOR',
    family: 'architecture'
  });

  const result = auditComponentStyles();

  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain

  for (const v of result.violations) {
    errors.push(`[${v.type.toUpperCase()}] ${v.file}: ${v.message}`);
  }

  await validator.finish(
    {
      'Vue components scanned': result.vueComponentsScanned,
      'SCSS stylesheets verified': result.scssFilesScanned,
      'Style linkage violations': result.violations.length
    },
    errors,
    warnings
  );
}
