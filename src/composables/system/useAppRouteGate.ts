import { computed, type ComputedRef } from 'vue';
import { useRoute, useRouter } from 'vue-router';

function isDevOrTestPath(path: string): boolean {
  return path.startsWith('/dev/') || path.startsWith('/test-');
}

export interface UseAppRouteGateReturn {
  readonly currentPath: ComputedRef<string>;
  readonly isLoginPage: ComputedRef<boolean>;
  readonly isAdventureTestPage: ComputedRef<boolean>;
  readonly isDevShadowEditorPage: ComputedRef<boolean>;
  readonly isStandaloneDevPage: ComputedRef<boolean>;
}

export function useAppRouteGate(): UseAppRouteGateReturn {
  const route = useRoute();
  const router = useRouter();

  const currentPath = computed<string>(() => {
    if (typeof globalThis.window === 'undefined') return '';
    return router?.currentRoute?.value?.path || route?.path || globalThis.location?.pathname || '';
  });

  const isLoginPage = computed<boolean>(() => {
    return currentPath.value === '/login';
  });

  const isAdventureTestPage = computed<boolean>(() => {
    return currentPath.value === '/test-aventura';
  });

  const isDevShadowEditorPage = computed<boolean>(() => {
    return currentPath.value.startsWith('/dev/shadow-editor');
  });

  const isStandaloneDevPage = computed<boolean>(() => {
    const path = currentPath.value;
    return isAdventureTestPage.value || isDevShadowEditorPage.value || isDevOrTestPath(path);
  });

  return {
    currentPath,
    isLoginPage,
    isAdventureTestPage,
    isDevShadowEditorPage,
    isStandaloneDevPage
  };
}
