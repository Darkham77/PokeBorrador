/**
 * tests/node/auditors/validate_error_suppression.test.ts
 *
 * Unit tests for ErrorSuppressionAuditor.
 */

import { describe, it, expect } from 'vitest';
import { ErrorSuppressionAuditor } from '../../../scripts/auditors/architecture/validate_error_suppression.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('ErrorSuppressionAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new ErrorSuppressionAuditor();
    expect(auditor.id).toBe('validate_error_suppression');
    expect(auditor.family).toBe('architecture');
  });

  it('detects empty catch blocks', () => {
    const auditor = new ErrorSuppressionAuditor();
    const badCode = `
      try {
        doSomething();
      } catch (err) {
        // empty block
      }
    `;

    scan(auditor, 'src/someFile.ts', badCode);
    expect(auditor.getCountsByRule().get('no-empty-catch')!).toBeGreaterThan(0);
  });

  it('allows catch blocks with proper handling or escape hatches', () => {
    const auditor = new ErrorSuppressionAuditor();
    const goodCode = `
      try {
        doSomething();
      } catch (err) {
        console.error('Failed to do something:', err);
        throw err;
      }
    `;

    scan(auditor, 'src/someFile.ts', goodCode);
    expect(auditor.getCountsByRule().get('no-empty-catch') ?? 0).toBe(0);
  });

  it('detects silent promise catches', () => {
    const auditor = new ErrorSuppressionAuditor();
    const badCode = `
      fetchData().catch(() => {});
    `;

    scan(auditor, 'src/someFile.ts', badCode);
    expect(auditor.getCountsByRule().get('no-silent-promise-catch')!).toBeGreaterThan(0);
  });

  it('detects missing instanceof Error narrowing in catch', () => {
    const auditor = new ErrorSuppressionAuditor();
    const badCode = `
      try {
        doSomething();
      } catch (err) {
        console.warn(err.message);
      }
    `;

    scan(auditor, 'src/someFile.ts', badCode);
    expect(auditor.getCountsByRule().get('strict-catch-narrowing')!).toBeGreaterThan(0);
  });
});
