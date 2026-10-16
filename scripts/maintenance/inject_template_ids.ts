/**
 * scripts/maintenance/inject_template_ids.ts
 *
 * AST-aware and regex-hardened template ID injector for Vue 3 SFCs.
 * Scans components and views across the project and injects unique, semantic,
 * namespaced IDs into form controls and interactive elements lacking one.
 *
 * Usage:
 *   npx tsx scripts/maintenance/inject_template_ids.ts [--cwd=<path>] [--dry-run]
 */

import fs from 'node:fs';
import path from 'node:path';

interface InjectionOptions {
  cwd: string;
  dryRun: boolean;
}

const INHERENT_INTERACTIVE_TAGS: ReadonlySet<string> = new Set([
  'input',
  'select',
  'textarea',
  'button'
]);
const INTERACTIVE_TAG_REGEX = /<([\w-]+)\b/g;
const INTERACTIVE_EVENT_REGEX =
  /@(?:click|change|submit|input|keydown\.enter)\b|v-on:(?:click|change|submit|input)/i;

function kebabCase(str: string): string {
  return str
    .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
    .replace(/[\s_]+/g, '-')
    .toLowerCase();
}

function sanitizeSlug(str: string): string {
  return str
    .toLowerCase()
    .replace(/[^a-z0-9-_]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 30);
}

function extractFullTag(
  content: string,
  startIndex: number
): { tag: string; endIndex: number } | null {
  let inQuote: string | null = null;
  for (let i = startIndex; i < content.length; i++) {
    const char = content[i];
    if (inQuote) {
      if (char === inQuote) {
        inQuote = null;
      }
    } else if (char === '"' || char === "'") {
      inQuote = char;
    } else if (char === '>') {
      return {
        tag: content.substring(startIndex, i + 1),
        endIndex: i + 1
      };
    }
  }
  return null;
}

function findClosingTagOrText(
  templateContent: string,
  tagEndIndex: number,
  tagName: string
): string {
  if (tagName !== 'button') return '';
  const searchSlice = templateContent.slice(tagEndIndex, tagEndIndex + 120);
  const closingIdx = searchSlice.indexOf('</button>');
  if (closingIdx === -1) return '';
  const innerHtml = searchSlice.slice(0, closingIdx).trim();
  // Strip nested tags like <span class="..."></span> or icons
  const textOnly = innerHtml.replace(/<[^>]+>/g, '').trim();
  return sanitizeSlug(textOnly);
}

