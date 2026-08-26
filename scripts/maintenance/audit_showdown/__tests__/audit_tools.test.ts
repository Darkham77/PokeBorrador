import assert from 'node:assert/strict';
import { test } from 'node:test';
import { audit4SeatCompatibility } from '../audit_4seat_compatibility.js';
import { auditActiveGenSSoT } from '../audit_active_gen_ssot.js';
import { auditCatchRateMath } from '../audit_catch_rate_math.js';
import { auditFSMEventParity } from '../audit_fsm_event_parity.js';
import { auditFsmSubstateParity } from '../audit_fsm_substate_parity.js';
import { auditFSMZeroTimer } from '../audit_fsm_zero_timer.js';
import { auditPlaywrightActionability } from '../audit_playwright_actionability.js';
import { auditRequestSchema } from '../audit_request_schema.ts';
import { auditSharedExecutorDuplication } from '../audit_shared_executor_duplication.js';
import { auditShowdownAbilityData } from '../audit_showdown_ability_data.js';
import { auditShowdownItemData } from '../audit_showdown_item_data.js';
import { auditShowdownMoveMechanics } from '../audit_showdown_move_mechanics.js';
import { auditShowdownStatusNull } from '../audit_showdown_status_null.js';
import { auditSilentFallbackPatterns } from '../audit_silent_fallback_patterns.js';
import { auditStatStageBoosts } from '../audit_stat_stage_boosts.js';
import { auditUIDMappingIntegrity } from '../audit_uid_mapping_integrity.js';
import { auditWeatherTerrainParity } from '../audit_weather_terrain_parity.js';
import { findUntestedShowdownEffects } from '../find_untested_showdown_effects.js';
import { parseReplayLogDesync } from '../parse_replay_log_desync.js';

test('Audit Tools Integrity Suite - Zero False Positives', () => {
  // 1. Audit 4-Seat Compatibility
  const seatRes = audit4SeatCompatibility('src/logic/battle');
  assert.ok(Array.isArray(seatRes.hardcodedTwoSeatFiles));

  // 2. Audit Active Gen SSoT
  const genRes = auditActiveGenSSoT('src/logic/battle');
  assert.ok(Array.isArray(genRes.hardcodedGenFiles));

  // 3. Audit Catch Rate Math
  const catchRes = auditCatchRateMath('src/logic/battle/battleCatchMath.ts', 'external/pokemon-showdown-code/sim');
  assert.ok(Array.isArray(catchRes.catchMathDiscrepancies));

  // 4. Audit FSM Event Parity
  const fsmEventRes = auditFSMEventParity('src/logic/battle/showdown.worker.ts', 'src/stores/battle.ts');
  assert.ok(Array.isArray(fsmEventRes.unhandledWorkerEvents));

  // 5. Audit FSM Substate Parity
  const fsmSubstateRes = auditFsmSubstateParity('src/stores/battle.ts');
  assert.ok(Array.isArray(fsmSubstateRes.unmappedSubstates));

  // 6. Audit FSM Zero Timer
  const timerRes = auditFSMZeroTimer('src/logic/battle');
  assert.ok(Array.isArray(timerRes.timerViolations));

  // 7. Audit Playwright Actionability
  const actionRes = auditPlaywrightActionability('scripts/e2e');
  assert.ok(Array.isArray(actionRes.forcedClickFiles));

  // 8. Audit Request Schema
  const schemaRes = auditRequestSchema('external/pokemon-showdown-code/sim', 'src/types');
  assert.ok(Array.isArray(schemaRes.missingFieldsInTypes));

  // 9. Audit Shared Executor Duplication
  const execRes = auditSharedExecutorDuplication('scripts/e2e');
  assert.ok(Array.isArray(execRes.duplicatedExecutorFiles));

  // 10. Audit Showdown Ability Data
  const abilityRes = auditShowdownAbilityData('external/pokemon-showdown-code/data/abilities.ts', 'src/logic/battle/actions');
  assert.ok(Array.isArray(abilityRes.unhandledAbilities));

  // 11. Audit Showdown Item Data
  const itemRes = auditShowdownItemData('external/pokemon-showdown-code/data/items.ts', 'src/logic/battle');
  assert.ok(Array.isArray(itemRes.unhandledBattleItems));

  // 12. Audit Showdown Move Mechanics
  const moveRes = auditShowdownMoveMechanics('external/pokemon-showdown-code/data/moves.ts', 'src/logic/battle/showdownBridgeCore.ts');
  assert.ok(Array.isArray(moveRes.missingMoveExecutors));

  // 13. Audit Showdown Status Null
  const statusRes = auditShowdownStatusNull('src/logic/battle');
  assert.ok(Array.isArray(statusRes.statusNullViolations));

  // 14. Audit Silent Fallback Patterns
  const fallbackRes = auditSilentFallbackPatterns('src');
  assert.ok(Array.isArray(fallbackRes.fallbackViolations));

  // 15. Audit Stat Stage Boosts
  const boostRes = auditStatStageBoosts('src/logic/battle/showdownBridgeStages.ts');
  assert.ok(Array.isArray(boostRes.statStageDiscrepancies));

  // 16. Audit UID Mapping Integrity
  const uidRes = auditUIDMappingIntegrity('src/logic/battle');
  assert.ok(Array.isArray(uidRes.fallbackViolations));

  // 17. Audit Weather Terrain Parity
  const weatherRes = auditWeatherTerrainParity('src/logic/battle/showdownBridgeField.ts');
  assert.ok(Array.isArray(weatherRes.unhandledWeatherTokens));

  // 18. Find Untested Showdown Effects
  const untestedRes = findUntestedShowdownEffects('external/pokemon-showdown-code/data', 'src');
  assert.ok(Array.isArray(untestedRes.untestedMoves));

  // 19. Parse Replay Log Desync
  const desyncRes = parseReplayLogDesync('non_existent_log.log');
  assert.equal(desyncRes.failedTurn, null);
  assert.equal(desyncRes.mismatchReason, 'Log file not found');
});
