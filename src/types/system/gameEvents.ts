export const GAME_UI_EVENTS = {
  BATTLE_ENTERING: 'battle-entering',
  STORE_READY: 'game-store-ready',
  STARTER_SELECT_READY: 'starter-select-ready',
} as const;

export type GameUiEventName = typeof GAME_UI_EVENTS[keyof typeof GAME_UI_EVENTS];

export interface StarterSelectReadyDetail {
  ready: boolean;
}

export interface BattleEnteringDetail {
  source: 'battle-store';
}

export interface GameStoreReadyDetail {
  ready: boolean;
}
