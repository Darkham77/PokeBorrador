import { Ref } from 'vue';
import { BattleState, BattleStages, BattleLog } from './battle.ts';
import { Pokemon, Move } from './pokemon.ts';
import { GameStore, BattleStore, UIStore, WarStore, EventStore, PlayerClassStore, AudioStore, BattleOptions } from './stores.ts';
import { BATTLE_STATES, BATTLE_SUBSTATES } from '@/logic/battle/battleStateMachine';

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
  upcomingPokemon: Ref<Pokemon | null>;
  debugLoopPokemon: Ref<Pokemon | null>;
  playerStages: Ref<BattleStages>;
  enemyStages: Ref<BattleStages>;
  battleLogs: Ref<BattleLog[]>;
  attackerSide: Ref<'player' | 'enemy' | null>;
  activeMove: Ref<Move | null>;
  faintedSides: Ref<Set<string>>;
  isCave?: boolean;
  isIndoors?: boolean;
  isCrystalCave?: boolean;
  
  handleFaint: (side: 'player' | 'enemy') => Promise<void>;
  addLog: (msg: string, type?: string, source?: Pokemon | string | null, sideOverride?: 'player' | 'enemy' | null) => void;
  endBattle: (win: boolean, fled: boolean) => Promise<void>;
  completeBattleFlow: (option?: string) => Promise<void>;
  persistBattle: () => void;
  waitForLogs: () => Promise<void>;
  clearLogs: () => void;
  clearVolatileStatus: (p: Pokemon) => void;
  startBattle: (enemyPoke: Pokemon, options?: BattleOptions) => Promise<void>;
  _startBattle: (enemyPoke: Pokemon, options?: BattleOptions) => Promise<void>;
  initBattle: (locId: string, isTr: boolean, trName: string, isGym: boolean, gymId: string, wasSearching: boolean) => Promise<void>;
  
  animations?: {
    triggerSearchEncounter: () => Promise<void>;
    revealWildPokemon: (isInstant?: boolean) => Promise<void>;
    triggerWildEmergence: () => Promise<void>;
    triggerCatchSparkles: (side: string) => Promise<void>;
    handleCatchRequest: (detail: string | { side?: string; ballId?: string }) => Promise<void>;
    handleReleaseRequest: (detail: string | { side?: string }) => Promise<void>;
    handleShakeRequest: (detail: string | { side?: string }) => void;
    handleFaintAnim: (detail: string | { side?: string; isFaint?: boolean } | { detail?: string | { side: string; isFaint?: boolean } }) => Promise<void>;
    playCatchCelebration: (side: string) => Promise<void>;
    playBallFadeOut: (side: string) => Promise<void>;
    triggerTrainerEntry: () => Promise<void>;
    triggerTrainerDialogs: () => Promise<void>;
    triggerTrainerRetreat: () => Promise<void>;
    triggerPokemonCall: () => Promise<void>;
  };
}
