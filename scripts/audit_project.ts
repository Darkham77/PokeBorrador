/**
 * scripts/audit_project.ts
 * 
 * STABLE PROJECT AUDIT ENGINE (Node.js 26+)
 * 
 * Final Safe Version: Context-aware GPU checking.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { parseArgs } from 'node:util';

enableCompileCache();

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'backup_legacy_code', 'public', 'docs', 'scratch']);
const AUDIT_EXTENSIONS = new Set(['.vue', '.scss', '.css', '.ts', '.js']);

const SASS_TRAPS = [
  'scale', 'grayscale', 'invert', 'opacity', 'brightness', 
  'blur', 'rotate', 'translate', 'saturate', 'drop-shadow',
  'translatex', 'translatey', 'translatez', 'skewx', 'skewy', 'matrix',
  'rgba', 'rgb'
];

interface Violation {
  file: string; line: number; message: string; context: string; severity: 'error' | 'warning'; fixable: boolean;
}

const config = {
  viewport: {
    regex: /\b\d+(?:\.\d+)?(vw|vh)\b/gi,
    message: (match: string) => `Unidad legacy detectada: '${match}'. Usa 'd${match.slice(-2)}' para soporte mobile dinámico.`,
    fix: (match: string) => `d${match.toLowerCase().slice(-2)}`
  },
  sassTraps: {
    regex: /([\.\$])?\b([a-zA-Z0-9-]+)\(/g,
    message: (match: string) => `Función SASS/CSS detectada en minúsculas: '${match}'. Debe capitalizarse para evitar colisiones en Dart Sass 2.0.`,
    fix: (match: string) => {
      if (match.startsWith('.') || match.startsWith('$')) return match;
      const func = match.slice(0, -1).toLowerCase();
      if (SASS_TRAPS.includes(func)) {
        if (func.includes('-')) {
          return func.split('-').map((p: string) => p.charAt(0).toUpperCase() + p.slice(1)).join('-') + '(';
        }
        return func.charAt(0).toUpperCase() + func.slice(1) + '(';
      }
      return match;
    }
  },
  gpuGaps: {
    regex: /(backdrop-filter|filter):/gi,
    message: "Filtro detectado sin 'will-change'. Considera añadir promoción de capa.",
    check: (content: string, match: any) => {
      // Look for will-change in the surrounding block (approx 500 chars)
      const start = Math.max(0, match.index - 500);
      const end = Math.min(content.length, match.index + 500);
      const context = content.substring(start, end);
      return !/will-change/gi.test(context);
    },
    fixable: false 
  },
  legacyDates: {
    regex: /new Date\(|Date\.now\(\)/g,
    message: "Uso de 'Date' detectado. Usa 'Temporal'.",
    fixable: false
  },
  nodePrefix: {
    regex: /import .* from ['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/g,
    message: "Import de Node sin prefijo 'node:'.",
    fix: (match: string) => match.replace(/['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/, (m) => m.slice(0, 1) + 'node:' + m.slice(1))
  },
  fileLength: {
    maxLines: 500,
    ignorePattern: /\[PureVue-Ignore-Length\]/
  }
};

async function walk(dir: string): Promise<string[]> {
  let files: string[] = [];
  const list = await fs.readdir(dir);
  for (const file of list) {
    if (IGNORE_DIRS.has(file)) continue;
    const fullPath = path.join(dir, file);
    if ((await fs.stat(fullPath)).isDirectory()) {
      files = files.concat(await walk(fullPath));
    } else if (AUDIT_EXTENSIONS.has(path.extname(file))) {
      files.push(fullPath);
    }
  }
  return files;
}

async function auditFile(filePath: string, fix: boolean): Promise<Violation[]> {
  const violations: Violation[] = [];
  let content = await fs.readFile(filePath, 'utf-8');
  let modified = false;

  const isVue = filePath.endsWith('.vue');
  const isLogic = filePath.endsWith('.ts') || filePath.endsWith('.js');
  const isStyle = filePath.endsWith('.scss') || filePath.endsWith('.css');

  if (isLogic || isVue) {
    const tag = 'script';
    let block = isVue ? extractBlock(content, tag) : content;
    if (block) {
      const newBlock = runRules(filePath, block, [config.legacyDates, config.nodePrefix], violations, fix, isVue ? findBlockStart(content, tag) : 0);
      if (fix && newBlock !== block) {
        content = isVue ? injectBlock(content, tag, newBlock) : newBlock;
        modified = true;
      }
    }
  }

  if (isStyle || isVue) {
    const tag = 'style';
    let block = isVue ? extractBlock(content, tag) : content;
    if (block) {
      const newBlock = runRules(filePath, block, [config.viewport, config.sassTraps, config.gpuGaps], violations, fix, isVue ? findBlockStart(content, tag) : 0);
      if (fix && newBlock !== block) {
        content = isVue ? injectBlock(content, tag, newBlock) : newBlock;
        modified = true;
      }
    }
  }

  if (fix && modified) {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  return violations;
}

function runRules(filePath: string, content: string, rules: any[], violations: Violation[], fix: boolean, offset: number): string {
  let result = content;
  for (const rule of rules) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      // 1. Specialized checks
      if (rule === config.sassTraps) {
        if (match[1]) continue; 
        if (!SASS_TRAPS.includes(match[2].toLowerCase())) continue; 
        if (match[2].charAt(0) === match[2].charAt(0).toUpperCase()) continue; 
      }
      
      if (rule === config.gpuGaps) {
        if (!rule.check(content, match)) continue; 
      }
      
      const lineNo = content.substring(0, match.index).split('\n').length + offset;
      violations.push({
        file: filePath, line: lineNo, message: typeof rule.message === 'function' ? rule.message(match[0]) : rule.message, 
        context: match[0], severity: rule.severity || 'warning', fixable: !!rule.fix
      });
    }
    if (fix && rule.fix) {
      const gRegex = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
      result = result.replace(gRegex, (m) => rule.fix(m));
    }
  }
  return result;
}

function extractBlock(content: string, tag: string): string | null {
  const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? match[1] : null;
}

function findBlockStart(content: string, tag: string): number {
  const match = content.match(new RegExp(`<${tag}[^>]*>`, 'i'));
  return match ? content.substring(0, match.index!).split('\n').length : 0;
}

function injectBlock(content: string, tag: string, block: string): string {
  return content.replace(new RegExp(`(<${tag}[^>]*>)[\\s\\S]*?(<\\/${tag}>)`, 'i'), `$1${block}$2`);
}

async function main() {
  const { values } = parseArgs({ options: { fix: { type: 'boolean', short: 'f' }, path: { type: 'string', short: 'p', default: '.' } } });
  console.log(styleText('bold', '\n--- 🔎 POKE VICIO - INTELLIGENT AUDIT ---'));
  const files = await walk(path.resolve(process.cwd(), values.path as string));
  let all = [];
  for (const f of files) all = all.concat(await auditFile(f, !!values.fix));
  all.forEach(v => console.log(styleText(v.severity === 'error' ? 'red' : 'yellow', `[${v.severity.toUpperCase()}] ${path.relative(process.cwd(), v.file)}:${v.line} -> ${v.message} ("${v.context}")`)));
  console.log(`\n❌ Errores: ${all.filter(v=>v.severity==='error').length} | ⚠️ Advertencias: ${all.filter(v=>v.severity==='warning').length}`);
  if (values.fix) console.log(styleText('cyan', '✨ Correcciones aplicadas.'));
}
main();
