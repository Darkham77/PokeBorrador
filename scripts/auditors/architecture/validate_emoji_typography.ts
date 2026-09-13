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

export interface EmojiCssViolation {
  readonly file: string;
  readonly line: number;
  readonly selector: string;
  readonly declaration: string;
  readonly message: string;
}

export interface EmojiAuditResult {
  readonly vueFilesScanned: number;
  readonly styleFilesScanned: number;
  readonly emojisFound: number;
  readonly violations: readonly EmojiViolation[];
  readonly cssViolations: readonly EmojiCssViolation[];
  readonly passed: boolean;
}

// Regex matching common emojis, special symbolic glyphs, modern Unicode 13-16 pictographs (including 1FA00-1FAFF like 🪙, 🪵), and geometric arrows
const EMOJI_REGEX = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}\u{1F1E6}-\u{1F1FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2300}-\u{23FF}\u{2190}-\u{21FF}\u{203C}\u{2049}\u{2122}\u{2139}\u{25A0}-\u{25FF}\u{2B00}-\u{2BFF}\u{2934}-\u{2935}\u{3030}\u{303D}\u{3297}\u{3299}]/u;
const IGNORE_DIRS: ReadonlySet<string> = new Set(['node_modules', '.git', 'dist', 'dev-dist', 'external', 'backup_legacy_code', 'scratch']); // runtime-set: Fast O(1) membership lookup set

function matchEmojis(text: string): string[] | null {
  const regex = new RegExp(EMOJI_REGEX.source, 'gu');
  return text.match(regex);
}

