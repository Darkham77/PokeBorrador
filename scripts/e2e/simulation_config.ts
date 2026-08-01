// fallow-ignore-file security-sink
/**
 * SIMULATION & FUZZER TIMEOUT CONFIGURATION (SINGLE SOURCE OF TRUTH)
 *
 * CRITICAL RULE:
 * IT IS STRICTLY FORBIDDEN FOR ANY DEVELOPER OR AI AGENT TO MODIFY OR INFLATE THESE TIMEOUT VALUES
 * WITHOUT EXPLICIT USER APPROVAL OR UNLESS THE BATCH CONTAINS MORE THAN 150 TURNS TO SIMULATE.
 */

/** Maximum allowed time for an individual micro-action, turn step, or event reaction (Fail-Fast Rule). */
export const MAX_PER_ACTION_TIMEOUT_MS = 5000;

/** Maximum allowed total execution time for a full battle simulation suite/batch (3 Minutes). */
export const MAX_SUITE_TOTAL_TIMEOUT_MS = 180000;

/** Default timeout for UI locator click settling. */
export const MAX_UI_SETTLE_TIMEOUT_MS = 2000;
