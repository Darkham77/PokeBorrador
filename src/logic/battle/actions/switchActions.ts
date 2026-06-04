import type { BattleContext } from '@/types/battleContext';
import { gameBus } from '@/logic/gameBus';

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
  
  const withdrawPromise = store.animations?.handleCatchRequest
    ? store.animations.handleCatchRequest({ side: 'enemy', pokemon: currentEnemy })
    : Promise.resolve();
  
  await withdrawPromise;
  
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.VACATE_SEAT);
  
  b.enemy = newPoke;
  
  // Clear stages on switch
  store.enemyStages.value = {
    atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0,
    reflect: 0, lightScreen: 0, safeguard: 0, mist: 0, spikes: 0
  };

  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.POKEMON_CALL);
  await fsm.transition(BATTLE_STATES.ACTIVE_BATTLE, BATTLE_SUBSTATES.OCCUPY_SEAT);
  store.addLog(`¡Envía a ${newPoke.name}!`, 'log-enemy', newPoke);
  
  const releasePromise = store.animations?.handleReleaseRequest
    ? store.animations.handleReleaseRequest({ side: 'enemy', pokemon: newPoke })
    : Promise.resolve();

  await releasePromise;
  if (store.exitingEnemy) store.exitingEnemy.value = null;

  // Entry hazard damage (Spikes)
  if (store.enemyStages.value.spikes && store.enemyStages.value.spikes > 0 && 
      newPoke.type !== 'flying' && newPoke.type2 !== 'flying' && newPoke.ability !== 'Levitación') {
    const dmg = Math.floor(newPoke.maxHp * (store.enemyStages.value.spikes / 8));
    newPoke.hp = Math.max(0, newPoke.hp - dmg);
    store.addLog(`¡${newPoke.name} recibió daño por las púas!`, 'log-info', newPoke);
    gameBus.emit('PLAY_SOUND', 'statusDamage');
  }
}
