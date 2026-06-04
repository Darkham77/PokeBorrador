/**
 * tests/helpers/debugSetup.ts
 * 
 * Centralized testing helper to mock localStorage in test environments
 * where window/global localStorage is missing.
 */

export function mockLocalStorage() {
  if (typeof localStorage === 'undefined') {
    const store: Record<string, string> = {};
    const mockLS = {
      getItem: (key: string): string | null => store[key] || null,
      setItem: (key: string, value: string): void => { store[key] = value.toString(); },
      clear: (): void => { for (const key in store) delete store[key]; },
      removeItem: (key: string): void => { delete store[key]; },
      length: 0,
      key: (_index: number): string | null => null
    };
    Object.defineProperty(global, 'localStorage', {
      value: mockLS,
      writable: true,
      configurable: true
    });
  }
}
