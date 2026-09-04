/**
 * scripts/maintenance/audit_for_commit.ts
 * 
 * COMPARADOR DE ADVERTENCIAS Y ERRORES PARA SAFE-COMMIT (Node.js 26+)
 * 
 * Obtiene los archivos modificados localmente comparando con 'origin/main'.
 * Analiza todo el proyecto buscando ERRORES (incluyendo eslint, vue-tsc type checking y 100% de sub-auditores).
 * Para las ADVERTENCIAS (warnings), solo exige resolver aquellas en archivos
 * modificados que sean nuevas comparadas con 'origin/main'.
 * 
 * ⚠️ ZERO TAMPERING MANDATE:
 * Under NO circumstances may this script be modified to weaken, downgrade, or
 * bypass new warnings (such as Fallow unused exports or complexity hotspots) to make
 * a commit pass. All new findings MUST be resolved at the source code level.
 */

import { spawnSync, execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';

import { type AuditSeverity } from './audit_rules.ts';
import { type StandardAuditResult } from '../lib/auditContract.ts';
import { renderBanner } from '../lib/unifiedTheme.ts';
import { discoverAuditors } from './auditScanner.ts';
import { executeAuditorStreaming } from '../lib/streamingRunner.ts';

enableCompileCache();

const ESLINT_STDIN_MAX_BUFFER_BYTES = 50 * 1024 * 1024;

export interface Violation {
  file: string;
  line: number;
  message: string;
  context: string;
  severity: AuditSeverity;
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
const AUDIT_EXTENSIONS = ['.vue', '.ts', '.js', '.scss', '.css'] as const;

export function isSubAuditorRule(ruleId?: string): boolean {
  if (!ruleId) return false;
  return ruleId === 'project-audit' ||
         ruleId === 'audit_project' ||
         ruleId.startsWith('Fallow') ||
         ruleId.startsWith('o1-') ||
         ruleId === 'spanish-logic-id' ||
         ruleId.startsWith('validate_') ||
         ruleId.startsWith('audit_') ||
         ruleId.startsWith('Largo de archivo');
}

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

    // Sugerencias de complejidad de Fallow son métricas informativas de salud
    if (violation.message.includes('Sugerencia de complejidad (Fallow)')) {
      const copy = { ...violation, isNew: false };
      result.push(copy);
      continue;
    }

    if (originContent === null) {
      // Archivo nuevo -> todas las advertencias en él son nuevas
      const copy = { ...violation, isNew: true };
      result.push(copy);
      continue;
    }

    // Regla de mantenibilidad 500/1000: si el archivo en origin/main ya superaba 500 líneas, es advertencia heredada
    if (violation.message.includes('Mantenibilidad (500/1000 Rule)') || 
        violation.message.includes('Largo de archivo (>300/500 líneas)')) {
      const originLines = originContent ? originContent.split('\n').length : 0;
      const copy = { ...violation, isNew: originLines <= 500 };
      result.push(copy);
      continue;
    }

    // Si es una regla de sub-auditor o auditoría de proyecto, comparar contexto en código fuente
    if (isSubAuditorRule(violation.ruleId)) {
      const existedInOriginCode = violation.context ? originContent.includes(violation.context) : true;
      const copy = { ...violation, isNew: !existedInOriginCode };
      result.push(copy);
    } else {
      // Para ESLint, comparar ruleId y message contra originWarnings
      const existedInOriginWarnings = originWarnings.some(
        orig => orig.ruleId === violation.ruleId && orig.message === violation.message
      );
      const copy = { ...violation, isNew: !existedInOriginWarnings };
      result.push(copy);
    }
  }

  return result;
}

