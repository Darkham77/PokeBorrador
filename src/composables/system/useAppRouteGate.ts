import { computed } from 'vue';
import { useRoute, useRouter } from 'vue-router';

function isDevOrTestPath(path: string): boolean {
  return path.startsWith('/dev/') || path.startsWith('/test-');
}

export function useAppRouteGate() {
  const route = useRoute();
  const router = useRouter();

  const currentPath = computed<string>(() => {
    if (typeof window === 'undefined') return '';
    return router?.currentRoute?.value?.path || route?.path || window.location?.pathname || '';
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
