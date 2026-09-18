/**
 * tests/node/auditors/validate_markdown_lint.test.ts
 *
 * Conformance and error-capture unit tests for MarkdownLintAuditor.
 */

import { describe, it, expect } from 'vitest';
import {
  MarkdownLintAuditor,
  parseMarkdownLintIssues,
  MARKDOWN_LINT_RULES
} from '../../../scripts/auditors/documentation/validate_markdown_lint.ts';

describe('validate_markdown_lint (Markdownlint Style & Hygiene Validator)', () => {
  it('instantiates with correct metadata complying with auditor-framework', () => {
    const auditor = new MarkdownLintAuditor();
    expect(auditor.id).toBe('validate_markdown_lint');
    expect(auditor.name).toBe('Markdownlint Style & Hygiene Validator');
    expect(auditor.family).toBe('documentation');
    expect(auditor.description.length).toBeLessThanOrEqual(60);
    expect(auditor.ruleIds).toEqual(MARKDOWN_LINT_RULES);
    expect(auditor.ruleDescriptions?.['markdownlint-issue']).toBeDefined();
    expect(auditor.ruleDescriptions?.['markdownlint-issue']?.length).toBeLessThanOrEqual(60);
  });

  describe('parseMarkdownLintIssues', () => {
    it('returns empty array when input is empty or has no issues', () => {
      expect(parseMarkdownLintIssues('')).toEqual([]);
      expect(parseMarkdownLintIssues('[]')).toEqual([]);
      expect(parseMarkdownLintIssues([])).toEqual([]);
    });

    it('parses raw JSON string output with multiple rule issues and elevations', () => {
      const sampleJson = JSON.stringify([
        {
          fileName: 'docs/test.md',
          lineNumber: 12,
          ruleNames: ['MD001', 'heading-increment'],
          ruleDescription: 'Heading levels should only increment by one level at a time',
          errorDetail: 'Expected: h2; Actual: h3',
          errorContext: '### Subheader'
        },
        {
          fileName: 'docs/guide.md',
          lineNumber: 45,
          ruleNames: ['MD009', 'no-trailing-spaces'],
          ruleDescription: 'Trailing spaces',
          errorDetail: 'Expected: 0 or 2; Actual: 1',
          errorContext: 'some line '
        }
      ]);

      const findings = parseMarkdownLintIssues(sampleJson, '/repo');
      expect(findings.length).toBe(2);

      const f1 = findings[0]!;
      expect(f1.suiteId).toBe('validate_markdown_lint');
      expect(f1.ruleId).toBe('markdownlint-issue');
      expect(f1.severity).toBe('error');
      expect(f1.file).toBe('docs/test.md');
      expect(f1.line).toBe(12);
      expect(f1.context).toBe('MD001/heading-increment');
      expect(f1.message).toContain('Heading levels should only increment by one level at a time');
      expect(f1.message).toContain('(Expected: h2; Actual: h3)');

      const f2 = findings[1]!;
      expect(f2.file).toBe('docs/guide.md');
      expect(f2.line).toBe(45);
      expect(f2.context).toBe('MD009/no-trailing-spaces');
      expect(f2.message).toContain('Trailing spaces');
      expect(f2.severity).toBe('error');
    });

    it('parses direct object array input correctly', () => {
      const issues = [
        {
          fileName: 'README.md',
          lineNumber: 1,
          ruleNames: ['MD041', 'first-line-heading'],
          ruleDescription: 'First line in file should be a top-level heading'
        }
      ];

      const findings = parseMarkdownLintIssues(issues, '/repo');
      expect(findings.length).toBe(1);
      expect(findings[0]?.file).toBe('README.md');
      expect(findings[0]?.line).toBe(1);
      expect(findings[0]?.context).toBe('MD041/first-line-heading');
      expect(findings[0]?.severity).toBe('error');
    });
  });
});
