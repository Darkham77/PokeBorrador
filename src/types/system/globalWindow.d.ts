/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

/**
 * src/types/system/globalWindow.d.ts
 *
 * Ambient type declarations for browser Window and globalThis extensions.
 * Provides explicit typing for global debuggers, E2E flags, and testing hooks,
 * eliminating unsafe double-casting (as unknown as ...).
 */

declare global {
  interface ViteDebugObject {
    mockEnemyChoices?: string[];
    p2ChoiceIdx?: number;
    enemyChoiceIndex?: number;
  }

  // eslint-disable-next-line no-var
  var __VITE_DEBUG__: ViteDebugObject | undefined;
  // eslint-disable-next-line no-var
  var __E2E__: boolean | undefined;
  // eslint-disable-next-line no-var
  var location: Location | undefined;

  interface Window {
    __VITE_DEBUG__?: ViteDebugObject;
    Pinia?: import('pinia').Pinia;
    gsap?: typeof import('gsap').gsap;
    __E2E__?: boolean;
    __DEBUG__?: boolean;
    __BATTLE_DEBUG__?: unknown;
    __ORCHESTRATOR_WORKER__?: unknown;
    __SHOWDOWN_WEATHER__?: unknown;
    __SHOWDOWN_WORKER__?: unknown;
    __DB_TIME__?: unknown;
    __POKE_MAP__?: unknown;
    pwa_app_mounted?: boolean;
  }
}

export {};
