// scripts/battle-tester/fuzzer-mock-battle-store.ts
import { ref } from 'vue';
import type { BattleContext } from '../../../../src/types/battle/battleContext.ts';
import type { BattleState, BattleStages, BattleLog } from '../../../../src/types/battle/battle.ts';
import type { Pokemon, Move } from '../../../../src/types/pokemon/pokemon.ts';
import { useGameStore } from '../../../../src/stores/game.ts';

export function createMockBattleContext(
  playerPoke: Pokemon,
  enemyPoke: Pokemon,
  playerTeam?: Pokemon[],
  enemyTeam?: Pokemon[]
): BattleContext {
  const mockBattleState: BattleState = {
    player: playerPoke,
    enemy: enemyPoke,
    playerTeam: playerTeam ?? [playerPoke],
    enemyTeam: enemyTeam ?? [enemyPoke],
    playerTeamIndex: 0,
    enemyTeamIndex: 0,
    participants: [playerPoke.uid, enemyPoke.uid],
    locationId: 'route1',
    isTrainer: false,
    turnCount: 1,
    over: false,
    escapeAttempts: 0,
    turn: 'player',
    weather: { type: 'clear', turns: 0 }
  };
  const activeBattle = ref<BattleState | null>(mockBattleState);

  const gameStore = useGameStore();
  if (gameStore) {
    (gameStore as { state: { team: Pokemon[] } }).state = { team: playerTeam || [playerPoke] };
  }

  const playerRef = ref<Pokemon | null | undefined>(playerPoke);
  const enemyRef = ref<Pokemon | null | undefined>(enemyPoke);

  const logs: string[] = []; // no-domain: Non-domain utility collection or data structure

  const addLog = (msg: string, type?: string, _source?: Pokemon | string | null) => {
    logs.push(`[${type || 'info'}] ${msg}`);
  };

  const initialStages: BattleStages = { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0, reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0 };

  const context: Partial<BattleContext> = {
    activeBattle,
    player: playerRef,
    enemy: enemyRef,
    attackerSide: ref<'player' | 'enemy' | null>(null),
    activeMove: ref<Move | null>(null),
    faintedSides: ref(new Set<string>()),
    playerStages: ref<BattleStages>({ ...initialStages }),
    enemyStages: ref<BattleStages>({ ...initialStages }),
    battleLogs: ref<BattleLog[]>([]),
    isBattleActive: ref(true),
    isFinishing: ref(false),
    isSearching: ref(false),
    isReadyToExit: ref(false),
    isIntroAnimating: ref(false),
    isPvP: ref(false),
    isProcessing: ref(false),
    debugBinoculars: ref(false),
    debugLoopPokemon: ref(null),
    exitingPlayer: ref(null),
    exitingEnemy: ref(null),
    
    addLog,
    handleFaint: async () => {},
    endBattle: async () => {},
    completeBattleFlow: async () => {},
    persistBattle: () => {},
    waitForLogs: async () => {},
    clearLogs: () => {},
    clearVolatileStatus: () => {},
    
    animations: {
      triggerSearchEncounter: async () => {},
      revealWildPokemon: async () => {},
      triggerWildEmergence: async () => {},
      triggerCatchSparkles: async () => {},
      handleCatchRequest: async () => {},
      handleReleaseRequest: async () => {},
      handleShakeRequest: async () => {},
      handleFaintAnim: async () => {},
      playCatchCelebration: async () => {},
      playBallFadeOut: async () => {},
      triggerTrainerEntry: async () => {},
      triggerTrainerDialogs: async () => {},
      triggerTrainerRetreat: async () => {},
      triggerPokemonCall: async () => {},
      handleHealRequest: async () => {},
      handleBlinkRequest: async () => {},
      awaitTween: async () => {}
    }
  };

  return context as BattleContext;
}
