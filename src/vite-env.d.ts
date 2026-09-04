/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
 
 interface IteratorConstructor {
   concat<T>(...iterators: (Iterator<T> | IterableIterator<T>)[]): IterableIterator<T>;
 }

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.scss' {
  const content: Record<string, string> // open-record: Generic key-value data dictionary container
  export default content
}

declare module 'sql.js' {
  export interface SqlJsOptions {
    locateFile?: (file: string) => string;
  }
  const initSqlJs: (options?: SqlJsOptions) => Promise<{
    Database: new (data?: Uint8Array) => {
      run: (sql: string, params?: unknown[]) => void;
      exec: (sql: string, params?: unknown[]) => { columns: string[]; values: unknown[][] }[];
      export: () => Uint8Array;
      prepare: (sql: string) => unknown;
      close?: () => void;
    };
  }>;
  export default initSqlJs;
}



