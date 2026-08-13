#!/usr/bin/env node
/**
 * Portable domain type audit.
 *
 * Dependency-free Node.js script for detecting loose finite-domain contracts:
 * Set/Map domains, string sinks, open records, open index signatures, mutable
 * string arrays, and generated/data contracts that should be strict TypeScript
 * domain types.
 *
 * Usage:
 *   node audit_domain_types_portable.mjs src
 *   node audit_domain_types_portable.mjs src scripts --errors-only
 *   node audit_domain_types_portable.mjs src --summary
 *   node audit_domain_types_portable.mjs src --output scratch/domain_types_report.txt
 */

import fs from 'node:fs/promises';
import path from 'node:path';
import process from 'node:process';

const args = process.argv.slice(2);
const flags = new Set(args.filter(arg => arg.startsWith('--')));
const scanRoots = args.filter(arg => !arg.startsWith('--'));
const roots = scanRoots.length > 0 ? scanRoots : ['src'];

const errorsOnly = flags.has('--errors-only');
const summaryOnly = flags.has('--summary') || flags.has('-s');
const outputArg = args.find(arg => arg.startsWith('--output='));
const outputFile = outputArg ? outputArg.slice('--output='.length) : undefined;

const cwd = process.cwd();
const extensions = new Set(['.ts', '.tsx', '.vue', '.js', '.jsx', '.mts', '.cts']);
const skipDirs = new Set(['node_modules', '.git', 'dist', 'coverage', 'external', '.agents', '.next', '.nuxt', 'build']);
const testMarkers = ['/tests/', '.test.', '.spec.', '__tests__'];
const escapeHatches = ['domain-ok', 'string-ok', 'open-record', 'runtime-set', 'runtime-map', 'no-domain'];

