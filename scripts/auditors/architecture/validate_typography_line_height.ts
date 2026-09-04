/**
 * scripts/auditors/architecture/validate_typography_line_height.ts
 *
 * TYPOGRAPHY LINE-HEIGHT & INTERLINEAR SPACING AUDITOR (Node.js 26+ Native)
 *
 * Enforces safe multiline line-height across Poké Vicio typography:
 *   1. Anti-Zero Line-Height: Detects text classes, headings, titles, descriptions,
 *      and multiline labels that declare 'line-height: 1' or 'line-height: 0'.
 *      Pixel fonts ('Pokemon FireRed LeafGreen') with line-height <= 1 collide
 *      and overlap vertically with zero spacing when text wraps into 2+ lines.
 *   2. Icon / Glyph Exemption: Standalone glyphs, SVGs, and emojis (.emoji, .icon,
 *      *-icon, .toggle-arrow, .avatar-placeholder, etc.) are allowed to use line-height: 1.
 *
 * Escape Hatch:
 *   // line-height-ok or /* line-height-ok *\/ disables the rule for intentional single-line fixtures.
 *
 * Usage:
 *   node --permission --experimental-strip-types --allow-fs-read=. --allow-fs-write=. scripts/auditors/architecture/validate_typography_line_height.ts
 *   npm run validate:line-height
 */

import fs from 'node:fs';
import path from 'node:path';
import { enableCompileCache } from 'node:module';
import { setupValidation } from '../../lib/validationBase.ts';

enableCompileCache();

export interface LineHeightViolation {
  readonly file: string;
  readonly line: number;
  readonly selector: string;
  readonly rawDeclaration: string;
  readonly message: string;
}

export interface LineHeightAuditResult {
  readonly filesScanned: number;
  readonly rulesChecked: number;
  readonly violations: readonly LineHeightViolation[];
  readonly passed: boolean;
}

const IGNORE_DIRS: ReadonlySet<string> = new Set(['node_modules', '.git', 'dist', 'dev-dist', 'external', 'backup_legacy_code', 'scratch']); // runtime-set: Fast O(1) membership lookup set

function getAllStyleAndVueFiles(dir: string): string[] {
  let results: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (IGNORE_DIRS.has(file)) continue;
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(getAllStyleAndVueFiles(filePath));
    } else if (filePath.endsWith('.vue') || filePath.endsWith('.scss') || filePath.endsWith('.css')) {
      results.push(filePath);
    }
  }
  return results;
}

// Patterns that identify icon / glyph / standalone single-character elements exempt from multiline line-height
const ICON_ELEMENT_REGEX = /(?:^|[._-])(?:emoji|icon|arrow|bullet|symbol|glyph|avatar|medal|quote|mark|placeholder|checkmark|shiny-star|star|particle|dot|sprite|indicator|infinity|dash|tooltip-wrapper|fx-wrapper|clear|close|dismiss|gender)(?:$|[._-])|(?<![a-zA-Z0-9_-])(?:img|svg|canvas)\b/i;

// Patterns that identify text, titles, headings, descriptions, labels, bodies, containers
const TEXT_ELEMENT_REGEX = /(?:^|[._-])(?:title|heading|header|caption|desc|description|sub|subtitle|dialogue|name|label|text|body|wrap|item|card|accordion|content|h[1-6]|paragraph|note|message|banner|alert|prompt|phrase|comment|summary|reason)(?:$|[._-])/i;

interface ExtractedStyleBlock {
  readonly content: string;
  readonly startLine: number;
}

function extractStyleBlocks(filePath: string, fileContent: string): ExtractedStyleBlock[] {
  if (filePath.endsWith('.scss') || filePath.endsWith('.css')) {
    return [{ content: fileContent, startLine: 1 }];
  }
  
  const blocks: ExtractedStyleBlock[] = [];
  const styleTagRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
  let match: RegExpExecArray | null;

  while ((match = styleTagRegex.exec(fileContent)) !== null) {
    const preContent = fileContent.slice(0, match.index);
    const startLine = preContent.split('\n').length;
    blocks.push({
      content: match[1] || '',
      startLine
    });
  }

  return blocks;
}