function getAllVueFiles(dir: string): string[] {
  let results: string[] = []; // no-domain: Non-domain utility collection or data structure
  if (!fs.existsSync(dir)) return results;
  const list = fs.readdirSync(dir);
  for (const file of list) {
    if (IGNORE_DIRS.has(file)) continue;
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

interface ElementNode {
  readonly tag: string;
  readonly hasEmojiClass: boolean;
}

function findNextTagEnd(template: string, startIndex: number): number {
  let inDouble = false;
  let inSingle = false;
  let inBacktick = false;

  for (let i = startIndex; i < template.length; i++) {
    const ch = template[i];
    if (ch === '"' && !inSingle && !inBacktick) {
      inDouble = !inDouble;
    } else if (ch === "'" && !inDouble && !inBacktick) {
      inSingle = !inSingle;
    } else if (ch === '`' && !inDouble && !inSingle) {
      inBacktick = !inBacktick;
    } else if (ch === '>' && !inDouble && !inSingle && !inBacktick) {
      return i;
    }
  }
  return -1;
}

function extractRootTemplate(sfcContent: string): { templateContent: string; startOffset: number } | null {
  const match = sfcContent.match(/<template\b[^>]*>/i);
  if (!match || match.index === undefined) return null;
  const startOffset = match.index + match[0].length;
  
  let depth = 1;
  const tagRegex = /<\/?template\b[^>]*>/gi;
  tagRegex.lastIndex = startOffset;
  let tagMatch: RegExpExecArray | null;
  let endOffset = sfcContent.length;

  while ((tagMatch = tagRegex.exec(sfcContent)) !== null) {
    if (tagMatch[0].startsWith('</')) {
      depth--;
      if (depth === 0) {
        endOffset = tagMatch.index;
        break;
      }
    } else if (!tagMatch[0].endsWith('/>')) {
      depth++;
    }
  }

  return {
    templateContent: sfcContent.slice(startOffset, endOffset),
    startOffset
  };
}

export function auditEmojiTypography(): EmojiAuditResult {
  const rootDir = process.cwd();
  const srcDir = path.join(rootDir, 'src');
  const vueFiles = getAllVueFiles(srcDir);

  const violations: EmojiViolation[] = [];
  let totalEmojisFound = 0;

  for (const file of vueFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const rootTemplate = extractRootTemplate(content);
    if (!rootTemplate) continue;

    const templateContent = rootTemplate.templateContent;
    const templateStartOffset = rootTemplate.startOffset;
    const linesBeforeTemplate = content.substring(0, templateStartOffset).split('\n').length - 1;
    const relPath = path.relative(rootDir, file).replace(/\\/g, '/');

    const stack: ElementNode[] = [];
    let index = 0;
    const len = templateContent.length;

    while (index < len) {
      // 1. Comment <!-- ... -->
      if (templateContent.startsWith('<!--', index)) {
        const endComment = templateContent.indexOf('-->', index + 4);
        if (endComment === -1) break;
        index = endComment + 3;
        continue;
      }

      // 2. Tag <...>
      if (templateContent[index] === '<') {
        const isClosing = templateContent[index + 1] === '/';
        const endTag = findNextTagEnd(templateContent, index);
        if (endTag === -1) break;

        const tagSlice = templateContent.slice(index, endTag + 1);
        const isSelfClosing = tagSlice.endsWith('/>') || tagSlice.endsWith('/ >');

        if (isClosing) {
          const match = tagSlice.match(/<\/\s*([a-zA-Z0-9-]+)/);
          const closeTagName = match ? (match[1] || '').toLowerCase() : '';
          for (let s = stack.length - 1; s >= 0; s--) {
            if (stack[s]?.tag === closeTagName) {
              stack.splice(s, 1);
              break;
            }
          }
        } else {
          const tagNameMatch = tagSlice.match(/^<\s*([a-zA-Z0-9-]+)/);
          if (tagNameMatch && tagNameMatch[1]) {
            const tagName = tagNameMatch[1].toLowerCase();
            const attrs = tagSlice.slice(tagNameMatch[0].length, tagSlice.endsWith('/>') ? -2 : -1);

            // Check static/dynamic props containing raw emojis mixed into text (e.g. title="...", label="...")
            // Note: explicit 'icon' and 'emoji' props are allowed as glyph props; their rendering is validated via interpolation Rule B
            const staticAttrRegex = /(?<![:@])\b(?:title|label|heading|caption|button-text)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
            let attrM: RegExpExecArray | null;
            while ((attrM = staticAttrRegex.exec(attrs)) !== null) {
              const attrVal = attrM[1] || attrM[2] || '';
              const attrEmojis = matchEmojis(attrVal);
              if (attrEmojis && attrEmojis.length > 0) {
                const line = linesBeforeTemplate + templateContent.slice(0, index).split('\n').length;
                for (const emoji of attrEmojis) {
                  violations.push({
                    file: relPath,
                    line,
                    emoji,
                    context: tagSlice.slice(0, 100).replace(/\s+/g, ' '),
                    message: `Emoji '${emoji}' appears in prop '${attrM[0]}'. Encapsulate in <span class="emoji">${emoji}</span> inside the slot/template instead of passing raw emojis in props.`
                  });
                }
              }
            }

            // Check if this tag has class "emoji"
            const classMatch = attrs.match(/\bclass\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const dynamicClassMatch = attrs.match(/:class\s*=\s*(?:"([^"]*)"|'([^']*)')/i);
            const classVal = (classMatch ? (classMatch[1] || classMatch[2] || '') : '') + ' ' + (dynamicClassMatch ? (dynamicClassMatch[1] || dynamicClassMatch[2] || '') : '');
            const hasEmojiClass = /\bemoji\b/i.test(classVal);

            const voidElements: ReadonlySet<string> = new Set(['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr']); // runtime-set: Fast O(1) membership lookup set
            if (!isSelfClosing && !voidElements.has(tagName)) {
              stack.push({
                tag: tagName,
                hasEmojiClass
              });
            }
          }
        }

        index = endTag + 1;
        continue;
      }

      // 3. Text node between tags
      const nextTag = templateContent.indexOf('<', index);
      const textChunk = nextTag === -1 ? templateContent.slice(index) : templateContent.slice(index, nextTag);
      const chunkStart = index;
      index = nextTag === -1 ? len : nextTag;

      if (textChunk.trim().length > 0) {
        const currentParent = stack[stack.length - 1] || { tag: 'template', hasEmojiClass: false };
        const isInsideEmojiTag = stack.some(node => node.hasEmojiClass);
        const isOptionTag = currentParent.tag === 'option';

        // A. Check literal emojis in textChunk (excluding regex literals and option tags)
        if (!isInsideEmojiTag && !isOptionTag) {
          const cleanChunk = textChunk.replace(/\/[^/\n\r]+\/[a-z]*/g, '');
          const emojis = matchEmojis(cleanChunk);
          if (emojis && emojis.length > 0) {
            totalEmojisFound += emojis.length;
            const line = linesBeforeTemplate + templateContent.slice(0, chunkStart).split('\n').length;
            for (const emoji of emojis) {
              violations.push({
                file: relPath,
                line,
                emoji,
                context: textChunk.trim().slice(0, 100).replace(/\s+/g, ' '),
                message: `Emoji '${emoji}' appears in <${currentParent.tag}> without the .emoji class wrapper. Wrap it in <span class="emoji">${emoji}</span>.`
              });
            }
          }
        }

        // B. Check Vue interpolations
        const interpolationRegex = /{{\s*([\s\S]*?)\s*}}/g;
        let interMatch: RegExpExecArray | null;
        while ((interMatch = interpolationRegex.exec(textChunk)) !== null) {
          const rawExpr = interMatch[1] || '';
          const expr = rawExpr.replace(/\/[^/\n]+\/[gimsuy]*/g, '');
          
          const exprEmojis = matchEmojis(expr);
          if (exprEmojis && exprEmojis.length > 0) {
            totalEmojisFound += exprEmojis.length;
            if (!isInsideEmojiTag) {
              const line = linesBeforeTemplate + templateContent.slice(0, chunkStart + interMatch.index).split('\n').length;
              for (const emoji of exprEmojis) {
                violations.push({
                  file: relPath,
                  line,
                  emoji,
                  context: interMatch[0],
                  message: `Expression '${interMatch[0]}' containing emoji '${emoji}' appears in <${currentParent.tag}> without the .emoji class wrapper. Wrap it in <span class="emoji">${interMatch[0]}</span>.`
                });
              }
            }
          }

          const emojiVarMatch = expr.match(/\b([a-zA-Z0-9_]*(?:[eE]moji|[iI]con|[bB]ullet|[gG]lyph))\b/);
          const varName = emojiVarMatch?.[1];
          const isTextPropertyAccess = /\.(?:text|label|name|desc|description|title|count|qty)\b/i.test(expr);
          if (varName && !isInsideEmojiTag && !isTextPropertyAccess) {
            if (!/^(?:is|has|can|should|toggle|open|close|get[A-Z].*Url|.*Path|.*Class)\b/i.test(varName) && !/Url|Path|Class|Style/i.test(varName)) {
              const line = linesBeforeTemplate + templateContent.slice(0, chunkStart + interMatch.index).split('\n').length;
              violations.push({
                file: relPath,
                line,
                emoji: varName,
                context: interMatch[0],
                message: `Interpolation '${interMatch[0]}' referencing emoji variable '${varName}' is rendered in <${currentParent.tag}> without the .emoji wrapper. Wrap it in <span class="emoji">{{ ${varName} }}</span>.`
              });
            }
          }
        }
      }
    }
  }

  // ─── Phase 2: CSS / SCSS Alignment & Container Audit ────────────────────
  const styleFiles = getAllStyleAndVueFiles(srcDir);
  const cssViolations: EmojiCssViolation[] = [];
  const manualOffsetRegex = /(?:^|\s|\{|;)(?:transform\s*:\s*(?:translateY|[^;]*translate\s*\([^)]*,)|margin-top\s*:\s*-?\d+|top\s*:\s*-?\d+px)/i;

  interface CssBlock {
    readonly selector: string;
    readonly startLine: number;
    hasFlex: boolean;
    hasAlignCenter: boolean;
    hasEmojiChild: boolean;
    readonly isEmoji: boolean;
    readonly isContainer: boolean;
  }

  for (const f of styleFiles) {
    const fileContent = fs.readFileSync(f, 'utf8');
    if (!fileContent.includes('.emoji')) continue;

    const relPath = path.relative(rootDir, f).replace(/\\/g, '/');
    const isVue = f.endsWith('.vue');

    interface StyleSection {
      content: string;
      lineOffset: number;
    }
    const styleSections: StyleSection[] = [];

    if (isVue) {
      const styleTagRegex = /<style\b[^>]*>([\s\S]*?)<\/style>/gi;
      let match: RegExpExecArray | null;
      while ((match = styleTagRegex.exec(fileContent)) !== null) {
        const before = fileContent.slice(0, match.index + match[0].indexOf('>') + 1);
        const lineOffset = before.split('\n').length - 1;
        styleSections.push({ content: match[1] || '', lineOffset });
      }
    } else {
      styleSections.push({ content: fileContent, lineOffset: 0 });
    }

    for (const section of styleSections) {
      if (!section.content.includes('.emoji')) continue;

      const lines = section.content.split('\n');
      const stack: CssBlock[] = [];

      for (let i = 0; i < lines.length; i++) {
        const lineNum = section.lineOffset + i + 1;
        const rawLine = lines[i] || '';
        const trimmed = rawLine.trim();

        if (trimmed.startsWith('//') || trimmed.startsWith('/*')) continue;
        if (rawLine.includes('// emoji-ok') || rawLine.includes('/* emoji-ok */')) continue;

        // Check opening blocks
        if (trimmed.includes('{')) {
          const parts = trimmed.split('{');
          const selector = parts[0]?.trim() || '';
          const isEmoji = /(?:^|\s|>|\+|~)\.emoji\b/.test(selector);
          const isContainer = /(?:\.action-button|\.btn\b|\.btn-|\.tag\b|\.tag-|\.badge\b|\.badge-|\bbutton\b)/i.test(selector);

          if (isEmoji && stack.length > 0) {
            for (let s = stack.length - 1; s >= 0; s--) {
              if (stack[s]?.isContainer) {
                stack[s]!.hasEmojiChild = true;
                break;
              }
            }
          }

          const newBlock: CssBlock = {
            selector,
            startLine: lineNum,
            hasFlex: false,
            hasAlignCenter: false,
            hasEmojiChild: false,
            isEmoji,
            isContainer
          };
          stack.push(newBlock);
        }

        const current = stack[stack.length - 1];
        if (current) {
          if (/display\s*:\s*(?:inline-)?flex/i.test(trimmed)) {
            for (let s = stack.length - 1; s >= 0; s--) {
              if (stack[s]?.isContainer) {
                stack[s]!.hasFlex = true;
                break;
              }
            }
          }
          if (/align-items\s*:\s*center/i.test(trimmed)) {
            for (let s = stack.length - 1; s >= 0; s--) {
              if (stack[s]?.isContainer) {
                stack[s]!.hasAlignCenter = true;
                break;
              }
            }
          }

          if (current.isEmoji || stack.some(b => b.isEmoji)) {
            if (manualOffsetRegex.test(trimmed)) {
              cssViolations.push({
                file: relPath,
                line: lineNum,
                selector: current.selector,
                declaration: trimmed,
                message: `Manual vertical offset hack detected on .emoji ('${trimmed}'). Remove manual offsets; use flexbox centering on the parent container instead.`
              });
            }

            const lhMatch = trimmed.match(/line-height\s*:\s*([^;]+)/);
            if (lhMatch) {
              const val = lhMatch[1]?.trim() || '';
              if (val !== '1' && val !== '1 !important' && val !== '100%' && val !== '100% !important') {
                cssViolations.push({
                  file: relPath,
                  line: lineNum,
                  selector: current.selector,
                  declaration: trimmed,
                  message: `Invalid line-height '${val}' on .emoji. .emoji must use line-height: 1 to preserve vertical centering.`
                });
              }
            }
          }
        }

        // Check closing blocks
        if (trimmed.includes('}')) {
          const popped = stack.pop();
          if (popped && popped.isContainer && popped.hasEmojiChild) {
            if (!popped.hasFlex || !popped.hasAlignCenter) {
              cssViolations.push({
                file: relPath,
                line: popped.startLine,
                selector: popped.selector,
                declaration: 'missing display: inline-flex / align-items: center',
                message: `Container '${popped.selector}' styling .emoji children must declare 'display: inline-flex' (or 'flex') and 'align-items: center' to eliminate baseline drops.`
              });
            }
          }
        }
      }
    }
  }

  return {
    vueFilesScanned: vueFiles.length,
    styleFilesScanned: styleFiles.length,
    emojisFound: totalEmojisFound,
    violations,
    cssViolations,
    passed: violations.length === 0 && cssViolations.length === 0
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

  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure

  for (const v of result.violations) {
    errors.push(`[EMOJI_UNWRAPPED] ${v.file}:${v.line} → ${v.message} (Context: "${v.context}")`);
  }

  for (const cv of result.cssViolations) {
    errors.push(`[EMOJI_CSS_ALIGNMENT] ${cv.file}:${cv.line} → ${cv.message} (Rule: "${cv.declaration}")`);
  }

  await validator.finish(
    {
      'Vue components scanned': result.vueFilesScanned,
      'Style & Vue files scanned': result.styleFilesScanned,
      'Total emojis found': result.emojisFound,
      'Unwrapped emoji violations': result.violations.length,
      'CSS layout violations': result.cssViolations.length
    },
    errors,
    warnings
  );
}
