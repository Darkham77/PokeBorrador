/**
 * tests/node/auditors/validate_console_cleanliness.test.ts
 *
 * Unit tests for ConsoleCleanlinessAuditor.
 */

import { describe, it, expect } from 'vitest';
import { ConsoleCleanlinessAuditor } from '../../../scripts/auditors/architecture/validate_console_cleanliness.ts';

interface ScannableAuditor {
  scanFile(relPath: string, content: string): void;
}
const scan = (auditor: unknown, path: string, code: string) =>
  (auditor as ScannableAuditor).scanFile(path, code);

describe('ConsoleCleanlinessAuditor', () => {
  it('instantiates with correct metadata', () => {
    const auditor = new ConsoleCleanlinessAuditor();
    expect(auditor.id).toBe('validate_console_cleanliness');
    expect(auditor.family).toBe('architecture');
  });

  it('detects debugger statements', () => {
    const auditor = new ConsoleCleanlinessAuditor();
    const badCode = `
      function debugMe() {
        debugger;
        return 42;
      }
    `;

    scan(auditor, 'src/someFile.ts', badCode);
    expect(auditor.getCountsByRule().get('no-debugger-statement')!).toBeGreaterThan(0);
  });

  it('detects uncoordinated console.log in src/', () => {
    const auditor = new ConsoleCleanlinessAuditor();
    const badCode = `
      export function testLog() {
        console.log("here I am");
      }
    `;

    scan(auditor, 'src/components/MyComponent.vue', badCode);
    expect(auditor.getCountsByRule().get('no-console-log-in-src')!).toBeGreaterThan(0);
  });

  it('allows console.warn and console.error directly without violation', () => {
    const auditor = new ConsoleCleanlinessAuditor();
    const goodCode = `
      export function reportIssue() {
        console.warn("Recoverable situation detected");
        console.error("Critical boundary error");
      }
    `;

    scan(auditor, 'src/services/myService.ts', goodCode);
    expect(auditor.getCountsByRule().get('no-console-log-in-src') ?? 0).toBe(0);
  });

  it('allows console.log with // console-ok escape hatch', () => {
    const auditor = new ConsoleCleanlinessAuditor();
    const goodCode = `
      export function printAsciiBanner() {
        console.log("=== POKE VICIO ENGINE ==="); // console-ok: intentional startup banner
      }
    `;

    scan(auditor, 'src/services/banner.ts', goodCode);
    expect(auditor.getCountsByRule().get('no-console-log-in-src') ?? 0).toBe(0);
  });
});
