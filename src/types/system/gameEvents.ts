export const GAME_UI_EVENTS = {
  BATTLE_ENTERING: 'battle-entering',
  STORE_READY: 'game-store-ready',
} as const;

export interface BattleEnteringDetail {
  source: 'battle-store';
}

export interface GameStoreReadyDetail {
  ready: boolean;
}
