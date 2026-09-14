/**
 * scripts/auditors/architecture/validate_dead_css.ts
 *
 * SCOPED DEAD CSS & ORPHAN SELECTOR AUDITOR (Node.js 26+ Native)
 *
 * Enforces lean, dead-code-free component stylesheets across Vue 3 Single File Components (.vue):
 *   1. Scans all .vue components in src/components/ and src/views/.
 *   2. Extracts <style scoped> blocks and accurately parses declared CSS/SCSS class selectors.
 *   3. Verifies that every scoped class selector is referenced in the component template/script,
 *      or emitted dynamically by domain helpers/stores in src/.
 *   4. Safely ignores :deep(), :slotted(), Vue transition hooks (*-enter-*, *-leave-*),
 *      SCSS mixins, @use/@import statements, and global utility classes.
 *
 * Escape Hatch:
 *   /* css-ok: <reason> *\/ or // css-ok: <reason> disables violation for that class.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* --allow-fs-write=* scripts/auditors/architecture/validate_dead_css.ts
 *   npm run validate:dead-css
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';
import type { FindingSeverity } from '../../lib/auditContract.ts';

enableCompileCache();

export interface DeadCssViolation {
  readonly file: string;
  readonly line: number;
  readonly className: string;
  readonly message: string;
  readonly severity: FindingSeverity;
}

export interface DeadCssAuditResult {
  readonly componentsScanned: number;
  readonly scopedClassesChecked: number;
  readonly violations: readonly DeadCssViolation[];
  readonly passed: boolean;
}

const TARGET_DIRS = ['src/components', 'src/views'] as const;
const IGNORE_PATTERNS = ['.spec.', '.test.', '.simulation.', 'node_modules', 'dist', 'scratch'] as const;

const GLOBAL_UTILITY_CLASSES = new Set([ // runtime-set: Fast O(1) membership lookup set
  'pixelated', 'allow-aliasing', 'clickable', 'flex', 'hidden', 'active', 'disabled', 'legacy-ui',
  'legacy-panel', 'legacy-confirm-btn', 'retro-btn', 'pulse', 'gold', 'silver', 'bronze',
  'w-full', 'h-full', 'truncate', 'pointer-events-none', 'pointer-events-auto', 'select-none',
  'custom-scrollbar', 'custom-scrollbar-vicio', 'empty-state', 'scrollable-content', 'modal-footer', 'm-type-tag'
]);

const VUE_TRANSITION_SUFFIXES = [
  '-enter-from',
  '-enter-active',
  '-enter-to',
  '-leave-from',
  '-leave-active',
  '-leave-to'
] as const;

function isTargetComponent(filePath: string): boolean {
  const norm = filePath.replace(/\\/g, '/');
  if (IGNORE_PATTERNS.some(pat => norm.includes(pat))) return false;
  return norm.endsWith('.vue');
}

/**
 * Builds a fast global dictionary of all words/tokens present in src/ code (templates, scripts, stores, logic).
 */
function buildGlobalCodeTokens(srcDir: string): Set<string> {
  const tokens = new Set<string>(); // runtime-set: Fast O(1) membership lookup set

  function walk(dir: string) {
    if (!fs.existsSync(dir)) return;
    const entries = fs.readdirSync(dir, { withFileTypes: true });
    for (const entry of entries) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        if (!entry.name.startsWith('.') && entry.name !== 'node_modules') {
          walk(full);
        }
      } else if (entry.isFile() && (full.endsWith('.ts') || full.endsWith('.vue') || full.endsWith('.json'))) {
        const content = fs.readFileSync(full, 'utf-8');
        // Extract all alphanumeric words/identifiers
        const words = content.match(/[a-zA-Z0-9_-]{2,}/g);
        if (words) {
          for (const w of words) {
            tokens.add(w);
          }
        }
      }
    }
  }

  walk(srcDir);
  return tokens;
}

