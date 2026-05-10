/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />
/// <reference types="vue" />
 
 interface IteratorConstructor {
   concat<T>(...iterators: (Iterator<T> | IterableIterator<T>)[]): IterableIterator<T>;
 }

declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<object, object, unknown>
  export default component
}

declare module '*.scss' {
  const content: Record<string, string>
  export default content
}


