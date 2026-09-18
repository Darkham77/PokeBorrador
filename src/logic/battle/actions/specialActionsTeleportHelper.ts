import type { LogFn } from '@/types/battle/battle';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';
import { gameBus } from '@/logic/events/gameBus';
import { callPokemonToBattle } from './specialActionsHelper.ts';

function handleWildTeleport(
  b: NonNullable<BattleContext['activeBattle']['value']>,
  src: Pokemon,
  addLogFn: LogFn
): void {
  addLogFn(`¡${src.name} se teletransportó fuera del combate!`, 'log-info', src);
  gameBus.emit('PLAY_ESCAPE_ANIM', { side: 'enemy', type: 'teleport' });
  b.fled = true;
  b.over = true;
}

async function handleEnemyTeleportSwitch(
  b: NonNullable<BattleContext['activeBattle']['value']>,
  src: Pokemon,
  aliveOthers: Pokemon[],
  addLogFn: LogFn,
  battleCtx: BattleContext
): Promise<void> {
  const randomPick = aliveOthers[Math.floor(Math.random() * aliveOthers.length)] || null;
  battleCtx.exitingEnemy.value = src;

  const { BATTLE_STATES, BATTLE_SUBSTATES } = battleCtx;
  await battleCtx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL);

  const withdrawPromise = battleCtx.animations?.handleCatchRequest
    ? battleCtx.animations.handleCatchRequest({ side: 'enemy', pokemon: src })
    : Promise.resolve();

  b.enemy = randomPick;
  await withdrawPromise;

  if (randomPick) {
    await callPokemonToBattle(
      'enemy',
      randomPick,
      `¡${randomPick.name} entra al combate!`,
      randomPick,
      addLogFn,
      battleCtx
    );
  }
  battleCtx.exitingEnemy.value = null;
}

async function handlePlayerTeleportSwitch(
  b: NonNullable<BattleContext['activeBattle']['value']>,
  src: Pokemon,
  battleCtx: BattleContext
): Promise<void> {
  battleCtx.exitingPlayer.value = src;

  const { BATTLE_STATES, BATTLE_SUBSTATES } = battleCtx;
  await battleCtx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL);

  const withdrawPromise = battleCtx.animations?.handleCatchRequest
    ? battleCtx.animations.handleCatchRequest({ side: 'player', pokemon: src })
    : Promise.resolve();

  const keys = Object.keys(battleCtx.playerStages.value) as (keyof typeof battleCtx.playerStages.value)[];
  keys.forEach(k => {
    battleCtx.playerStages.value[k] = 0;
  });

  await withdrawPromise;
  battleCtx.exitingPlayer.value = null;
  b.player = null;

  battleCtx.uiStore.isBattleSwitchForced = true;
  await battleCtx.fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.SWITCH_MENU);
}

export async function executeTeleportAction(
  src: Pokemon,
  addLogFn: LogFn,
  battleCtx?: BattleContext
): Promise<void> {
  const b = battleCtx?.activeBattle.value;
  if (!b || !battleCtx) return;

  const isWild = !b.isTrainer && !b.isGym;
  if (isWild) {
    handleWildTeleport(b, src, addLogFn);
    return;
  }

  const isPlayer = src.uid === b.player?.uid;
  const team = isPlayer ? b.playerTeam : b.enemyTeam;
  const aliveOthers = (team || []).filter((p) => p.uid !== src.uid && p.hp > 0);

  if (aliveOthers.length === 0) {
    addLogFn(`¡${src.name} intentó teletransportarse!`, 'log-info', src);
    addLogFn("¡Pero no hay nadie para sustituirle!", 'log-info', src);
    return;
  }

  addLogFn(`¡${src.name} se teletransportó!`, 'log-info', src);

  if (!isPlayer) {
    await handleEnemyTeleportSwitch(b, src, aliveOthers, addLogFn, battleCtx);
  } else {
    await handlePlayerTeleportSwitch(b, src, battleCtx);
  }
}
