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


interface AuditRule {
  regex: RegExp;
  message: string | ((match: string) => string);
  fix?: (match: string) => string;
  check?: (context: string, match: RegExpExecArray) => boolean;
  severity?: 'error' | 'warning';
  fixable?: boolean;
  addImport?: string;
  maxLines?: number;
  ignorePattern?: RegExp;
}

interface Violation {
  file: string; line: number; message: string; context: string; severity: 'error' | 'warning'; fixable: boolean;
}

const viewport: AuditRule = {
  regex: /\b\d+(?:\.\d+)?(vw|vh)\b/gi,
  message: (match: string) => `Unidad legacy detectada: '${match}'. Usa 'd${match.slice(-2)}' para soporte mobile dinámico.`,
  fix: (match: string) => `d${match.toLowerCase().slice(-2)}`
};


const gpuGaps: AuditRule = {
  regex: /(backdrop-filter|filter):/gi,
  message: "Filtro detectado sin 'will-change'. Considera añadir promoción de capa.",
  check: (content: string, match: RegExpExecArray) => {
    const start = Math.max(0, match.index - 500);
    const end = Math.min(content.length, match.index + 500);
    const context = content.substring(start, end);
    return !/will-change/gi.test(context);
  },
  fixable: false 
};

const legacyDates: AuditRule = {
  regex: /new Date\(|Date\.now\(\)/g,
  message: "Uso de 'Date' detectado. Usa 'Temporal'.",
  fixable: false
};

const nodePrefix: AuditRule = {
  regex: /import .* from ['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/g,
  message: "Import de Node sin prefijo 'node:'.",
  fix: (match: string) => match.replace(/['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/, (m) => m.slice(0, 1) + 'node:' + m.slice(1))
};

const tsIgnore: AuditRule = {
  regex: /\/\/\s*@ts-(ignore|nocheck|expect-error)/g,
  message: "Uso de supresión de TypeScript detectado. Prohibido por la política 'Zero-Ignore'.",
  severity: 'error',
  fix: () => '',
  fixable: true
};

const timersPromises: AuditRule = {
  regex: /new Promise\(r => setTimeout\(r, (\d+)\)\)/g,
  message: "Uso de setTimeout manual. Usa 'import { setTimeout } from \"node:timers/promises\"'.",
  fix: (match: string) => match.replace(/new Promise\(r => setTimeout\(r, (\d+)\)\)/, 'await setTimeout($1)'),
  check: (filePath: string) => filePath.includes('scripts' + path.sep) && !filePath.includes('node_modules'),
  addImport: "import { setTimeout } from 'node:timers/promises';"
};

const explicitResource: AuditRule = {
  regex: /const (\w+) = (new DatabaseSync|fs\.openSync)/g,
  message: "Recurso detectado sin 'using'. Usa Explicit Resource Management (Node 26+).",
  fix: (match: string) => match.replace('const', 'using'),
  check: (filePath: string) => filePath.includes('scripts' + path.sep)
};

const fileLength: AuditRule = {
  regex: /[\s\S]*/,
  message: "Archivo demasiado largo.",
  maxLines: 500,
  ignorePattern: /\[PureVue-Ignore-Length\]/
};

const SASS_TRAPS = [
  'scale', 'grayscale', 'invert', 'opacity', 'brightness', 
  'blur', 'rotate', 'translate', 'saturate', 'drop-shadow',
  'translatex', 'translatey', 'translatez', 'skewx', 'skewy', 'matrix',
  'rgba', 'rgb'
];

const sassTraps: AuditRule = {
  regex: /([.$])?\b([a-zA-Z0-9-]+)\(/g,
  message: (match: string) => `Función SASS/CSS detectada sin capitalización: '${match}'. El plugin de Vite la capitalizará, pero se recomienda escribirla correctamente.`,
  fixable: false
};

const config = {
  viewport, gpuGaps, legacyDates, nodePrefix, tsIgnore, timersPromises, explicitResource, fileLength, sassTraps
};

async function getFilesToAudit(dir: string): Promise<string[]> {
  const files: string[] = [];
  const pattern = `**/*{${Array.from(AUDIT_EXTENSIONS).join(',')}}`;
  
  for await (const entry of fs.glob(pattern, { cwd: dir, exclude: (p: string) => Array.from(IGNORE_DIRS).some(d => p.includes(d)) })) {
    files.push(path.resolve(dir, entry));
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
    const block = isVue ? extractBlock(content, tag) : content;
    if (block) {
      const allRules: AuditRule[] = [legacyDates, nodePrefix, tsIgnore, timersPromises, explicitResource];
      let rules: AuditRule[] = allRules;
      
      // EXCEPCIÓN: Ignorar 'legacyDates' en scripts de utilidad/migración
      if (filePath.includes('scripts' + path.sep) || filePath.includes('audit_project.ts')) {
        rules = rules.filter(r => r !== config.legacyDates);
      }

      let newBlock = runRules(filePath, block, rules, violations, fix, isVue ? findBlockStart(content, tag) : 0);
      
      // Post-fix: Añadir imports necesarios si se aplicaron correcciones
      if (fix && newBlock !== block) {
        for (const rule of rules) {
          const importer = rule.addImport;
          if (importer && newBlock.includes(importer.split(' ')[1]!) && !newBlock.includes(importer)) {
            newBlock = importer + '\n' + newBlock;
          }
        }
        content = isVue ? injectBlock(content, tag, newBlock) : newBlock;
        modified = true;
      }
    }
  }

  if (isStyle || isVue) {
    const tag = 'style';
    const block = isVue ? extractBlock(content, tag) : content;
    if (block) {
      const newBlock = runRules(filePath, block, [config.viewport, config.gpuGaps], violations, fix, isVue ? findBlockStart(content, tag) : 0);
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

function runRules(filePath: string, content: string, rules: AuditRule[], violations: Violation[], fix: boolean, offset: number): string {
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
      
      if (rule.check) {
        if (rule === config.gpuGaps) {
          if (!rule.check(content, match)) continue;
        } else {
          if (!rule.check(filePath, match)) continue;
        }
      }
      
      const lineNo = content.substring(0, match.index).split('\n').length + offset;
      violations.push({
        file: filePath, line: lineNo, message: typeof rule.message === 'function' ? rule.message(match[0]) : rule.message, 
        context: match[0], severity: rule.severity || 'warning', fixable: !!rule.fix
      });
    }
    const fixer = rule.fix;
    if (fix && fixer) {
      const gRegex = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
      result = result.replace(gRegex, (m) => fixer(m));
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
  const files = await getFilesToAudit(path.resolve(process.cwd(), values.path as string));
  let all: Violation[] = [];
  for (const f of files) all = all.concat(await auditFile(f, !!values.fix));
  all.forEach(v => console.log(styleText(v.severity === 'error' ? 'red' : 'yellow', `[${v.severity.toUpperCase()}] ${path.relative(process.cwd(), v.file)}:${v.line} -> ${v.message} ("${v.context}")`)));
  console.log(`\n❌ Errores: ${all.filter(v=>v.severity==='error').length} | ⚠️ Advertencias: ${all.filter(v=>v.severity==='warning').length}`);
  if (values.fix) console.log(styleText('cyan', '✨ Correcciones aplicadas.'));
}
main();
