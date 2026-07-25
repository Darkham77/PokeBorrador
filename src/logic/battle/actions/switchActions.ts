import type { BattleContext } from '@/types/battle/battleContext';
import { applyEntryHazards } from '../battleFlow.ts';

/**
 * Handles switching the active enemy Pokemon with GSAP animation.
 */
export async function executeEnemySwitch(store: BattleContext, newPokeIndex: number) {
  const b = store.activeBattle.value;
  if (!b || !b.enemyTeam || newPokeIndex === -1) return;
  const currentEnemy = b.enemy;
  if (!currentEnemy) return;

  const newPoke = b.enemyTeam[newPokeIndex];
  if (!newPoke) return;

  const fsm = store.fsm;
  const { BATTLE_STATES, BATTLE_SUBSTATES } = store;

  store.addLog(`¡${b.trainerName || 'El entrenador'} retira a ${currentEnemy.name}!`, 'log-enemy', 'enemy_trainer');
  
  if (store.exitingEnemy) store.exitingEnemy.value = currentEnemy;

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_RECALL);
  
  const withdrawPromise = store.animations?.handleWithdrawRequest
    ? store.animations.handleWithdrawRequest({ side: 'enemy', pokemon: currentEnemy })
    : Promise.resolve();
  
  await withdrawPromise;
  
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT);
  
  b.enemy = newPoke;
  
  // Clear stat stages on switch but preserve field conditions
  const s = store.enemyStages.value;
  store.enemyStages.value = {
    ...s,
    atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0
  };

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL);
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.RENDER_BALL);
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT);
  store.addLog(`¡Envía a ${newPoke.name}!`, 'log-enemy', 'enemy_trainer');
  
  const releasePromise = store.animations?.handleReleaseRequest
    ? store.animations.handleReleaseRequest({ side: 'enemy', pokemon: newPoke })
    : Promise.resolve();

  await releasePromise;
  if (store.exitingEnemy) store.exitingEnemy.value = null;

  applyEntryHazards(newPoke, store.enemyStages.value, store.addLog);
}
