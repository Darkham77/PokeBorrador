/**
 * scripts/maintenance/analyzers/constantAnalyzer.ts
 *
 * Scans codebase files for duplicate constant declarations across modules.
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import type { Violation, RuleDescriptor } from '../audit_rules.ts';

export const CONSTANT_ANALYZER_DESCRIPTOR: RuleDescriptor = {
  id: 'duplicate-constants',
  name: 'Duplicate Constants Across Modules',
  category: 'Constantes duplicadas entre módulos',
  aliases: ['duplicate-constants', 'constants', 'constantes', 'constantes-duplicadas']
};

const IGNORED_CONSTANT_NAMES = new Set([ // runtime-set
  'ID', 'NAME', 'TYPE', 'KEY', 'INDEX', 'COUNT', 'DEFAULT', 'SIZE', 'MAX', 'MIN',
  'VAL', 'VALUE', 'ITEM', 'STATE', 'MODE', 'TAG', 'URL', 'PATH', 'ERR', 'ERROR',
  'MSG', 'DATA', 'INFO', 'OPTIONS', 'CONFIG', 'RESULT', 'RES', 'REQ', 'STATUS',
  'LEVEL', 'STEP', 'DELTA', 'WIDTH', 'HEIGHT', 'X', 'Y', 'Z', 'I', 'J', 'K',
  'TEST', 'MOCK', 'STUB', 'DUMMY', 'VERSION', 'DESC', 'TITLE', 'LABEL', 'ICON',
  'COLOR', 'THEME', 'STYLE', 'PROPS', 'EMITS', 'MAP', 'LIST', 'ITEMS', 'ACTIONS',
  'TYPES', 'KEYS', 'VALUES', 'ROLES', 'MODALS', 'VIEWS', 'COMPONENTS', 'STORE',
  'SCHEMA', 'KEY_CODES', 'REF', 'COMPOSABLE', 'PROVIDE', 'INJECT', 'SLOTS', 'SLOT'
]);

interface ConstDecl {
  file: string;
  line: number;
  valueStr: string;
  isExported: boolean;
}

export async function detectDuplicateConstants(files: string[]): Promise<Violation[]> {
  const violations: Violation[] = [];
  const declarations = new Map<string, ConstDecl[]>();

  for (const filePath of files) {
    const rel = path.relative(process.cwd(), filePath);
    if (
      rel.includes('node_modules') ||
      rel.includes('external') ||
      rel.includes('tests') ||
      rel.includes('scratch') ||
      rel.includes('scripts') ||
      rel.includes('.sim.ts') ||
      rel.includes('npcSpriteCatalog.ts') ||
      rel.includes('pokemonFeetDatabase.ts') ||
      rel.includes('official_servers.ts')
    ) {
      continue;
    }

    let content: string;
    try {
      content = await fs.readFile(filePath, 'utf-8');
    } catch {
      continue;
    }

    const lines = content.split('\n');
    for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
      const line = lines[lineIdx]!.trim();
      const isTopLevelDecl = line.startsWith('export const ') || line.startsWith('const ');
      if (!isTopLevelDecl) continue;

      const match = /^(export\s+)?const\s+([A-Z0-9_]{4,})\s*(?::\s*[^=]+)?=\s*([^;\n]+)/.exec(line);
      if (!match) continue;

      const isExported = !!match[1];
      const constName = match[2]!;
      const rawValue = match[3]!.trim();

      if (IGNORED_CONSTANT_NAMES.has(constName)) continue;
      if (!/^[A-Z0-9_]+$/.test(constName)) continue;

      if (!declarations.has(constName)) {
        declarations.set(constName, []);
      }
      declarations.get(constName)!.push({
        file: filePath,
        line: lineIdx + 1,
        valueStr: rawValue,
        isExported,
      });
    }
  }

  const fileContentCache = new Map<string, string>();

  for (const [constName, decls] of declarations.entries()) {
    const uniqueFiles = Array.from(new Set(decls.map(d => d.file)));
    if (uniqueFiles.length <= 1) continue;

    let isCrossImported = false;
    for (let i = 0; i < uniqueFiles.length; i++) {
      for (let j = i + 1; j < uniqueFiles.length; j++) {
        const fileA = uniqueFiles[i]!;
        const fileB = uniqueFiles[j]!;

        let contentA = fileContentCache.get(fileA);
        if (contentA === undefined) {
          contentA = await fs.readFile(fileA, 'utf-8').catch(() => '');
          fileContentCache.set(fileA, contentA);
        }
        let contentB = fileContentCache.get(fileB);
        if (contentB === undefined) {
          contentB = await fs.readFile(fileB, 'utf-8').catch(() => '');
          fileContentCache.set(fileB, contentB);
        }

        const importRegex = new RegExp(`import\\s+[^;]*\\b${constName}\\b`);
        if (importRegex.test(contentA) || importRegex.test(contentB)) {
          isCrossImported = true;
          break;
        }
      }
      if (isCrossImported) break;
    }
    const normalizedValueA = decls[0]!.valueStr.replace(/\s+/g, '');
    const hasIdenticalValues = decls.every(d => d.valueStr.replace(/\s+/g, '') === normalizedValueA);
    const fileList = uniqueFiles.map(f => path.relative(process.cwd(), f)).join(', ');

    if (!isCrossImported) {
      if (hasIdenticalValues) {
        for (const decl of decls) {
          violations.push({
            file: decl.file,
            line: decl.line,
            message: `Constante duplicada '${constName}' con valor idéntico declarada en múltiples módulos (${fileList}). DEBE modularizarse obligatoriamente en src/logic/constants/ para su reutilización.`,
            context: constName,
            severity: 'error',
            fixable: false,
          });
        }
      } else {
        for (const decl of decls) {
          violations.push({
            file: decl.file,
            line: decl.line,
            message: `Constante '${constName}' declarada con valores diferentes en múltiples módulos (${fileList}). Revisa si es un posible bug o si se debe unificar/renombrar según su subdominio.`,
            context: constName,
            severity: 'error',
            fixable: false,
          });
        }
      }
    }
  }

  return violations;
}
