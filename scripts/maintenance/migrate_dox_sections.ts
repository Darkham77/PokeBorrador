/**
 * scripts/maintenance/migrate_dox_sections.ts
 *
 * Canonical DOX Hierarchy & Section Migration Script.
 * Migrates all repository AGENTS.md files to the 6 canonical sections enforced by Rule 60:
 *   # Purpose
 *   ## Ownership
 *   ## Local Contracts
 *   [## Key Files]
 *   ## Work Guidance
 *   ## Verification
 *   ## Child DOX Index
 */

import fs from 'node:fs';
import path from 'node:path';

const PROJECT_ROOT = process.cwd();

const IGNORED_DIRS = new Set([
  'node_modules',
  'external',
  'backup_legacy_code',
  'test aventura',
  'supabase/docker',
  '.tsbuildinfo',
  '.git',
  'dist',
  'scratch'
]);

const CODE_EXTENSIONS = new Set(['.ts', '.vue', '.js', '.cjs', '.mjs', '.jsx', '.tsx', '.scss', '.css']);

function isTestFile(fileName: string): boolean {
  return fileName.includes('.spec.') || fileName.includes('.test.') || fileName.includes('.simulation.');
}

function collectAgentsFiles(dir: string, list: string[] = []): string[] {
  const dirName = path.basename(dir);
  if (IGNORED_DIRS.has(dirName) || (dirName.startsWith('.') && dirName !== '.')) {
    return list;
  }

  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return list;
  }

  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectAgentsFiles(fullPath, list);
    } else if (entry.isFile() && entry.name === 'AGENTS.md') {
      list.push(fullPath);
    }
  }

  return list;
}

function findDirectChildAgents(dir: string, _allAgents: readonly string[]): string[] {
  const childPaths: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    if (IGNORED_DIRS.has(entry.name) || entry.name.startsWith('.')) continue;

    const childDir = path.join(dir, entry.name);
    const childAgents = path.join(childDir, 'AGENTS.md');
    if (fs.existsSync(childAgents)) {
      const rel = path.relative(dir, childAgents).split(path.sep).join(path.posix.sep);
      childPaths.push(rel.startsWith('.') ? rel : `./${rel}`);
    }
  }

  return childPaths;
}

function listCodeFilesInDir(dir: string): string[] {
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return [];
  }

  const codeFiles: string[] = [];
  for (const entry of entries) {
    if (!entry.isFile()) continue;
    if (entry.name === 'AGENTS.md' || entry.name.endsWith('.d.ts') || entry.name.endsWith('.map')) continue;
    if (isTestFile(entry.name)) continue;

    const ext = path.extname(entry.name).toLowerCase();
    if (CODE_EXTENSIONS.has(ext)) {
      codeFiles.push(entry.name);
    }
  }

  return codeFiles.sort();
}

interface ParsedRawSection {
  level: number;
  title: string;
  normalizedTitle: string;
  lines: string[];
}

function parseSections(content: string): ParsedRawSection[] {
  const lines = content.split('\n');
  const sections: ParsedRawSection[] = [];
  let currentSection: ParsedRawSection | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]!;
    const match = /^(#{1,2})\s+(\S.*)$/.exec(line);

    if (match) {
      if (currentSection) {
        sections.push(currentSection);
      }
      const level = match[1]!.length;
      const title = match[2]!.trim();
      currentSection = {
        level,
        title,
        normalizedTitle: title.toLowerCase(),
        lines: []
      };
    } else {
      if (currentSection) {
        currentSection.lines.push(line);
      } else {
        if (line.trim()) {
          // Lines before first header - create a default purpose
          currentSection = {
            level: 1,
            title: 'Purpose',
            normalizedTitle: 'purpose',
            lines: [line]
          };
        }
      }
    }
  }

  if (currentSection) {
    sections.push(currentSection);
  }

  return sections;
}

function cleanBody(lines: readonly string[]): string {
  return lines.join('\n').trim();
}

interface DoxData {
  purposeText: string;
  ownershipText: string;
  contractChunks: string[];
  keyFilesText: string;
  guidanceChunks: string[];
  verificationText: string;
  childIndexText: string;
}

function assignCanonicalSection(s: ParsedSection, body: string, data: DoxData): boolean {
  const norm = s.normalizedTitle;
  if (norm === 'purpose' || norm.startsWith('purpose &') || norm.startsWith('purpose:')) {
    data.purposeText = body || data.purposeText;
    return true;
  }
  if (norm === 'ownership') {
    data.ownershipText = body;
    return true;
  }
  if (norm === 'local contracts') {
    if (body) data.contractChunks.push(body);
    return true;
  }
  if (norm === 'key files' || norm === 'directory structure & files' || norm.startsWith('key files &')) {
    data.keyFilesText = body;
    return true;
  }
  if (norm === 'work guidance' || norm === 'guidelines & work instructions') {
    if (body) data.guidanceChunks.push(body);
    return true;
  }
  if (norm === 'verification') {
    data.verificationText = body;
    return true;
  }
  if (norm === 'child dox index' || norm === 'dox directory navigation index' || norm === 'child index') {
    data.childIndexText = body;
    return true;
  }
  return false;
}

