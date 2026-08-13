import { Ref } from 'vue';
import { BattleState, BattleStages, BattleLog, type BattleSource, type BattleSide } from '@/types/battle/battle';
import { Pokemon, Move } from '@/types/pokemon/pokemon';
import { GameStore, BattleStore, UIStore, WarStore, EventStore, PlayerClassStore, AudioStore, BattleOptions } from '@/types/system/stores';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';

export type BattleSeatId = 'seat1' | 'seat2' | 'seat3' | 'seat4';

export interface BattleContext {
  gs: GameStore;
  warStore: WarStore;
  eventStore: EventStore;
  classStore: PlayerClassStore;
  audio: AudioStore;
  uiStore: UIStore;
  activeBattle: Ref<BattleState | null>;
  player: Ref<Pokemon | null | undefined>;
  enemy: Ref<Pokemon | null | undefined>;
  fsm: BattleStore['fsm'];
  BATTLE_STATES: typeof BATTLE_STATES;
  BATTLE_SUBSTATES: typeof BATTLE_SUBSTATES;
  isBattleActive: Ref<boolean>;
  isFinishing: Ref<boolean>;
  isSearching: Ref<boolean>;
  isReadyToExit: Ref<boolean>;
  isIntroAnimating: Ref<boolean>;
  isPvP: Ref<boolean>;
  isProcessing: Ref<boolean>;
  debugBinoculars: Ref<boolean>;
  debugLoopPokemon: Ref<Pokemon | null>;
  playerStages: Ref<BattleStages>;
  enemyStages: Ref<BattleStages>;
  battleLogs: Ref<BattleLog[]>;
  attackerSide: Ref<BattleSide | null>;
  activeMove: Ref<Move | null>;
  faintedSides: Ref<Set<string>>;
  exitingPlayer: Ref<Pokemon | null>;
  exitingEnemy: Ref<Pokemon | null>;
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  
  handleFaint: (side: BattleSide) => Promise<void>;
  addLog: (msg: string, type?: string, source?: BattleSource | null, sideOverride?: BattleSide | null) => void;
  endBattle: (win: boolean, fled: boolean) => Promise<void>;
  completeBattleFlow: (option?: string) => Promise<void>;
  persistBattle: () => void;
  waitForLogs: () => Promise<void>;
  clearLogs: () => void;
  clearVolatileStatus: (p: Pokemon) => void;
  startBattle: (enemyPoke: Pokemon, options?: BattleOptions) => Promise<void>;
  _startBattle: (enemyPoke: Pokemon, options?: BattleOptions) => Promise<void>;
  initBattle: () => Promise<void>;
  
  animations?: {
    seats?: import('vue').Ref<Record<BattleSeatId, import('@/composables/battle/useBattleSeats').SeatState>>;
    triggerSearchEncounter: () => Promise<void>;
    revealWildPokemon: (isInstant?: boolean) => Promise<void>;
    triggerWildEmergence: () => Promise<void>;
    triggerCatchSparkles: (side: string) => Promise<void>;
    handleCatchRequest: (detail: string | { side?: string; ballId?: string; pokemon?: Pokemon }) => Promise<void>;
    handleReleaseRequest: (detail: string | { side?: string; pokemon?: Pokemon }) => Promise<void>;
    handleWithdrawRequest?: (detail: string | { side?: string; pokemon?: Pokemon }) => Promise<void>;
    handleShakeRequest: (detail: string | { side?: string }) => Promise<void>;
    handleFaintAnim: (detail: string | { side?: string; isFaint?: boolean; pokemon?: Pokemon } | { detail?: string | { side: string; isFaint?: boolean; pokemon?: Pokemon } }) => Promise<void>;
    playCatchCelebration: (side: string) => Promise<void>;
    playBallFadeOut: (side: string) => Promise<void>;
    triggerTrainerEntry: () => Promise<void>;
    triggerTrainerDialogs: () => Promise<void>;
    triggerTrainerRetreat: () => Promise<void>;
    triggerPokemonCall: () => Promise<void>;
    handleHealRequest?: (detail: string | { side?: string }) => Promise<void>;
    handleBlinkRequest?: (detail: string | { side?: string }) => Promise<void>;
    awaitTween?: (key: string) => Promise<void>;
    resetAll?: () => void;
  };
}