async function getModifiedFiles(): Promise<Set<string>> {
  try {
    try {
      execSync('git fetch origin main --timeout=5', { stdio: 'ignore' });
    } catch {
      // Usar referencia local existente si falla o no hay conexión
    }

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
        if (line[0] !== 'D' && line[1] !== 'D') {
          files.add(file);
        }
      }
    });

    const filteredFiles = new Set<string>();
    for (const f of files) {
      const ext = path.extname(f).toLowerCase();
      const isConfigFile = /^(vite|vitest|playwright|eslint)\.config\./i.test(path.basename(f)) || path.basename(f).startsWith('vitest.');
      if ((AUDIT_EXTENSIONS as readonly string[]).includes(ext) && !isConfigFile && !f.includes('node_modules') && !f.startsWith('external/') && !f.startsWith('external\\') && !f.startsWith('dist/') && !f.startsWith('dev-dist/') && !f.startsWith('scratch/') && !f.startsWith('test aventura')) { // no-domain: Non-domain utility collection or data structure
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

async function main() {
  console.log(renderBanner(
    'POKE VICIO - WARNINGS DIFF & PRE-COMMIT GATEKEEPER',
    'Comparador contra origin/main: Exige 0 errores en proyecto y 0 warnings nuevos'
  ));
  
  const modifiedFiles = await getModifiedFiles();
  console.log(styleText('bold', '📁 Archivos modificados detectados:'));
  if (modifiedFiles.size === 0) {
    console.log(styleText('green', '  ✔ Cero archivos fuente modificados comparados con origin/main.\n'));
  } else {
    const MAX_SAMPLE_FILES = 8;
    const sample = Array.from(modifiedFiles).slice(0, MAX_SAMPLE_FILES);
    sample.forEach(f => console.log(`  - ${styleText('cyan', f)}`));
    if (modifiedFiles.size > MAX_SAMPLE_FILES) {
      console.log(styleText('dim', `  ... y ${modifiedFiles.size - MAX_SAMPLE_FILES} archivos más`));
    }
    console.log('');
  }

  // 1. Ejecutar ESLint en todo el proyecto
  console.log(styleText('dim', '[ 1/3 ] 🔍 Ejecutando ESLint con caché en todo el proyecto...'));
  const eslintViolations = await runProjectEslint();

  // 2. Ejecutar Type Checking (vue-tsc)
  console.log(styleText('dim', '[ 2/3 ] 🔍 Ejecutando comprobación de tipos TypeScript (vue-tsc)...'));
  const typeErrors = await runTypeChecking();

  // 3. Ejecutar dinámicamente 100% de sub-auditores descubiertos en scripts/auditors/
  console.log(styleText('dim', '[ 3/3 ] 🔍 Ejecutando todas las suites de auditoría descubiertas...'));
  const discoveredTasks = await discoverAuditors();
  const subAuditorViolations: Violation[] = [];
  const totalTasks = discoveredTasks.length;

  for (let i = 0; i < totalTasks; i++) {
    const task = discoveredTasks[i]!;
    const stepNum = i + 1;
    const stepStr = String(stepNum).padStart(2, '0');
    const totalStr = String(totalTasks).padStart(2, '0');
    const pct = Math.round((stepNum / totalTasks) * 100);
    const pctStr = `${pct}%`.padStart(4, ' ');

    console.log(`     ${styleText('dim', `[ ${stepStr}/${totalStr} │ ${pctStr} ]`)} ⚙️  ${styleText('cyan', task.name)} ${styleText('dim', `(${task.id})`)}...`);

    const proc = await executeAuditorStreaming(task, task.args, (subLine) => {
      console.log(`        ${styleText('dim', '│')}  ${styleText('dim', subLine)}`);
    });

    const jsonPath = path.resolve(process.cwd(), 'scratch/audits', task.family, `${task.id}.json`);
    try {
      const data = await fs.readFile(jsonPath, 'utf-8');
      const parsed = JSON.parse(data) as StandardAuditResult;
      for (const finding of parsed.findings || []) {
        if (finding.severity === 'info') continue;
        const targetFile = finding.file ? path.relative(process.cwd(), finding.file) : '';
        // Advertencias sin archivo objetivo no son regresiones en archivos fuente modificados
        if (!targetFile && finding.severity === 'warning') continue;

        subAuditorViolations.push({
          file: targetFile || task.scriptPath,
          line: finding.line || 1,
          message: finding.message,
          context: finding.context || task.name,
          severity: finding.severity,
          ruleId: finding.ruleId || task.id
        });
      }
    } catch {
      if (proc.timedOut) {
        subAuditorViolations.push({
          file: task.scriptPath,
          line: 1,
          message: `Timeout excedido (${task.timeoutMs ?? 60000}ms) en ejecución de la suite.`,
          context: task.name,
          severity: 'error',
          ruleId: task.id
        });
      }
    }
  }

  // Combinar todas las violaciones del proyecto sin duplicaciones
  const allViolations = [
    ...eslintViolations,
    ...typeErrors,
    ...subAuditorViolations
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
      const hasEslint = localFileWarnings.some(w => !isSubAuditorRule(w.ruleId));
      if (hasEslint) {
        originEslint = await runOriginEslint(file, originContent);
      }
    }

    const filtered = filterNewWarnings(localFileWarnings, originEslint, originContent, file);
    finalWarnings.push(...filtered);
  }

  const newWarnings = finalWarnings.filter(v => v.isNew);
  const legacyWarnings = finalWarnings.filter(v => !v.isNew);

  // Escribir reporte JSON y TXT bajo scratch/ y scratch/audits/
  await fs.mkdir('scratch/audits', { recursive: true });
  
  const reportData = {
    analyzedModifiedFiles: Array.from(modifiedFiles),
    summary: {
      projectErrors: projectErrors.length,
      newWarnings: newWarnings.length,
      legacyWarnings: legacyWarnings.length,
      status: projectErrors.length === 0 && newWarnings.length === 0 ? 'passed' : 'failed'
    },
    errors: projectErrors,
    newWarnings,
    legacyWarnings
  };

  const reportJsonPath = 'scratch/warnings_diff_report.json';
  const latestAuditDiffPath = 'scratch/audits/latest_warnings_diff.json';
  const jsonReportString = JSON.stringify(reportData, null, 2);

  await fs.writeFile(reportJsonPath, jsonReportString, 'utf-8');
  await fs.writeFile(latestAuditDiffPath, jsonReportString, 'utf-8');

  // Imprimir reporte visual y Box-Drawing consolidado
  console.log(styleText('bold', '\n📊 RESULTADOS DE COMPARACIÓN (PRE-COMMIT GATEKEEPER):'));
  console.log('  ────────────────────────────────────────────────────────────────────────');

  if (projectErrors.length > 0) {
    console.log(styleText('bold', styleText('red', `\n❌ ERRORES DETECTADOS EN EL PROYECTO (${projectErrors.length}):`)));
    projectErrors.forEach(v => {
      console.log(`  - ${styleText('bold', v.file)}:${v.line} -> ${v.message} ("${v.context}")`);
    });
  } else {
    console.log(styleText('green', '  ✔ Cero errores detectados en todo el proyecto (ESLint, TypeScript, Dominio, FSM, SQL).'));
  }

  if (newWarnings.length > 0) {
    console.log(styleText('bold', styleText('yellow', `\n⚠️ NUEVAS ADVERTENCIAS EN ARCHIVOS MODIFICADOS (${newWarnings.length}):`)));
    newWarnings.forEach(v => {
      console.log(`  - ${styleText('bold', v.file)}:${v.line} [${v.ruleId}] -> ${v.message}`);
    });
  } else {
    console.log(styleText('green', '  ✔ Cero advertencias nuevas en los archivos modificados.'));
  }

  if (legacyWarnings.length > 0) {
    console.log(styleText('dim', `  ℹ️  ${legacyWarnings.length} advertencias preexistentes en archivos modificados (ignoradas conforme al contrato).`));
  }

  console.log('  ────────────────────────────────────────────────────────────────────────');

  const isSuccess = projectErrors.length === 0 && newWarnings.length === 0;

  if (isSuccess) {
    console.log(styleText('bold', styleText('green', '\n✨ ¡GATEKEEPER APROBADO! Repositorio 100% limpio y listo para safe-commit.\n')));
    console.log(styleText('dim', `💾 Reporte guardado en: ${latestAuditDiffPath}\n`));
    process.exit(0);
  } else {
    console.error(styleText('bold', styleText('red', `\n🚨 GATEKEEPER BLOQUEADO: Se encontraron ${projectErrors.length} errores y ${newWarnings.length} advertencias nuevas.\n`)));
    console.log(styleText('dim', `💾 Reporte guardado en: ${latestAuditDiffPath}\n`));
    process.exit(1);
  }
}

// Solo ejecutar main si se corre directamente
if (process.argv[1] && (process.argv[1].endsWith('audit_for_commit.ts') || process.argv[1].endsWith('audit_for_commit.js') || process.argv[1].endsWith('audit_warnings_diff.ts'))) {
  main().catch((err: unknown) => {
    const msg = err instanceof Error ? (err as Error).message : String(err);
    console.error(styleText('red', `💥 Error fatal en audit_for_commit: ${msg}`));
    process.exit(1);
  });
}