function parseCliArgs(): InjectionOptions {
  const args = process.argv.slice(2);
  let cwd = process.cwd();
  let dryRun = false;

  for (const arg of args) {
    if (arg.startsWith('--cwd=')) {
      cwd = path.resolve(arg.slice(6));
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { cwd, dryRun };
}

function getAllVueFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  const results: string[] = [];
  for (const entry of fs.readdirSync(dir, { recursive: true, withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.vue')) {
      results.push(path.join(entry.parentPath ?? dir, entry.name));
    }
  }
  return results;
}

export function runInjection(opts: InjectionOptions): void {
  console.log(`🔧 Iniciando inyector de Template IDs en: ${opts.cwd}`);
  console.log(
    `   Modo: ${opts.dryRun ? 'DRY-RUN (Simulación sin escribir)' : 'ESCRITURA DIRECTA'}`
  );

  const targetDirs = [
    path.join(opts.cwd, 'src', 'components'),
    path.join(opts.cwd, 'src', 'views'),
    path.join(opts.cwd, 'test_aventura', 'components'),
    path.join(opts.cwd, 'test_aventura', 'views')
  ];

  const allFiles: string[] = [];
  for (const d of targetDirs) {
    allFiles.push(...getAllVueFiles(d));
  }

  console.log(`📁 Encontrados ${allFiles.length} archivos .vue para escanear.`);

  const globalUsedIds = new Set<string>();

  // Pass 1: Collect pre-existing static IDs to prevent collisions
  for (const file of allFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const staticIdRegex = /(?:^|[\s<])id\s*=\s*["']([^"'\s>]+)["']/g;
    let m: RegExpExecArray | null;
    while ((m = staticIdRegex.exec(content)) !== null) {
      if (m[1]) globalUsedIds.add(m[1]);
    }
  }

  console.log(`📌 Registrados ${globalUsedIds.size} IDs estáticos preexistentes.`);

  let totalInjected = 0;
  let filesModified = 0;

  for (const filePath of allFiles) {
    const content = fs.readFileSync(filePath, 'utf-8');
    const templateMatch = /<template\b[^>]*>([\s\S]*?)<\/template>/i.exec(content);
    if (!templateMatch || templateMatch.index === undefined) continue;

    const templateOpenTagEnd = content.indexOf('>', templateMatch.index) + 1;
    const templateContent = templateMatch[1];
    if (!templateContent) continue;

    const baseName = path.basename(filePath, '.vue');
    const compPrefix = kebabCase(baseName);

    // Track replacements in reverse order of index to maintain string slice offsets
    interface InsertionPoint {
      tagStart: number; // relative to content
      tagName: string;
      idAttr: string;
      insertOffset: number; // point where id attribute should be placed
    }

    const insertions: InsertionPoint[] = [];
    INTERACTIVE_TAG_REGEX.lastIndex = 0;
    let match: RegExpExecArray | null;

    let componentLocalCounter = 0;

    while ((match = INTERACTIVE_TAG_REGEX.exec(templateContent)) !== null) {
      const tagType = (match[1] ?? '').toLowerCase();
      const tagInfo = extractFullTag(templateContent, match.index);
      if (!tagInfo) continue;

      const tagFull = tagInfo.tag;
      const isInteractive =
        INHERENT_INTERACTIVE_TAGS.has(tagType) || INTERACTIVE_EVENT_REGEX.test(tagFull);
      if (!isInteractive) continue;

      if (tagType === 'input' && /\btype\s*=\s*["']hidden["']/i.test(tagFull)) {
        continue;
      }

      if (/id-ok/i.test(tagFull)) {
        continue;
      }

      const hasId = /\b(?:v-bind:id|:id|id)\s*=/i.test(tagFull);
      if (hasId) continue;

      // Extract semantic descriptors
      let role = 'btn';
      if (tagType === 'input') role = 'input';
      else if (tagType === 'select') role = 'select';
      else if (tagType === 'textarea') role = 'textarea';
      else if (tagType !== 'button') role = tagType;

      let descriptor = '';

      // 1. Check v-model
      const vModelMatch = /\bv-model(?:\.[a-z]+)*\s*=\s*["']([^"'\s]+)["']/i.exec(tagFull);
      if (vModelMatch && vModelMatch[1]) {
        descriptor = sanitizeSlug(vModelMatch[1].split('.').pop() || '');
      }

      // 2. Check inner text of buttons
      if (!descriptor && tagType === 'button') {
        descriptor = findClosingTagOrText(templateContent, tagInfo.endIndex, 'button');
      }

      // 3. Check @click or event handler
      if (!descriptor) {
        const eventMatch = /@(?:click|change|submit)\s*=\s*["']([^"'\s(]+)/i.exec(tagFull);
        if (eventMatch && eventMatch[1]) {
          descriptor = sanitizeSlug(eventMatch[1].replace(/^(?:handle|on)/, ''));
        }
      }

      // 4. Check name attribute
      if (!descriptor) {
        const nameMatch = /\bname\s*=\s*["']([^"'\s]+)["']/i.exec(tagFull);
        if (nameMatch && nameMatch[1]) {
          descriptor = sanitizeSlug(nameMatch[1]);
        }
      }

      // 5. Check placeholder, title, or aria-label
      if (!descriptor) {
        const labelMatch = /\b(?:aria-label|title|placeholder)\s*=\s*["']([^"']+)["']/i.exec(
          tagFull
        );
        if (labelMatch && labelMatch[1]) {
          descriptor = sanitizeSlug(labelMatch[1]);
        }
      }

      // 6. Check ref
      if (!descriptor) {
        const refMatch = /\bref\s*=\s*["']([^"'\s]+)["']/i.exec(tagFull);
        if (refMatch && refMatch[1]) {
          descriptor = sanitizeSlug(refMatch[1]);
        }
      }

      // Fallback
      if (!descriptor) {
        componentLocalCounter++;
        descriptor = `${componentLocalCounter}`;
      }

      // Generate base unique static id
      let candidateId = `${compPrefix}-${role}-${descriptor}`;
      if (globalUsedIds.has(candidateId)) {
        let counter = 2;
        while (globalUsedIds.has(`${candidateId}-${counter}`)) {
          counter++;
        }
        candidateId = `${candidateId}-${counter}`;
      }
      globalUsedIds.add(candidateId);

      // Determine where to insert the attribute: immediately after `<tagName`
      const insertRelPos = match.index + match[0].length;
      const absoluteInsertPos = templateOpenTagEnd + insertRelPos;

      // Preserve formatting: if multi-line tag starting with newline, format cleanly
      const isMultiLine = tagFull.includes('\n');
      const idAttr = isMultiLine ? `\n    id="${candidateId}"` : ` id="${candidateId}"`;

      insertions.push({
        tagStart: templateOpenTagEnd + match.index,
        tagName: tagType,
        idAttr,
        insertOffset: absoluteInsertPos
      });
    }

    if (insertions.length === 0) continue;

    // Apply insertions from right to left (descending order of offsets)
    insertions.sort((a, b) => b.insertOffset - a.insertOffset);

    let newContent = content;
    for (const ins of insertions) {
      newContent =
        newContent.slice(0, ins.insertOffset) + ins.idAttr + newContent.slice(ins.insertOffset);
    }

    totalInjected += insertions.length;
    filesModified++;

    const rel = path.relative(opts.cwd, filePath);
    console.log(`  ✨ [${insertions.length} IDs] ${rel}`);

    if (!opts.dryRun) {
      fs.writeFileSync(filePath, newContent, 'utf-8');
    }
  }

  console.log('\n======================================================');
  console.log(`✅ Inyección completada:`);
  console.log(`   Archivos modificados: ${filesModified}`);
  console.log(`   Total de IDs inyectados: ${totalInjected}`);
  console.log('======================================================\n');
}

const cliOpts = parseCliArgs();
runInjection(cliOpts);
