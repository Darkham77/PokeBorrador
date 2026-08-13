import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { isOPFSSupported, saveToOPFS, loadFromOPFS } from '@/logic/db/opfsHelper';

describe('OPFS Persistence Helper', () => {
  const originalNavigator = globalThis.navigator;

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    Object.defineProperty(globalThis, 'navigator', {
      value: originalNavigator,
      writable: true,
      configurable: true,
    });
  });

  it('detects OPFS support when navigator.storage.getDirectory is available', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {
        storage: {
          getDirectory: vi.fn(),
        },
      },
      writable: true,
      configurable: true,
    });

    expect(isOPFSSupported()).toBe(true);
  });

  it('returns false for isOPFSSupported when storage API is missing', () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    expect(isOPFSSupported()).toBe(false);
  });

  it('gracefully handles saveToOPFS when OPFS is unsupported', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    const data = new Uint8Array([1, 2, 3]);
    const success = await saveToOPFS('test_db', data);
    expect(success).toBe(false);
  });

  it('gracefully handles loadFromOPFS when file is missing', async () => {
    Object.defineProperty(globalThis, 'navigator', {
      value: {},
      writable: true,
      configurable: true,
    });

    const result = await loadFromOPFS('non_existent_file');
    expect(result).toBeNull();
  });
});
