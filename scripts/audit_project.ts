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
import { Z_LAYERS } from '../src/logic/constants/visuals.ts';

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

// Invert Z_LAYERS for lookup
const Z_VALUE_MAP = Object.fromEntries(
  Object.entries(Z_LAYERS).map(([key, value]) => [value, key])
);

// Sorted values for nearest search
const Z_SORTED_ENTRIES = Object.entries(Z_LAYERS).sort((a, b) => a[1] - b[1]);

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
    return !/(will-change|will-animate)/gi.test(context);
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

const esmExtensions: AuditRule = {
  // Match relative imports WITHOUT an extension (not .ts, .js, or .vue at the end)
  regex: /import .* from ['"](\.\.[^'"]*(?<!\.[jt]s)(?<!\.vue))['"]|import .* from ['"](\.[^/][^'"]*(?<!\.[jt]s)(?<!\.vue))['"]/g,
  message: (match: string) => `Import relativo sin extensión: '${match}'. En Node.js 26+ nativo las extensiones son obligatorias.`,
  // Fix: only add .ts when the path doesn't already end with .vue, .js, or .ts
  fix: (match: string) => match.replace(/(['"])(\.\.?\/[^'"]+)(?<!\.[jt]s)(?<!\.vue)(['"])/g, '$1$2.ts$3'),
  // Only applies to pure .ts files in src/logic, scripts — NOT .vue files (handled by Vite resolver)
  check: (filePath: string) => !filePath.endsWith('.vue')
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
  message: "Uso de setTimeout manual en script Node. Considera 'import { setTimeout } from \"node:timers/promises\"'.",
  // Only report in scripts/ — NEVER auto-fix via addImport (caused mass injection)
  check: (filePath: string) => filePath.includes('scripts' + path.sep) && !filePath.includes('node_modules'),
  fixable: false
  // NOTE: addImport removed intentionally — it caused spurious injection in src/ frontend files.
};

const explicitResource: AuditRule = {
  regex: /const (\w+) = (new DatabaseSync|fs\.openSync)/g,
  message: "Recurso detectado sin 'using'. Usa Explicit Resource Management (Node 26+).",
  fix: (match: string) => match.replace('const', 'using'),
  check: (filePath: string) => filePath.includes('scripts' + path.sep)
};

const manualAnimations: AuditRule = {
  regex: /@keyframes\b|\btransition\s*:/g,
  message: (match: string) => `Animación manual detectada: '${match}'. MIGRACIÓN OBLIGATORIA A GSAP: Está estrictamente PROHIBIDO borrar esta animación sin haberla migrado antes a GSAP para preservar la experiencia visual.`,
  severity: 'error',
  fixable: false
};

const manualTimersFrontend: AuditRule = {
  regex: /\b(set|clear)(Timeout|Interval)\b/g,
  message: (match: string) => `Timer de ANIMACIÓN detectado: '${match}'. MIGRACIÓN OBLIGATORIA A GSAP: Prohibido en componentes UI para gestionar flujo visual. Está estrictamente PROHIBIDO borrar este timer sin migrar su lógica a GSAP (ej: gsap.delayedCall) para evitar desincronización de flujo.`,
  severity: 'warning', 
  check: (_content: string, _match: RegExpExecArray) => {
    // TODO: TEMPORAL - Deshabilitado hasta terminar la migración de animaciones a GSAP.
    // Una vez terminada la migración, volver a habilitar este check.
    return false;

    /* 
    // Only context-aware check for animation keywords in Vue files
    const contextStart = Math.max(0, match.index - 150);
    const contextEnd = Math.min(content.length, match.index + 150);
    const context = content.substring(contextStart, contextEnd).toLowerCase();
    
    const animKeywords = [
      'anim', 'fade', 'show', 'hide', 'visible', 'active', 'opacity', 
      'transform', 'duration', 'delay', 'isloading', 'isvisible', 'isactive',
      'transition', 'oncomplete', 'flash', 'bounce', 'pulse'
    ];
    
    return animKeywords.some(key => context.includes(key));
    */
  },
  fixable: false
};

const fileLength: AuditRule = {
  regex: /[\s\S]*/,
  message: () => `Archivo demasiado largo.`, // Placeholder, handled in logic
  maxLines: 500,
  ignorePattern: /\[PureVue-Ignore-Length\]/
};



