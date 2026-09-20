/**
 * scripts/auditors/architecture/validate_component_styles.ts
 *
 * VUE COMPONENT STYLE LINKAGE & SCSS ORPHAN AUDITOR (Node.js 26+ Native)
 *
 * Enforces component-level style governance across the Poké Vicio codebase:
 *   1. Broken style link verification: All `<style src="...">` in `.vue` files
 *      and `@use`/`@import`/`@forward` must resolve to existent files on disk.
 *   2. Missing style linkage verification: Every `.vue` component with custom
 *      template classes must have an associated `<style>` block or explicit link.
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
import { BaseAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type ComponentStyleRuleId =
  | 'broken-style-link'
  | 'missing-style-tag'
  | 'banned-style-inherited'
  | 'orphaned-scss';

export const COMPONENT_STYLE_RULES: readonly ComponentStyleRuleId[] = [
  'broken-style-link',
  'missing-style-tag',
  'banned-style-inherited',
  'orphaned-scss'
];

export interface ComponentStyleViolation {
  readonly file: string;
  readonly type: 'broken_style_link' | 'missing_style_tag' | 'banned_style_inherited' | 'orphaned_scss';
  readonly message: string;
}

export interface ComponentStyleAuditResult {
  readonly vueComponentsScanned: number;
  readonly scssFilesScanned: number;
  readonly violations: readonly ComponentStyleViolation[];
  readonly passed: boolean;
}

const GLOBAL_UTILITY_CLASSES = new Set([ // runtime-set: Fast O(1) membership lookup set
  'pixelated', 'allow-aliasing', 'clickable', 'flex', 'hidden', 'active', 'disabled', 'legacy-ui',
  'legacy-panel', 'legacy-confirm-btn', 'retro-btn', 'pv-button-retro', 'pulse', 'gold', 'silver', 'bronze',
  'w-full', 'h-full', 'truncate', 'pointer-events-none', 'pointer-events-auto', 'select-none',
  'custom-scrollbar', 'empty-state', 'scrollable-content', 'modal-footer', 'm-type-tag', 'emoji'
]);

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

export class ComponentStylesAuditor extends BaseAuditor<ComponentStyleRuleId> {
  private readonly collectedViolations: ComponentStyleViolation[] = [];
  private vueCount = 0;
  private scssCount = 0;

  constructor() {
    super({
      id: 'validate_component_styles',
      name: 'Vue Component Style Linkage & SCSS Auditor',
      description: 'Valida enlaces de estilos de componentes y huérfanos SCSS',
      family: 'architecture',
      ruleIds: COMPONENT_STYLE_RULES,
      ruleDescriptions: {
        'broken-style-link': 'Enlace de estilo roto o archivo inexistente',
        'missing-style-tag': 'Componente con clases sin bloque de estilos',
        'banned-style-inherited': 'Uso prohibido del marcador style-inherited',
        'orphaned-scss': 'Archivo SCSS huérfano sin importar ni enlazar'
      },
      roots: ['src']
    });
  }

  public getViolations(): readonly ComponentStyleViolation[] {
    return this.collectedViolations;
  }

  public getVueCount(): number {
    return this.vueCount;
  }

  public getScssCount(): number {
    return this.scssCount;
  }

  public override runAudit(): void {
    const srcDir = path.join(this.projectRoot, 'src');
    const vueFiles = this.context.collectFiles(['src'], new Set(['.vue']));
    const scssFiles = this.context.collectFiles(['src'], new Set(['.scss']));

    this.vueCount = vueFiles.length;
    this.scssCount = scssFiles.length;
    this.filesScannedCount = vueFiles.length + scssFiles.length;

    const importedScssFiles = new Set<string>();

    const trackScssFile = (filePath: string) => {
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
    };

    // 1. Seed root SCSS graph (src/styles/_index.scss, main styles)
    const rootScss = path.join(srcDir, 'styles', '_index.scss');
    if (fs.existsSync(rootScss)) {
      trackScssFile(rootScss);
    }

    // 2. Audit Vue components
    for (const file of vueFiles) {
      const content = fs.readFileSync(file, 'utf-8');
      const relPath = path.relative(this.projectRoot, file).replace(/\\/g, '/');

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
          const v: ComponentStyleViolation = {
            file: relPath,
            type: 'broken_style_link',
            message: `Style src points to non-existent file: ${srcPath}`
          };
          this.collectedViolations.push(v);
          this.addViolation({
            ruleId: 'broken-style-link',
            severity: 'error',
            file: relPath,
            line: 1,
            message: v.message,
            context: styleSrcMatch[0]
          });
        } else {
          trackScssFile(resolved);
        }
      }

      // Check for illegal style-inherited bypass directive
      if (content.includes('style-inherited')) {
        const v: ComponentStyleViolation = {
          file: relPath,
          type: 'banned_style_inherited',
          message: `Directiva ilegal '// ' + 'style-inherited' detectada. Los estilos scoped en Vue 3 no penetran a componentes hijos; cada SFC debe declarar o enlazar explícitamente sus propios estilos.`
        };
        this.collectedViolations.push(v);
        this.addViolation({
          ruleId: 'banned-style-inherited',
          severity: 'error',
          file: relPath,
          line: 1,
          message: v.message,
          context: 'style-inherited'
        });
      }

      // Check whether component has a valid (non-empty or src-linked) style block
      const styleMatches = Array.from(content.matchAll(/<style\b([^>]*)>([\s\S]*?)<\/style>/gi));
      const hasValidStyle = styleMatches.some(sm => {
        const attrs = sm[1] ?? '';
        const body = (sm[2] ?? '')
          .replace(/\/\*[\s\S]*?\*\//g, '')
          .replace(/\/\/[^\n]*/g, '')
          .trim();
        return /\bsrc=["']/.test(attrs) || body.length > 0;
      });

      // Check missing style tag on component defining custom template classes
      if (!hasValidStyle) {
        const classMatches = content.matchAll(/(?<![-:\w])class=["']([^"']+)["']/g);
        const customClasses: string[] = []; // no-domain: Non-domain utility collection or data structure

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

        // Also harvest static string literal class tokens from dynamic :class bindings
        const dynamicClassMatches = content.matchAll(/(?:\s:|\bv-bind:)class=["']([^"']+)["']/g);
        for (const dm of dynamicClassMatches) {
          const expr = dm[1]!;
          const strLiterals = expr.matchAll(/['`]([a-zA-Z0-9_-]+)['`]/g);
          for (const sl of strLiterals) {
            const c = sl[1]!;
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
          const v: ComponentStyleViolation = {
            file: relPath,
            type: 'missing_style_tag',
            message: `Defines ${customClasses.length} custom template classes (${customClasses.slice(0, 3).join(', ')}...) without an associated non-empty <style> block`
          };
          this.collectedViolations.push(v);
          this.addViolation({
            ruleId: 'missing-style-tag',
            severity: 'error',
            file: relPath,
            line: 1,
            message: v.message,
            context: customClasses.slice(0, 3).join(', ')
          });
        }
      }
    }

    // 3. Detect orphaned SCSS files in src/styles/components/
    const componentScssDir = path.join(srcDir, 'styles', 'components');
    const componentScssFiles = scssFiles.filter(f => f.startsWith(componentScssDir));

    for (const file of componentScssFiles) {
      const normalized = path.normalize(file);

      if (!importedScssFiles.has(normalized)) {
        const relPath = path.relative(this.projectRoot, file).replace(/\\/g, '/');
        const v: ComponentStyleViolation = {
          file: relPath,
          type: 'orphaned_scss',
          message: `SCSS component stylesheet is never imported by any Vue component or SCSS root`
        };
        this.collectedViolations.push(v);
        this.addViolation({
          ruleId: 'orphaned-scss',
          severity: 'error',
          file: relPath,
          line: 1,
          message: v.message,
          context: relPath
        });
      }
    }
  }
}

export function auditComponentStyles(_rootDir: string = process.cwd()): ComponentStyleAuditResult {
  const auditor = new ComponentStylesAuditor();
  auditor.runAudit();
  return {
    vueComponentsScanned: auditor.getVueCount(),
    scssFilesScanned: auditor.getScssCount(),
    violations: auditor.getViolations(),
    passed: auditor.getViolations().length === 0
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new ComponentStylesAuditor());
}
