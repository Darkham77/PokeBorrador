export const GAME_UI_EVENTS = {
  BATTLE_ENTERING: 'battle-entering',
  STORE_READY: 'game-store-ready',
} as const;

export type GameUiEventName = typeof GAME_UI_EVENTS[keyof typeof GAME_UI_EVENTS];

export interface BattleEnteringDetail {
  source: 'battle-store';
}

export interface GameStoreReadyDetail {
  ready: boolean;
}
