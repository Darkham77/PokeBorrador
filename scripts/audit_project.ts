/**
 * scripts/audit_project.ts
 * 
 * STABLE PROJECT AUDIT ENGINE (Node.js 26+)
 * 
 * Final Safe Version: Context-aware GPU checking.
 */

import fs from 'node:fs/promises';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { parseArgs } from 'node:util';
import { execSync } from 'node:child_process';
import { Z_LAYERS } from '../src/logic/constants/visuals.ts';

enableCompileCache();

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'backup_legacy_code', 'public', 'docs', 'scratch', 'showdown']);
const AUDIT_EXTENSIONS = new Set(['.vue', '.scss', '.css', '.ts', '.js']);


interface AuditRule {
  regex: RegExp;
  message: string | ((match: string) => string);
  fix?: (match: string) => string;
  check?: (context: string, match: RegExpExecArray, filePath?: string) => boolean;
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
  check: (content: string, match: RegExpExecArray, filePath?: string) => {
    const start = Math.max(0, match.index - 500);
    const end = Math.min(content.length, match.index + 500);
    const context = content.substring(start, end);

    // 1. Check for standard disable/ignore comments in the context
    if (/audit-disable\s+gpu-gaps|will-change:\s*(skip|ignore|false)/i.test(context)) {
      return false;
    }

    // 2. Check if this is a high-density component (card, sprite, avatar, nickname, weather, list, grid, cell, row, icon, badge)
    // We analyze the surrounding text or selector for typical high-density keywords
    const beforeMatch = content.substring(start, match.index);
    const lastSemi = Math.max(beforeMatch.lastIndexOf(';'), beforeMatch.lastIndexOf('}'), beforeMatch.lastIndexOf('{'));
    const selectorText = beforeMatch.substring(lastSemi + 1).trim();

    const highDensityKeywords = /(card|item|sprite|avatar|nickname|badge|icon|grid|list|row|cell|weather|overlay|background)/i;
    if (highDensityKeywords.test(selectorText) || (filePath && highDensityKeywords.test(filePath))) {
      return false;
    }

    // 3. Only warn if the filter is dynamically animated or transitioned via CSS
    // Check if there is transition or animation property in the context that targets filter/backdrop-filter/all
    const isDynamic = /transition\s*:[^;]*(filter|backdrop-filter|all)|animation\s*:/gi.test(context);
    if (!isDynamic) {
      return false; // Static filter - does not require layer promotion
    }

    // 4. Warn if will-change is missing
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
  message: (match: string) => `Timer de ANIMACIÓN/UI detectado: '${match}'. MIGRACIÓN OBLIGATORIA A GSAP: Prohibido en componentes UI y lógicas para gestionar flujo visual o reintentos de carga. Usa gsap.delayedCall, timelines o promesas deterministas.`,
  severity: 'error', 
  check: (content: string, _match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    if (/audit-disable\s+timers/i.test(content)) return false;
    // Strictly block inside Vue SFCs under src/components/ to protect component logic
    return filePath.endsWith('.vue') && filePath.includes('src' + path.sep + 'components');
  },
  fixable: false
};

const jsonStringifyInWatch: AuditRule = {
  regex: /\bwatch\s*\(\s*(?:\(\)\s*=>\s*)?JSON\.stringify/g,
  message: "Uso de 'JSON.stringify' dentro de un watcher detectado. Serializar objetos/arrays en watchers de alta frecuencia satura la CPU. Realiza comparaciones directas por elementos o usa watchers profundos ({ deep: true }) con moderación.",
  severity: 'error',
  fixable: false
};

const intersectionObserverRoot: AuditRule = {
  regex: /new\s+IntersectionObserver\s*\(\s*[^,]+,\s*\{\s*[^}]*root\s*:\s*(?!null\b)[a-zA-Z0-9_$]/g,
  message: "Uso de 'root' dinámico o DOM en IntersectionObserver detectado. En contenedores escalados o con zoom (ej: #zoomable-content), usar un root distinto de null genera fallos de cálculo de visibilidad que apagan animaciones. Deja 'root' como 'null' (viewport) o no lo declares.",
  severity: 'warning',
  fixable: false
};

const dbInTemplates: AuditRule = {
  regex: /\b(pokemonDataProvider|DBRouter|sqlite|supabase)\b/g,
  message: "Acceso directo a Base de Datos o Data Provider detectado dentro de un bloque <template>. Está PROHIBIDO consultar datos en el render loop. Cachea los datos reactivamente con 'computed' en <script> y expón una estructura de datos lista para renderizar.",
  severity: 'error',
  fixable: false
};

const functionCallsInTemplates: AuditRule = {
  regex: /(?::[a-zA-Z0-9-]+|v-bind:[a-zA-Z0-9-]+)="([a-zA-Z0-9_$]+)\([^"]*\)"|\{\{\s*([a-zA-Z0-9_$]+)\([^}]*\)\s*\}\}/g,
  message: (match: string) => `Llamada a función/método '${match}' detectada en plantilla Vue. Está PROHIBIDO llamar a funciones que realicen consultas a bases de datos, transformaciones de array (.map/.filter) o lógica pesada en el render loop. Cachea los datos con 'computed'.`,
  severity: 'error',
  check: (_content: string, match: RegExpExecArray, filePath?: string) => {
    if (!filePath) return false;
    const funcName = match[1] || match[2];
    if (!funcName) return false;
    
    // Ignorar funciones seguras comunes de formato o traducción
    const safeFunctions = /^(t|i18n|translate|formatCurrency|formatNumber|class|style|typeof)$/i;
    if (safeFunctions.test(funcName)) return false;
    
    try {
      const fullFileContent = readFileSync(filePath, 'utf-8');
      const scriptStart = fullFileContent.indexOf('<script');
      const scriptEnd = fullFileContent.indexOf('</script>');
      if (scriptStart === -1 || scriptEnd === -1) return false;
      const scriptContent = fullFileContent.substring(scriptStart, scriptEnd);
      
      const funcDefRegex = new RegExp(`(?:const|let|var|function)\\s+${funcName}\\b[^;]*`, 'g');
      const defMatch = funcDefRegex.exec(scriptContent);
      if (!defMatch) return false;
      
      const defStart = defMatch.index;
      const defContext = scriptContent.substring(defStart, Math.min(scriptContent.length, defStart + 1000));
      
      const isHeavy = /\b(pokemonDataProvider|DBRouter|sqlite|supabase|getGuardianData|\.map\(|\.filter\(|\.reduce\()/i.test(defContext);
      return isHeavy;
    } catch (_e) {
      return false;
    }
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
  fix: (match: string) => {
    const valMatch = match.match(/-?\d+/);
    if (!valMatch) return match;
    const val = parseInt(valMatch[0]);
    
    const entry = Z_VALUE_MAP[val];
    if (entry) {
      const key = entry.toLowerCase().replace(/_/g, '-');
      return `z-index: var(--z-${key})`;
    }

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
      return `z-index: calc(var(--z-${key}) ${sign} ${Math.abs(offset)})`;
    }

    return match;
  },
  fixable: true
};

const config = {
  viewport, gpuGaps, legacyDates, nodePrefix, esmExtensions, tsIgnore, timersPromises, explicitResource, fileLength, zIndexAudit, manualAnimations, manualTimersFrontend, jsonStringifyInWatch, intersectionObserverRoot, dbInTemplates, functionCallsInTemplates
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
      const allRules: AuditRule[] = [legacyDates, nodePrefix, esmExtensions, tsIgnore, timersPromises, explicitResource, config.jsonStringifyInWatch, config.intersectionObserverRoot];
      let rules: AuditRule[] = allRules;
      
      // EXCEPCIÓN: Ignorar 'legacyDates' en scripts de utilidad/migración
      if (filePath.includes('scripts' + path.sep) || filePath.includes('supabase' + path.sep) || filePath.includes('audit_project.ts')) {
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

  if (isVue) {
    const tag = 'template';
    const block = extractBlock(content, tag);
    if (block) {
      runRules(filePath, block, [config.dbInTemplates, config.functionCallsInTemplates], violations, fix, findBlockStart(content, tag));
    }
  }

  // MODULARITY AUDIT: 300/500 Rule
  const isDataFile = filePath.includes('src' + path.sep + 'data' + path.sep) || 
                     filePath.includes('scripts' + path.sep) ||
                     filePath.includes('supabase' + path.sep) ||
                     filePath.endsWith('DB.ts') || 
                     filePath.endsWith('Metadata.ts') ||
                     config.fileLength.ignorePattern?.test(content);

  if (!isDataFile) {
    // Calcular SLOC real excluyendo comentarios y líneas vacías
    let slocCount = 0;
    let inBlockComment = false;
    let inHtmlComment = false;
    for (const line of content.split('\n')) {
      const trimmed = line.trim();
      if (trimmed === '') continue;
      if (inBlockComment) {
        if (trimmed.includes('*/')) inBlockComment = false;
        continue;
      }
      if (inHtmlComment) {
        if (trimmed.includes('-->')) inHtmlComment = false;
        continue;
      }
      if (trimmed.startsWith('//')) continue;
      if (trimmed.startsWith('/*')) {
        if (!trimmed.includes('*/')) inBlockComment = true;
        continue;
      }
      if (trimmed.startsWith('<!--')) {
        if (!trimmed.includes('-->')) inHtmlComment = true;
        continue;
      }
      slocCount++;
    }

    if (slocCount > 500) {
      violations.push({
        file: filePath,
        line: slocCount,
        message: `Mantenibilidad CRÍTICA: El archivo tiene ${slocCount} líneas reales de código (SLOC). MÁXIMO PERMITIDO: 500. Es OBLIGATORIO fragmentar este componente (SRP) o extraer lógica a Composables.`,
        context: `SLOC: ${slocCount}`,
        severity: 'error',
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
          if (!rule.check(content, match, filePath)) continue;
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
            ? rule.check(content, execMatch!, filePath) 
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

function getChangedFiles(ref: string): string[] {
  try {
    const output = execSync(`git diff --name-only ${ref}`, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'] });
    return output
      .split('\n')
      .map(f => f.trim())
      .filter(f => f !== '' && AUDIT_EXTENSIONS.has(path.extname(f)) && !Array.from(IGNORE_DIRS).some(d => f.includes(d)))
      .map(f => path.resolve(process.cwd(), f));
  } catch (_e) {
    console.log(styleText('yellow', `⚠️ No se pudo obtener la lista de archivos modificados desde git para ref: '${ref}'. Se auditará el proyecto completo.`));
    return [];
  }
}

interface FallowInstance {
  path: string;
  line: number;
}
interface FallowCloneGroup {
  instances: FallowInstance[];
  duplicated_tokens: number;
}
interface FallowFinding {
  path: string;
  line: number;
  cwe?: number;
  evidence?: string;
  kind?: string;
  function_name?: string;
  cognitive?: number;
  cyclomatic?: number;
}
interface FallowUnusedDep {
  package_name: string;
  path?: string;
  line?: number;
}
interface FallowUnusedExport {
  export_name: string;
  path: string;
  line?: number;
}
interface FallowUnusedFile {
  path: string;
}
interface FallowDeadCode {
  unused_dependencies?: FallowUnusedDep[];
  unused_dev_dependencies?: FallowUnusedDep[];
  unused_exports?: FallowUnusedExport[];
  unused_files?: FallowUnusedFile[];
}
interface FallowComplexity {
  findings?: FallowFinding[];
}
interface FallowAuditData {
  clone_groups?: FallowCloneGroup[];
  security_findings?: FallowFinding[];
  dead_code?: FallowDeadCode;
  complexity?: FallowComplexity;
  findings?: FallowFinding[];
  unused_dependencies?: FallowUnusedDep[];
  unused_dev_dependencies?: FallowUnusedDep[];
  unused_exports?: FallowUnusedExport[];
  unused_files?: FallowUnusedFile[];
}

function runFallow(command: string, extraArgs: string[] = []): Violation[] {
  const violations: Violation[] = [];
  try {
    const args = ['--format', 'json', ...extraArgs];
    const cmd = `node ./node_modules/fallow/bin/fallow ${command} ${args.join(' ')}`;
    const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 10 * 1024 * 1024 });
    const jsonStart = stdout.indexOf('{');
    if (jsonStart !== -1) {
      const data = JSON.parse(stdout.substring(jsonStart)) as FallowAuditData;
      violations.push(...mapFallowJson(command, data));
    }
  } catch (e: unknown) {
    const err = e as { stdout?: Buffer; message?: string; stderr?: Buffer };
    if (err.stdout) {
      const stdoutStr = err.stdout.toString('utf8');
      const jsonStart = stdoutStr.indexOf('{');
      if (jsonStart !== -1) {
        try {
          const data = JSON.parse(stdoutStr.substring(jsonStart)) as FallowAuditData;
          violations.push(...mapFallowJson(command, data));
        } catch {
          // Ignorar errores de parseo de JSON en salida de error
        }
      }
    }
    if (violations.length === 0) {
      violations.push({
        file: 'fallow',
        line: 0,
        message: `Error ejecutando fallow ${command}: ${err.message || String(e)} | Stderr: ${err.stderr || ''}`,
        context: `fallow ${command}`,
        severity: 'error',
        fixable: false
      });
    }
  }
  return violations;
}

function mapFallowJson(command: string, data: FallowAuditData): Violation[] {
  const violations: Violation[] = [];
  if (command === 'dupes') {
    const groups = data.clone_groups || [];
    for (const g of groups) {
      const instances = g.instances || [];
      if (instances.length > 0) {
        const first = instances[0];
        if (first) {
          const locations = instances.slice(1).map((i) => `${i.path}:${i.line}`).join(', ');
          violations.push({
            file: path.resolve(process.cwd(), first.path),
            line: first.line,
            message: `Código duplicado crítico: Encontradas ${instances.length} coincidencias de código idéntico. Ubicaciones: ${first.path}:${first.line}, ${locations}`,
            context: `duplicación (${g.duplicated_tokens} tokens)`,
            severity: 'error',
            fixable: false
          });
        }
      }
    }
  } else if (command === 'security') {
    const findings = data.security_findings || [];
    for (const f of findings) {
      violations.push({
        file: path.resolve(process.cwd(), f.path),
        line: f.line,
        message: `Vulnerabilidad de seguridad [CWE-${f.cwe}] en ${f.path}:${f.line} -> ${f.evidence}`,
        context: f.kind || '',
        severity: 'error',
        fixable: false
      });
    }
  } else if (command === 'audit') {
    if (data.dead_code) {
      const unusedDeps = [...(data.dead_code.unused_dependencies || []), ...(data.dead_code.unused_dev_dependencies || [])];
      for (const d of unusedDeps) {
        violations.push({
          file: path.resolve(process.cwd(), d.path || 'package.json'),
          line: d.line || 1,
          message: `Sugerencia de calidad (Fallow): Dependencia no usada: '${d.package_name}'`,
          context: d.package_name,
          severity: 'warning',
          fixable: false
        });
      }
      const unusedExports = data.dead_code.unused_exports || [];
      for (const x of unusedExports) {
        violations.push({
          file: path.resolve(process.cwd(), x.path),
          line: x.line || 1,
          message: `Sugerencia de calidad (Fallow): Export no usado: '${x.export_name}'`,
          context: x.export_name,
          severity: 'warning',
          fixable: false
        });
      }
      const unusedFiles = data.dead_code.unused_files || [];
      for (const f of unusedFiles) {
        violations.push({
          file: path.resolve(process.cwd(), f.path),
          line: 1,
          message: `Sugerencia de calidad (Fallow): Archivo huérfano/no usado`,
          context: f.path,
          severity: 'warning',
          fixable: false
        });
      }
    }
    if (data.complexity && data.complexity.findings) {
      for (const f of data.complexity.findings) {
        violations.push({
          file: path.resolve(process.cwd(), f.path),
          line: f.line,
          message: `Sugerencia de complejidad (Fallow): Función '${f.function_name || ''}' alta complejidad (cognitiva: ${f.cognitive || 0}, ciclomática: ${f.cyclomatic || 0})`,
          context: f.function_name || '',
          severity: 'warning',
          fixable: false
        });
      }
    }
  } else if (command === 'dead-code') {
    const unusedDeps = [...(data.unused_dependencies || []), ...(data.unused_dev_dependencies || [])];
    for (const d of unusedDeps) {
      violations.push({
        file: path.resolve(process.cwd(), d.path || 'package.json'),
        line: d.line || 1,
        message: `Sugerencia de calidad (Fallow): Dependencia no usada: '${d.package_name}'`,
        context: d.package_name,
        severity: 'warning',
        fixable: false
      });
    }
    const unusedExports = data.unused_exports || [];
    for (const x of unusedExports) {
      violations.push({
        file: path.resolve(process.cwd(), x.path),
        line: x.line || 1,
        message: `Sugerencia de calidad (Fallow): Export no usado: '${x.export_name}'`,
        context: x.export_name,
        severity: 'warning',
        fixable: false
      });
    }
    const unusedFiles = data.unused_files || [];
    for (const f of unusedFiles) {
      violations.push({
        file: path.resolve(process.cwd(), f.path),
        line: 1,
        message: `Sugerencia de calidad (Fallow): Archivo huérfano/no usado`,
        context: f.path,
        severity: 'warning',
        fixable: false
      });
    }
  } else if (command === 'health') {
    const findings = data.findings || [];
    for (const f of findings) {
      violations.push({
        file: path.resolve(process.cwd(), f.path),
        line: f.line,
        message: `Sugerencia de complejidad (Fallow): Función '${f.function_name || ''}' alta complejidad (cognitiva: ${f.cognitive || 0}, ciclomática: ${f.cyclomatic || 0})`,
        context: f.function_name || '',
        severity: 'warning',
        fixable: false
      });
    }
  }
  return violations;
}

async function main() {
  const { values } = parseArgs({
    options: {
      fix: { type: 'boolean', short: 'f' },
      path: { type: 'string', short: 'p', default: '.' },
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' },
      'changed-since': { type: 'string' }
    }
  });
  console.log(styleText('bold', '\n--- 🔎 POKE VICIO - INTELLIGENT AUDIT ---'));
  
  // Consistency Check
  const syncErrors = await checkZIndexConsistency(!!values.fix);
  if (syncErrors.length > 0) {
    console.log(styleText('magenta', `\n[SYNC] Desincronización detectada entre visuals.ts y _variables.scss:`));
    syncErrors.forEach(e => console.log(styleText('yellow', `  -> ${e}`)));
    if (!values.fix) console.log(styleText('cyan', '  (Usa --fix para sincronizar automáticamente)'));
  }

  let files: string[] = [];
  const changedSince = values['changed-since'] as string | undefined;
  
  if (changedSince) {
    files = getChangedFiles(changedSince);
    console.log(styleText('cyan', `Auditando solo archivos cambiados desde: '${changedSince}' (${files.length} archivos)`));
  } else {
    files = await getFilesToAudit(path.resolve(process.cwd(), values.path as string));
  }

  let all: Violation[] = [];
  for (const f of files) {
    all = all.concat(await auditFile(f, !!values.fix));
  }

  // Integración de Fallow
  console.log(styleText('cyan', '\nEjecutando análisis de Fallow...'));
  if (changedSince) {
    all = all.concat(runFallow('audit', ['--changed-since', changedSince]));
    all = all.concat(runFallow('security', ['--changed-since', changedSince]));
  } else {
    all = all.concat(runFallow('dupes'));
    all = all.concat(runFallow('security'));
    all = all.concat(runFallow('dead-code'));
    all = all.concat(runFallow('health'));
  }

  if (values.summary) {
    console.log(styleText('bold', '\n--- 📊 RESUMEN DE VIOLACIONES ---'));
    
    const fileGroups: Record<string, number> = {};
    const typeGroups: Record<string, number> = {};

    for (const v of all) {
      const rel = path.relative(process.cwd(), v.file);
      fileGroups[rel] = (fileGroups[rel] || 0) + 1;

      let type = 'Otros';
      if (v.message.includes('Unidad legacy')) type = 'Viewport (dvh/dvw)';
      else if (v.message.includes('will-change')) type = 'Falta will-change (GPU)';
      else if (v.message.includes('Temporal')) type = 'Uso de Date (Temporal)';
      else if (v.message.includes('prefijo')) type = 'Import de Node sin prefijo';
      else if (v.message.includes('extensión')) type = 'Import relativo sin extensión';
      else if (v.message.includes('Zero-Ignore')) type = 'TypeScript Ignore';
      else if (v.message.includes('setTimeout manual')) type = 'setTimeout manual en script';
      else if (v.message.includes('timer de ANIMACIÓN')) type = 'setTimeout/setInterval en UI';
      else if (v.message.includes('sin \'using\'')) type = 'Falta explicit resource (\'using\')';
      else if (v.message.includes('Animación manual')) type = 'Animación/Transición manual (GSAP)';
      else if (v.message.includes('Z-Index')) type = 'Z-Index fuera de estándar';
      else if (v.message.includes('archivo tiene') || v.message.includes('líneas reales')) type = 'Largo de archivo (>300/500 líneas)';
      else if (v.message.includes('Código duplicado')) type = 'Fallow: Código duplicado';
      else if (v.message.includes('Vulnerabilidad de seguridad')) type = 'Fallow: Vulnerabilidad de seguridad';
      else if (v.message.includes('Sugerencia de calidad')) type = 'Fallow: Calidad / Dead Code';
      else if (v.message.includes('Sugerencia de complejidad')) type = 'Fallow: Complejidad';

      typeGroups[type] = (typeGroups[type] || 0) + 1;
    }

    console.log('\nPor tipo de regla:');
    Object.entries(typeGroups)
      .sort((a, b) => b[1] - a[1])
      .forEach(([type, count]) => {
        console.log(`  - ${type}: ${count}`);
      });

    console.log('\nTop 15 archivos con más problemas:');
    Object.entries(fileGroups)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 15)
      .forEach(([file, count]) => {
        console.log(`  - ${file}: ${count} violaciones`);
      });

    console.log(`\n❌ Errores: ${all.filter(v=>v.severity==='error').length} | ⚠️ Advertencias: ${all.filter(v=>v.severity==='warning').length}`);
  } else {
    const limit = 50;
    const toPrint = all.slice(0, limit);
    toPrint.forEach(v => console.log(styleText(v.severity === 'error' ? 'red' : 'yellow', `[${v.severity.toUpperCase()}] ${path.relative(process.cwd(), v.file)}:${v.line} -> ${v.message} ("${v.context}")`)));
    if (all.length > limit) {
      console.log(styleText('cyan', `\n[INFO] Se muestran solo las primeras ${limit} violaciones de un total de ${all.length} para evitar saturar la terminal.`));
      console.log(styleText('cyan', `👉 Para ver el resumen consolidado por archivo y regla: npm run audit -- --summary`));
      console.log(styleText('cyan', `👉 Para exportar el reporte completo a un archivo: npm run audit -- --output=scratch/audit_report.txt`));
    }
    console.log(`\n❌ Errores: ${all.filter(v=>v.severity==='error').length} | ⚠️ Advertencias: ${all.filter(v=>v.severity==='warning').length}`);
  }

  if (values.fix) console.log(styleText('cyan', '✨ Correcciones aplicadas.'));

  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    if (outputPath.endsWith('.json')) {
      await fs.writeFile(outputPath, JSON.stringify(all, null, 2), 'utf-8');
    } else {
      const lines = all.map(v => `[${v.severity.toUpperCase()}] ${path.relative(process.cwd(), v.file)}:${v.line} -> ${v.message} ("${v.context}")`);
      await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    }
    console.log(styleText('cyan', `\n✨ Reporte completo escrito en: ${values.output}`));
  }

  // Salir con código de error si existen violaciones con severidad de error
  if (all.some(v => v.severity === 'error')) {
    process.exit(1);
  }
}
main();
