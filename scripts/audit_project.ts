/**
 * scripts/audit_project.ts
 * 
 * UNIFIED PROJECT AUDIT & REPAIR ENGINE (Node.js 26+)
 * 
 * Reemplaza todas las herramientas de legado (.py) con una suite nativa de alto rendimiento.
 * Ejecuta auditorías de: Viewport, SASS, GPU, Performance, Estándares de Código y Estética.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { enableCompileCache } from 'node:module';
import { parseArgs } from 'node:util';

enableCompileCache();

const IGNORE_DIRS = new Set(['node_modules', '.git', 'dist', 'backup_legacy_code', 'public', 'docs']);
const AUDIT_EXTENSIONS = new Set(['.vue', '.scss', '.css', '.ts', '.js']);

interface Violation {
  file: string;
  line: number;
  message: string;
  context: string;
  severity: 'error' | 'warning';
  fixable: boolean;
}

const config = {
  viewport: {
    regex: /\b\d+(?:\.\d+)?(vw|vh)\b/gi,
    message: (match: string) => `Unidad legacy detectada: '${match}'. Usa 'd${match.slice(-2)}' para soporte mobile dinámico.`,
    fix: (match: string) => `d${match.toLowerCase().slice(-2)}`
  },
  sassFilters: {
    regex: /(filter|backdrop-filter):\s*.*?\b(blur|scale|invert|grayscale|opacity|brightness)\(/gi,
    message: (match: string) => `Filtro CSS en minúsculas detectado. Usa la versión capitalizada (ej. 'Blur(') para evitar colisiones con SASS.`,
    fix: (match: string) => match.replace(/\b(blur|scale|invert|grayscale|opacity|brightness)\(/gi, (m) => m.charAt(0).toUpperCase() + m.slice(1))
  },
  transformIntegrity: {
    regex: /transform:\s*.*?\b(Blur|Scale|Invert|GrayScale|Opacity|Brightness)\(/g,
    message: "Transformación CSS capitalizada detectada. Las transformaciones deben ser minúsculas para compatibilidad del navegador.",
    fix: (match: string) => match.toLowerCase()
  },
  gpuGaps: {
    regex: /(backdrop-filter|filter):/g,
    exclude: /will-change/g,
    message: "Filtro detectado sin 'will-change'. Considera añadir promoción de capa para mejorar el rendimiento GPU.",
    fixable: false
  },
  legacyDates: {
    regex: /new Date\(|Date\.now\(\)/g,
    message: "Uso de 'Date' detectado. El estándar del proyecto exige la API 'Temporal' para lógica de motor.",
    fixable: false
  },
  nodePrefix: {
    regex: /import .* from ['"](fs|path|os|crypto|util|url|events|stream|child_process)['"]/g,
    message: "Import de Node sin prefijo 'node:'. Usa 'node:module'.",
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
    const stat = await fs.stat(fullPath);
    if (stat.isDirectory()) {
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
  const lines = content.split('\n');
  let modified = false;

  // 1. Check Line Length
  if (lines.length > config.fileLength.maxLines && !config.fileLength.ignorePattern.test(content)) {
    violations.push({
      file: filePath,
      line: 0,
      message: `Archivo demasiado largo (${lines.length} líneas). Máximo permitido: ${config.fileLength.maxLines}.`,
      context: 'File Length Audit',
      severity: 'error',
      fixable: false
    } as any);
  }

  // 2. Regex Checks
  const runRegexAudit = (key: keyof typeof config, audit: any) => {
    if (!audit.regex) return;
    
    // First, find all violations for reporting
    const regex = new RegExp(audit.regex);
    let match;
    while ((match = regex.exec(content)) !== null) {
      const lineNo = content.substring(0, match.index).split('\n').length;
      violations.push({
        file: filePath,
        line: lineNo,
        message: typeof audit.message === 'function' ? audit.message(match[0]) : audit.message,
        context: match[0],
        severity: audit.severity || 'warning',
        fixable: !!audit.fix
      });
    }

    // Then, if fixing is enabled, replace all occurrences
    if (fix && audit.fix) {
      const newContent = content.replace(new RegExp(audit.regex), (m) => {
        modified = true;
        return audit.fix(m);
      });
      content = newContent;
    }
  };

  runRegexAudit('viewport', config.viewport);
  runRegexAudit('sassFilters', config.sassFilters);
  runRegexAudit('transformIntegrity', config.transformIntegrity);
  runRegexAudit('legacyDates', config.legacyDates);
  runRegexAudit('nodePrefix', config.nodePrefix);

  // Special case: GPU Gaps (only CSS/SCSS/Vue)
  if (filePath.endsWith('.scss') || filePath.endsWith('.css') || filePath.endsWith('.vue')) {
    if (config.gpuGaps.regex.test(content) && !config.gpuGaps.exclude.test(content)) {
      violations.push({
        file: filePath,
        line: 0,
        message: config.gpuGaps.message,
        context: 'GPU Performance Audit',
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

async function main() {
  const { values } = parseArgs({
    options: {
      fix: { type: 'boolean', short: 'f' },
      path: { type: 'string', short: 'p', default: '.' }
    }
  });

  console.log(styleText('bold', '\n--- 🔎 POKE VICIO - UNIFIED AUDIT ENGINE ---'));
  
  const root = path.resolve(process.cwd(), values.path as string);
  const files = await walk(root);
  let allViolations: Violation[] = [];

  console.log(styleText('yellow', `   Auditando ${files.length} archivos...\n`));

  for (const file of files) {
    const violations = await auditFile(file, !!values.fix);
    allViolations = allViolations.concat(violations);
  }

  if (allViolations.length === 0) {
    console.log(styleText('green', '   ✅ ¡Excelente! El proyecto cumple con todos los estándares.\n'));
    process.exit(0);
  }

  const errors = allViolations.filter(v => v.severity === 'error');
  const warnings = allViolations.filter(v => v.severity === 'warning');

  console.log(styleText('bold', '--- RESUMEN DE AUDITORÍA ---'));
  allViolations.forEach(v => {
    const color = v.severity === 'error' ? 'red' : 'yellow';
    console.log(styleText(color, `[${v.severity.toUpperCase()}] ${path.relative(process.cwd(), v.file)}:${v.line}`));
    console.log(`      ${v.message}`);
    console.log(`      Contexto: "${v.context}"\n`);
  });

  console.log(styleText('red', `   ❌ Fallos encontrados: ${errors.length}`));
  console.log(styleText('yellow', `   ⚠️  Advertencias encontradas: ${warnings.length}`));
  
  if (values.fix) {
    console.log(styleText('cyan', '\n   ✨ Se han aplicado las correcciones automáticas posibles. Vuelve a auditar para verificar.\n'));
  } else if (allViolations.some(v => v.fixable)) {
    console.log(styleText('cyan', '\n   💡 Usa --fix para corregir automáticamente los problemas marcados como reparables.\n'));
  }

  process.exit(errors.length > 0 ? 1 : 0);
}

main();
