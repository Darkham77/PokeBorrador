import { audit4SeatCompatibility } from './audit_4seat_compatibility.js';
import { auditActiveGenSSoT } from './audit_active_gen_ssot.js';
import { auditCatchRateMath } from './audit_catch_rate_math.js';
import { auditFSMEventParity } from './audit_fsm_event_parity.js';
import { auditFsmSubstateParity } from './audit_fsm_substate_parity.js';
import { auditFSMZeroTimer } from './audit_fsm_zero_timer.js';
import { auditPlaywrightActionability } from './audit_playwright_actionability.js';
import { auditRequestSchema } from './audit_request_schema.js';
import { auditSharedExecutorDuplication } from './audit_shared_executor_duplication.js';
import { auditShowdownAbilityData } from './audit_showdown_ability_data.js';
import { auditShowdownItemData } from './audit_showdown_item_data.js';
import { auditShowdownMoveMechanics } from './audit_showdown_move_mechanics.js';
import { auditShowdownStatusNull } from './audit_showdown_status_null.js';
import { auditSilentFallbackPatterns } from './audit_silent_fallback_patterns.js';
import { auditStatStageBoosts } from './audit_stat_stage_boosts.js';
import { auditUIDMappingIntegrity } from './audit_uid_mapping_integrity.js';
import { auditWeatherTerrainParity } from './audit_weather_terrain_parity.js';
import { findUntestedShowdownEffects } from './find_untested_showdown_effects.js';
import { auditShowdownProtocolTokens } from './audit_showdown_protocol_tokens.js';
import { auditMissingAnimations } from './audit_missing_animations.js';

export function runFullAuditSuite() {
  console.log('=== RUNNING COMPLETE 21-TOOL AUDIT SUITE ===\n');

  const report = {
    seatRes: audit4SeatCompatibility('src/logic/battle'),
    genRes: auditActiveGenSSoT('src/logic/battle'),
    catchRes: auditCatchRateMath('src/logic/battle/battleCatchMath.ts', 'external/pokemon-showdown-code/sim'),
    fsmEventRes: auditFSMEventParity('src/logic/battle/showdown.worker.ts', 'src/stores/battle.ts'),
    fsmSubstateRes: auditFsmSubstateParity('src/stores/battle.ts'),
    timerRes: auditFSMZeroTimer('src/logic/battle'),
    actionRes: auditPlaywrightActionability('scripts/e2e'),
    schemaRes: auditRequestSchema('external/pokemon-showdown-code/sim', 'src/types'),
    execRes: auditSharedExecutorDuplication('scripts/e2e'),
    abilityRes: auditShowdownAbilityData('external/pokemon-showdown-code/data/abilities.ts', 'src/logic/battle/actions'),
    itemRes: auditShowdownItemData('external/pokemon-showdown-code/data/items.ts', 'src/logic/battle'),
    moveRes: auditShowdownMoveMechanics('external/pokemon-showdown-code/data/moves.ts', 'src/logic/battle/showdownBridgeCore.ts'),
    statusRes: auditShowdownStatusNull('src/logic/battle'),
    fallbackRes: auditSilentFallbackPatterns('src'),
    boostRes: auditStatStageBoosts('src/logic/battle/showdownBridgeStages.ts'),
    uidRes: auditUIDMappingIntegrity('src/logic/battle'),
    weatherRes: auditWeatherTerrainParity('src/logic/battle/showdownBridgeField.ts'),
    untestedRes: findUntestedShowdownEffects('external/pokemon-showdown-code/data', 'src'),
    protocolTokensRes: auditShowdownProtocolTokens('external/pokemon-showdown-code', 'src/logic/battle'),
    missingAnimsRes: auditMissingAnimations('src')
  };

  console.log(JSON.stringify(report, null, 2));
}

runFullAuditSuite();