function getLeafSelector(fullSelector: string): string {
  // Extract the last chunk of the selector (the actual element being styled)
  const segments = fullSelector.split(/[\s>+~]/).map(s => s.trim()).filter(Boolean);
  const last = segments[segments.length - 1] || fullSelector;
  // Strip pseudo-classes (:hover, ::before, :deep(), etc.)
  return last.replace(/::?[a-zA-Z0-9_-]+(\([^)]*\))?/g, '').trim();
}

function isEmojiFontContext(lines: readonly string[], currentIndex: number): boolean {
  const start = Math.max(0, currentIndex - 6);
  const end = Math.min(lines.length - 1, currentIndex + 6);
  for (let idx = start; idx <= end; idx++) {
    const l = lines[idx] || '';
    if (/font-family\s*:\s*.*(?:Emoji|Apple Color Emoji|Segoe UI Emoji|Noto Color Emoji)/i.test(l)) {
      return true;
    }
  }
  return false;
}

export function auditLineHeight(): LineHeightAuditResult {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, 'src');
  const files = getAllStyleAndVueFiles(srcDir);

  const violations: LineHeightViolation[] = [];
  let totalRulesChecked = 0;

  for (const file of files) {
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');
    const content = fs.readFileSync(file, 'utf-8');
    const blocks = extractStyleBlocks(file, content);

    for (const block of blocks) {
      const lines = block.content.split('\n');
      const selectorStack: string[] = []; // no-domain: Non-domain utility collection or data structure

      for (let i = 0; i < lines.length; i++) {
        const lineText = lines[i] || '';
        const trimmed = lineText.trim();

        // Skip comments
        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;

        // Track selector hierarchy
        if (trimmed.includes('{')) {
          const selPart = trimmed.slice(0, trimmed.indexOf('{')).trim();
          if (selPart) {
            selectorStack.push(selPart);
          }
        }

        // Check line-height declarations
        const lineHeightMatch = trimmed.match(/\bline-height\s*:\s*(1|0|1\.0|0\.0)(?:\s*!important)?\s*;/i);
        if (lineHeightMatch) {
          totalRulesChecked++;

          // Check escape hatch
          const hasEscape = trimmed.includes('line-height-ok') || trimmed.includes('icon-ok') || trimmed.includes('font-pixel-ok');
          if (!hasEscape) {
            const fullSelector = selectorStack.join(' ');
            const leafSelector = getLeafSelector(fullSelector);

            const isIconExempt = ICON_ELEMENT_REGEX.test(leafSelector);
            const isEmojiFont = isEmojiFontContext(lines, i);
            const isTextTarget = TEXT_ELEMENT_REGEX.test(leafSelector) || TEXT_ELEMENT_REGEX.test(fullSelector);

            // If the leaf element is specifically an icon or emoji font context, it is exempt
            if (isIconExempt || isEmojiFont) {
              // Exempt
            } else if (isTextTarget || (!fullSelector.includes('.emoji') && !fullSelector.includes('.icon'))) {
              // Ignore global reset in _base.scss or _reset.scss
              if (relPath.includes('_base.scss') || relPath.includes('_reset.scss')) {
                continue;
              }

              const lineNum = block.startLine + i;
              violations.push({
                file: relPath,
                line: lineNum,
                selector: fullSelector || 'unknown',
                rawDeclaration: trimmed,
                message: `Selector '${fullSelector}' (leaf '${leafSelector}') sets '${trimmed}'. Pixel text overlapping risk on line wrap. Use minimum line-height: 1.25+ or remove override to inherit standard 1.35.`
              });
            }
          }
        }

        if (trimmed.includes('}')) {
          selectorStack.pop();
        }
      }
    }
  }

  return {
    filesScanned: files.length,
    rulesChecked: totalRulesChecked,
    violations,
    passed: violations.length === 0
  };
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  const validator = setupValidation({
    title: 'TYPOGRAPHY LINE-HEIGHT & INTERLINEAR SPACING AUDITOR',
    family: 'architecture',
    id: 'validate_typography_line_height'
  });

  const result = auditLineHeight();

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    errors.push(`[LINE_HEIGHT_OVERLAP] ${v.file}:${v.line} → ${v.message}`);
  }

  await validator.finish(
    {
      'Files scanned': result.filesScanned,
      'Line-height rules analyzed': result.rulesChecked,
      'Dangerous line-height: 1 violations': result.violations.length
    },
    errors,
    warnings
  );
}
