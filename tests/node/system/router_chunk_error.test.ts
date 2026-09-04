import { describe, it, expect } from 'vitest';

describe('Router Chunk Error Detection', () => {
  it('should identify "Couldn\'t resolve component" as a chunk reload error', () => {
    const isChunkError = (message: string): boolean => {
      const chunkErrorRegex = /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|Loading chunk|Couldn't resolve component/i;
      return chunkErrorRegex.test(message);
    };

    const error1 = 'Couldn\'t resolve component "default" at "/login"';
    const error2 = 'Failed to fetch dynamically imported module: https://example.com/assets/LoginView-123.js';
    const error3 = 'TypeError: Cannot read properties of undefined';

    expect(isChunkError(error1)).toBe(true);
    expect(isChunkError(error2)).toBe(true);
    expect(isChunkError(error3)).toBe(false);
  });
});
