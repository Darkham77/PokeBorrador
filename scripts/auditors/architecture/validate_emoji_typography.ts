/**
 * scripts/auditors/architecture/validate_emoji_typography.ts
 *
 * EMOJI TYPOGRAPHY & VERTICAL CENTERING AUDITOR (Node.js 26+ Native)
 *
 * Enforces proper emoji encapsulation across Poké Vicio Vue templates:
 *   1. Naked Emoji Detection: Prevents emojis from being embedded directly in raw
 *      text nodes alongside pixel art typography without an icon/emoji wrapper.
 *   2. Class Compliance: Ensures emojis are placed inside elements with approved
 *      styling classes (e.g., .icon, .emoji-inline, .title-icon, .btn-emoji, .medal,
 *      or classes ending in -icon) to guarantee system emoji font rendering and
 *      vertical baseline alignment.
 *
 * Escape Hatch:
 *   <!-- emoji-ok --> on the line or block disables the check for intentional exceptions.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=. --allow-fs-write=. scripts/auditors/architecture/validate_emoji_typography.ts
 *   npm run validate:emojis
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

export interface EmojiViolation {
  readonly file: string;
  readonly line: number;
  readonly emoji: string;
  readonly context: string;
  readonly message: string;
}

export interface EmojiAuditResult {
  readonly vueFilesScanned: number;
  readonly emojisFound: number;
  readonly violations: readonly EmojiViolation[];
  readonly passed: boolean;
}

// Regex matching common emojis and special symbolic glyphs
const EMOJI_REGEX = /[\u{1F300}-\u{1F9FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2190}-\u{21FF}\u{2B50}\u{2B55}\u{3030}\u{303D}\u{3297}\u{3299}]/u;
const EMOJI_GLOBAL_REGEX = new RegExp(EMOJI_REGEX.source, 'gu');

const APPROVED_CLASS_PATTERNS = [
  /\bicon\b/i,
  /\bemoji\b/i,
  /\bmedal\b/i,
  /\bbtn-emoji\b/i,
  /\bbtn-icon\b/i,
  /\bsort-arrow\b/i,
  /\bcat-icon\b/i,
  /\btoast-icon\b/i,
  /\bweather-emoji\b/i,
  /\bdesc-line-icon\b/i,
  /\badmin-icon-btn\b/i,
  /\bfaction-emoji\b/i,
  /\btitle-icon\b/i,
  /\bsection-icon\b/i,
  /\bsection-title-icon\b/i,
  /\bseason-icon\b/i,
  /\bevent-stat-icon\b/i,
  /\btrophies-header-icon\b/i,
  /\bempty-icon\b/i,
  /\binfo-icon\b/i,
  /\bcategory-icon\b/i,
  /\brank-icon\b/i,
  /\bstatus-icon\b/i,
  /\bheader-icon\b/i,
  /\bfield-condition-dot\b/i,
  /\bsource-symbol\b/i,
  /-symbol\b/i,
  /-icon\b/i,
  /\bicon-/i,
  /-emoji\b/i,
  /\bemoji-/i,
  /-medal\b/i,
  /\binfo-btn\b/i
];

function getAllVueFiles(dir: string): string[] {
  let results: string[] = []; // no-domain
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllVueFiles(filePath));
    } else if (filePath.endsWith('.vue')) {
      results.push(filePath);
    }
  }
  return results;
}

export function auditEmojiTypography(): EmojiAuditResult {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, 'src');
  const vueFiles = getAllVueFiles(srcDir);

  const violations: EmojiViolation[] = [];
  let totalEmojisFound = 0;

  for (const file of vueFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const templateMatch = content.match(/<template>([\s\S]*?)<\/template>/i);
    if (!templateMatch || templateMatch.index === undefined) continue;

    const templateContent = templateMatch[1] ?? '';
    const templateStartOffset = templateMatch.index;
    const linesBeforeTemplate = content.substring(0, templateStartOffset).split('\n').length - 1;

    const templateLines = templateContent.split('\n');

    for (let i = 0; i < templateLines.length; i++) {
      const line = templateLines[i] ?? '';
      const lineNumber = linesBeforeTemplate + i + 1;

      // Skip HTML comments or emoji-ok escape hatches
      if (line.includes('<!--') && line.includes('-->')) {
        if (line.includes('emoji-ok') || line.trim().startsWith('<!--')) continue;
      }
      if (line.includes('emoji-ok')) continue;

      // Strip regex literals like replace(/[♂♀]/g, '')
      let textOnly = line.replace(/\/[^/\n\r]+\/[a-z]*/g, '');

      // Strip HTML attributes to only inspect actual DOM text content
      textOnly = textOnly
        .replace(/(?:title|alt|placeholder|aria-label|v-tooltip|v-model)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '')
        .replace(/:(?:title|alt|placeholder|aria-label)\s*=\s*(?:"[^"]*"|'[^']*')/gi, '');

      const emojis = textOnly.match(EMOJI_GLOBAL_REGEX);
      if (!emojis || emojis.length === 0) continue;

      totalEmojisFound += emojis.length;

      // Check current line for approved class pattern
      let hasApprovedClass = APPROVED_CLASS_PATTERNS.some(p => p.test(line));

      // If not found on the immediate line, inspect up to 5 preceding lines for enclosing tag class
      if (!hasApprovedClass) {
        const startWindow = Math.max(0, i - 5);
        const contextChunk = templateLines.slice(startWindow, i + 1).join(' ');
        hasApprovedClass = APPROVED_CLASS_PATTERNS.some(p => p.test(contextChunk));
      }

      if (!hasApprovedClass) {
        for (const emoji of emojis) {
          const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
          violations.push({
            file: relPath,
            line: lineNumber,
            emoji,
            context: line.trim(),
            message: `Emoji '${emoji}' appears without an approved icon/emoji class (.icon, .emoji-inline, .title-icon, .btn-emoji, .medal). Wrap it in <span class="emoji-inline">${emoji}</span> or an approved icon container.`
          });
        }
      }
    }
  }

  return {
    vueFilesScanned: vueFiles.length,
    emojisFound: totalEmojisFound,
    violations,
    passed: violations.length === 0
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'EMOJI TYPOGRAPHY & VERTICAL CENTERING AUDITOR',
    family: 'architecture',
    id: 'validate_emoji_typography'
  });

  const result = auditEmojiTypography();

  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain

  for (const v of result.violations) {
    errors.push(`[EMOJI_UNWRAPPED] ${v.file}:${v.line} → ${v.message} (Context: "${v.context}")`);
  }

  await validator.finish(
    {
      'Vue components scanned': result.vueFilesScanned,
      'Total emojis found': result.emojisFound,
      'Unwrapped emoji violations': result.violations.length
    },
    errors,
    warnings
  );
}
