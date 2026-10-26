import { registerSW } from 'virtual:pwa-register';
import {
  ref,
  computed,
  onMounted,
  onUnmounted,
  type ComputedRef,
  type Ref,
  type WritableComputedRef
} from 'vue';

import { gameBus } from '@/logic/events/gameBus';
import { logger } from '@/logic/utils/logger';
import { useUpdateStore, type UpdateExecutionOptions } from '@/stores/update';

export const PWA_INSTALL_OUTCOMES = ['accepted', 'dismissed'] as const;
export type PwaInstallOutcome = (typeof PWA_INSTALL_OUTCOMES)[number];

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: PwaInstallOutcome;
    platform: string;
  }>;
  prompt(): Promise<void>;
}

// Global Shared Install Prompt State
const installEvent = ref<BeforeInstallPromptEvent | null>(null);
const canInstall = ref(false);
const isInstalled = ref(false);
const localNeedRefresh = ref(false);

const updateServiceWorker = registerSW({
  immediate: true,
  onNeedRefresh() {
    if (typeof globalThis.window !== 'undefined' && globalThis.__E2E__) {
      logger.info('PWA', 'SW Update available but bypassed in E2E session');
      return;
    }
    localNeedRefresh.value = true;
    logger.info('PWA', 'SW Update available');
    gameBus.emit('PWA_NEED_REFRESH');
  },
  onOfflineReady() {
    logger.info('PWA', 'PWA Offline Ready');
  },
  onRegistered(r: ServiceWorkerRegistration | undefined) {
    logger.debug('PWA', 'SW Registered:', r);
  },
  onRegisterError(error: unknown) {
    logger.error('PWA', `SW registration error: ${(error as Error).message}`);
  }
});

export interface UsePWAReturn {
  canInstall: Ref<boolean>;
  isInstalled: Ref<boolean>;
  installApp: () => Promise<boolean>;
  needRefresh: WritableComputedRef<boolean>;
  isUpdating: ComputedRef<boolean>;
  progress: ComputedRef<number>;
  progressText: ComputedRef<string>;
  handleUpdate: (options?: UpdateExecutionOptions) => Promise<void>;
  updateServiceWorker: (reloadPage?: boolean) => Promise<void>;
}

export function usePWA(): UsePWAReturn {
  const updateStore = useUpdateStore();

  const needRefresh = computed({
    get: () => updateStore.isUpdateAvailable || localNeedRefresh.value,
    set: (val: boolean) => {
      localNeedRefresh.value = val;
    }
  });
  const isUpdating = computed(() => updateStore.isUpdating);
  const progress = computed(() => updateStore.progress);
  const progressText = computed(() => updateStore.progressText);

  const handleInstallPrompt = (e: Event): void => {
    const installEv = e as BeforeInstallPromptEvent;
    installEv.preventDefault();
    installEvent.value = installEv;
    canInstall.value = true;
    logger.info('PWA', 'PWA Install Prompt captured');
  };

  const checkInstallState = (): void => {
    if (typeof globalThis.window === 'undefined') return;
    if (
      globalThis.matchMedia('(display-mode: standalone)').matches ||
      globalThis.matchMedia('(display-mode: fullscreen)').matches ||
      (globalThis.navigator as Navigator & { standalone?: boolean }).standalone
    ) {
      isInstalled.value = true;
      canInstall.value = false;
    }
  };

  const installApp = async (): Promise<boolean> => {
    if (!installEvent.value) return false;

    const event = installEvent.value;
    if (event && typeof event.prompt === 'function') {
      await event.prompt();
      const { outcome } = await event.userChoice;
      logger.info('PWA', `User response to the install prompt: ${outcome}`);
      installEvent.value = null;
      canInstall.value = false;
      return outcome === 'accepted';
    }
    return false;
  };

  const handleUpdate = async (options?: UpdateExecutionOptions): Promise<void> => {
    await updateStore.executeCleanUpdate(options);
  };

  const handleNeedRefresh = (): void => {
    localNeedRefresh.value = true;
    updateStore.notifyServiceWorkerUpdate();
  };

  const checkUpdatesOnWakeup = async (): Promise<void> => {
    if (typeof globalThis.window === 'undefined' || !navigator.onLine) return;
    if (document.visibilityState === 'visible' && 'serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.getRegistration();
        if (reg) {
          logger.debug('PWA', 'Checking SW updates on app wakeup/focus');
          await reg.update();
        }
      } catch (e) {
        logger.warn('PWA', 'Wakeup update check error:', e);
      }
    }
  };

  onMounted(() => {
    globalThis.addEventListener('beforeinstallprompt', handleInstallPrompt);
    globalThis.addEventListener('appinstalled', () => {
      isInstalled.value = true;
      canInstall.value = false;
      installEvent.value = null;
      logger.success('PWA', 'PWA installed successfully');
    });
    document.addEventListener('visibilitychange', checkUpdatesOnWakeup);
    globalThis.addEventListener('focus', checkUpdatesOnWakeup);
    gameBus.on('PWA_NEED_REFRESH', handleNeedRefresh);
    checkInstallState();
  });

  onUnmounted(() => {
    globalThis.removeEventListener('beforeinstallprompt', handleInstallPrompt);
    document.removeEventListener('visibilitychange', checkUpdatesOnWakeup);
    globalThis.removeEventListener('focus', checkUpdatesOnWakeup);
    gameBus.off('PWA_NEED_REFRESH', handleNeedRefresh);
  });

  return {
    canInstall,
    isInstalled,
    installApp,
    needRefresh,
    isUpdating,
    progress,
    progressText,
    handleUpdate,
    updateServiceWorker
  };
}
