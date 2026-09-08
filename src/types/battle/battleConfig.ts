export const BATTLE_MODES = [
  'wild',
  'trainer',
  'gym',
  'faction_war',
  'pvp_casual',
  'pvp_ranked',
  'pvp_spectator',
  'replay'
] as const;

export type BattleMode = (typeof BATTLE_MODES)[number];

export interface BattleUiConfig {
  readonly mode: BattleMode;
  readonly showTurnTimer: boolean;
  readonly allowBag: boolean;
  readonly allowCatch: boolean;
  readonly allowFlee: boolean;
  readonly allowForfeit: boolean;
  readonly showTeamPreview: boolean;
  readonly showLeaderDialogue: boolean;
  readonly enableContinuousSearch: boolean;
  readonly showActionButtons: boolean;
  readonly showSpectatorBadge: boolean;
  readonly showReplayControls: boolean;
}

export function createBattleUiConfig(
  mode: BattleMode,
  overrides?: Partial<BattleUiConfig>
): BattleUiConfig {
  const isPvP = mode === 'pvp_casual' || mode === 'pvp_ranked';
  const isSpectator = mode === 'pvp_spectator';
  const isReplay = mode === 'replay';
  const isGym = mode === 'gym';
  const isWild = mode === 'wild';

  const baseConfig: BattleUiConfig = {
    mode,
    showTurnTimer: isPvP || isSpectator,
    allowBag: !isPvP && !isSpectator && !isReplay,
    allowCatch: isWild,
    allowFlee: isWild,
    allowForfeit: isPvP,
    showTeamPreview: isPvP,
    showLeaderDialogue: isGym,
    enableContinuousSearch: isWild,
    showActionButtons: !isSpectator && !isReplay,
    showSpectatorBadge: isSpectator,
    showReplayControls: isReplay
  };

  if (!overrides) {
    return baseConfig;
  }

  return {
    ...baseConfig,
    ...overrides
  };
}
