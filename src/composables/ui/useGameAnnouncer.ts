import { useLiveAnnouncer } from '@vueuse/core';

export interface UseGameAnnouncerReturn {
  announce: (message: string) => void;
  polite: (message: string) => void;
  assertive: (message: string) => void;
  announceBattleTurn: (message: string, isUrgent?: boolean) => void;
  announceToast: (text: string) => void;
}

/**
 * useGameAnnouncer
 *
 * Screen reader accessibility announcer powered by VueUse 15 (useLiveAnnouncer).
 * Programmatically manages ARIA live regions for battle turns, level-ups, and notifications.
 */
export function useGameAnnouncer(): UseGameAnnouncerReturn {
  const { announce, polite, assertive } = useLiveAnnouncer({ idPrefix: 'pv-live-announcer' });

  function announceBattleTurn(message: string, isUrgent = false): void {
    if (isUrgent) {
      assertive(message);
    } else {
      polite(message);
    }
  }

  function announceToast(text: string): void {
    polite(text);
  }

  return {
    announce,
    polite,
    assertive,
    announceBattleTurn,
    announceToast
  };
}
