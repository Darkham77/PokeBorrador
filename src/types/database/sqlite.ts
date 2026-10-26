import type { DisplayText } from '@francogp/auditor';

export interface SQLiteResult {
  columns: DisplayText[];
  values: unknown[][];
}

export interface SQLiteDatabase {
  run: (sql: string, params?: unknown[]) => void;
  exec: (sql: string, params?: unknown[]) => SQLiteResult[];
  export: () => Uint8Array;
  prepare: (sql: string) => unknown;
}
