// unit_test_battle_regression_fixes.js
// Focused regression checks for:
// 1) addLogFn ReferenceError in enemy damage flow
// 2) recharge state carrying over after switch

const fs = require('fs');
const path = require('path');

const battlePath = path.join(__dirname, 'js', '07_battle.js');
const uiPath = path.join(__dirname, 'js', '11_battle_ui.js');

const battleSrc = fs.readFileSync(battlePath, 'utf8');
const uiSrc = fs.readFileSync(uiPath, 'utf8');

let passed = 0;
let total = 0;

function assertOk(condition, message) {
  total++;
  if (condition) {
    passed++;
    console.log(`PASS - ${message}`);
  } else {
    console.error(`FAIL - ${message}`);
  }
}

function blockAround(src, anchor, radius = 700) {
  const idx = src.indexOf(anchor);
  if (idx === -1) return '';
  const start = Math.max(0, idx - radius);
  const end = Math.min(src.length, idx + radius);
  return src.slice(start, end);
}

console.log('Running battle regression checks...\n');

// 1) Rage block must use addLog, not addLogFn (prevents ReferenceError).
const rageAnchor = 'if (b.player.rageActive && finalDmg > 0 && b.player.hp > 0) {';
const rageBlock = blockAround(battleSrc, rageAnchor);
assertOk(rageBlock.length > 0, 'Rage block exists in enemy damage flow');
assertOk(!/addLogFn\(/.test(rageBlock), 'Rage block no longer references addLogFn');
assertOk(/addLog\(/.test(rageBlock), 'Rage block logs with addLog');
assertOk(/applyMoveEffect\('stat_up_self_atk', b\.player, b\.enemy, b\.playerStages, b\.enemyStages, addLog\);/.test(rageBlock), 'Rage block passes addLog to applyMoveEffect');

// 2) Enemy switch paths must clear enemyRecharging before assigning new active.
const trainerSwitchAnchor = 'const newPoke = b.enemyTeam[bestIdx];';
const trainerSwitchBlock = blockAround(battleSrc, trainerSwitchAnchor);
assertOk(trainerSwitchBlock.length > 0, 'Trainer switch block exists');
assertOk(/b\.enemyRecharging = false;\s*b\.enemy = newPoke;/.test(trainerSwitchBlock), 'Trainer switch clears enemyRecharging before assigning new enemy');

const passiveSwitchAnchor = 'const newPoke = aiTeam[decision.pokemonIndex];';
const passiveSwitchBlock = blockAround(battleSrc, passiveSwitchAnchor);
assertOk(passiveSwitchBlock.length > 0, 'Passive AI switch block exists');
assertOk(/b\.enemyRecharging = false;\s*b\.enemy = newPoke;/.test(passiveSwitchBlock), 'Passive AI switch clears enemyRecharging before assigning new enemy');

const nextEnemyAnchor = 'nextP._revealed = true;';
const nextEnemyBlock = blockAround(battleSrc, nextEnemyAnchor);
assertOk(nextEnemyBlock.length > 0, 'Next enemy send-out block exists');
assertOk(/nextP\._revealed = true;\s*b\.enemyRecharging = false;\s*b\.enemy = nextP;/.test(nextEnemyBlock), 'Next enemy send-out clears enemyRecharging');

// 3) Player switch path must clear recharging before assigning teamRef.
assertOk(/b\.recharging = false;\s*b\.player = teamRef;/.test(uiSrc), 'Player switch clears recharging before assigning teamRef');

console.log(`\nResults: ${passed}/${total} checks passed.`);
if (passed !== total) {
  process.exit(1);
}
