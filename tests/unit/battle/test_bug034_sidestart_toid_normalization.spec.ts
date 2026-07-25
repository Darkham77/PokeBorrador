import { describe, it, expect } from 'vitest';

describe('Audit Parity - BUG-034: -sidestart/-sideend must use toID() not .replace(/[^a-z0-9]/g, "")', () => {
  it('showdownBridgeField.ts must not use .replace(/[^a-z0-9]/g) for sidestart condition key normalization', async () => {
    const { readFileSync } = await import('node:fs');
    const { resolve } = await import('node:path');

    const bridgePath = resolve(process.cwd(), 'src/logic/battle/showdownBridgeField.ts');
    const content = readFileSync(bridgePath, 'utf-8');

    // Extract the -sidestart case block
    const sidestartSection = content.slice(
      content.indexOf("case '-sidestart'"),
      content.indexOf("case '-sideend'")
    );

    // The forbidden normalization pattern must not appear in the sidestart block
    expect(sidestartSection).not.toMatch(/\.replace\(\/\[.*?\]\/g?/);
    // toID() must be used instead
    expect(sidestartSection).toContain('toID(');
  });
});
