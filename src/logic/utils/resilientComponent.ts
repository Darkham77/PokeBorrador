import { defineAsyncComponent, type AsyncComponentLoader, type Component } from "vue";
import { gsap } from "gsap";
import { gsapSleep } from "@/logic/utils/gsapHelpers.ts";

const RETRY_BACKOFF_BASE_MS = 150;
const MS_PER_SECOND = 1000;

/**
 * Creates a resilient Vue async component that retries loading on network or Vite dev-server hiccups.
 */
export function defineResilientAsyncComponent<T extends Component = Component>(
  loader: AsyncComponentLoader<T>,
  maxRetries = 3
) {
  return defineAsyncComponent({
    loader,
    onError(_error, retry, fail, attempts) {
      if (attempts <= maxRetries) {
        gsap.delayedCall((attempts * RETRY_BACKOFF_BASE_MS) / MS_PER_SECOND, retry);
      } else {
        fail();
      }
    },
  });
}

/**
 * Wraps a dynamic route component import with automatic retries.
 */
export function resilientRouteComponent<T>(loader: () => Promise<T>, maxRetries = 3): () => Promise<T> {
  return async () => {
    let attempts = 0;
    while (true) {
      try {
        return await loader();
      } catch (err) {
        attempts++;
        if (attempts >= maxRetries) {
          throw err;
        }
        await gsapSleep(attempts * RETRY_BACKOFF_BASE_MS);
      }
    }
  };
}
