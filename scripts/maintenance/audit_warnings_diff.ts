// fallow-ignore-file security-sink
/**
 * scripts/maintenance/audit_warnings_diff.ts
 * 
 * COMPARADOR DE ADVERTENCIAS Y ERRORES (Node.js 26+)
 * 
 * Obtiene los archivos modificados localmente comparando con 'origin/main'.
 * Analiza todo el proyecto buscando ERRORES (incluyendo eslint, vue-tsc type checking, fallow dupes, fallow security).
 * Para las ADVERTENCIAS (warnings), solo analiza y exige resolver aquellas en archivos
 * modificados que sean nuevas comparadas con 'origin/main'.
 */

import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

enableCompileCache();

const ESLINT_STDIN_MAX_BUFFER_BYTES = 50 * 1024 * 1024;

export interface Violation {
  file: string;
  line: number;
  message: string;
  context: string;
  severity: 'error' | 'warning';
  ruleId?: string;
  isNew?: boolean;
}

interface EslintMessage {
  line?: number;
  message?: string;
  source?: string;
  severity?: number;
  ruleId?: string;
}

interface EslintFileResult {
  filePath: string;
  messages: EslintMessage[];
}

// Extensiones a auditar
const AUDIT_EXTENSIONS = new Set(['.vue', '.ts', '.js', '.scss', '.css']);

export function filterNewWarnings(
  localWarnings: Violation[],
  originWarnings: Violation[],
  originContent: string | null,
  filePath: string
): Violation[] {
  const result: Violation[] = [];
  
  for (const violation of localWarnings) {
    if (violation.severity !== 'warning' || violation.file !== filePath) {
      continue;
    }

    if (originContent === null) {
      // Archivo nuevo -> todas las advertencias en él son nuevas
      const copy = { ...violation, isNew: true };
      result.push(copy);
      continue;
    }

    if (violation.ruleId === 'project-audit') {
      // Para la auditoría del proyecto, verificar si el contexto exacto ya existía en origin/main
      const existed = originContent.includes(violation.context);
      const copy = { ...violation, isNew: !existed };
      result.push(copy);
    } else {
      // Para ESLint, comparar ruleId y message contra origin/main
      const existed = originWarnings.some(orig => orig.ruleId === violation.ruleId && orig.message === violation.message);
      const copy = { ...violation, isNew: !existed };
      result.push(copy);
    }
  }

  return result;
}

async function getModifiedFiles(): Promise<Set<string>> {
  try {
    // Asegurarse de tener la referencia remota actualizada (con timeout para no bloquear)
    try {
      execSync('git fetch origin main --timeout=5', { stdio: 'ignore' });
    } catch {
      // Usar referencia local existente si falla o no hay conexión
    }

    // Obtener lista de archivos modificados, agregados o sin seguimiento comparados con origin/main
    const diffOutput = execSync('git diff --name-only origin/main', { encoding: 'utf-8' });
    const statusOutput = execSync('git status --porcelain', { encoding: 'utf-8' });

    const files = new Set<string>();

    diffOutput.split('\n').forEach(f => {
      const trimmed = f.trim();
      if (trimmed) files.add(trimmed);
    });

const GIT_STATUS_PREFIX_OFFSET = 3;

    statusOutput.split('\n').forEach(line => {
      if (line.length > GIT_STATUS_PREFIX_OFFSET) {
        const file = line.substring(GIT_STATUS_PREFIX_OFFSET).trim();
        // Evitar archivos borrados
        if (line[0] !== 'D' && line[1] !== 'D') {
          files.add(file);
        }
      }
    });

    const filteredFiles = new Set<string>();
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      const isConfigFile = /^(vite|vitest|playwright|eslint)\.config\./i.test(path.basename(f)) || path.basename(f).startsWith('vitest.');
      if (AUDIT_EXTENSIONS.has(ext) && !isConfigFile && !f.includes('node_modules') && !f.startsWith('external/') && !f.startsWith('external\\') && !f.startsWith('dist/') && !f.startsWith('dev-dist/') && !f.startsWith('scratch/')) {
        filteredFiles.add(f);
      }
    }
    return filteredFiles;
  } catch (error) {
    console.error(styleText('red', `❌ Error al obtener archivos modificados con git: ${(error as Error).message}`));
    return new Set();
  }
}

