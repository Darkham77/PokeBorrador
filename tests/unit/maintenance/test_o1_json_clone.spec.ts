import { describe, it, expect } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import {
  scanFileForO1Issues,
  P_JSON_CLONE
} from '../../../scripts/auditors/domain_data/validate_o1_data_structures.ts';

describe('validate_o1_data_structures - o1-json-clone rule', () => {
  it('detects JSON.parse(JSON.stringify(...)) as a strict error', () => {
    const code = `const copy = JSON.parse(JSON.stringify(original));`;
    const issues = scanFileForO1Issues('src/some/file.ts', code);

    const jsonCloneIssues = issues.filter(i => i.ruleId === 'o1-json-clone');
    expect(jsonCloneIssues).toHaveLength(1);
    const firstIssue = jsonCloneIssues[0];
    expect(firstIssue).toBeDefined();
    expect(firstIssue?.isWarning).toBe(false);
    expect(firstIssue?.message).toContain('Anti-pattern');
    expect(firstIssue?.message).toContain('structuredClone');
  });

  it('detects formatting variations with whitespace', () => {
    const code = `const copy = JSON.parse(   JSON.stringify(  state  )  );`;
    const issues = scanFileForO1Issues('src/some/file.ts', code);

    const jsonCloneIssues = issues.filter(i => i.ruleId === 'o1-json-clone');
    expect(jsonCloneIssues).toHaveLength(1);
  });

  it('does NOT flag native structuredClone', () => {
    const code = `const copy = structuredClone(original);`;
    const issues = scanFileForO1Issues('src/some/file.ts', code);

    const jsonCloneIssues = issues.filter(i => i.ruleId === 'o1-json-clone');
    expect(jsonCloneIssues).toHaveLength(0);
  });

  it('does NOT flag valid I/O JSON.parse deserialization', () => {
    const code = `
      const payload = JSON.parse(storageRaw);
      const data = JSON.parse(networkBuffer.toString());
    `;
    const issues = scanFileForO1Issues('src/some/file.ts', code);

    const jsonCloneIssues = issues.filter(i => i.ruleId === 'o1-json-clone');
    expect(jsonCloneIssues).toHaveLength(0);
  });

  it('asserts zero occurrences of JSON.parse(JSON.stringify) remain in src/', () => {
    const srcDir = path.resolve(process.cwd(), 'src');
    const matchedFiles: Array<{ file: string; line: number; text: string }> = [];

    const walk = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          walk(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith('.ts') || entry.name.endsWith('.vue'))) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          const lines = content.split('\n');
          for (let i = 0; i < lines.length; i++) {
            const line = lines[i] ?? '';
            P_JSON_CLONE.lastIndex = 0;
            if (P_JSON_CLONE.test(line)) {
              matchedFiles.push({
                file: path.relative(process.cwd(), fullPath),
                line: i + 1,
                text: line.trim()
              });
            }
          }
        }
      }
    };

    walk(srcDir);
    expect(matchedFiles).toEqual([]);
  });
});
