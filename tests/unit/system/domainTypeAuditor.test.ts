import { describe, it, expect } from 'vitest';
import { detectRepeatedStringUnions } from '@/../scripts/auditors/domain_data/validate_domain_types';

describe('Generic Repeated String Literal Union Auditor', () => {
  it('flags ad-hoc string literal unions repeated across 2 or more locations', () => {
    const files = [
      {
        file: 'src/moduleA.ts',
        content: `export function process(side: 'p1' | 'p2') { return side; }`,
      },
      {
        file: 'src/moduleB.ts',
        content: `const current = target as 'p2' | 'p1';`,
      },
    ];

    const repeated = detectRepeatedStringUnions(files);
    expect(repeated.has('p1|p2')).toBe(true);

    const matches = repeated.get('p1|p2')!;
    expect(matches).toHaveLength(2);
    expect(matches[0]!.file).toBe('src/moduleA.ts');
    expect(matches[1]!.file).toBe('src/moduleB.ts');
  });

  it('normalizes literal order alphabetically so reverse unions match the same signature', () => {
    const files = [
      {
        file: 'src/view.ts',
        content: `const side: 'player' | 'enemy' = 'player';`,
      },
      {
        file: 'src/store.ts',
        content: `const target: 'enemy' | 'player' = 'enemy';`,
      },
    ];

    const repeated = detectRepeatedStringUnions(files);
    expect(repeated.has('enemy|player')).toBe(true);
    expect(repeated.get('enemy|player')).toHaveLength(2);
  });

  it('does NOT flag single-occurrence literal unions as repeated domain violations', () => {
    const files = [
      {
        file: 'src/isolated.ts',
        content: `type OneOffMode = 'alpha' | 'beta';`,
      },
    ];

    const repeated = detectRepeatedStringUnions(files);
    expect(repeated.has('alpha|beta')).toBe(false);
    expect(repeated.size).toBe(0);
  });

  it('ignores lines annotated with // domain-ok: Open dynamic text or non-domain string payload or // no-domain: Non-domain utility collection or data structure escape hatches', () => {
    const files = [
      {
        file: 'src/escapedA.ts',
        content: `const side: 'player' | 'enemy' = 'player'; // domain-ok: Open dynamic text or non-domain string payload`,
      },
      {
        file: 'src/escapedB.ts',
        content: `const side: 'player' | 'enemy' = 'enemy'; // domain-ok: Open dynamic text or non-domain string payload`,
      },
    ];

    const repeated = detectRepeatedStringUnions(files);
    expect(repeated.has('enemy|player')).toBe(false);
  });

  it('ignores comment lines containing literal unions', () => {
    const files = [
      {
        file: 'src/commentedA.ts',
        content: `// Example: side: 'p1' | 'p2'`,
      },
      {
        file: 'src/commentedB.ts',
        content: `/* side: 'p1' | 'p2' */`,
      },
    ];

    const repeated = detectRepeatedStringUnions(files);
    expect(repeated.size).toBe(0);
  });
});
