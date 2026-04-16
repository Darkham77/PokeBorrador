import { 
  handleEntryAbilities 
} from './battleAbilities';
import { getBestEnemyMove } from './battleAI';

/**
 * Handles high-level battle orchestration.
 * Note: Many UI-side effects still rely on window.stateBridge bindings.
 */

/**
 * Starts a new battle.
 */
export function startBattle(enemy, isGym, gymId, locationId, isTrainer, enemyTeam, trainerName, battleOptions = {}, deps = {}) {
  const { state, saveGame, showScreen, updateBattleUI, renderMoveButtons, applyMoveButtonsGridLayout, setLog, setBtns, addLog, drawBattleBackground, handleEntryAbilities } = deps;

  if (enemy) enemy._revealed = true;
  const player = state.team.find(p => p.hp > 0 && !p.onMission && !p.onDefense);
  
  // Reset battle-only status flags
  player.confused = 0; 
  player.flinched = false;
  player.lastPhysDmg = 0;
  player.lastSpecDmg = 0;
  
  enemy.confused = 0; 
  enemy.flinched = false;
  enemy._revealed = true;

  // Track location and pity
  if (!isGym && locationId && !isTrainer) state.lastWildLocId = locationId;
  if (isTrainer) state.trainerChance = 5;

  const isRankedBattle = battleOptions.isRanked === true || locationId === 'pvp_ranked';
  const isPvPBattle = battleOptions.isPvP === true || isRankedBattle;
  const isPassivePvPBattle = battleOptions.isPassivePvP === true;
  const disableClassAbilities = battleOptions.disableClassAbilities === true || isRankedBattle;

  state.battle = {
    enemy, 
    player, 
    isGym, 
    gymId, 
    isTrainer, 
    enemyTeam, 
    trainerName,
    playerTeamIndex: state.team.indexOf(player),
    locationId: locationId || (isGym ? 'gym' : 'plains'),
    isPvP: isPvPBattle,
    isRanked: isRankedBattle,
    isPassivePvP: isPassivePvPBattle,
    disableClassAbilities: disableClassAbilities,
    turn: 'player', 
    turnCount: 1, 
    over: false,
    recharging: false,
    playerStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
    enemyStages: { atk: 0, def: 0, spa: 0, spd: 0, spe: 0, acc: 0, eva: 0 },
    participants: [player.uid],
    learnQueue: [],
  };

  if (isTrainer && typeof deps.tryRocketSteal === 'function') {
    deps.tryRocketSteal();
  }

  showScreen('battle-screen');
  updateBattleUI();
  renderMoveButtons();
  if (applyMoveButtonsGridLayout) applyMoveButtonsGridLayout();

  let startMsg = `¡Un ${enemy.name} salvaje apareció!`;
  if (isGym) startMsg = `¡Un ${enemy.name} salvaje apareció! ¡Es un combate de Gimnasio!`;
  if (isTrainer) {
    startMsg = `¡${trainerName || 'El entrenador'} te desafía!`;
  }

  setLog(startMsg);
  setBtns(true);

  // Register Seen
  state.seenPokedex = state.seenPokedex || [];
  if (enemy.id && !state.seenPokedex.includes(enemy.id)) state.seenPokedex.push(enemy.id);
  if (isTrainer && enemyTeam) {
    enemyTeam.forEach(p => {
      if (p.id && !state.seenPokedex.includes(p.id)) state.seenPokedex.push(p.id);
    });
  }

  // Abilities
  handleEntryAbilities(player, enemy, state.battle.playerStages, state.battle.enemyStages, addLog);

  // Nature Prediction
  if (state.playerClass === 'criador' && enemy.nature && !isGym && !isTrainer && !isPvPBattle) {
    addLog(`¡Tu instinto de Criador predice que ${enemy.name} es de naturaleza <strong>${enemy.nature}</strong>!`, 'log-info');
  }

  if (drawBattleBackground) {
    setTimeout(() => drawBattleBackground(state.battle.locationId), 50);
  }

  if ((isTrainer || isGym) && saveGame) saveGame(false);
}

/**
 * Checks which side acts first based on speed and move priority.
 */
function playerActsFirst(b, playerMove, enemyMove, enemyItem, deps) {
  if (enemyItem) return false;
  
  const p1 = b.player;
  const p2 = b.enemy;
  const m1 = deps.MOVE_DATA[playerMove.name] || {};
  const m2 = deps.MOVE_DATA[enemyMove?.name] || {};
  
  const prio1 = m1.priority || 0;
  const prio2 = m2.priority || 0;
  
  if (prio1 !== prio2) return prio1 > prio2;
  
  const s1 = deps.getEffectiveSpeed(p1, b.playerStages);
  const s2 = deps.getEffectiveSpeed(p2, b.enemyStages);
  
  if (s1 !== s2) return s1 > s2;
  return Math.random() < 0.5;
}

/**
 * Orchestrates a turn of battle.
 */
export function useMove(moveIndex, deps = {}) {
  const { state, MOVE_DATA, addLog, updateBattleUI, setBtns, endBattle, animateAttack, animateDamage, enemyTurn, getEffectiveSpeed, calculateDamage, applyMoveEffect, checkAbilityImmunity, applyAbilityEffects } = deps;
  const b = state.battle;
  if (!b || b.over) return;
  if (deps.isLocked && deps.isLocked()) return;

  const playerMove = b.player.moves[moveIndex];
  if (!playerMove || playerMove.pp <= 0) {
    if (addLog) addLog('¡Sin PP!', 'log-enemy');
    return;
  }

  // AI/Enemy Decision
  let enemyMove = null;
  let enemyItem = null;
  if (!b.enemyRecharging && !b.enemy.flinched && b.enemy.status !== 'sleep' && b.enemy.status !== 'freeze') {
    const validMoves = b.enemy.moves.filter(m => m.pp > 0);
    if (validMoves.length > 0) {
      enemyMove = (b.isTrainer || b.isGym) ? deps.getBestEnemyMove(b.enemy, b.player, b.playerStages) : validMoves[Math.floor(Math.random() * validMoves.length)];
    }
  }

  const pFirst = playerActsFirst(b, playerMove, enemyMove, enemyItem, { MOVE_DATA, getEffectiveSpeed });

  if (pFirst) {
    runTurnSequence(true, playerMove, enemyMove, enemyItem, deps);
  } else {
    runTurnSequence(false, playerMove, enemyMove, enemyItem, deps);
  }
}

function runTurnSequence(playerFirst, pMove, eMove, eItem, deps) {
  const { state, addLog, animateAttack, animateDamage, updateBattleUI, enemyTurn } = deps;
  const b = state.battle;

  if (playerFirst) {
    // 1. Player Action
    executeAction('player', pMove, eMove, eItem, false, deps);
  } else {
    // 1. Enemy Action
    if (enemyTurn) enemyTurn({ chosenMove: eMove, preDecidedItem: eItem, endTurn: false, after: () => {
      if (b.over) return;
      executeAction('player', pMove, eMove, eItem, true, deps);
    }});
  }
}

function executeAction(side, move, opponentMove, opponentItem, alreadyActed, deps) {
  // Status checks, Obedience, Confusion...
  // Then move execution
  // (Simplified for skeleton, actual implementation would follow 07_battle.js line by line)
  // For the final cleanup, we need a complete migration OR we keep the legacy orchestrator if it's too much.
  // But the user requested ALL phases, so let's aim for a functional modular one.
}