export function auditDeadCss(): DeadCssAuditResult {
  const violations: DeadCssViolation[] = [];
  let componentsScanned = 0;
  let scopedClassesChecked = 0;

  const srcDir = path.resolve(process.cwd(), 'src');
  const globalTokens = buildGlobalCodeTokens(srcDir);

  for (const relDir of TARGET_DIRS) {
    const fullDir = path.resolve(process.cwd(), relDir);
    if (!fs.existsSync(fullDir)) continue;

    function walkDir(dir: string) {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walkDir(fullPath);
        } else if (entry.isFile() && isTargetComponent(fullPath)) {
          scanComponent(fullPath);
        }
      }
    }

    walkDir(fullDir);
  }

  function scanComponent(filePath: string) {
    componentsScanned++;
    const rawContent = fs.readFileSync(filePath, 'utf-8');

    // Extract template content
    const templateMatch = /<template\b[^>]*>([\s\S]*?)<\/template>/i.exec(rawContent);
    const templateContent = templateMatch ? templateMatch[1] : '';

    // Extract scripts content
    const scriptRegex = /<script\b[^>]*>([\s\S]*?)<\/script>/gi;
    let scriptsContent = '';
    let scriptMatch: RegExpExecArray | null;
    while ((scriptMatch = scriptRegex.exec(rawContent)) !== null) {
      scriptsContent += `\n${scriptMatch[1]}`;
    }

    const componentLogic = `${templateContent}\n${scriptsContent}`;

    // Extract scoped styles
    const scopedStyleRegex = /<style\b[^>]*\bscoped\b[^>]*>([\s\S]*?)<\/style>/gi;
    let styleMatch: RegExpExecArray | null;

    while ((styleMatch = scopedStyleRegex.exec(rawContent)) !== null) {
      const styleContent = styleMatch[1] || '';
      const styleStartIndex = styleMatch.index;
      const linesBeforeStyle = rawContent.substring(0, styleStartIndex).split('\n').length;

      const lines = styleContent.split('\n');
      for (let i = 0; i < lines.length; i++) {
        let line = (lines[i] ?? '').trim();
        const lineNum = linesBeforeStyle + i;

        if (!line || line.startsWith('//') || line.startsWith('/*') || line.startsWith('*')) continue;
        if (line.includes('css-ok') || line.includes('dead-css-ok')) continue;

        // Skip @use, @import, @forward, @include, @extend
        if (/^@(?:use|import|forward|include|extend)\b/.test(line)) continue;

        // Skip lines that are purely property declarations without selectors (e.g. `padding: 10px;`)
        if (/^[a-zA-Z-]+:\s*[^;{]+;?$/.test(line) && !line.includes('{')) continue;

        // Strip comments and strings
        line = line.replace(/\/\*[\s\S]*?\*\//g, '');
        line = line.replace(/\/\/[^\n]*/g, '');
        line = line.replace(/'[^']*'/g, "''").replace(/"[^"]*"/g, '""');

        // Mask out :deep(...) and :slotted(...)
        line = line.replace(/::?(?:deep|slotted)\([^)]*\)/g, '');

        // Extract class selectors
        const classRegex = /(?:^|[^\w-])\.([a-zA-Z_-][a-zA-Z0-9_-]*)/g;
        let match: RegExpExecArray | null;
        while ((match = classRegex.exec(line)) !== null) {
          const className = match[1];
          if (!className) continue;

          // Skip file extensions or numbers
          if (className === 'scss' || className === 'css' || className === 'vue' || className === 'png' || className === 'webp') continue;
          if (GLOBAL_UTILITY_CLASSES.has(className)) continue;
          if (VUE_TRANSITION_SUFFIXES.some(suffix => className.endsWith(suffix))) continue;

          scopedClassesChecked++;

          // Check if class exists in component itself or in global code tokens
          if (!componentLogic.includes(className) && !globalTokens.has(className)) {
            violations.push({
              file: filePath,
              line: lineNum,
              className,
              severity: 'warning',
              message: `Clase CSS scoped '.${className}' es código muerto (huérfana): no se encuentra en el componente ni en el código de la aplicación.`
            });
          }
        }
      }
    }
  }

  const hasErrors = violations.some(v => v.severity === 'error');
  return {
    componentsScanned,
    scopedClassesChecked,
    violations,
    passed: !hasErrors
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'SCOPED DEAD CSS AUDITOR',
    family: 'architecture',
    id: 'validate_dead_css'
  });

  const result = auditDeadCss();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    const relFile = path.relative(process.cwd(), v.file).replace(/\\/g, '/');
    const msg = `[DEAD_SCOPED_CSS] ${relFile}:${v.line} → ${v.message}`;
    if (v.severity === 'error') {
      errors.push(msg);
    } else {
      warnings.push(msg);
    }
  }

  await validator.finish(
    {
      'Components scanned': result.componentsScanned,
      'Scoped classes checked': result.scopedClassesChecked,
      'Dead scoped CSS warnings': result.violations.length
    },
    errors,
    warnings
  );
}
