/**
 * scripts/auditors/architecture/validate_typography_line_height.ts
 *
 * TYPOGRAPHY LINE-HEIGHT & INTERLINEAR SPACING AUDITOR (Node.js 26+ Native)
 *
 * Enforces safe multiline line-height across Poké Vicio typography:
 *   1. Anti-Zero Line-Height (`line-height-overlap`): Detects text classes, headings, titles,
 *      descriptions, and multiline labels that declare 'line-height: 1' or 'line-height: 0'.
 *      Pixel fonts ('Pokemon FireRed LeafGreen') with line-height <= 1 collide
 *      and overlap vertically with zero spacing when text wraps into 2+ lines.
 *   2. Icon / Glyph Exemption: Standalone glyphs, SVGs, and emojis (.emoji, .icon,
 *      *-icon, .toggle-arrow, .avatar-placeholder, etc.) are allowed to use line-height: 1.
 *
 * Escape Hatch:
 *   // line-height-ok or /* line-height-ok *\/ disables the rule for intentional single-line fixtures.
 *
 * Usage:
 *   npm run validate:line-height
 */

import path from 'node:path';
import { enableCompileCache } from 'node:module';
import {
  FileScanAuditor,
  BaseAuditor
} from '../../lib/auditorBase.ts';

enableCompileCache();

export type LineHeightRuleId = 'line-height-overlap';

const ICON_ELEMENT_REGEX = /(?:^|[._-])(?:emoji|icon|arrow|bullet|symbol|glyph|avatar|medal|quote|mark|placeholder|checkmark|shiny-star|star|particle|dot|sprite|indicator|infinity|dash|tooltip-wrapper|fx-wrapper|clear|close|dismiss|gender)(?:$|[._-])|(?<![a-zA-Z0-9_-])(?:img|svg|canvas)\b/i;
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
  const segments = fullSelector.split(/[\s>+~]/).map(s => s.trim()).filter(Boolean);
  const last = segments[segments.length - 1] || fullSelector;
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

export class TypographyLineHeightAuditor extends FileScanAuditor<LineHeightRuleId> {
  private totalRulesChecked = 0;

  constructor() {
    super({
      id: 'validate_typography_line_height',
      name: 'Typography Line-Height & Interlinear Spacing Validator',
      description: 'Detecta colisiones de line-height en tipografías retro',
      family: 'architecture',
      ruleIds: ['line-height-overlap'],
      ruleDescriptions: {
        'line-height-overlap': 'Colisión de line-height en tipografía'
      },
      roots: ['src'],
      allowedExtensions: new Set(['.vue', '.scss', '.css'])
    });
  }

  protected override scanFile(relPath: string, content: string): void {
    const styleBlocks = extractStyleBlocks(relPath, content);

    for (const block of styleBlocks) {
      const blockLines = block.content.split('\n');
      const selectorStack: string[] = [];

      for (let i = 0; i < blockLines.length; i++) {
        const line = blockLines[i];
        if (!line) continue;
        const trimmed = line.trim();

        if (this.isLineIgnored(line, ['line-height-ok', 'css-ok']) || line.includes('/* line-height-ok */')) {
          continue;
        }

        if (trimmed.includes('{')) {
          const selectorPart = trimmed.slice(0, trimmed.indexOf('{')).trim();
          if (selectorPart) {
            selectorStack.push(selectorPart);
          }
        }

        const lineHeightMatch = trimmed.match(/\bline-height\s*:\s*(0|1|0px|1px|1em|1rem)\s*(?:!important)?\s*;/i);
        if (lineHeightMatch) {
          this.totalRulesChecked++;
          const currentSelector = selectorStack.join(' ') || '(global scope)';
          const leafSelector = getLeafSelector(currentSelector);

          if (!ICON_ELEMENT_REGEX.test(leafSelector) && !isEmojiFontContext(blockLines, i)) {
            if (TEXT_ELEMENT_REGEX.test(leafSelector) || currentSelector.includes('&__') || currentSelector.includes('.text')) {
              const absoluteLine = block.startLine + i;
              this.addViolation({
                ruleId: 'line-height-overlap',
                severity: 'error',
                file: relPath,
                line: absoluteLine,
                message: `Dangerous '${lineHeightMatch[0]}' on text selector '${currentSelector}'. Pixel fonts overlap when text wraps. Use 'line-height: 1.2' to '1.4' or $lh-normal.`,
                context: trimmed
              });
            }
          }
        }

        if (trimmed.includes('}')) {
          const closeCount = (trimmed.match(/\}/g) || []).length;
          for (let c = 0; c < closeCount; c++) {
            selectorStack.pop();
          }
        }
      }
    }
  }

  public override async runAudit(): Promise<void> {
    await super.runAudit();
    this.context.setMetric('Line-height rules analyzed', this.totalRulesChecked);
  }
}

// ─── CLI Entrypoint ─────────────────────────────────────────────────────────
if (process.argv[1] && import.meta.filename && path.basename(process.argv[1]) === path.basename(import.meta.filename)) {
  await BaseAuditor.runCli(new TypographyLineHeightAuditor());
}