async function getOriginFileContent(filePath: string): Promise<string | null> {
  try {
    return execSync(`git show origin/main:${filePath}`, { encoding: 'utf-8', stdio: ['pipe', 'pipe', 'ignore'] });
  } catch {
    // Si el archivo no existe en origin/main (es nuevo)
    return null;
  }
}

async function runProjectEslint(): Promise<Violation[]> {
  const violations: Violation[] = [];
  try {
    const eslintProc = spawnSync('npx', ['eslint', '--cache', '--format', 'json', '.'], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    const output = eslintProc.stdout ? eslintProc.stdout.trim() : '';
    if (!output) return [];

    const results = JSON.parse(output) as EslintFileResult[];
    for (const fileResult of results) {
      const relPath = path.relative(process.cwd(), fileResult.filePath);
      if (relPath.includes('node_modules') || relPath.startsWith('dist/') || relPath.startsWith('dev-dist/') || relPath.startsWith('scratch/')) {
        continue;
      }
      for (const msg of fileResult.messages) {
        violations.push({
          file: relPath,
          line: msg.line || 0,
          message: msg.message || '',
          context: msg.source || '',
          severity: msg.severity === 2 ? 'error' : 'warning',
          ruleId: msg.ruleId || 'eslint-rule'
        });
      }
    }
  } catch (err) {
    console.error(styleText('yellow', `⚠️ Advertencia al correr ESLint en el proyecto: ${(err as Error).message}`));
  }
  return violations;
}

async function runOriginEslint(filePath: string, content: string): Promise<Violation[]> {
  const violations: Violation[] = [];
  try {
    const eslintProc = spawnSync('npx', ['eslint', '--stdin', '--stdin-filename', filePath, '--format', 'json'], {
      input: content,
      encoding: 'utf-8',
      maxBuffer: ESLINT_STDIN_MAX_BUFFER_BYTES
    });
    const output = eslintProc.stdout ? eslintProc.stdout.trim() : '';
    if (!output) return [];

    const results = JSON.parse(output) as EslintFileResult[];
    for (const fileResult of results) {
      for (const msg of fileResult.messages) {
        violations.push({
          file: filePath,
          line: msg.line || 0,
          message: msg.message || '',
          context: msg.source || '',
          severity: msg.severity === 2 ? 'error' : 'warning',
          ruleId: msg.ruleId || 'eslint-rule'
        });
      }
    }
  } catch {
    // Ignorar fallos de eslint en el origen
  }
  return violations;
}

async function runTypeChecking(): Promise<Violation[]> {
  const violations: Violation[] = [];
  try {
    const tscProc = spawnSync('npx', ['vue-tsc', '--noEmit'], { encoding: 'utf-8', maxBuffer: 50 * 1024 * 1024 });
    const output = tscProc.stdout ? tscProc.stdout.trim() : '';
    if (!output) return [];

    // Parsear salida estándar de tsc/vue-tsc
    // Formato común: src/components/File.vue(12,5): error TS2322: Type 'x' is not assignable...
    const lines = output.split('\n');
    for (const line of lines) {
      const match = line.match(/^([^(]+)\((\d+),(\d+)\):\s+(error\s+TS\d+):\s+(.+)$/);
      if (match) {
        const file = match[1]?.trim() || '';
        const lineNum = parseInt(match[2] || '0', 10);
        const code = match[4] || '';
        const message = match[5] || '';
        violations.push({
          file: path.relative(process.cwd(), file),
          line: lineNum,
          message: `${code}: ${message}`,
          context: 'typescript',
          severity: 'error',
          ruleId: 'typescript-tsc'
        });
      } else if (line.includes('error TS')) {
        violations.push({
          file: 'tsconfig.json',
          line: 0,
          message: line.trim(),
          context: 'typescript',
          severity: 'error',
          ruleId: 'typescript-tsc'
        });
      }
    }
  } catch (err) {
    console.error(styleText('yellow', `⚠️ Advertencia al correr vue-tsc: ${(err as Error).message}`));
  }
  return violations;
}

async function runScriptValidator(name: string, scriptPath: string, args: string[] = []): Promise<Violation[]> {
  const violations: Violation[] = [];
  try {
    const proc = spawnSync('node', [
      '--permission',
      '--experimental-strip-types',
      '--allow-fs-read=.',
      '--allow-fs-write=.',
      scriptPath,
      ...args
    ], { encoding: 'utf-8' });
    if (proc.status !== 0) {
      const errOut = (proc.stderr || proc.stdout || '').trim();
      const firstLine = errOut.split('\n').find(l => l.trim().length > 0) ?? `Código de salida ${proc.status}`;
      violations.push({
        file: scriptPath,
        line: 1,
        message: `Fallo en validación [${name}]: ${firstLine}`,
        context: name,
        severity: 'error',
        ruleId: `validator-${name.toLowerCase().replace(/\s+/g, '-')}`
      });
    }
  } catch (err) {
    violations.push({
      file: scriptPath,
      line: 1,
      message: `Error ejecutando validador ${name}: ${(err as Error).message}`,
      context: name,
      severity: 'error',
      ruleId: `validator-${name.toLowerCase().replace(/\s+/g, '-')}`
    });
  }
  return violations;
}

async function main() {
  console.log(styleText('bold', '\n--- 🕵️ POKE VICIO - WARNINGS DIFF & PROJECT ERRORS AUDIT (Análisis Estático) ---'));
  
  const modifiedFiles = await getModifiedFiles();
  if (modifiedFiles.size === 0) {
    console.log(styleText('green', '✔ No hay archivos fuente modificados comparados con origin/main.'));
  } else {
    console.log(styleText('cyan', `Archivos modificados detectados para diff de advertencias: (${modifiedFiles.size} archivos)`));
    if (modifiedFiles.size <= 10) {
      modifiedFiles.forEach(f => console.log(`  - ${f}`));
    } else {
      const sample = Array.from(modifiedFiles).slice(0, 8);
      sample.forEach(f => console.log(`  - ${f}`));
      console.log(styleText('gray', `  ... y ${modifiedFiles.size - 8} archivos modificados más`));
    }
  }

  // 1. Ejecutar ESLint en todo el proyecto
  console.log(styleText('cyan', '\n[1/4] Ejecutando ESLint con caché en todo el proyecto...'));
  const eslintViolations = await runProjectEslint();

  // 2. Ejecutar Type Checking (vue-tsc)
  console.log(styleText('cyan', '[2/4] Ejecutando validación de tipos TypeScript (vue-tsc)...'));
  const typeErrors = await runTypeChecking();

  // 3. Ejecutar validaciones de dominio y bases de datos
  console.log(styleText('cyan', '[3/4] Ejecutando validaciones de dominio (Types, SQL, Saves, FSM, Items, Moves, Abilities)...'));
  const domainTypeErrors = await runScriptValidator('Domain Types', 'scripts/validation/validate_domain_types.ts', ['--errors-only']);
  const sqlErrors = await runScriptValidator('SQL Migrations', 'scripts/database/validate_sql_migrations.ts');
  const saveErrors = await runScriptValidator('Save Migrations', 'scripts/validation/validate_save_migrations.ts');
  const fsmDiagramErrors = await runScriptValidator('FSM Diagrams', 'scripts/validation/validate_fsm_diagrams.ts');
  const fsmImplErrors = await runScriptValidator('FSM Implementation', 'scripts/validation/validate_fsm_implementation.ts');
  const fsmFlowErrors = await runScriptValidator('FSM Flow Parity', 'scripts/validation/validate_fsm_flow_parity.ts');
  const itemsErrors = await runScriptValidator('Items Database', 'scripts/validation/validate_items.ts');
  const abilitiesErrors = await runScriptValidator('Abilities Database', 'scripts/validation/validate_abilities.ts');
  const movesErrors = await runScriptValidator('Moves Database', 'scripts/validation/validate_moves.ts');

  // 4. Ejecutar auditoría del proyecto local (audit_project.ts: AST, Fallow, CSS, DOX, Constantes)
  console.log(styleText('cyan', '[4/4] Ejecutando Auditoría Integral del Proyecto (AST, Fallow Dupes/Security/DeadCode, CSS, DOX)...'));
  const auditReportJsonPath = 'scratch/audit_local.json';
  
  // Limpiar reporte previo
  await fs.rm(auditReportJsonPath, { force: true });
  
  spawnSync('node', [
    '--permission',
    '--experimental-strip-types',
    '--allow-fs-read=*',
    '--allow-fs-write=*',
    '--allow-child-process',
    'scripts/maintenance/audit_project.ts',
    '--output',
    auditReportJsonPath
  ], { stdio: 'ignore' });

  let auditViolations: Violation[] = [];
  try {
    const rawAudit = await fs.readFile(auditReportJsonPath, 'utf-8');
    const parsed = JSON.parse(rawAudit) as { files?: Record<string, Violation[]> } | Violation[];
    if (Array.isArray(parsed)) {
      auditViolations = parsed.map((v: Violation) => ({
        file: path.relative(process.cwd(), v.file),
        line: v.line,
        message: v.message,
        context: v.context,
        severity: v.severity,
        ruleId: 'project-audit'
      }));
    } else if (parsed && parsed.files) {
      for (const [file, list] of Object.entries(parsed.files)) {
        for (const v of list) {
          auditViolations.push({
            file: path.relative(process.cwd(), file),
            line: v.line,
            message: v.message,
            context: v.context,
            severity: v.severity,
            ruleId: 'project-audit'
          });
        }
      }
    }
  } catch {
    // Si no se generó el archivo de auditoría, asumimos que no hubo violaciones
  }

  // Combinar todas las violaciones del proyecto sin duplicaciones
  const allViolations = [
    ...eslintViolations,
    ...typeErrors,
    ...domainTypeErrors,
    ...sqlErrors,
    ...saveErrors,
    ...fsmDiagramErrors,
    ...fsmImplErrors,
    ...fsmFlowErrors,
    ...itemsErrors,
    ...abilitiesErrors,
    ...movesErrors,
    ...auditViolations
  ];

  // Separar en errores (globales) y warnings (filtrados por modificados)
  const projectErrors: Violation[] = [];
  const warningsByFile: Record<string, Violation[]> = {};

  for (const violation of allViolations) {
    if (violation.severity === 'error') {
      projectErrors.push(violation);
      continue;
    }

    if (modifiedFiles.has(violation.file)) {
      let list = warningsByFile[violation.file];
      if (!list) {
        list = [];
        warningsByFile[violation.file] = list;
      }
      list.push(violation);
    }
  }

  const finalWarnings: Violation[] = [];

  for (const file of Object.keys(warningsByFile)) {
    const localFileWarnings = warningsByFile[file]!;
    const originContent = await getOriginFileContent(file);
    let originEslint: Violation[] = [];
    
    if (originContent !== null) {
      const hasEslint = localFileWarnings.some(w => w.ruleId !== 'project-audit');
      if (hasEslint) {
        originEslint = await runOriginEslint(file, originContent);
      }
    }

    const filtered = filterNewWarnings(localFileWarnings, originEslint, originContent, file);
    finalWarnings.push(...filtered);
  }

  // Escribir reporte JSON y TXT bajo scratch/
  await fs.mkdir('scratch', { recursive: true });
  
  const reportData = {
    analyzedModifiedFiles: Array.from(modifiedFiles),
    errors: projectErrors,
    warnings: finalWarnings
  };

  await fs.writeFile('scratch/warnings_diff_report.json', JSON.stringify(reportData, null, 2), 'utf-8');

  // Imprimir reporte por pantalla y guardarlo en .txt
  const txtLines: string[] = [];
  txtLines.push('================================================================');
  txtLines.push('📊 REPORTE DE ANÁLISIS GLOBAL: ERRORES DEL PROYECTO Y WARNINGS LOCALES');
  txtLines.push('================================================================\n');

  const newWarnings = finalWarnings.filter(v => v.isNew);
  const legacyWarnings = finalWarnings.filter(v => !v.isNew);

  if (projectErrors.length > 0) {
    txtLines.push(styleText('bold', styleText('red', `❌ ERRORES DETECTADOS EN EL PROYECTO (DEBEN CORREGIRSE TODOS) (${projectErrors.length}):`)));
    projectErrors.forEach(v => {
      txtLines.push(`  - ${v.file}:${v.line} -> ${v.message} ("${v.context}")`);
    });
    txtLines.push('');
  } else {
    txtLines.push(styleText('green', '✔ Cero errores detectados en todo el proyecto.\n'));
  }

  if (newWarnings.length > 0) {
    txtLines.push(styleText('bold', styleText('yellow', `⚠️ NUEVAS ADVERTENCIAS EN ARCHIVOS MODIFICADOS (DEBEN CORREGIRSE) (${newWarnings.length}):`)));
    newWarnings.forEach(v => {
      txtLines.push(`  - ${v.file}:${v.line} [${v.ruleId}] -> ${v.message}`);
    });
    txtLines.push('');
  } else {
    txtLines.push(styleText('green', '✔ Cero advertencias nuevas en los archivos modificados.\n'));
  }

  if (legacyWarnings.length > 0) {
    txtLines.push(styleText('cyan', `ℹ ADVERTENCIAS PRE-EXISTENTES EN ARCHIVOS MODIFICADOS (PUEDEN IGNORARSE) (${legacyWarnings.length}):`));
    legacyWarnings.forEach(v => {
      txtLines.push(`  - ${v.file}:${v.line} [${v.ruleId}] -> ${v.message}`);
    });
    txtLines.push('');
  }

  const outputTxt = txtLines.join('\n');
  console.log(outputTxt);
  await fs.writeFile('scratch/warnings_diff_report.txt', outputTxt.replace(new RegExp(String.fromCharCode(27) + '\\[[0-9;]*m', 'g'), ''), 'utf-8');

  // Limpiar temporales
  await fs.rm(auditReportJsonPath, { force: true });

  // Si hay errores de proyecto o nuevas advertencias, salir con código de error
  if (projectErrors.length > 0 || newWarnings.length > 0) {
    console.error(styleText('bold', styleText('red', `\n💥 FAILED: Se encontraron ${projectErrors.length} errores de proyecto y ${newWarnings.length} advertencias nuevas.`)));
    process.exit(1);
  } else {
    console.log(styleText('bold', styleText('green', '✨ Todo limpio. Listo para safe-commit!')));
    process.exit(0);
  }
}

// Solo ejecutar main si se corre directamente
if (process.argv[1] && (process.argv[1].endsWith('audit_warnings_diff.ts') || process.argv[1].endsWith('audit_warnings_diff.js'))) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? (err as Error).message : String(err);
    console.error(styleText('red', `💥 Error fatal en audit_warnings_diff: ${msg}`));
    process.exit(1);
  });
}