const zIndexAudit: AuditRule = {
  regex: /z-index\s*:\s*(-?\d+)\b/gi,
  message: (match: string) => {
    const val = parseInt(match.match(/-?\d+/)![0]!);
    
    const entry = Z_VALUE_MAP[val];
    if (entry) {
      const key = entry.toLowerCase().replace(/_/g, '-');
      return `Z-Index hardcodeado detectado: '${match}'. Corresponde a Z_LAYERS.${entry}. Usa 'var(--z-${key})'.`;
    }

    // Nearest match (+/- 10)
    let nearestKey = '';
    let minDiff = 11;
    for (const [key, zVal] of Z_SORTED_ENTRIES) {
      const diff = Math.abs(val - zVal);
      if (diff < minDiff) {
        minDiff = diff;
        nearestKey = key;
      }
    }

    if (nearestKey) {
      const key = nearestKey.toLowerCase().replace(/_/g, '-');
      const offset = val - Z_LAYERS[nearestKey as keyof typeof Z_LAYERS];
      const sign = offset >= 0 ? '+' : '-';
      return `Z-Index relativo detectado: '${match}'. Cerca de Z_LAYERS.${nearestKey}. Usa 'calc(var(--z-${key}) ${sign} ${Math.abs(offset)})'.`;
    }

    return `Z-Index hardcodeado fuera de estándar: '${match}'. Define una nueva capa en 'visuals.ts' o usa una existente.`;
  },
  severity: 'warning',
  fixable: false
};

const config = {
  viewport, gpuGaps, legacyDates, nodePrefix, esmExtensions, tsIgnore, timersPromises, explicitResource, fileLength, zIndexAudit, manualAnimations, manualTimersFrontend
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
      const allRules: AuditRule[] = [legacyDates, nodePrefix, esmExtensions, tsIgnore, timersPromises, explicitResource];
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
      const newBlock = runRules(filePath, block, [config.viewport, config.gpuGaps, config.zIndexAudit, config.manualAnimations], violations, fix, isVue ? findBlockStart(content, tag) : 0);
      if (fix && newBlock !== block) {
        content = isVue ? injectBlock(content, tag, newBlock) : newBlock;
        modified = true;
      }
    }
  }

  if (isVue) {
    const tag = 'script';
    const block = extractBlock(content, tag);
    if (block) {
      runRules(filePath, block, [config.manualTimersFrontend], violations, fix, findBlockStart(content, tag));
    }
  }

  // MODULARITY AUDIT: 300/500 Rule
  const isDataFile = filePath.includes('src' + path.sep + 'data' + path.sep) || 
                     filePath.endsWith('DB.ts') || 
                     filePath.endsWith('Metadata.ts') ||
                     config.fileLength.ignorePattern?.test(content);

  if (!isDataFile) {
    const lineCount = content.split('\n').length;
    if (lineCount > 500) {
      violations.push({
        file: filePath,
        line: lineCount,
        message: `Mantenibilidad CRÍTICA: El archivo tiene ${lineCount} líneas. MÁXIMO PERMITIDO: 500. Es OBLIGATORIO fragmentar este componente (SRP) o extraer lógica a Composables.`,
        context: `SLOC: ${lineCount}`,
        severity: 'error',
        fixable: false
      });
    } else if (lineCount > 300) {
      violations.push({
        file: filePath,
        line: lineCount,
        message: `Advertencia de Modularización: El archivo tiene ${lineCount} líneas. Se RECOMIENDA iniciar la fragmentación a partir de las 300 líneas para mantener la agilidad del código.`,
        context: `SLOC: ${lineCount}`,
        severity: 'warning',
        fixable: false
      });
    }
  }

  if (fix && modified) {
    await fs.writeFile(filePath, content, 'utf-8');
  }

  return violations;
}

function isInsideComment(content: string, index: number): boolean {
  const before = content.substring(0, index);
  
  // Check for Block Comment /* ... */
  const lastStartBlock = before.lastIndexOf('/*');
  const lastEndBlock = before.lastIndexOf('*/');
  if (lastStartBlock > lastEndBlock) return true;

  // Check for Line Comment // ...
  const lastNewLine = before.lastIndexOf('\n');
  const lastLineComment = before.lastIndexOf('//');
  if (lastLineComment > lastNewLine) return true;

  return false;
}

