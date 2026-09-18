import type { Router } from 'vue-router';
import { logger } from '@/logic/utils/logger';
import { checkDBCompatibility, checkAppVersionCompatibility, type DBRouter } from '@/logic/db/dbRouter';
import type { useUpdateStore } from '@/stores/update';
import type { useGameStore } from '@/stores/game';
import type { useBattleStore } from '@/stores/battle/battle';
import type { useUIStore } from '@/stores/ui';
import type { useAuthStore } from '@/stores/auth';
import type { useProfileStore } from '@/stores/player/profile';
import type { useSocialStore } from '@/stores/social/social';

export interface ShouldInitSessionParams {
  isInitializing: boolean;
  isStandaloneDev: boolean;
  hasUser: boolean;
  isLogin: boolean;
  isGameReady: boolean;
}

export function shouldInitSession(opts: ShouldInitSessionParams): boolean {
  if (opts.isInitializing || opts.isStandaloneDev) return false;
  return Boolean(opts.hasUser && !opts.isLogin && !opts.isGameReady);
}

export interface RunSessionInitParams {
  gameStore: ReturnType<typeof useGameStore>;
  updateStore: ReturnType<typeof useUpdateStore>;
  battleStore: ReturnType<typeof useBattleStore>;
  router: Router;
  uiStore: ReturnType<typeof useUIStore>;
  authStore: ReturnType<typeof useAuthStore>;
  profileStore: ReturnType<typeof useProfileStore>;
  socialStore: ReturnType<typeof useSocialStore>;
}

export async function runSessionInitialization(params: RunSessionInitParams): Promise<void> {
  const isCompatible = await validateAppAndDbCompatibility(params.gameStore.db as DBRouter, params.updateStore);
  if (!isCompatible) return;

  await params.gameStore.loadGame();
  await restoreActiveCombatOrMap(params.gameStore, params.battleStore, params.router, params.uiStore);
  await reconnectActivePvPSession();

  if (params.authStore.user) {
    params.profileStore.syncProfileFromAuth(params.authStore.user, params.gameStore.state);
  }
  params.socialStore.startPresence();
}

async function validateAppAndDbCompatibility(
  db: DBRouter,
  updateStore: ReturnType<typeof useUpdateStore>
): Promise<boolean> {
  const comp = await checkDBCompatibility(db); // domain-ok: Open dynamic text or non-domain string payload
  if (!comp.compatible) {
    updateStore.notifyDbIncompatible({
      client: String(comp.client || ''),
      server: String(comp.db || ''),
      db: comp.db
    });
    return false;
  }

  const appComp = await checkAppVersionCompatibility(db); // domain-ok: Open dynamic text or non-domain string payload
  if (!appComp.compatible) {
    if (appComp.error === 'OUTDATED_SERVER') {
      updateStore.notifyOutdatedServer({
        client: appComp.client,
        server: appComp.server
      });
      return false;
    }
    if (appComp.error === 'OUTDATED_CLIENT') {
      updateStore.notifyOutdatedClient({
        client: appComp.client,
        server: appComp.server
      });
      return false;
    }
  }

  return true;
}

async function restoreActiveCombatOrMap(
  gameStore: ReturnType<typeof useGameStore>,
  battleStore: ReturnType<typeof useBattleStore>,
  router: Router,
  uiStore: ReturnType<typeof useUIStore>
): Promise<void> {
  const hasIllegalInTeam = (gameStore.state.team || []).some((p) => p && p.isIllegal);
  if (hasIllegalInTeam && gameStore.state.activeBattle) {
    logger.warn('App', 'Se detectaron Pokémon ilegales en el equipo durante la carga. Abortando combate persistente y regresando al mapa.');
    gameStore.state.activeBattle = null;
    uiStore.notify('Combate cancelado: se detectaron Pokémon ilegales en tu equipo. Repáralos en el menú de depuración.', '⚠️');
    router.replace('/game/map');
    return;
  }

  if (gameStore.state.activeBattle) {
    if (gameStore.state.activeBattle.over) {
      logger.info('App', 'Detectado combate persistente finalizado. Limpiando estado...');
      gameStore.state.activeBattle = null;
      await gameStore.save(false);
    } else {
      logger.info('App', 'Detectado combate persistente. Restaurando estado...');
      await battleStore.restoreBattle(gameStore.state.activeBattle);
    }
  }
}

async function reconnectActivePvPSession(): Promise<void> {
  const { getActivePvPSession } = await import('@/logic/pvp/pvpReconnectHelper');
  const activePvPSession = getActivePvPSession();
  if (activePvPSession) {
    const { useLivePvPStore } = await import('@/stores/livePvP');
    const livePvPStore = useLivePvPStore();
    logger.info('App', `Detectada sesión PvP activa (${activePvPSession.matchId}). Intentando reconexión...`);
    livePvPStore.reconnectBattle(activePvPSession);
  }
}

export async function checkClientPwaVersion(
  appVersion: string,
  updateStore: ReturnType<typeof useUpdateStore>
): Promise<void> {
  if (import.meta.env.DEV) return;
  try {
    const verUrl = new URL(`${import.meta.env.BASE_URL}version.json`, window.location.origin);
    verUrl.searchParams.set('t', Temporal.Now.instant().epochMilliseconds.toString());
    // fallow-ignore-next-line security-sink
    const response = await fetch(verUrl, {
      cache: 'no-store'
    });
    if (response.ok) {
      const data = (await response.json()) as { version?: string };
      const serverVersion = data.version || '';
      const clientVersion = appVersion || '';

      if (clientVersion && serverVersion && clientVersion < serverVersion) {
        logger.warn(
          'App',
          `PWA: Client version (${clientVersion}) is older than server version (${serverVersion}). Presentando cartel de actualización manual.`
        );
        updateStore.notifyOutdatedClient({
          client: clientVersion,
          server: serverVersion
        });
      }
    }
  } catch (e) {
    logger.error('App', 'Failed to check PWA version.json', (e as Error).message);
  }
}

function isElementOrParentScrollable(el: HTMLElement | null): boolean {
  let curr: HTMLElement | null = el;
  while (curr && curr !== document.body && curr !== document.documentElement) {
    const style = window.getComputedStyle(curr);
    const overflow = style.overflow + style.overflowY + style.overflowX;
    if (/(auto|scroll)/.test(overflow)) {
      return true;
    }
    curr = curr.parentElement;
  }
  return false;
}

export function handleGlobalBlockEvent(
  e: Event,
  isAnyBlockingModalOpen: boolean,
  isStandaloneDevPage: boolean
): void {
  if (isStandaloneDevPage) return;
  const target = e.target as HTMLElement | null;
  if (!target || typeof target.closest !== 'function') return;

  const isInsideModal = Boolean(target.closest('.base-modal-root, .base-modal-content, .modal-host'));
  if (isInsideModal || isElementOrParentScrollable(target)) {
    e.stopPropagation();
    return;
  }

  if (isAnyBlockingModalOpen) {
    e.preventDefault();
    e.stopImmediatePropagation();
  }
}
