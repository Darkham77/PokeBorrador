// fallow-ignore-file security-sink
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
import { Z_LAYERS } from '../../src/logic/constants/visuals.ts';
import {
  type AuditRule,
  type Violation,
  auditRulesConfig as config,
  legacyDates,
  nodePrefix,
  esmExtensions,
  tsIgnore,
  timersPromises,
  explicitResource,
  forbiddenFallbacks
} from './audit_rules.ts';

enableCompileCache();

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'dev-dist', 'backup_legacy_code', 'public', 'docs', 'scratch', 'showdown', 'external']);
const AUDIT_EXTENSIONS = new Set(['.vue', '.scss', '.css', '.ts', '.js', '.md']);

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
  const isMd = filePath.endsWith('.md');


  if (isLogic || isVue) {
    if (isVue) {
      const scriptBlocks = extractAllBlocks(content, 'script');
      // Procesa los bloques de script en reversa para no alterar los índices de caracteres al modificar el contenido
      for (let i = scriptBlocks.length - 1; i >= 0; i--) {
        const block = scriptBlocks[i]!;
        const allRules: AuditRule[] = [
          legacyDates, 
          config.hardcodedTimezone, 
          nodePrefix, 
          esmExtensions, 
          tsIgnore, 
          timersPromises, 
          explicitResource, 
          config.jsonStringifyInWatch, 
          config.intersectionObserverRoot, 
          forbiddenFallbacks,
          config.manualTimersFrontend
        ];
        let rules: AuditRule[] = allRules;
        
        if (filePath.includes('scripts' + path.sep) || filePath.includes('supabase' + path.sep) || filePath.includes('audit_project.ts')) {
          rules = rules.filter(r => r !== config.legacyDates);
        }

        let newBlock = runRules(filePath, block.content, rules, violations, fix, block.startLine);
        
        if (fix && newBlock !== block.content) {
          for (const rule of rules) {
            const importer = rule.addImport;
            if (importer && newBlock.includes(importer.split(' ')[1]!) && !newBlock.includes(importer)) {
              newBlock = importer + '\n' + newBlock;
            }
          }
          content = content.substring(0, block.startIdx) + newBlock + content.substring(block.endIdx);
          modified = true;
        }
      }

      // También audita el bloque de template para reglas de lógica e integridad
      const templateBlocks = extractAllBlocks(content, 'template');
      for (const block of templateBlocks) {
        const templateRules: AuditRule[] = [
          config.dbInTemplates, 
          config.functionCallsInTemplates
        ];
        
        if (!(filePath.includes('scripts' + path.sep) || filePath.includes('supabase' + path.sep) || filePath.includes('audit_project.ts'))) {
          templateRules.push(legacyDates);
        }

        runRules(filePath, block.content, templateRules, violations, false, block.startLine);
      }
    } else {
      // isLogic
      const allRules: AuditRule[] = [
        legacyDates, 
        config.hardcodedTimezone, 
        nodePrefix, 
        esmExtensions, 
        tsIgnore, 
        timersPromises, 
        explicitResource, 
        config.jsonStringifyInWatch, 
        config.intersectionObserverRoot, 
        forbiddenFallbacks
      ];
      let rules: AuditRule[] = allRules;
      
      if (filePath.includes('scripts' + path.sep) || filePath.includes('supabase' + path.sep) || filePath.includes('audit_project.ts')) {
        rules = rules.filter(r => r !== config.legacyDates);
      }

      let newBlock = runRules(filePath, content, rules, violations, fix, 0);
      
      if (fix && newBlock !== content) {
        for (const rule of rules) {
          const importer = rule.addImport;
          if (importer && newBlock.includes(importer.split(' ')[1]!) && !newBlock.includes(importer)) {
            newBlock = importer + '\n' + newBlock;
          }
        }
        content = newBlock;
        modified = true;
      }
    }
  }

  if (isStyle || isVue) {
    if (isVue) {
      const styleBlocks = extractAllBlocks(content, 'style');
      for (let i = styleBlocks.length - 1; i >= 0; i--) {
        const block = styleBlocks[i]!;
        const newBlock = runRules(filePath, block.content, [config.viewport, config.gpuGaps, config.zIndexAudit, config.manualAnimations], violations, fix, block.startLine);
        if (fix && newBlock !== block.content) {
          content = content.substring(0, block.startIdx) + newBlock + content.substring(block.endIdx);
          modified = true;
        }
      }
    } else {
      // isStyle
      const newBlock = runRules(filePath, content, [config.viewport, config.gpuGaps, config.zIndexAudit, config.manualAnimations], violations, violations.length > 0 ? false : fix, 0);
      if (fix && newBlock !== content) {
        content = newBlock;
        modified = true;
      }
    }
  }

  // MODULARITY AUDIT: 300/500/1000 Rule
  const isDatabaseOrMetadata = filePath.endsWith('.md') ||
                               filePath.includes('src' + path.sep + 'data' + path.sep) || 
                               filePath.includes('scripts' + path.sep) ||
                               filePath.includes('supabase' + path.sep) ||
                               filePath.endsWith('DB.ts') || 
                               filePath.endsWith('Metadata.ts');

  if (!isDatabaseOrMetadata) {
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

    const hasLengthIgnore = config.fileLength.ignorePattern?.test(content);
    const isVueFile = filePath.endsWith('.vue');
    
    // [PureVue-Ignore-Length] is ONLY allowed for database/data files. UI files (.vue) or standard logic files cannot use it.
    const isAllowedIgnore = hasLengthIgnore && !isVueFile && (
      filePath.toLowerCase().includes('data') ||
      filePath.toLowerCase().includes('database') ||
      filePath.toLowerCase().includes('catalog') ||
      /export\s+const\s+[A-Z_]+\s*[:=]\s*(?:\[|\{)/.test(content)
    );

    if (slocCount > 1000) {
      violations.push({
        file: filePath,
        line: slocCount,
        message: `Mantenibilidad CRÍTICA: El archivo supera las 1000 líneas reales de código (SLOC: ${slocCount}). A pesar de cualquier tag de ignore, superar las 1000 líneas es un ERROR que requiere modularización obligatoria.`,
        context: `SLOC: ${slocCount}`,
        severity: 'error',
        fixable: false
      });
    } else if (slocCount > 500 && !isAllowedIgnore) {
      violations.push({
        file: filePath,
        line: slocCount,
        message: `Mantenibilidad (500/1000 Rule): El archivo tiene ${slocCount} líneas reales de código (SLOC). Supera las 500 líneas. Se recomienda fuertemente modularizar y extraer lógica a Composables (SRP).`,
        context: `SLOC: ${slocCount}`,
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
        if (!rule.check(content, match, filePath)) continue;
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


interface VueBlock {
  content: string;
  startLine: number;
  startIdx: number;
  endIdx: number;
}

function extractAllBlocks(content: string, tag: string): VueBlock[] {
  const regex = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'gi');
  const blocks: VueBlock[] = [];
  let match;
  while ((match = regex.exec(content)) !== null) {
    const blockContent = match[1] ?? '';
    const beforeMatch = content.substring(0, match.index);
    const startLine = beforeMatch.split('\n').length;
    const openingTagLength = match[0].indexOf(blockContent);
    const startIdx = match.index + openingTagLength;
    const endIdx = startIdx + blockContent.length;
    blocks.push({
      content: blockContent,
      startLine,
      startIdx,
      endIdx
    });
  }
  return blocks;
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
  path?: string;
  file?: string;
  line?: number;
  start_line?: number;
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

function getCssCheckerCmd(): string | null {
  const isWin = process.platform === 'win32';
  const binName = isWin ? 'css-checker.exe' : 'css-checker';

  const candidates = [
    // 1. Local node_modules/.bin
    path.join(process.cwd(), 'node_modules', '.bin', isWin ? 'css-checker.cmd' : 'css-checker'),
    path.join(process.cwd(), 'node_modules', '.bin', binName),
    // 2. Package bin directory
    path.join(process.cwd(), 'node_modules', 'css-checker-kit', 'bin', binName),
    path.join(process.cwd(), 'node_modules', 'css-checker-kit', binName),
  ];

  // 3. User APPDATA / HOME npm bin directories
  if (isWin && process.env.APPDATA) {
    candidates.push(path.join(process.env.APPDATA, 'npm', 'bin', binName));
    candidates.push(path.join(process.env.APPDATA, 'npm', binName));
  } else if (process.env.HOME) {
    candidates.push(path.join(process.env.HOME, '.npm-global', 'bin', binName));
    candidates.push(path.join(process.env.HOME, '.local', 'bin', binName));
    candidates.push(path.join('/usr', 'local', 'bin', binName));
  }

  // 4. PATH directories
  const pathEnv = process.env.PATH || '';
  const dirs = pathEnv.split(path.delimiter);
  for (const dir of dirs) {
    candidates.push(path.join(dir, binName));
    if (isWin) candidates.push(path.join(dir, 'css-checker.cmd'));
  }

  // 5. Check candidate paths
  for (const candidate of candidates) {
    if (readFileSyncExists(candidate)) return candidate;
  }

  // 6. Check npm prefix cross-platform
  try {
    const prefix = execSync('npm config get prefix', { encoding: 'utf-8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    if (prefix) {
      const prefixCandidates = [
        path.join(prefix, 'bin', binName),
        path.join(prefix, binName)
      ];
      for (const candidate of prefixCandidates) {
        if (readFileSyncExists(candidate)) return candidate;
      }
    }
  } catch {
    // Ignore npm config errors
  }

  return null;
}

function readFileSyncExists(p: string): boolean {
  try {
    return readFileSync(p) !== undefined;
  } catch {
    return false;
  }
}

async function runCssChecker(targetDir: string = '.'): Promise<Violation[]> {
  const violations: Violation[] = [];
  const binCmd = getCssCheckerCmd();

  if (!binCmd) {
    violations.push({
      file: 'css-checker',
      line: 0,
      message: `Error: 'css-checker' no está instalado o no se encuentra el binario ejecutable en el sistema. Para instalarlo, ejecuta: "npm install --save-dev css-checker-kit" y luego "cd node_modules/css-checker-kit && npm run postinstall"`,
      context: 'instalación css-checker',
      severity: 'error',
      fixable: false
    });
    return violations;
  }

  const tmpDir = path.resolve(process.cwd(), 'scratch/css_audit_tmp');
  const fileMap: Map<string, string> = new Map();

  try {
    await fs.rm(tmpDir, { recursive: true, force: true });
    await fs.mkdir(tmpDir, { recursive: true });

    const effectiveTarget = targetDir === '.' ? 'src' : targetDir;
    const searchDir = path.resolve(process.cwd(), effectiveTarget);
    // Auditar archivos .scss, .css y bloques de estilo en .vue dentro de src/
    const pattern = '**/*.{scss,css,vue}';
    
    const bundles: Record<string, string> = {
      bundle_styles: '',
      bundle_components: '',
      bundle_views: '',
      bundle_other: ''
    };

    let count = 0;
    for await (const entry of fs.glob(pattern, { cwd: searchDir, exclude: (p: string) => Array.from(IGNORE_DIRS).some(d => p.includes(d)) })) {
      const fullPath = path.join(searchDir, entry);
      const relPath = path.relative(process.cwd(), fullPath);

      const content = await fs.readFile(fullPath, 'utf-8');
      let cssContent = '';

      if (fullPath.endsWith('.vue')) {
        const matches = content.match(/<style[^>]*>([\s\S]*?)<\/style>/gi);
        if (matches) {
          cssContent = matches.map(m => m.replace(/<\/?style[^>]*>/gi, '')).join('\n');
        }
      } else {
        cssContent = content;
      }

      if (cssContent.trim()) {
        count++;
        let bundleKey = 'bundle_other';
        if (relPath.includes('styles')) bundleKey = 'bundle_styles';
        else if (relPath.includes('components')) bundleKey = 'bundle_components';
        else if (relPath.includes('views')) bundleKey = 'bundle_views';

        bundles[bundleKey] += `\n/* FILE: ${relPath} */\n` + cssContent + '\n';
      }
    }

    if (count === 0) return violations;

    for (const [key, code] of Object.entries(bundles)) {
      if (code.trim()) {
        await fs.writeFile(path.join(tmpDir, `${key}.css`), code, 'utf-8');
      }
    }

    let stdout = '';
    try {
      stdout = execSync(`"${binCmd}" -path "${tmpDir}" -colors=false -long-line=false -sim=false`, {
        encoding: 'utf-8',
        stdio: ['ignore', 'pipe', 'ignore'],
        maxBuffer: 10 * 1024 * 1024,
        timeout: 15000,
        killSignal: 'SIGKILL'
      });
    } catch (e: unknown) {
      const err = e as { stdout?: string | Buffer; message?: string };
      if (err.stdout) {
        stdout = err.stdout.toString('utf-8');
      } else {
        violations.push({
          file: 'css-checker',
          line: 0,
          message: `Error ejecutando css-checker: ${err.message || String(e)}. Asegúrate de que el paquete 'css-checker-kit' esté instalado correctamente.`,
          context: 'css-checker',
          severity: 'error',
          fixable: false
        });
        return violations;
      }
    }

    if (!stdout) return violations;

    const sections = stdout.split(/\(\d+\) Same class content found in \d+ places:/g);
    for (let i = 1; i < sections.length; i++) {
      const sec = sections[i];
      if (!sec) continue;
      const lines = sec.split('\n');
      const places: { selector: string; fileName: string }[] = [];
      
      for (const line of lines) {
        const match = line.match(/\s*(.+?)\s*<<\s*.*?(style_\d+\.css)/);
        if (match && match[1] && match[2]) {
          places.push({ selector: match[1].trim(), fileName: match[2].trim() });
        }
      }

      if (places.length > 0) {
        const first = places[0]!;
        const firstRealPath = fileMap.get(first.fileName) || first.fileName;
        const locations = places.slice(1).map(p => {
          const rPath = fileMap.get(p.fileName) || p.fileName;
          return `${p.selector} en ${rPath}`;
        }).join(', ');

        violations.push({
          file: path.resolve(process.cwd(), firstRealPath),
          line: 1,
          message: `SCSS duplicado crítico (css-checker): Selector '${first.selector}' coincide con ${places.length} reglas idénticas. Ubicaciones: ${firstRealPath}, ${locations}`,
          context: `duplicación css-checker (${places.length} lugares)`,
          severity: 'error',
          fixable: false
        });
      }
    }
  } catch (err: unknown) {
    violations.push({
      file: 'css-checker',
      line: 0,
      message: `Error ejecutando css-checker: ${(err as Error).message || String(err)}. Si falta el ejecutable, instala con 'npm install --save-dev css-checker-kit'`,
      context: 'css-checker',
      severity: 'error',
      fixable: false
    });
  } finally {
    try {
      await fs.rm(tmpDir, { recursive: true, force: true });
    } catch {
      // Ignorar error al limpiar
    }
  }

  return violations;
}

function runFallow(command: string, extraArgs: string[] = []): Violation[] {
  const violations: Violation[] = [];
  let parsedSuccessfully = false;
  try {
    const args = ['--format', 'json', ...extraArgs];
    const cmd = `node ./node_modules/fallow/bin/fallow ${command} ${args.join(' ')}`;
    const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 10 * 1024 * 1024 });
    const jsonStart = stdout.indexOf('{');
    if (jsonStart !== -1) {
      const data = JSON.parse(stdout.substring(jsonStart)) as FallowAuditData;
      violations.push(...mapFallowJson(command, data));
      parsedSuccessfully = true;
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
          parsedSuccessfully = true;
        } catch {
          // Ignorar errores de parseo de JSON en salida de error
        }
      }
    }
    if (!parsedSuccessfully) {
      violations.push({
        file: 'fallow',
        line: 0,
        message: `Error ejecutando fallow ${command}: ${(err as Error).message || String(e)} | Stderr: ${err.stderr || ''}`,
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
          const firstPath = first.file || first.path || '';
          const firstLine = first.start_line || first.line || 0;
          const locations = instances.slice(1).map((i) => `${i.file || i.path || ''}:${i.start_line || i.line || 0}`).join(', ');
          const isTriplicate = instances.length >= 3;
          const prefix = isTriplicate ? 'Código triplicado crítico' : 'Código duplicado crítico';
          violations.push({
            file: path.resolve(process.cwd(), firstPath),
            line: firstLine,
            message: `${prefix}: Encontradas ${instances.length} coincidencias de código idéntico. Ubicaciones: ${firstPath}:${firstLine}, ${locations}`,
            context: `${isTriplicate ? 'triplicación' : 'duplicación'} (${g.duplicated_tokens} tokens)`,
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

async function checkDoxIntegrity(): Promise<Violation[]> {
  const violations: Violation[] = [];
  const rootDir = process.cwd();

  // Build set of gitignored paths by parsing .gitignore directly.
  // NOTE: 'git ls-files --others --ignored' only lists paths that EXIST on disk.
  // In CI checkouts the gitignored dirs are absent, so that set would be empty.
  // Parsing .gitignore directly works regardless of whether the paths exist.
  const gitIgnoredPaths = new Set<string>();
  try {
    const gitignoreRaw = await fs.readFile(path.join(rootDir, '.gitignore'), 'utf-8');
    for (const line of gitignoreRaw.split('\n')) {
      const trimmed = line.trim().replace(/\/$/, '');
      // Skip comments, empty lines, and glob patterns (handle only plain paths)
      if (!trimmed || trimmed.startsWith('#') || trimmed.includes('*') || trimmed.includes('?')) continue;
      gitIgnoredPaths.add(path.resolve(rootDir, trimmed));
    }
  } catch { /* no .gitignore found — skip silently */ }

  
  // Recursivamente busca todos los directorios del proyecto (no ignorados)
  const doxDirs: string[] = [];
  
  async function hasCodeFiles(dir: string): Promise<boolean> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });
      for (const entry of entries) {
        if (entry.isFile()) {
          const ext = path.extname(entry.name).toLowerCase();
          if (ext === '.ts' || ext === '.vue' || ext === '.js' || ext === '.scss' || ext === '.css') {
            return true;
          }
        }
      }
    } catch {
      return false;
    }
    return false;
  }

  async function traverse(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    const relPath = path.relative(rootDir, dir);
    const dirName = path.basename(dir);
    
    // Evitar directorios ignorados
    if (IGNORE_DIRS.has(dirName) || (dirName.startsWith('.') && dirName !== '.')) {
      return;
    }

    const posixRelPath = relPath.split(path.sep).join(path.posix.sep);
    if (
      posixRelPath.includes('supabase/docker') ||
      posixRelPath === 'scripts/lib' ||
      posixRelPath.includes('test aventura')
    ) {
      return;
    }
    
    if (relPath !== '' && relPath !== 'src') {
      // Solo exigir AGENTS.md si el directorio contiene archivos de código
      if (await hasCodeFiles(dir)) {
        doxDirs.push(dir);
      }
    }
    
    for (const entry of entries) {
      if (entry.isDirectory()) {
        await traverse(path.join(dir, entry.name));
      }
    }
  }
  
  await traverse(rootDir);
  
  const doxFilesMap = new Map<string, string>();

  // Cargar todos los AGENTS.md existentes en el proyecto en doxFilesMap
  async function loadAllDoxFiles(dir: string) {

    const entries = await fs.readdir(dir, { withFileTypes: true });
    const dirName = path.basename(dir);
    if (IGNORE_DIRS.has(dirName) || (dirName.startsWith('.') && dirName !== '.')) return;

    const agentsPath = path.join(dir, 'AGENTS.md');
    try {
      const content = await fs.readFile(agentsPath, 'utf-8');
      doxFilesMap.set(dir, content);
    } catch {}

    for (const entry of entries) {
      if (entry.isDirectory()) {
        await loadAllDoxFiles(path.join(dir, entry.name));
      }
    }
  }

  await loadAllDoxFiles(rootDir);

  for (const dir of doxDirs) {
    const agentsPath = path.join(dir, 'AGENTS.md');
    if (!doxFilesMap.has(dir)) {
      violations.push({
        file: agentsPath,
        line: 1,
        message: `Falta el archivo obligatorio de documentación 'AGENTS.md' en el directorio '${path.relative(rootDir, dir)}'.`,
        context: 'AGENTS.md',
        severity: 'error',
        fixable: false
      });
    }
  }
  
  const rootAgentsPath = path.join(rootDir, 'AGENTS.md');
  console.log(styleText('cyan', '📘 Escaneando jerarquía e integridad de índices AGENTS.md / DOX...'));

  if (!doxFilesMap.has(rootDir)) {
    violations.push({
      file: rootAgentsPath,
      line: 1,
      message: `Falta el archivo de documentación raíz 'AGENTS.md'.`,
      context: 'AGENTS.md',
      severity: 'error',
      fixable: false
    });
  }


  function findNearestAncestorDoxDir(dir: string): string | null {
    let current = path.dirname(dir);
    while (current !== rootDir) {
      if (doxFilesMap.has(current)) {
        return current;
      }
      current = path.dirname(current);
    }
    return rootDir;
  }

  for (const [dirPath, content] of doxFilesMap.entries()) {
    const agentsPath = path.join(dirPath, 'AGENTS.md');
    
    if (dirPath !== rootDir) {
      const parentDoxDir = findNearestAncestorDoxDir(dirPath);
      if (parentDoxDir) {
        const parentContent = doxFilesMap.get(parentDoxDir);
        if (parentContent) {
          const relativeChildPath = path.relative(parentDoxDir, agentsPath);
          const posixPath = relativeChildPath.split(path.sep).join(path.posix.sep);
          const cleanPath = posixPath.startsWith('./') ? posixPath.slice(2) : posixPath;
          const dirOnlyPath = path.dirname(posixPath);
          const hasLink = parentContent.includes(cleanPath) || 
                          parentContent.includes('./' + cleanPath) || 
                          parentContent.includes('[' + dirOnlyPath + '/]') || 
                          parentContent.includes('(' + dirOnlyPath + '/') || 
                          parentContent.includes('./' + dirOnlyPath + '/');
          
          if (!hasLink) {
            const parentFile = path.join(parentDoxDir, 'AGENTS.md');
            violations.push({
              file: parentFile,
              line: 1,
              message: `El archivo '${path.relative(rootDir, agentsPath)}' no está registrado en el índice DOX de '${path.relative(rootDir, parentFile)}'.`,
              context: cleanPath,
              severity: 'error',
              fixable: false
            });
          }
        }
      }
    }

    const linkRegex = /\[([^\]]+)\]\(([^)]+)\)/g;
    const lines = content.split('\n');
    
    for (let i = 0; i < lines.length; i++) {
      const lineText = lines[i];
      if (lineText === undefined) continue;
      let match;
      while ((match = linkRegex.exec(lineText)) !== null) {
        const label = match[1] ?? '';
        const targetUrl = (match[2] ?? '').trim();
        
        if (targetUrl.startsWith('http://') || targetUrl.startsWith('https://') || targetUrl.startsWith('#')) {
          continue;
        }
        
        const isFullPath = targetUrl.startsWith('file://') ||
                           targetUrl.startsWith('/') ||
                           targetUrl.startsWith('\\') ||
                           /^[a-zA-Z]:/.test(targetUrl) ||
                           path.isAbsolute(targetUrl);

        if (isFullPath) {
          violations.push({
            file: agentsPath,
            line: i + 1,
            message: `Enlace absoluto o ruta completa prohibida '${targetUrl}' detectada en '${label}'. Se exige el uso exclusivo de rutas relativas (RULE 10).`,
            context: targetUrl,
            severity: 'error',
            fixable: false
          });
          continue;
        }

        const cleanTarget = targetUrl.split('#')[0];
        if (!cleanTarget) continue;
        
        const absoluteTarget = path.resolve(dirPath, cleanTarget);

        // Skip validation for paths intentionally excluded via .gitignore
        // (they exist locally but are absent in CI checkouts).
        const isGitIgnored = gitIgnoredPaths.has(absoluteTarget) ||
          [...gitIgnoredPaths].some(p => absoluteTarget.startsWith(p + path.sep));
        if (isGitIgnored) continue;

        try {
          await fs.stat(absoluteTarget);
        } catch (_e) {
          violations.push({
            file: agentsPath,
            line: i + 1,
            message: `Enlace roto: '${targetUrl}' apuntando a '${cleanTarget}' no existe en el disco.`,
            context: targetUrl,
            severity: 'error',
            fixable: false
          });
        }
      }
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
      'changed-since': { type: 'string' },
      'errors-only': { type: 'boolean' },
      'css-only': { type: 'boolean' }
    }
  });
  console.log(styleText('bold', '\n--- 🔎 POKE VICIO - REGLAS DE CÓDIGO & ESTRUCTURA DOX (audit_project.ts) ---'));
  console.log(styleText('cyan', '💡 Nota: Para ejecutar la suite completa de todos los módulos (tests, FSM, ítems, migraciones SQL), ejecuta: npm run audit:full'));
  console.log(styleText('cyan', '💡 Info: Se puede usar "--errors-only" en todos los scripts de validación y auditoría para filtrar advertencias.'));
  console.log(styleText('cyan', '💡 Recomendación: Se aconseja utilizar "--summary" para obtener un resumen estructurado.'));
  
  let all: Violation[] = [];

  if (values['css-only']) {
    console.log(styleText('cyan', '\nEjecutando análisis exclusivo de css-checker (SCSS duplicados)...'));
    all = await runCssChecker(values.path as string);
  } else {
    // Consistency Check
    console.log(styleText('cyan', '🎨 Verificando paridad de z-index (visuals.ts <-> _variables.scss)...'));
    const syncErrors = await checkZIndexConsistency(!!values.fix);
    const syncViolations: Violation[] = [];
    if (syncErrors.length > 0) {
      console.log(styleText('magenta', `\n[SYNC] Desincronización detectada entre visuals.ts y _variables.scss:`));
      syncErrors.forEach(e => console.log(styleText('yellow', `  -> ${e}`)));
      if (!values.fix) {
        console.log(styleText('cyan', '  (Usa --fix para sincronizar automáticamente)'));
        for (const err of syncErrors) {
          syncViolations.push({
            file: path.resolve(process.cwd(), 'src/styles/core/_variables.scss'),
            line: 1,
            message: `Desincronización de z-index: ${err}`,
            context: 'z-index',
            severity: 'error',
            fixable: true
          });
        }
      }
    }

    // DOX / AGENTS.md Integrity Check
    const doxErrors = await checkDoxIntegrity();

    let files: string[] = [];
    const changedSince = values['changed-since'] as string | undefined;
    
    if (changedSince) {
      files = getChangedFiles(changedSince);
      console.log(styleText('cyan', `Auditando solo archivos cambiados desde: '${changedSince}' (${files.length} archivos)`));
    } else {
      files = await getFilesToAudit(path.resolve(process.cwd(), values.path as string));
    }

    all = [...syncViolations, ...doxErrors];
    console.log(styleText('cyan', `🔍 Auditando ${files.length} archivos...`));
    let processed = 0;
    const total = files.length;
    for (const f of files) {
      processed++;
      if (processed % 100 === 0 || processed === total) {
        console.log(styleText('cyan', `⏳ Progreso auditoría: ${processed}/${total} archivos (${Math.round((processed / total) * 100)}%)`));
      }
      all = all.concat(await auditFile(f, !!values.fix));
    }
    console.log('');

    // SASS Module Migration (solo en --fix)
    if (values.fix) {
      console.log(styleText('cyan', '\n\u2728 Ejecutando sass-migrator (built-in-only)...'));
      const legacyScssFiles = files.filter(f => {
        if (!f.endsWith('.scss') && !f.endsWith('.css')) return false;
        try { return readFileSync(f, 'utf-8').includes('@import'); } catch { return false; }
      });
      const legacyVueFiles = files.filter(f => {
        if (!f.endsWith('.vue')) return false;
        try { return readFileSync(f, 'utf-8').includes('@import'); } catch { return false; }
      });
      if (legacyScssFiles.length > 0) {
        for (const f of legacyScssFiles) {
          try {
            execSync(`sass-migrator module --built-in-only ${JSON.stringify(f)}`, { encoding: 'utf-8', stdio: 'pipe' });
          } catch (err: unknown) {
            const msg = err instanceof Error ? (err as Error).message : String(err);
            console.log(styleText('yellow', `  \u26a0\ufe0f  [${path.relative(process.cwd(), f)}]: ${msg.split('\n')[0] ?? msg}`));
          }
        }
        console.log(styleText('green', `  \u2705 sass-migrator aplicado sobre ${legacyScssFiles.length} archivo(s) .scss con @import.`));
      } else {
        console.log(styleText('green', '  \u2705 Sin @import legados en archivos .scss. \u00a1Migrado!'));
      }
      if (legacyVueFiles.length > 0) {
        console.log(styleText('yellow', `  \u26a0\ufe0f  ${legacyVueFiles.length} Vue SFC(s) con @import legacy (requieren @use manual, alias @/ no resuelto por migrador):` ));
        for (const f of legacyVueFiles) {
          console.log(styleText('yellow', `     - ${path.relative(process.cwd(), f)}`));
        }
      }
    }

    // Integración de Fallow
    console.log(styleText('cyan', '\nEjecutando análisis de Fallow...'));
    if (changedSince) {
      console.log(styleText('cyan', '  -> Fallow audit & security (archivos modificados)...'));
      all = all.concat(runFallow('audit', ['--changed-since', changedSince]));
      all = all.concat(runFallow('security', ['--changed-since', changedSince]));
    } else {
      console.log(styleText('cyan', '  [1/4] Fallow: Análisis de duplicación de código...'));
      all = all.concat(runFallow('dupes'));
      all = all.concat(runFallow('dupes', ['--min-occurrences', '3', '--min-lines', '10', '--min-tokens', '60']));
      console.log(styleText('cyan', '  [2/4] Fallow: Análisis de seguridad...'));
      all = all.concat(runFallow('security'));
      console.log(styleText('cyan', '  [3/4] Fallow: Análisis de código muerto...'));
      all = all.concat(runFallow('dead-code'));
      console.log(styleText('cyan', '  [4/4] Fallow: Cálculo de métricas de salud...'));
      all = all.concat(runFallow('health'));
    }

    // Integración de css-checker
    console.log(styleText('cyan', '\nEjecutando análisis de css-checker (SCSS duplicados)...'));
    all = all.concat(await runCssChecker(values.path as string));
  }

  // Filtrar solo errores si la opción '--errors-only' está activa
  if (values['errors-only']) {
    all = all.filter(v => v.severity === 'error');
  }

  // Priorizar mostrar siempre primero los errores, y luego los warnings
  all.sort((a, b) => {
    if (a.severity === 'error' && b.severity !== 'error') return -1;
    if (a.severity !== 'error' && b.severity === 'error') return 1;
    return 0;
  });


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
      else if (v.message.includes('Código triplicado')) type = 'Fallow: Código triplicado';
      else if (v.message.includes('Vulnerabilidad de seguridad')) type = 'Fallow: Vulnerabilidad de seguridad';
      else if (v.message.includes('Sugerencia de calidad')) type = 'Fallow: Calidad / Dead Code';
      else if (v.message.includes('Sugerencia de complejidad')) type = 'Fallow: Complejidad';
      else if (v.message.includes('AGENTS.md') || v.message.includes('DOX') || v.message.includes('Enlace')) type = 'DOX / AGENTS.md';
      else if (v.message.includes('css-checker') || v.message.includes('CSS/SCSS duplicado')) type = 'css-checker: SCSS/CSS duplicado';

      typeGroups[type] = (typeGroups[type] || 0) + 1;
    }

    const types = Object.entries(typeGroups);
    if (types.length > 0) {
      console.log('\nPor tipo de regla:');
      types
        .sort((a, b) => b[1] - a[1])
        .forEach(([type, count]) => {
          console.log(`  - ${type}: ${count}`);
        });
    }

    const filesList = Object.entries(fileGroups);
    if (filesList.length > 0) {
      console.log('\nTop 15 archivos con más problemas:');
      filesList
        .sort((a, b) => b[1] - a[1])
        .slice(0, 15)
        .forEach(([file, count]) => {
          console.log(`  - ${file}: ${count} violaciones`);
        });
    }

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
main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal en el audit: ${(err as Error).message}`));
  process.exit(1);
});
