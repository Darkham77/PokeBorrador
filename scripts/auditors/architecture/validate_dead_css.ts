/**
 * scripts/auditors/architecture/validate_dead_css.ts
 *
 * SCOPED DEAD CSS AUDITOR (Node.js 26+ Native)
 *
 * Enforces lean CSS bundles by detecting orphaned/unused classes inside <style scoped>
 * blocks of Vue components across src/components and src/views.
 *
 * Escape Hatch:
 *   // css-ok: <justification> or // dead-css-ok: <justification>
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=* scripts/auditors/architecture/validate_dead_css.ts
 *   npm run validate:dead-css
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { BaseAuditor } from '../../lib/auditorBase.ts';

enableCompileCache();

export type DeadCssRuleId = 'dead-scoped-css';

export const DEAD_CSS_RULES: readonly DeadCssRuleId[] = [
  'dead-scoped-css'
] as const;

const GLOBAL_UTILITY_CLASSES = new Set([
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

export class DeadCssAuditor extends BaseAuditor<DeadCssRuleId> {
  constructor() {
    super({
      id: 'validate_dead_css',
      name: 'Scoped Dead CSS Auditor',
      description: 'Detecta clases CSS scoped huérfanas en componentes Vue',
      family: 'architecture',
      ruleIds: DEAD_CSS_RULES,
      ruleDescriptions: {
        'dead-scoped-css': 'Clase CSS scoped huérfana no utilizada en la aplicación'
      }
    });
  }

  public override async runAudit(): Promise<void> {
    this.context.logStep(1, 2, 'Recopilando tokens de código globales en src/...');
    const allSrcFiles = await this.context.collectFiles(['src'], new Set(['.ts', '.vue', '.json']));
    const globalTokens = new Set<string>();

    for (const relPath of allSrcFiles) {
      if (relPath.includes('.spec.') || relPath.includes('.test.') || relPath.includes('.simulation.')) {
        continue;
      }
      const fullPath = path.resolve(this.projectRoot, relPath);
      const content = fs.readFileSync(fullPath, 'utf-8');
      const words = content.match(/[a-zA-Z0-9_-]{2,}/g);
      if (words) {
        for (const w of words) {
          globalTokens.add(w);
        }
      }
    }

    this.context.logStep(2, 2, 'Auditando clases scoped en src/components y src/views...');
    const componentFiles = await this.context.collectFiles(['src/components', 'src/views'], new Set(['.vue']));
    let scopedClassesChecked = 0;

    for (const relPath of componentFiles) {
      if (relPath.includes('.spec.') || relPath.includes('.test.') || relPath.includes('.simulation.')) {
        continue;
      }

      this.filesScannedCount++;
      const fullPath = path.resolve(this.projectRoot, relPath);
      const rawContent = fs.readFileSync(fullPath, 'utf-8');

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

          // Skip lines that are purely property declarations without selectors
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
              this.addViolation({
                ruleId: 'dead-scoped-css',
                severity: 'error',
                file: relPath,
                line: lineNum,
                message: `Clase CSS scoped '.${className}' es código muerto (huérfana): no se encuentra en el componente ni en el código de la aplicación.`,
                context: className
              });
            }
          }
        }
      }
    }

    this.context.setMetric('Components Scanned', this.filesScannedCount);
    this.context.setMetric('Scoped Classes', scopedClassesChecked);
  }
}

// Canonical CLI Entrypoint
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new DeadCssAuditor());
}
