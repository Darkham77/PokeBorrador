import { describe, it, expect } from 'vitest';

describe('Audit Parity - BUG-039: detailschange/replace must not use dynamic import() in hot event path', () => {
  it('pokemonDataProvider should be statically importable and should not be lazily loaded per-event', async () => {
    // Verify that the bridge file itself does not contain a dynamic import() call
    // inside detailschange handling. We do this by reading the source file text.
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');

    const bridgePath = resolve(
      process.cwd(),
      'src/logic/battle/showdownBridgeMisc.ts'
    );
    const content = readFileSync(bridgePath, 'utf-8');

    // Detect dynamic import inside the detailschange/replace case block
    // The bug is present if there's an import() call inside detailschange handling
    const detailschangeSection = content.slice(
      content.indexOf("case 'detailschange'"),
      content.indexOf("case 'switch'")
    );

    expect(detailschangeSection).not.toContain('import(');
  });
});