function runRules(filePath: string, content: string, rules: AuditRule[], violations: Violation[], fix: boolean, offset: number): string {
  let result = content;
  for (const rule of rules) {
    const regex = new RegExp(rule.regex.source, rule.regex.flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      // 0. Skip comments to avoid false positives
      if (isInsideComment(content, match.index)) continue;

      // 1. Specialized checks
      if (rule.check) {
        if (rule === config.gpuGaps || rule === config.manualTimersFrontend) {
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
      
      // Aplicar fix solo si pasa el check (contexto-aware)
      result = result.replace(gRegex, (match) => {
        // Necesitamos recrear el match array para el check
        const execMatch = rule.regex.exec(content);
        if (rule.check) {
          const pass = (rule === config.gpuGaps) 
            ? rule.check(content, execMatch!) 
            : rule.check(filePath, execMatch!);
          if (!pass) return match;
        }
        return fixer(match);
      });
    }
  }
  return result;
}

function extractBlock(content: string, tag: string): string | null {
  const match = content.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i'));
  return match ? (match[1] ?? null) : null;
}

function findBlockStart(content: string, tag: string): number {
  const match = content.match(new RegExp(`<${tag}[^>]*>`, 'i'));
  return match ? content.substring(0, match.index!).split('\n').length : 0;
}

function injectBlock(content: string, tag: string, block: string): string {
  return content.replace(new RegExp(`(<${tag}[^>]*>)[\\s\\S]*?(<\\/${tag}>)`, 'i'), `$1${block}$2`);
}

async function checkZIndexConsistency(fix: boolean): Promise<string[]> {
  const scssPath = path.resolve(process.cwd(), 'src/styles/core/_variables.scss');
  try {
    let scssContent = await fs.readFile(scssPath, 'utf-8');
    let modified = false;
    const errors: string[] = [];

    for (const [key, value] of Object.entries(Z_LAYERS)) {
      const dashedKey = key.toLowerCase().replace(/_/g, '-');
      const varName = `--z-${dashedKey}`;
      const regex = new RegExp(`${varName}\\s*:\\s*(-?\\d+)\\b`);
      const match = scssContent.match(regex);

      if (!match) {
        errors.push(`Falta variable CSS '${varName}' (debe ser ${value})`);
        if (fix) {
          // Intentar insertar antes del cierre del bloque :root
          if (scssContent.includes(':root {')) {
             scssContent = scssContent.replace(/}\s*$/, `  ${varName}: ${value};\n}\n`);
             modified = true;
          }
        }
      } else if (parseInt(match[1]!) !== value) {
        errors.push(`Desincronización en '${varName}': TS=${value}, SCSS=${match[1]}`);
        if (fix) {
          scssContent = scssContent.replace(regex, `${varName}: ${value}`);
          modified = true;
        }
      }
    }

    if (fix && modified) {
      await fs.writeFile(scssPath, scssContent, 'utf-8');
    }
    return errors;
  } catch (e) {
    return [`Error leyendo _variables.scss: ${e}`];
  }
}

async function main() {
  const { values } = parseArgs({ options: { fix: { type: 'boolean', short: 'f' }, path: { type: 'string', short: 'p', default: '.' } } });
  console.log(styleText('bold', '\n--- 🔎 POKE VICIO - INTELLIGENT AUDIT ---'));
  
  // Consistency Check
  const syncErrors = await checkZIndexConsistency(!!values.fix);
  if (syncErrors.length > 0) {
    console.log(styleText('magenta', `\n[SYNC] Desincronización detectada entre visuals.ts y _variables.scss:`));
    syncErrors.forEach(e => console.log(styleText('yellow', `  -> ${e}`)));
    if (!values.fix) console.log(styleText('cyan', '  (Usa --fix para sincronizar automáticamente)'));
  }

  const files = await getFilesToAudit(path.resolve(process.cwd(), values.path as string));
  let all: Violation[] = [];
  for (const f of files) all = all.concat(await auditFile(f, !!values.fix));
  all.forEach(v => console.log(styleText(v.severity === 'error' ? 'red' : 'yellow', `[${v.severity.toUpperCase()}] ${path.relative(process.cwd(), v.file)}:${v.line} -> ${v.message} ("${v.context}")`)));
  console.log(`\n❌ Errores: ${all.filter(v=>v.severity==='error').length} | ⚠️ Advertencias: ${all.filter(v=>v.severity==='warning').length}`);
  if (values.fix) console.log(styleText('cyan', '✨ Correcciones aplicadas.'));
}
main();
