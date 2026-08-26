import { describe, it, expect } from 'vitest';
import { execSync } from 'node:child_process';
import path from 'node:path';
import {
  stripCodeBlocksAndInlineCode,
  checkMarkdownLinksInContent,
  collectMarkdownFiles,
  auditMarkdownLinks,
} from '../../../scripts/validation/validate_markdown_links.ts';

describe('Markdown & DOX Relative Links Auditor (validate_markdown_links.ts)', () => {
  const rootDir = path.resolve(process.cwd());

  describe('stripCodeBlocksAndInlineCode', () => {
    it('should strip multi-line fenced code blocks', () => {
      const input = `# Title\n\n\`\`\`markdown\n[broken link](./nonexistent_file.md)\n\`\`\`\n\nReal text`;
      const cleaned = stripCodeBlocksAndInlineCode(input);
      expect(cleaned).not.toContain('[broken link](./nonexistent_file.md)');
      expect(cleaned).toContain('# Title');
      expect(cleaned).toContain('Real text');
    });

    it('should strip inline code snippets', () => {
      const input = `Here is an example: \`[example](./fake.md)\` in backticks.`;
      const cleaned = stripCodeBlocksAndInlineCode(input);
      expect(cleaned).not.toContain('[example](./fake.md)');
      expect(cleaned).toContain('Here is an example:');
    });
  });

  describe('checkMarkdownLinksInContent', () => {
    it('should ignore valid relative links and external URLs', () => {
      const sampleContent = `
# Real Doc
- [Package JSON](../../package.json)
- [External Web](https://pokemonshowdown.com)
- [Mail](mailto:dev@pokevicio.com)
- [Agent Chat](conversation://12345)
`;
      const fakeDocPath = path.join(rootDir, 'src/logic/dummy.md');
      const result = checkMarkdownLinksInContent(sampleContent, fakeDocPath, rootDir);

      expect(result.linksChecked).toBe(1); // Only package.json checked
      expect(result.brokenLinks.length).toBe(0);
    });

    it('should catch nonexistent relative target paths', () => {
      const sampleContent = `
# Broken Doc
- [Ghost File](./completely_fake_nonexistent_file_12345.md)
- [Ghost Folder](../another_fake_dir/AGENTS.md)
`;
      const fakeDocPath = path.join(rootDir, 'src/logic/dummy.md');
      const result = checkMarkdownLinksInContent(sampleContent, fakeDocPath, rootDir);

      expect(result.linksChecked).toBe(2);
      expect(result.brokenLinks.length).toBe(2);
      expect(result.brokenLinks[0]!.linkText).toBe('Ghost File');
      expect(result.brokenLinks[0]!.error).toContain('Target path does not exist');
      expect(result.brokenLinks[1]!.linkText).toBe('Ghost Folder');
    });
  });

  describe('collectMarkdownFiles', () => {
    it('should collect markdown files and skip ignored directories', () => {
      const files = collectMarkdownFiles('.agents/skills/project-standards', rootDir);
      expect(files.length).toBeGreaterThan(0);
      expect(files.every(f => f.endsWith('.md'))).toBe(true);
      expect(files.some(f => f.includes('SKILL.md'))).toBe(true);
    });
  });

  describe('Full Codebase Audit', () => {
    it('should verify 100% of all relative markdown links pass across skills and DOX hierarchy', () => {
      const result = auditMarkdownLinks({ rootDir });
      expect(result.filesScanned).toBeGreaterThan(50);
      expect(result.linksChecked).toBeGreaterThan(100);
      if (result.violations.length > 0) {
        console.error('Violations found in unit test:', result.violations);
      }
      expect(result.violations).toEqual([]);
      expect(result.passed).toBe(true);
    });
  });

  describe('CLI Execution', () => {
    it('should run validate_markdown_links.ts successfully with exit code 0', () => {
      const output = execSync(
        'node --permission --experimental-strip-types --allow-fs-read=. scripts/validation/validate_markdown_links.ts --summary',
        {
          cwd: rootDir,
          encoding: 'utf-8',
        }
      );
      expect(output).toContain('MARKDOWN RELATIVE LINKS & DOX AUDITOR');
      expect(output).toContain('Broken link violations:  0');
    });
  });
});
