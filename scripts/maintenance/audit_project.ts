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
  auditRulesConfig as config
} from './audit_rules.ts';
import { runCssChecker } from './analyzers/cssAnalyzer.ts';
import { checkDoxIntegrity } from './analyzers/doxAnalyzer.ts';
import { detectDuplicateConstants } from './analyzers/constantAnalyzer.ts';

enableCompileCache();

const SLOC_WARNING_THRESHOLD = 500;
const SLOC_ERROR_THRESHOLD = 1000;

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'dev-dist', 'backup_legacy_code', 'public', 'docs', 'scratch', 'showdown', 'external']); // runtime-set
const AUDIT_EXTENSIONS = new Set(['.vue', '.scss', '.css', '.ts', '.js', '.md']); // runtime-set

async function getFilesToAudit(dir: string): Promise<string[]> {
  const files: string[] = []; // no-domain
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
    const allRules: AuditRule[] = Object.values(config) as AuditRule[];
    if (isVue) {
      const scriptBlocks = extractAllBlocks(content, 'script');
      // Procesa los bloques de script en reversa para no alterar los índices de caracteres al modificar el contenido
      for (let i = scriptBlocks.length - 1; i >= 0; i--) {
        const block = scriptBlocks[i]!;
        let rules: AuditRule[] = allRules.filter(r => r !== config.dbInTemplates && r !== config.functionCallsInTemplates && r !== config.fileLength);
        
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
          config.functionCallsInTemplates,
          config.missingInteractiveId
        ];
        
        if (!(filePath.includes('scripts' + path.sep) || filePath.includes('supabase' + path.sep) || filePath.includes('audit_project.ts'))) {
          templateRules.push(config.legacyDates);
        }

        runRules(filePath, block.content, templateRules, violations, false, block.startLine);
      }
    } else {
      // isLogic
      let rules: AuditRule[] = allRules.filter(r => r !== config.dbInTemplates && r !== config.functionCallsInTemplates && r !== config.fileLength);
      
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
                               filePath.endsWith('Metadata.ts') ||
                               /^(vite|vitest|playwright|eslint)\.config\./i.test(path.basename(filePath)) ||
                               path.basename(filePath).startsWith('vitest.');

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
    const isConfigFile = config.fileLength.exemptConfigFiles?.test(path.basename(filePath)) || path.basename(filePath).startsWith('vitest.');
    const isAllowedIgnore = (hasLengthIgnore || isConfigFile) && !isVueFile && (
      isConfigFile ||
      filePath.toLowerCase().includes('data') ||
      filePath.toLowerCase().includes('database') ||
      filePath.toLowerCase().includes('catalog') ||
      /export\s+const\s+[A-Z_]+\s*[:=]\s*(?:\[|\{)/.test(content)
    );

    if (!isConfigFile) {
      if (slocCount > SLOC_ERROR_THRESHOLD) {
        violations.push({
          file: filePath,
          line: 1,
          message: `Mantenibilidad CRÍTICA: El archivo supera las ${SLOC_ERROR_THRESHOLD} líneas reales de código (SLOC: ${slocCount}). A pesar de cualquier tag de ignore, superar las ${SLOC_ERROR_THRESHOLD} líneas es un ERROR que requiere modularización obligatoria.`,
          context: `SLOC: ${slocCount}`,
          severity: 'error',
          fixable: false
        });
      } else if (slocCount > SLOC_WARNING_THRESHOLD && !isAllowedIgnore) {
        violations.push({
          file: filePath,
          line: 1,
          message: `Mantenibilidad (500/1000 Rule): El archivo tiene ${slocCount} líneas reales de código (SLOC). Supera las ${SLOC_WARNING_THRESHOLD} líneas. Se recomienda fuertemente modularizar y extraer lógica a Composables (SRP).`, // no-magic
          context: `SLOC: ${slocCount}`,
          severity: 'warning',
          fixable: false
        });
      }
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
  // Pre-calculate line breaks once per content block instead of substring splitting inside match loop
  let lineBreakIndices: number[] | null = null;
  const getLineNo = (idx: number): number => {
    if (!lineBreakIndices) {
      lineBreakIndices = [];
      for (let i = 0; i < content.length; i++) {
        if (content[i] === '\n') lineBreakIndices.push(i);
      }
    }
    let low = 0, high = lineBreakIndices.length;
    while (low < high) {
      const mid = (low + high) >> 1;
      if (lineBreakIndices[mid]! < idx) low = mid + 1;
      else high = mid;
    }
    return low + 1 + offset;
  };

  for (const rule of rules) {
    const flags = rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g';
    const regex = new RegExp(rule.regex.source, flags);
    let match;
    while ((match = regex.exec(content)) !== null) {
      if (match.index === regex.lastIndex) regex.lastIndex++; // Ensure no zero-width infinite loops

      // 0. Skip comments to avoid false positives
      if (isInsideComment(content, match.index)) continue;

      // 1. Specialized checks
      if (rule.check) {
        if (!rule.check(content, match, filePath)) continue;
      }
      
      const lineNo = getLineNo(match.index);
      violations.push({
        file: filePath, line: lineNo, message: typeof rule.message === 'function' ? rule.message(match[0]) : rule.message, 
        context: match[0], severity: rule.severity || 'warning', fixable: !!rule.fix
      });
    }
    const fixer = rule.fix;
    if (fix && fixer) {
      const gRegex = new RegExp(rule.regex.source, rule.regex.flags.includes('g') ? rule.regex.flags : rule.regex.flags + 'g');
      result = result.replace(gRegex, (match) => fixer(match));
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
    const errors: string[] = []; // no-domain

    for (const [key, value] of Object.entries(Z_LAYERS)) {
      const dashedKey = key.toLowerCase().replace(/_/g, '-'); // string-ok
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
    process.stderr.write(styleText('yellow', `⚠️ No se pudo obtener la lista de archivos modificados desde git para ref: '${ref}'. Se auditará el proyecto completo.\n`));
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
interface FallowCircularDep {
  path?: string;
  cycle?: string[];
  files?: string[];
  message?: string;
  line?: number;
}
interface FallowStaleSuppression {
  path?: string;
  file?: string;
  line?: number;
  kind?: string;
  message?: string;
}
interface FallowDuplicateExport {
  path?: string;
  file?: string;
  line?: number;
  export_name?: string;
  name?: string;
}
interface FallowDeadCode {
  unused_dependencies?: FallowUnusedDep[];
  unused_dev_dependencies?: FallowUnusedDep[];
  unused_exports?: FallowUnusedExport[];
  unused_files?: FallowUnusedFile[];
  circular_dependencies?: FallowCircularDep[];
  stale_suppressions?: FallowStaleSuppression[];
  duplicate_exports?: FallowDuplicateExport[];
}
interface FallowComplexity {
  findings?: FallowFinding[];
}
export interface FallowAuditData {
  clone_groups?: FallowCloneGroup[];
  security_findings?: FallowFinding[];
  dead_code?: FallowDeadCode;
  complexity?: FallowComplexity;
  findings?: FallowFinding[];
  unused_dependencies?: FallowUnusedDep[];
  unused_dev_dependencies?: FallowUnusedDep[];
  unused_exports?: FallowUnusedExport[];
  unused_files?: FallowUnusedFile[];
  circular_dependencies?: FallowCircularDep[];
  stale_suppressions?: FallowStaleSuppression[];
  duplicate_exports?: FallowDuplicateExport[];
}

function runFallow(command: string, extraArgs: string[] = []): Violation[] {
  const violations: Violation[] = [];
  let parsedSuccessfully = false;
  try {
    const args = ['--format', 'json', ...extraArgs]; // no-domain
    const fallowBin = path.resolve(process.cwd(), 'node_modules/fallow/bin/fallow');
    const cmd = `node "${fallowBin}" ${command} ${args.join(' ')}`;
    const stdout = execSync(cmd, { encoding: 'utf8', stdio: ['pipe', 'pipe', 'ignore'], maxBuffer: 10 * 1024 * 1024, timeout: 30000, killSignal: 'SIGKILL' });
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

export function mapFallowJson(command: string, data: FallowAuditData): Violation[] {
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
  } else if (command === 'audit' || command === 'dead-code') {
    // 1. Dependencias circulares (Error crítico)
    const circularDeps = [...(data.circular_dependencies || []), ...(data.dead_code?.circular_dependencies || [])];
    for (const c of circularDeps) {
      const filePath = c.path || (c.cycle && c.cycle[0]) || 'src';
      const cyclePathStr = Array.isArray(c.cycle) && c.cycle.length > 0 ? c.cycle.join(' → ') : (c.message || filePath);
      violations.push({
        file: path.resolve(process.cwd(), filePath),
        line: c.line || 1,
        message: `Dependencia circular crítica (Fallow): ${cyclePathStr}`,
        context: filePath,
        severity: 'error',
        fixable: false
      });
    }

    // 2. Archivos huérfanos / no usados (Dead Code - Error crítico)
    const unusedFiles = [...(data.unused_files || []), ...(data.dead_code?.unused_files || [])];
    for (const f of unusedFiles) {
      violations.push({
        file: path.resolve(process.cwd(), f.path),
        line: 1,
        message: `Archivo huérfano/no usado (Dead Code Fallow): '${f.path}'`,
        context: f.path,
        severity: 'error',
        fixable: false
      });
    }

    // 3. Supresiones obsoletas (Stale Suppressions - Error)
    const staleSuppressions = [...(data.stale_suppressions || []), ...(data.dead_code?.stale_suppressions || [])];
    for (const s of staleSuppressions) {
      violations.push({
        file: path.resolve(process.cwd(), s.path || s.file || 'src'),
        line: s.line || 1,
        message: `Supresión obsoleta de Fallow (Stale Suppression): ${s.message || s.kind || ''}`,
        context: s.path || s.file || '',
        severity: 'error',
        fixable: false
      });
    }

    // 4. Exports duplicados / ambiguos (Error)
    const duplicateExports = [...(data.duplicate_exports || []), ...(data.dead_code?.duplicate_exports || [])];
    for (const d of duplicateExports) {
      violations.push({
        file: path.resolve(process.cwd(), d.path || d.file || 'src'),
        line: d.line || 1,
        message: `Export duplicado ambiguo (Fallow): '${d.export_name || d.name || ''}'`,
        context: d.export_name || d.name || '',
        severity: 'error',
        fixable: false
      });
    }

    // 5. Dependencias no usadas en package.json (Error)
    const unusedDeps = [
      ...(data.unused_dependencies || []),
      ...(data.unused_dev_dependencies || []),
      ...(data.dead_code?.unused_dependencies || []),
      ...(data.dead_code?.unused_dev_dependencies || [])
    ];
    for (const d of unusedDeps) {
      violations.push({
        file: path.resolve(process.cwd(), d.path || 'package.json'),
        line: d.line || 1,
        message: `Dependencia de package.json no usada (Fallow): '${d.package_name}'`,
        context: d.package_name,
        severity: 'error',
        fixable: false
      });
    }

    // 6. Exports no usados (Warning)
    const unusedExports = [...(data.unused_exports || []), ...(data.dead_code?.unused_exports || [])];
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

    // 7. Complejidad en auditoría
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

export function getViolationCategory(v: Violation): string {
  const msg = v.message;
  if (msg.includes('Número mágico') || msg.includes('mágico')) return 'Números mágicos sin constante';
  if (msg.includes('Nombre de constante impropio') || msg.includes('hardcodear el valor')) return 'Nombres de constantes con valor numérico';
  if (msg.includes('Domain ID fallback') || msg.includes('noDomainIdFallbacks') || msg.includes('FALLBACK DE ID A NOMBRE')) return 'Fallback silencioso de Domain ID / Nombre';
  if (msg.includes('Unidad legacy')) return 'Viewport (dvh/dvw)';
  if (msg.includes('will-change')) return 'Falta will-change (GPU)';
  if (msg.includes('Temporal')) return 'Uso de Date (Temporal)';
  if (msg.includes('prefijo')) return 'Import de Node sin prefijo';
  if (msg.includes('extensión')) return 'Import relativo sin extensión';
  if (msg.includes('Zero-Ignore')) return 'TypeScript Ignore';
  if (msg.includes('setTimeout manual')) return 'setTimeout manual en script';
  if (msg.includes('timer de ANIMACIÓN')) return 'setTimeout/setInterval en UI';
  if (msg.includes('sin \'using\'')) return 'Falta explicit resource (\'using\')';
  if (msg.includes('Animación manual')) return 'Animación/Transición manual (GSAP)';
  if (msg.includes('Z-Index') || msg.includes('z-index')) return 'Z-Index fuera de estándar';
  if (msg.includes('archivo tiene') || msg.includes('líneas reales') || msg.includes('SLOC')) return 'Largo de archivo (>300/500 líneas)';
  if (msg.includes('Código duplicado')) return 'Fallow: Código duplicado';
  if (msg.includes('Código triplicado')) return 'Fallow: Código triplicado';
  if (msg.includes('Vulnerabilidad de seguridad')) return 'Fallow: Vulnerabilidad de seguridad';
  if (msg.includes('Dependencia circular') || msg.includes('circular')) return 'Fallow: Dependencias circulares';
  if (msg.includes('Archivo huérfano') || msg.includes('huérfano')) return 'Fallow: Archivos huérfanos / Dead Code';
  if (msg.includes('Supresión obsoleta')) return 'Fallow: Supresiones obsoletas';
  if (msg.includes('Export duplicado')) return 'Fallow: Exports duplicados';
  if (msg.includes('Dependencia de package.json no usada')) return 'Fallow: Dependencias no usadas';
  if (msg.includes('Sugerencia de calidad')) return 'Fallow: Calidad / Dead Code';
  if (msg.includes('Sugerencia de complejidad')) return 'Fallow: Complejidad';
  if (msg.includes('AGENTS.md') || msg.includes('DOX') || msg.includes('Enlace')) return 'DOX / AGENTS.md';
  if (msg.includes('css-checker') || msg.includes('CSS/SCSS duplicado')) return 'css-checker: SCSS/CSS duplicado';
  if (msg.includes('Constante duplicada') || msg.includes('valores diferentes')) return 'Constantes duplicadas entre módulos';
  if (msg.includes('Variable mutable')) return 'Variable mutable global (let)';
  return 'Otros';
}

const MAX_CONTEXT_SNIPPET_LENGTH = 50; // no-magic
const DEFAULT_TOP_LIMIT = 15; // no-magic
const MAX_FILES_TO_SHOW_IN_TERMINAL = 25; // no-magic
const MAX_VIOLATIONS_PER_FILE_IN_TERMINAL = 10; // no-magic

function sanitizeContext(ctx: string): string {
  if (!ctx) return '';
  return ctx.replace(/\r?\n/g, ' ').replace(/\s+/g, ' ').trim().slice(0, MAX_CONTEXT_SNIPPET_LENGTH);
}

async function main() {
  const { values } = parseArgs({
    options: {
      fix: { type: 'boolean', short: 'f' },
      path: { type: 'string', short: 'p', default: '.' },
      output: { type: 'string', short: 'o' },
      summary: { type: 'boolean', short: 's' },
      json: { type: 'boolean', short: 'j' },
      human: { type: 'boolean', short: 'H' },
      pretty: { type: 'boolean' },
      top: { type: 'string', short: 't' },
      'changed-since': { type: 'string' },
      'errors-only': { type: 'boolean' },
      'css-only': { type: 'boolean' },
      rule: { type: 'string', short: 'r' }
    }
  });

  const isHumanMode = !!(values.human || values.pretty || values.summary);

  function logProgress(msg: string) {
    if (isHumanMode) {
      console.log(msg);
    } else {
      process.stderr.write(msg + '\n');
    }
  }

  logProgress(styleText('bold', '\n--- 🔎 POKE VICIO - REGLAS DE CÓDIGO & ESTRUCTURA DOX (audit_project.ts) ---'));
  logProgress(styleText('cyan', '💡 Modo por defecto: JSON puro para herramientas e IA. Usa "--human" o "-H" para vista de consola.'));
  
  let all: Violation[] = [];

  if (values['css-only']) {
    logProgress(styleText('cyan', '\nEjecutando análisis exclusivo de css-checker (SCSS duplicados)...'));
    all = await runCssChecker(values.path as string || '.', IGNORE_DIRS);
  } else {
    // Consistency Check
    logProgress(styleText('cyan', '🎨 Verificando paridad de z-index (visuals.ts <-> _variables.scss)...'));
    const syncErrors = await checkZIndexConsistency(!!values.fix);
    const syncViolations: Violation[] = [];
    if (syncErrors.length > 0) {
      logProgress(styleText('magenta', `\n[SYNC] Desincronización detectada entre visuals.ts y _variables.scss:`));
      syncErrors.forEach(e => logProgress(styleText('yellow', `  -> ${e}`)));
      if (!values.fix) {
        logProgress(styleText('cyan', '  (Usa --fix para sincronizar automáticamente)'));
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
    const doxErrors = await checkDoxIntegrity(process.cwd(), IGNORE_DIRS);

    let files: string[] = []; // no-domain
    const changedSince = values['changed-since'] as string | undefined;
    
    if (changedSince) {
      files = getChangedFiles(changedSince);
      logProgress(styleText('cyan', `Auditando solo archivos cambiados desde: '${changedSince}' (${files.length} archivos)`));
    } else {
      files = await getFilesToAudit(path.resolve(process.cwd(), values.path as string));
    }

    all = [...syncViolations, ...doxErrors];
    logProgress(styleText('cyan', `🔍 Auditando ${files.length} archivos...`));
    let processed = 0;
    const total = files.length;
    for (const f of files) {
      processed++;
      if (processed % 100 === 0 || processed === total) {
        logProgress(styleText('cyan', `⏳ Progreso auditoría: ${processed}/${total} archivos (${Math.round((processed / total) * 100)}%)`));
      }
      all = all.concat(await auditFile(f, !!values.fix));
    }

    // SASS Module Migration (solo en --fix)
    if (values.fix) {
      logProgress(styleText('cyan', '\n✨ Ejecutando sass-migrator (built-in-only)...'));
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
            logProgress(styleText('yellow', `  ⚠️  [${path.relative(process.cwd(), f)}]: ${msg.split('\n')[0] ?? msg}`));
          }
        }
        logProgress(styleText('green', `  ✅ sass-migrator aplicado sobre ${legacyScssFiles.length} archivo(s) .scss con @import.`));
      } else {
        logProgress(styleText('green', '  ✅ Sin @import legados en archivos .scss. ¡Migrado!'));
      }
      if (legacyVueFiles.length > 0) {
        logProgress(styleText('yellow', `  ⚠️  ${legacyVueFiles.length} Vue SFC(s) con @import legacy:`));
        for (const f of legacyVueFiles) {
          logProgress(styleText('yellow', `     - ${path.relative(process.cwd(), f)}`));
        }
      }
    }

    // Integración de Fallow
    logProgress(styleText('cyan', '\nEjecutando análisis de Fallow...'));
    if (changedSince) {
      logProgress(styleText('cyan', '  -> Fallow audit & security (archivos modificados)...'));
      all = all.concat(runFallow('audit', ['--changed-since', changedSince]));
      all = all.concat(runFallow('security', ['--changed-since', changedSince]));
    } else {
      logProgress(styleText('cyan', '  [1/4] Fallow: Análisis de duplicación de código...'));
      all = all.concat(runFallow('dupes'));
      all = all.concat(runFallow('dupes', ['--min-occurrences', '3', '--min-lines', '10', '--min-tokens', '60'])); // no-magic
      logProgress(styleText('cyan', '  [2/4] Fallow: Análisis de seguridad...'));
      all = all.concat(runFallow('security'));
      logProgress(styleText('cyan', '  [3/4] Fallow: Análisis de código muerto...'));
      all = all.concat(runFallow('dead-code'));
      logProgress(styleText('cyan', '  [4/4] Fallow: Cálculo de métricas de salud...'));
      all = all.concat(runFallow('health'));
    }

    // Integración de css-checker
    logProgress(styleText('cyan', '\nEjecutando análisis de css-checker (SCSS duplicados)...'));
    all = all.concat(await runCssChecker(values.path as string || '.', IGNORE_DIRS));

    // Integración de detector de constantes duplicadas
    logProgress(styleText('cyan', '\nEjecutando análisis de constantes duplicadas entre módulos...'));
    all = all.concat(await detectDuplicateConstants(files));
  }

  // Filtrar por ruta si la opción '--path' está activa para asegurar que herramientas globales respeten el scope
  if (values.path) {
    const normPath = path.normalize(values.path as string);
    all = all.filter(v => path.normalize(v.file).includes(normPath));
  }

  // Filtrar solo errores si la opción '--errors-only' está activa
  if (values['errors-only']) {
    all = all.filter(v => v.severity === 'error');
  }

  // Filtrar por regla específica si se especifica '--rule'
  if (values.rule) {
    const filterTerm = (values.rule as string).toLowerCase();
    all = all.filter(v => 
      v.message.toLowerCase().includes(filterTerm) || 
      v.context.toLowerCase().includes(filterTerm)
    );
  }

  // Priorizar mostrar siempre primero los errores, y luego los warnings
  all.sort((a, b) => {
    if (a.severity === 'error' && b.severity !== 'error') return -1;
    if (a.severity !== 'error' && b.severity === 'error') return 1;
    return 0;
  });

  // Construir agrupaciones de archivos y categorías
  const fileGroups: Record<string, Violation[]> = {};
  const typeGroups: Record<string, number> = {};

  for (const v of all) {
    const rel = path.relative(process.cwd(), v.file);
    if (!fileGroups[rel]) fileGroups[rel] = [];
    fileGroups[rel].push(v);

    const category = getViolationCategory(v);
    typeGroups[category] = (typeGroups[category] || 0) + 1;
  }

  const topLimit = values.top ? parseInt(values.top as string, 10) : DEFAULT_TOP_LIMIT;
  const topFiles = Object.entries(fileGroups)
    .map(([file, violations]) => ({
      file,
      errors: violations.filter(v => v.severity === 'error').length,
      warnings: violations.filter(v => v.severity === 'warning').length,
      total: violations.length
    }))
    .sort((a, b) => b.total - a.total)
    .slice(0, topLimit);

  const errorsCount = all.filter(v => v.severity === 'error').length;
  const warningsCount = all.filter(v => v.severity === 'warning').length;

  const jsonReport = {
    status: errorsCount > 0 ? 'failed' : 'passed',
    summary: {
      totalViolations: all.length,
      errors: errorsCount,
      warnings: warningsCount,
      filesWithIssues: Object.keys(fileGroups).length,
      byCategory: typeGroups
    },
    topFiles,
    files: Object.fromEntries(
      Object.entries(fileGroups).map(([file, violations]) => [
        file,
        violations.map(v => ({
          line: v.line,
          severity: v.severity,
          category: getViolationCategory(v),
          message: v.message,
          context: sanitizeContext(v.context)
        }))
      ])
    )
  };

  // Salida por defecto (JSON para IAs/Herramientas)
  if (!isHumanMode) {
    console.log(JSON.stringify(jsonReport, null, 2));
  } else {
    // Modo Humano / Consola interactiva
    if (values.summary) {
      console.log(styleText('bold', '\n--- 📊 RESUMEN DE AUDITORÍA DE CÓDIGO ---'));
      console.log('\nPor tipo de regla:');
      Object.entries(typeGroups)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          console.log(`  - ${cat}: ${count}`);
        });

      console.log(`\nTop ${topLimit} archivos con más problemas:`);
      topFiles.forEach(f => {
        console.log(`  - ${f.file}: ${f.total} violaciones (${f.errors} ❌, ${f.warnings} ⚠️)`);
      });
    } else {
      console.log(styleText('bold', '\n--- 🔎 DETALLE DE VIOLACIONES POR ARCHIVO ---'));
      const entries = Object.entries(fileGroups);
      const filesToShow = entries.slice(0, MAX_FILES_TO_SHOW_IN_TERMINAL);

      for (const [file, violations] of filesToShow) {
        const fileErrors = violations.filter(v => v.severity === 'error').length;
        const fileWarns = violations.filter(v => v.severity === 'warning').length;
        console.log(`\n📁 ${styleText('bold', file)} (${violations.length} avisos: ${fileErrors} ❌, ${fileWarns} ⚠️)`);

        for (const v of violations.slice(0, MAX_VIOLATIONS_PER_FILE_IN_TERMINAL)) {
          const icon = v.severity === 'error' ? '❌ ERROR' : '⚠️ WARN ';
          const color = v.severity === 'error' ? 'red' : 'yellow';
          const lineStr = `L${v.line}`.padEnd(5);
          const snippet = sanitizeContext(v.context);
          const snippetStr = snippet ? ` ("${snippet}")` : '';
          console.log(`  ${lineStr} ${styleText(color, icon)} [${getViolationCategory(v)}] ${v.message}${snippetStr}`);
        }
        if (violations.length > MAX_VIOLATIONS_PER_FILE_IN_TERMINAL) {
          console.log(styleText('cyan', `  ... y ${violations.length - MAX_VIOLATIONS_PER_FILE_IN_TERMINAL} aviso(s) más en este archivo.`));
        }
      }

      if (entries.length > MAX_FILES_TO_SHOW_IN_TERMINAL) {
        console.log(styleText('cyan', `\n[INFO] Se muestran ${MAX_FILES_TO_SHOW_IN_TERMINAL} de ${entries.length} archivos con avisos para evitar saturar la terminal.`));
        console.log(styleText('cyan', `👉 Usa "npm run audit -- --summary" para vista de métricas o "--output=<archivo>" para volcado completo.`));
      }
    }

    console.log(styleText('bold', '\n======================================================'));
    console.log(`📊 TOTAL: ${errorsCount === 0 ? styleText('green', '0 Errores') : styleText('red', `${errorsCount} Errores`)} | ${styleText('yellow', `${warningsCount} Advertencias`)} | ${Object.keys(fileGroups).length} Archivos`);
    console.log('======================================================\n');
  }

  // Exportar reporte si se pasa --output
  if (values.output) {
    const outputPath = path.resolve(process.cwd(), values.output as string);
    if (outputPath.endsWith('.json')) {
      await fs.writeFile(outputPath, JSON.stringify(jsonReport, null, 2), 'utf-8');
    } else if (outputPath.endsWith('.md')) {
      let md = `# Reporte de Auditoría del Proyecto\n\n`;
      md += `**Estado**: ${errorsCount === 0 ? '✅ Aprobado' : '❌ Fallido'}\n\n`;
      md += `| Métrica | Valor |\n| :--- | :--- |\n`;
      md += `| **Errores** | \`${errorsCount}\` |\n`;
      md += `| **Advertencias** | \`${warningsCount}\` |\n`;
      md += `| **Archivos Afectados** | \`${Object.keys(fileGroups).length}\` |\n\n`;

      md += `## 📊 Desglose por Categoría\n\n| Categoría | Cantidad |\n| :--- | :---: |\n`;
      Object.entries(typeGroups)
        .sort((a, b) => b[1] - a[1])
        .forEach(([cat, count]) => {
          md += `| ${cat} | ${count} |\n`;
        });

      md += `\n## 📁 Top Archivos con Más Avisos\n\n| Archivo | Errores | Advertencias | Total |\n| :--- | :---: | :---: | :---: |\n`;
      topFiles.forEach(f => {
        md += `| \`${f.file}\` | ${f.errors} | ${f.warnings} | ${f.total} |\n`;
      });

      await fs.writeFile(outputPath, md, 'utf-8');
    } else {
      const lines = all.map(v => `[${v.severity.toUpperCase()}] ${path.relative(process.cwd(), v.file)}:${v.line} -> [${getViolationCategory(v)}] ${v.message} ("${sanitizeContext(v.context)}")`);
      await fs.writeFile(outputPath, lines.join('\n'), 'utf-8');
    }
    logProgress(styleText('cyan', `✨ Reporte completo escrito en: ${values.output}`));
  }

  if (values.fix) logProgress(styleText('cyan', '✨ Correcciones aplicadas.'));

  if (all.some(v => v.severity === 'error')) {
    process.exit(1);
  }
}

main().catch(err => {
  console.error(styleText('red', `\n💥 Error fatal en el audit: ${(err as Error).message}`));
  process.exit(1);
});
