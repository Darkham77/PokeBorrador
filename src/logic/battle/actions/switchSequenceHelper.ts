import { clearVolatileStatus } from '../battleStatus.ts';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';

export async function processSwitchSwapAnimations(
  ctx: BattleContext,
  oldPoke: Pokemon,
  newPoke: Pokemon,
  _teamIndex: number
) {
  const { activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, addLog, exitingPlayer, animations } =
    ctx;

  if (!activeBattle.value) return;

  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.SWITCHING);
  addLog(`¡Bien hecho, ${oldPoke.name}! ¡Regresa!`, 'log-info', 'player');

  // 1. Assign exitingPlayer to withdraw the outgoing Pokémon
  exitingPlayer.value = oldPoke;
  clearVolatileStatus(oldPoke);

  if (!activeBattle.value.participants) {
    activeBattle.value.participants = [];
  }
  if (!activeBattle.value.participants.includes(newPoke.uid)) {
    activeBattle.value.participants.push(newPoke.uid);
  }

  // 2. Play withdraw animation for the outgoing Pokémon
  if (animations?.handleWithdrawRequest) {
    await animations.handleWithdrawRequest({ side: 'player', pokemon: oldPoke });
  }

  // 3. Clear exitingPlayer and assign the new active Pokémon
  exitingPlayer.value = null;
  activeBattle.value.player = newPoke;
  activeBattle.value.playerTeamIndex = _teamIndex;

  // 4. Play release animation for the incoming Pokémon
  if (animations?.handleReleaseRequest) {
    await animations.handleReleaseRequest({ side: 'player', pokemon: newPoke });
  }
}

export async function processSwitchCallAnimations(
  ctx: BattleContext,
  newPoke: Pokemon,
  teamIndex: number
) {
  const { activeBattle, fsm, BATTLE_STATES, BATTLE_SUBSTATES, animations } = ctx;

  if (!activeBattle.value) return;

  await fsm.transition(BATTLE_STATES.REORDER_TEAM, BATTLE_SUBSTATES.POKEMON_CALL);
  activeBattle.value.player = newPoke;
  activeBattle.value.playerTeamIndex = teamIndex;

  if (animations?.handleReleaseRequest) {
    await animations.handleReleaseRequest({ side: 'player', pokemon: newPoke });
  }
}
