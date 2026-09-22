/**
 * scripts/auditors/architecture/validate_typography_line_height.ts
 *
 * TYPOGRAPHY LINE-HEIGHT & INTERLINEAR SPACING AUDITOR (Node.js 26+ Native)
 *
 * Enforces safe typography and spacing across Poké Vicio:
 *   1. Anti-Zero Line-Height (`line-height-overlap`): Detects text classes, headings, titles,
 *      descriptions, and multiline labels that declare 'line-height: 1' or 'line-height: 0'.
 *      Pixel fonts ('Pokemon FireRed LeafGreen') with line-height <= 1 collide
 *      and overlap vertically with zero spacing when text wraps into 2+ lines.
 *   2. Descender Clipping Prevention (`typography-descender-clipping`): Detects single-line
 *      or clamped text elements using 'overflow: hidden' (with ellipsis/nowrap) without safe
 *      line-height (>= 1.4) or padding-bottom, which cuts off descenders (g, p, q, y, j).
 *
 * Escape Hatch:
 *   // line-height-ok or // descender-ok disables the check for intentional fixtures.
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

export type LineHeightRuleId =
  | 'line-height-overlap'
  | 'typography-descender-clipping';

export const TYPOGRAPHY_LINE_HEIGHT_RULES: readonly LineHeightRuleId[] = [
  'line-height-overlap',
  'typography-descender-clipping'
];

const ICON_ELEMENT_REGEX = /(?:^|[._-])(?:emoji|icon|arrow|bullet|symbol|glyph|avatar|medal|quote|mark|placeholder|checkmark|shiny-star|star|particle|dot|sprite|indicator|infinity|dash|tooltip-wrapper|fx-wrapper|clear|close|dismiss|gender)(?:$|[._-])|(?<![a-zA-Z0-9_-])(?:img|svg|canvas)\b/i;
const TEXT_ELEMENT_REGEX = /(?:^|[._-])(?:title|heading|header|caption|desc|description|sub|subtitle|dialogue|name|label|text|body|wrap|item|card|accordion|content|h[1-6]|paragraph|note|message|banner|alert|prompt|phrase|comment|summary|reason|metric|trainer|slot|evo|pill|tag)(?:$|[._-])/i;

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

function checkPaddingHasBottom(paddingVal: string): boolean {
  if (paddingVal.includes('clamp') || paddingVal.includes('calc') || paddingVal.includes('var(')) {
    return true;
  }
  const parts = paddingVal.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) {
    return parts[0] !== '0' && parts[0] !== '0px';
  }
  if (parts.length === 2) {
    return parts[0] !== '0' && parts[0] !== '0px';
  }
  if (parts.length >= 3) {
    return parts[2] !== '0' && parts[2] !== '0px';
  }
  return true;
}

interface FrameState {
  selector: string;
  startLine: number;
  hasOverflowHidden: boolean;
  overflowLine: number;
  hasTruncation: boolean;
  lineHeight: number | null;
  hasPaddingBottom: boolean;
  hasTextClues: boolean;
  isIgnored: boolean;
}

export class TypographyLineHeightAuditor extends FileScanAuditor<LineHeightRuleId> {
  private totalRulesChecked = 0;

  constructor() {
    super({
      id: 'validate_typography_line_height',
      name: 'Typography Line-Height & Interlinear Spacing Validator',
      description: 'Valida line-height y recorte de descendentes en tipografía',
      family: 'architecture',
      ruleIds: TYPOGRAPHY_LINE_HEIGHT_RULES,
      ruleDescriptions: {
        'line-height-overlap': 'Colisión de line-height en tipografía',
        'typography-descender-clipping': 'Recorte de descendentes en texto con overflow: hidden'
      },
      roots: ['src'],
      allowedExtensions: new Set(['.vue', '.scss', '.css'])
    });
  }

  protected override scanFile(relPath: string, content: string): void {
    const styleBlocks = extractStyleBlocks(relPath, content);

    for (const block of styleBlocks) {
      const blockLines = block.content.split('\n');
      const frameStack: FrameState[] = [];

      for (let i = 0; i < blockLines.length; i++) {
        const line = blockLines[i];
        if (!line) continue;
        const trimmed = line.trim();

        const lineIgnored = this.isLineIgnored(line, ['line-height-ok', 'descender-ok', 'css-ok']) ||
                            line.includes('/* line-height-ok */') ||
                            line.includes('/* descender-ok */');

        if (trimmed.includes('{')) {
          const selectorPart = trimmed.slice(0, trimmed.indexOf('{')).trim();
          if (selectorPart) {
            frameStack.push({
              selector: selectorPart,
              startLine: block.startLine + i,
              hasOverflowHidden: false,
              overflowLine: 0,
              hasTruncation: false,
              lineHeight: null,
              hasPaddingBottom: false,
              hasTextClues: false,
              isIgnored: lineIgnored
            });
          }
        }

        const currentFrame = frameStack[frameStack.length - 1];
        if (currentFrame) {
          if (lineIgnored) {
            currentFrame.isIgnored = true;
          }

          // Check overflow: hidden (excluding purely horizontal overflow-x)
          if (/\boverflow(-y)?\s*:\s*hidden\b/i.test(trimmed)) {
            currentFrame.hasOverflowHidden = true;
            currentFrame.overflowLine = block.startLine + i;
          }

          // Check text truncation indicators
          if (/\btext-overflow\s*:\s*ellipsis\b/i.test(trimmed) ||
              /\bwhite-space\s*:\s*nowrap\b/i.test(trimmed) ||
              /(?:-webkit-)?line-clamp\s*:/i.test(trimmed) ||
              /@include\s+text-truncate\b/i.test(trimmed)) {
            currentFrame.hasTruncation = true;
          }

          // Check line-height values
          const lhMatch = trimmed.match(/\bline-height\s*:\s*([0-9.]+)(px|em|rem)?/i);
          if (lhMatch) {
            currentFrame.lineHeight = parseFloat(lhMatch[1] || '0');
          }

          // Check padding-bottom
          const pbMatch = trimmed.match(/\bpadding-bottom\s*:\s*([^;]+);/i);
          if (pbMatch) {
            const pbVal = pbMatch[1]?.trim() || '';
            if (pbVal !== '0' && pbVal !== '0px') {
              currentFrame.hasPaddingBottom = true;
            }
          }

          const padMatch = trimmed.match(/\bpadding\s*:\s*([^;]+);/i);
          if (padMatch && checkPaddingHasBottom(padMatch[1] || '')) {
            currentFrame.hasPaddingBottom = true;
          }

          // Check text indications
          if (/(?:font-size|font-family|font-weight|@include\s+pixelated|letter-spacing|color)\b/i.test(trimmed)) {
            currentFrame.hasTextClues = true;
          }
        }

        // Rule 1: Anti-Zero Line-Height (line-height-overlap)
        const lineHeightMatch = trimmed.match(/\bline-height\s*:\s*(0|1|0px|1px|1em|1rem)\s*(?:!important)?\s*;/i);
        if (lineHeightMatch && !lineIgnored) {
          this.totalRulesChecked++;
          const currentSelector = frameStack.map(f => f.selector).join(' ') || '(global scope)';
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

        // Closing bracket: evaluate Frame for Rule 2 (typography-descender-clipping)
        if (trimmed.includes('}')) {
          const closeCount = (trimmed.match(/\}/g) || []).length;
          for (let c = 0; c < closeCount; c++) {
            const popped = frameStack.pop();
            if (popped && !popped.isIgnored) {
              const fullSelector = [...frameStack.map(f => f.selector), popped.selector].join(' ');
              const leafSelector = getLeafSelector(popped.selector);

              if (popped.hasOverflowHidden && popped.hasTruncation) {
                const isIcon = ICON_ELEMENT_REGEX.test(leafSelector);
                const isText = TEXT_ELEMENT_REGEX.test(leafSelector) ||
                               TEXT_ELEMENT_REGEX.test(fullSelector) ||
                               popped.hasTextClues;

                if (isText && !isIcon) {
                  // If it lacks both line-height >= 1.4 AND padding-bottom
                  const hasSafeLineHeight = popped.lineHeight !== null && popped.lineHeight >= 1.4;
                  if (!hasSafeLineHeight && !popped.hasPaddingBottom) {
                    this.totalRulesChecked++;
                    const targetLine = popped.overflowLine || popped.startLine;
                    this.addViolation({
                      ruleId: 'typography-descender-clipping',
                      severity: 'error',
                      file: relPath,
                      line: targetLine,
                      message: `Text selector '${leafSelector}' uses 'overflow: hidden' with truncation but lacks 'line-height: 1.4+' or 'padding-bottom'. Descenders (g, p, q, y, j) risk clipping.`,
                      context: popped.selector
                    });
                  }
                }
              }
            }
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