function classifySections(sections: readonly ParsedSection[]): DoxData {
  const data: DoxData = {
    purposeText: '',
    ownershipText: '',
    contractChunks: [],
    keyFilesText: '',
    guidanceChunks: [],
    verificationText: '',
    childIndexText: ''
  };

  for (const s of sections) {
    const body = cleanBody(s.lines);
    const wasCanonical = assignCanonicalSection(s, body, data);
    if (!wasCanonical) {
      classifyNonCanonicalSection(s, body, data);
    }
  }

  return data;
}

function classifyNonCanonicalSection(s: ParsedSection, body: string, data: DoxData): void {
  const norm = s.normalizedTitle;
  const chunk = `### ${s.title}\n\n${body}`.trim();
  if (norm.includes('contract') || norm.includes('mandate') || norm.includes('invariant') || norm.includes('rule') || norm.includes('architecture') || norm.includes('governance')) {
    data.contractChunks.push(chunk);
  } else if (norm.includes('guid') || norm.includes('workflow') || norm.includes('instruction') || norm.includes('convention')) {
    data.guidanceChunks.push(chunk);
  } else if (!data.purposeText && s.level === 1) {
    data.purposeText = body;
  } else {
    data.contractChunks.push(chunk);
  }
}

function applySectionFallbacks(data: DoxData, dir: string): void {
  const dirName = path.basename(dir);
  if (!data.purposeText || data.purposeText.length < 10) {
    data.purposeText = `Domain boundary and module implementation for ${dirName}. Defines architectural responsibilities and subsystem logic.`;
  }
  if (!data.ownershipText || data.ownershipText.length < 5) {
    data.ownershipText = 'Poké Vicio Development Team.';
  }
  if (data.contractChunks.length === 0) {
    data.contractChunks.push('- Follow repository architecture, clean code standards, and strict domain typing.\n- Ensure strict module decoupling and zero side-effects.');
  }
  if (data.guidanceChunks.length === 0) {
    data.guidanceChunks.push('- Adhere to domain-type-first contracts without loose any/unknown or naked strings.\n- Maintain high cohesion, low complexity, and test coverage across all module modifications.');
  }
  if (!data.verificationText || data.verificationText.length < 10) {
    data.verificationText = '- Run fast lint suite: `npm run lint`\n- Run automated tests: `npm run test`';
  }
}

function resolveKeyFiles(dir: string, existing: string): string {
  const codeFiles = listCodeFilesInDir(dir);
  if (codeFiles.length === 0) return existing;
  const missingFiles = codeFiles.filter(cf => !existing.includes(cf));
  if (missingFiles.length === 0) return existing;
  const extraList = missingFiles.map(cf => `- [\`${cf}\`](./${cf}): Module implementation.`).join('\n');
  return existing ? `${existing}\n${extraList}` : extraList;
}

function resolveChildIndex(dir: string, existing: string, allAgents: readonly string[]): string {
  const directChildren = findDirectChildAgents(dir, allAgents);
  if (directChildren.length === 0) {
    return `- *This directory contains specialized domain logic and files with no subdirectories.*`;
  }
  const links = directChildren.map(c => `- [\`${c}\`](${c}): Subsystem index for ${path.dirname(c).replace(/^\.\//, '')}.`);
  if (!existing || !existing.includes('AGENTS.md')) {
    return links.join('\n');
  }
  let result = existing;
  for (const c of directChildren) {
    if (!result.includes(c)) {
      result += `\n- [\`${c}\`](${c}): Subsystem index for ${path.dirname(c)}.`;
    }
  }
  return result;
}

function composeCanonicalDox(data: DoxData): string {
  let doc = `# Purpose\n\n${data.purposeText}\n\n## Ownership\n\n${data.ownershipText}\n\n## Local Contracts\n\n${data.contractChunks.join('\n\n')}\n\n`;
  if (data.keyFilesText.trim()) {
    doc += `## Key Files\n\n${data.keyFilesText.trim()}\n\n`;
  }
  doc += `## Work Guidance\n\n${data.guidanceChunks.join('\n\n')}\n\n## Verification\n\n${data.verificationText}\n\n## Child DOX Index\n\n${data.childIndexText}\n`;
  return doc;
}

function migrateAgentsFile(filePath: string, allAgents: readonly string[]): boolean {
  const relPath = path.relative(PROJECT_ROOT, filePath).split(path.sep).join(path.posix.sep);
  if (relPath === 'AGENTS.md') return false;

  const dir = path.dirname(filePath);
  const rawContent = fs.readFileSync(filePath, 'utf-8');
  const sections = parseSections(rawContent);

  const data = classifySections(sections);
  applySectionFallbacks(data, dir);
  data.keyFilesText = resolveKeyFiles(dir, data.keyFilesText);
  data.childIndexText = resolveChildIndex(dir, data.childIndexText, allAgents);

  const doc = composeCanonicalDox(data);
  if (doc !== rawContent) {
    fs.writeFileSync(filePath, doc, 'utf-8');
    return true;
  }
  return false;
}

function main(): void {
  const allAgents = collectAgentsFiles(PROJECT_ROOT);
  let updatedCount = 0;

  for (const file of allAgents) {
    if (migrateAgentsFile(file, allAgents)) {
      updatedCount++;
    }
  }

  console.log(`DOX migration complete. Total AGENTS.md files: ${allAgents.length}. Updated: ${updatedCount}.`);
}

main();
