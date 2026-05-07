import { Ref } from 'vue';
import { BattleState, BattleStages, BattleLog } from './battle';
import { Pokemon, Move } from './pokemon';
import { GameStore, BattleStore, UIStore, WarStore, EventStore, PlayerClassStore, AudioStore } from './stores';
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
  
  handleFaint: (side: 'player' | 'enemy') => Promise<void>;
  addLog: (msg: string, type?: string, source?: any, sideOverride?: 'player' | 'enemy' | null) => void;
  endBattle: (win: boolean, fled: boolean) => Promise<void>;
  completeBattleFlow: (option: any) => Promise<void>;
  persistBattle: () => void;
  waitForLogs: () => Promise<void>;
  clearLogs: () => void;
  clearVolatileStatus: (p: Pokemon) => void;
  startBattle: (enemyPoke: Pokemon, options: any) => Promise<void>;
  _startBattle: (enemyPoke: Pokemon, options: any) => Promise<void>;
  initBattle: (locId: string, isTr: boolean, trName: string, isGym: boolean, gymId: string, wasSearching: boolean) => Promise<void>;
}
