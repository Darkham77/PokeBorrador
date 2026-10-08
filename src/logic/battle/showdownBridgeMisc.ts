import type { SBCtx } from './showdownBridgeCtx.ts';
import { handleGimmickEvents } from './showdownBridgeGimmicks.ts';
import { handleItemAndAbilityEvents } from './showdownBridgeItemAbility.ts';
import { handleSwitchAndDragEvents } from './showdownBridgeSwitchDrag.ts';
import { handleFeedbackEvent } from './showdownBridgeFeedback.ts';
import { handleFailEvent, handleTurnOrUpkeep } from './showdownBridgeFailUpkeep.ts';

const IGNORED_PROTOCOL_EVENTS = [
  'gen', 'gametype', 'teamsize', 'rated', 'tier', 'showteam',
  'debug', 'bigerror', 'event', '-candynamax', '-center',
  '-combine', '-waiting', 'custom', '-anim',
] as const;
const IGNORED_PROTOCOL_EVENTS_SET: ReadonlySet<string> = new Set<string>(IGNORED_PROTOCOL_EVENTS); // runtime-set: Fast O(1) membership lookup set

/**
 * Handles miscellaneous events, battle logs, turns, and delegates to specialized sub-bridges.
 */
export function handleMiscEvents(ctx: SBCtx): boolean | Promise<boolean> {
  const { type } = ctx;

  if (IGNORED_PROTOCOL_EVENTS_SET.has(type)) {
    return true;
  }

  if (type === 'switch' || type === 'drag') {
    return handleSwitchAndDragEvents(ctx);
  }

  if (type === '-fail') {
    return handleFailEvent(ctx);
  }

  if (type === 'turn' || type === 'upkeep') {
    return handleTurnOrUpkeep(ctx);
  }

  if (handleFeedbackEvent(ctx)) {
    return true;
  }

  if (handleItemAndAbilityEvents(ctx)) return true;
  if (handleGimmickEvents(ctx)) return true;

  return false;
}