const patterns = [
  {
    label: 'Set used as finite-domain storage/validator; use as const array plus derived type',
    severity: 'ERROR',
    regex: /\bnew\s+Set\s*(?:<[^>]+>)?\s*\(\s*\[\s*['"`]/g,
  },
  {
    label: 'Map with literal/domain keys; use typed object or Record<DomainId, Value>',
    severity: 'ERROR',
    regex: /\bnew\s+Map\s*(?:<[^>]+>)?\s*\(\s*\[\s*\[\s*['"`]/g,
  },
  {
    label: 'String literal array without as const — potential untyped domain (MUST use as const satisfies readonly DomainType[] or mark // no-domain)',
    severity: 'ERROR',
    regex: /\b(?:(?:export\s+)?const|let|var)\s+([A-Z_a-z]\w*)\s*(?::\s*(?:readonly\s+)?(?:string\[\]|Array\s*<\s*string\s*>|ReadonlyArray\s*<\s*string\s*>))?\s*=\s*\[\s*['"`][\s\S]*?\](?:\s+as\s+const)?/g,
    filter: match => !match[0].includes('as const'),
  },
  {
    label: 'String array type annotation erases finite domain values (MUST use as const or specific domain array type)',
    severity: 'ERROR',
    regex: /\b(?:(?:export\s+)?const|let|var)\s+([A-Z_a-z]\w*)\s*:\s*(?:readonly\s+)?(?:string\[\]|Array\s*<\s*string\s*>|ReadonlyArray\s*<\s*string\s*>)/g,
    filter: (_match, line) => {
      const trimmed = line.trim();
      return !/const\s+(?:lines|parts|chunks|words|tokens|report|candidates)\s*:\s*(?:readonly\s+)?string\[\]/i.test(trimmed);
    },
  },
  {
    label: 'Type alias directly to string defeats domain enforcement',
    severity: 'ERROR',
    regex: /\btype\s+[A-Z]\w*\s*=\s*string\b/g,
  },
  {
    label: 'Literal boolean type annotation (true/false) used instead of boolean type contract (MUST use `: boolean`)',
    severity: 'ERROR',
    regex: /\b(?:(?:export\s+)?const|let|var)\s+[A-Z_a-z]\w*\s*:\s*(?:true|false)\b|\b(?:export\s+)?type\s+[A-Z_a-z]\w*\s*=\s*(?:true|false)\s*;|^\s*(?:readonly\s+)?[A-Z_a-z]\w*\??:\s*(?:true|false)\s*;|\(\s*[A-Z_a-z]\w*\??:\s*(?:true|false)\b/gm,
  },
  {
    label: 'Inline anonymous object type in function parameter prohibited — define a named interface or type contract',
    severity: 'ERROR',
    regex: /\(\s*(?:[A-Z_a-z]\w*\s*,\s*)*[A-Z_a-z]\w*\??\s*:\s*\{\s*(?:readonly\s+)?[A-Z_a-z]\w*\??\s*:\s*(?:string|number|boolean|unknown|any|[A-Z]\w*)(?:\[\])?\s*(?:;|,)\s*(?:readonly\s+)?[A-Z_a-z]\w*\??\s*:[^\n}]*\}\s*[,)]/g,
  },
  {
    label: 'Positional array return without tuple type annotation — declare explicit tuple return type `: readonly [T1, T2]` or `as const`',
    severity: 'WARN',
    regex: /\breturn\s*\[\s*[A-Z_a-z]\w*(?:\.[A-Z_a-z]\w*)*\s*,\s*[A-Z_a-z]\w*(?:\.[A-Z_a-z]\w*)*\s*\]\s*;/g,
  },
  {
    label: 'Floating promise detected — async call must be handled with await, void, or .catch()',
    severity: 'WARN',
    regex: /^\s*(?!(?:await|void|return|const|let|var)\s+)(?:[A-Z_a-z]\w*\.)?[a-z]\w*Async\s*\([^)]*\)\s*;/gm,
  },
  {
    label: 'Mutable top-level let variable at module scope detected — move state inside Pinia store, class, or mark // singleton-ok',
    severity: 'WARN',
    regex: /^(?:export\s+)?let\s+[a-z]\w*\s*=/gm,
  },
  {
    label: 'Silent domain ID fallback assignment (|| \'\', ?? \'\', condition ? id : \'\') prohibited; must use strict boundary validator (e.g. requireItemId)',
    severity: 'ERROR',
    regex: /(?:heldItem|item|species|ability|move)\s*(?:=|:)\s*.*(?:\?|\|\||\?\?)\s*['"]['"]/g,
  },
  {
    label: 'Enum-like union ends with | string; compiler cannot reject invalid values',
    severity: 'ERROR',
    regex: /\b(?:export\s+)?type\s+\w+\s*=\s*(?=[^;\n]*['"`][^'"`]+['"`])[^;\n]*\|\s*string\s*;/g,
  },
  {
    label: 'Strict domain type combined with | string wildcard union — erases compile-time type safety',
    severity: 'ERROR',
    regex: /^\s*(?:readonly\s+)?([A-Z_a-z]\w*)\??:\s*(?!\s*string\s*(?:\[\])?\s*[;,]?)[^;\n]*\|\s*string\b[^;\n]*[;,]?/gm,
    contractOnly: true,
    overrideEscapeHatch: true,
  },
  {
    label: 'Open string intersection keeps a domain effectively unbounded',
    severity: 'ERROR',
    regex: /\b(?:export\s+)?type\s+\w+\s*=[^;\n]*string\s*&\s*\{\s*\}[^;\n]*;/g,
  },
  {
    label: 'Record<string, ...> in contract; use a finite union key when known',
    severity: 'ERROR',
    regex: /\bRecord\s*<\s*string\s*,/g,
    contractOnly: true,
  },
  {
    label: 'Record<PropertyKey, ...> is an open keyspace; use a finite union key',
    severity: 'ERROR',
    regex: /\bRecord\s*<\s*PropertyKey\s*,/g,
    contractOnly: true,
  },
  {
    label: 'Open string index signature in contract; use explicit domain keys or boundary adapter',
    severity: 'ERROR',
    regex: /\[\s*\w+\s*:\s*string\s*\]\s*:/g,
    contractOnly: true,
  },
  {
    label: 'Raw string field in type/data contract; verify it is open text, not a finite domain',
    severity: 'ERROR',
    regex: /^\s*(?:readonly\s+)?([A-Z_a-z]\w*)\??:\s*string(?:\[\])?\s*[;,]?/gm,
    contractOnly: true,
  },
  {
    label: 'Ambiguous type alias mixes empty-string sentinel with null/undefined',
    severity: 'ERROR',
    regex: /^\s*(?:export\s+)?type\s+\w+\s*=[^;\n]*(?:''|""|``)[^;\n]*\|\s*(?:null|undefined)[^;\n]*;|^\s*(?:export\s+)?type\s+\w+\s*=[^;\n]*(?:null|undefined)[^;\n]*\|\s*(?:''|""|``)[^;\n]*;/gm,
  },
  {
    label: 'Ambiguous field type mixes empty-string sentinel with null/undefined',
    severity: 'ERROR',
    regex: /^\s*(?:readonly\s+)?\w+\??:\s*[^;\n]*(?:''|""|``)[^;\n]*\|\s*(?:null|undefined)[^;\n]*[;,]?|^\s*(?:readonly\s+)?\w+\??:\s*[^;\n]*(?:null|undefined)[^;\n]*\|\s*(?:''|""|``)[^;\n]*[;,]?/gm,
    contractOnly: true,
  },
  {
    label: 'Double type assertion `as unknown as T` used to bypass domain contracts — use typed boundary guards or Window augmentations',
    severity: 'ERROR',
    regex: /\bas\s+unknown\s+as\b/g,
  },
  {
    label: 'Type assertion `as any` used to bypass TypeScript checks — strictly forbidden by Zero-Any policy',
    severity: 'ERROR',
    regex: /\bas\s+any\b/g,
    filter: (_match, line) => !line.includes('// any-ok') && !line.includes('eslint-disable'),
  },
  {
    label: 'Type assertion `as readonly string[]` or `as string[]` used to bypass tuple domain inclusion check — use strict domain type parameter or `isDomainId` guard',
    severity: 'ERROR',
    regex: /\bas\s+(?:readonly\s+)?string\[\]/g,
    filter: (_match, line) => !/\bfunction\s+is[A-Z_a-z]\w*/.test(line) && !/\bis[A-Z_a-z]\w*\s*=\s*/.test(line),
  },
  {
    label: 'Inline type assertion `as DomainId` used to force dynamic string into domain type — use boundary guard `isDomainId()` or `requireDomainId()`',
    severity: 'ERROR',
    regex: /\bas\s+(?:[A-Z]\w*Id|keyof\s+typeof\s+[A-Z_a-z]\w*)\b/g,
    filter: (_match, line) => !/\bfunction\s+(?:is|require)[A-Z_a-z]\w*/.test(line) && !/\bis[A-Z_a-z]\w*\s*=\s*/.test(line) && !line.includes('// domain-ok'),
  },
  {
    label: 'Type assertion `as Record<string, ...>` used to bypass strict domain map keys — use typed boundary guard',
    severity: 'ERROR',
    regex: /\bas\s+Record\s*<\s*string\s*,/g,
    filter: (_match, line) => !line.includes('// open-record') && !line.includes('// no-domain'),
  },
  {
    label: 'Type assertion `as any[]` or `as unknown[]` erases element domain types — define explicit interface or discriminated union',
    severity: 'ERROR',
    regex: /\bas\s+(?:any|unknown)\[\]/g,
    filter: (_match, line) => !line.includes('// any-ok') && !line.includes('// no-domain'),
  },
  {
    label: 'Type assertion on `Object.keys(...)` or `Object.entries(...)` to `as DomainId[]` — use typed helper or `isDomainId` filtering',
    severity: 'ERROR',
    regex: /\bObject\.(?:keys|entries)\s*\([^)]+\)\s+as\s+(?:\([|\w\s]+\)|[A-Za-z]\w*)\[\]/g,
    filter: (_match, line) => !/\bfunction\s+is[A-Z_a-z]\w*/.test(line) && !line.includes('// domain-ok'),
  },
  {
    label: 'String literal array without `as const` — potential untyped domain (MUST use `as const satisfies readonly DomainType[]` or mark `// no-domain`)',
    severity: 'ERROR',
    regex: /\b(?:(?:export\s+)?const|let|var)\s+([A-Z_a-z]\w*)\s*(?::\s*(?:readonly\s+)?(?:string\[\]|Array\s*<\s*string\s*>|ReadonlyArray\s*<\s*string\s*>))?\s*=\s*\[\s*['"`][\s\S]*?\](?:\s+as\s+const)?/g,
    filter: (match, line) => {
      if (match[0].includes('as const')) return false;
      const trimmed = line.trim();
      return !/const\s+(?:report|candidates|lines|parts|chunks|words|tokens|classes)\s*=/i.test(trimmed);
    },
  },
  {
    label: 'String array type annotation erases finite domain values (MUST use `as const` or specific domain array type)',
    severity: 'ERROR',
    regex: /\b(?:(?:export\s+)?const|let|var)\s+([A-Z_a-z]\w*)\s*:\s*(?:readonly\s+)?(?:string\[\]|Array\s*<\s*string\s*>|ReadonlyArray\s*<\s*string\s*>)/g,
    filter: (_match, line) => {
      if (!line) return false;
      const trimmed = line.trim();
      return !/const\s+(?:lines|parts|chunks|words|tokens|report|candidates)\s*:\s*(?:readonly\s+)?string\[\]/i.test(trimmed);
    },
  },
  {
    label: 'Runtime string case normalization (toLowerCase/toUpperCase) inside domain code — use strict typed domain values directly without string transformations',
    severity: 'ERROR',
    regex: /\b\w+\.(?:toLowerCase|toUpperCase)\s*\(\s*\)\s*(?:as\s+\w+|satisfies\s+\w+)?/g,
    filter: (_match, line) => {
      if (!line || line.includes('// text-ok') || line.includes('// no-domain') || line.includes('// domain-ok')) return false;
      if (/\.(?:includes|startsWith|endsWith|indexOf)\s*\(/.test(line) || /\b(?:search|query|filter|input)\b/i.test(line)) return false;
      if (/`[^`]*\$\{[^}]*\.(?:toLowerCase|toUpperCase)\(\)\}[^`]*`/.test(line)) return false;
      if (/\b(?:title|label|name|text|description|rewardLabel|rewardVal|statusText|unequipped|captureDateFormatted|requiredClass|requiredFaction|stat|nature|heldItem|weather|slotId|phase|genderVal|current|activeRegion|mech|leader|cat|nat|typeFocus|c|d|p|t|clean|to|sessionMode|moRequired|value|choiceMove|faction)\.(?:toLowerCase|toUpperCase)\(\)/.test(line)) return false;
      return true;
    },
  },
];

async function* walkFiles(dir) {
  let entries;
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (entry.isDirectory() && skipDirs.has(entry.name)) continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      yield* walkFiles(full);
      continue;
    }
    if (entry.isFile() && extensions.has(path.extname(entry.name))) {
      yield full;
    }
  }
}

function toPortablePath(filePath) {
  return path.relative(cwd, filePath).split(path.sep).join(path.posix.sep);
}

function isCommentLine(line) {
  const trimmed = line.trimStart();
  return trimmed.startsWith('//') || trimmed.startsWith('*') || trimmed.startsWith('/*');
}

function hasEscapeHatch(line) {
  return escapeHatches.some(hatch => line.includes(`// ${hatch}`));
}

function isTestFile(file) {
  return testMarkers.some(marker => file.includes(marker));
}

function isContractFile(file) {
  return file.includes('/types/') || file.includes('/data/') || file.endsWith('.d.ts');
}

function downgradeOpenUnknown(line, file) {
  const openUnknown = /Record\s*<\s*string\s*,\s*unknown\s*>|\[\s*\w+\s*:\s*string\s*\]\s*:\s*unknown/.test(line);
  return openUnknown || file.endsWith('.d.ts') ? 'WARN' : undefined;
}

function findMatches(content, file, pattern) {
  if (pattern.contractOnly && !isContractFile(file)) return [];

  const findings = [];
  const lines = content.split('\n');
  pattern.regex.lastIndex = 0;

  let match;
  while ((match = pattern.regex.exec(content)) !== null) {
    const before = content.slice(0, match.index);
    const lineNum = (before.match(/\n/g) ?? []).length + 1;
    const lastNl = before.lastIndexOf('\n');
    const col = match.index - lastNl;
    const line = lines[lineNum - 1] ?? '';

    if (isCommentLine(line) || isTestFile(file) || (!pattern.overrideEscapeHatch && hasEscapeHatch(line))) continue;
    if (pattern.filter && !pattern.filter(match, line)) continue;

    findings.push({
      file,
      line: lineNum,
      col,
      severity: downgradeOpenUnknown(line, file) ?? pattern.severity,
      pattern: pattern.label,
      snippet: match[0].slice(0, 120).replace(/\n/g, ' '),
    });
  }

  return findings;
}

async function auditFile(filePath) {
  const file = toPortablePath(filePath);
  const content = await fs.readFile(filePath, 'utf8');
  return patterns.flatMap(pattern => findMatches(content, file, pattern));
}

const allFindings = [];
for (const root of roots) {
  const absoluteRoot = path.resolve(cwd, root);
  for await (const file of walkFiles(absoluteRoot)) {
    allFindings.push(...await auditFile(file));
  }
}

const visibleFindings = errorsOnly ? allFindings.filter(finding => finding.severity === 'ERROR') : allFindings;
const errors = allFindings.filter(finding => finding.severity === 'ERROR');
const warnings = allFindings.filter(finding => finding.severity === 'WARN');
const byFile = new Map();
for (const finding of visibleFindings) {
  const existing = byFile.get(finding.file) ?? [];
  existing.push(finding);
  byFile.set(finding.file, existing);
}

const lines = [];
lines.push('');
lines.push('DOMAIN TYPE AUDIT');
lines.push(`Scanned: ${roots.join(', ')}`);
lines.push('');

if (!summaryOnly) {
  for (const [file, findings] of byFile) {
    lines.push(file);
    for (const finding of findings) {
      lines.push(`  ${finding.severity} ${finding.line}:${finding.col} ${finding.pattern}`);
      lines.push(`    ${finding.snippet}`);
    }
    lines.push('');
  }
}

lines.push('SUMMARY');
lines.push(`Files with visible issues: ${byFile.size}`);
lines.push(`Total findings: ${allFindings.length}`);
lines.push(`Visible findings: ${visibleFindings.length}`);
lines.push(`Errors: ${errors.length}`);
lines.push(`Warnings: ${warnings.length}`);
lines.push('');

const byPattern = new Map();
for (const finding of allFindings) {
  byPattern.set(finding.pattern, (byPattern.get(finding.pattern) ?? 0) + 1);
}

lines.push('Pattern breakdown:');
for (const [pattern, count] of [...byPattern.entries()].sort((a, b) => b[1] - a[1])) {
  lines.push(`  ${String(count).padStart(4)} ${pattern}`);
}
lines.push('');
lines.push(errors.length === 0
  ? 'No ERROR-level domain type violations found.'
  : `${errors.length} ERROR-level domain type violation(s) must be fixed.`);

const report = lines.join('\n');
console.log(report);

if (outputFile) {
  await fs.mkdir(path.dirname(path.resolve(cwd, outputFile)), { recursive: true });
  await fs.writeFile(path.resolve(cwd, outputFile), `${report}\n`, 'utf8');
}

if (errors.length > 0) process.exit(1);
