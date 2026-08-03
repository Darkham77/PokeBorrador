import '@pkmn/sim';

declare module '@pkmn/sim' {
  interface Side {
    clearChoice(): void;
    choice: {
      actions: Array<{ choice: string }>;
      forcedSwitchesLeft?: number;
    };
  }
  interface Battle {
    allChoicesDone(): boolean;
    commitChoices(): void;
  }
}
