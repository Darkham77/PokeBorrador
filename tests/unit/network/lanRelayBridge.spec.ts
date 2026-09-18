/**
 * tests/unit/network/lanRelayBridge.spec.ts
 *
 * Unit tests for LAN WebSocket relay message schema validation.
 */

import { describe, it, expect } from 'vitest';
import * as v from 'valibot';
import { lanRelayMessageSchema, LAN_RELAY_ACTIONS } from '@/logic/db/lanRelayBridge';

describe('lanRelayMessageSchema', () => {
  it('exposes the canonical array of LAN relay actions', () => {
    expect(LAN_RELAY_ACTIONS).toEqual(['subscribe', 'unsubscribe', 'broadcast']);
  });

  it('validates a valid broadcast message successfully', () => {
    const validMessage = {
      action: 'broadcast',
      channel: 'pvp_room_123',
      senderId: 'client_xyz',
      data: { moveId: 'tackle', target: 0 }
    };

    const parsed = v.parse(lanRelayMessageSchema, validMessage);
    expect(parsed.action).toBe('broadcast');
    expect(parsed.channel).toBe('pvp_room_123');
    expect(parsed.senderId).toBe('client_xyz');
  });

  it('validates subscribe and unsubscribe actions', () => {
    const subscribeMsg = { action: 'subscribe', channel: 'chat_global' };
    const unsubscribeMsg = { action: 'unsubscribe', channel: 'chat_global' };

    expect(v.is(lanRelayMessageSchema, subscribeMsg)).toBe(true);
    expect(v.is(lanRelayMessageSchema, unsubscribeMsg)).toBe(true);
  });

  it('validates messages without optional fields (omitted senderId and data)', () => {
    const minimalMsg = { action: 'broadcast', channel: 'system_announcements' };
    expect(v.is(lanRelayMessageSchema, minimalMsg)).toBe(true);
    const parsed = v.parse(lanRelayMessageSchema, minimalMsg);
    expect(parsed.senderId).toBeUndefined();
    expect(parsed.data).toBeUndefined();
  });

  it('validates messages with complex arbitrary objects in data', () => {
    const complexMsg = {
      action: 'broadcast',
      channel: 'battle_sync',
      data: {
        fsmState: 'ACTIVE_BATTLE',
        subState: 'WAIT_INPUT',
        seed: [1, 2, 3, 4]
      }
    };
    expect(v.is(lanRelayMessageSchema, complexMsg)).toBe(true);
  });

  it('rejects malformed messages with invalid action', () => {
    const invalidActionMsg = {
      action: 'unauthorized_action',
      channel: 'pvp_room_123'
    };

    expect(() => v.parse(lanRelayMessageSchema, invalidActionMsg)).toThrow();
  });

  it('rejects messages missing required channel property', () => {
    const missingChannelMsg = {
      action: 'broadcast',
      senderId: 'client_xyz'
    };

    expect(() => v.parse(lanRelayMessageSchema, missingChannelMsg)).toThrow();
  });

  it('rejects non-object primitives and null values', () => {
    expect(() => v.parse(lanRelayMessageSchema, null)).toThrow();
    expect(() => v.parse(lanRelayMessageSchema, 'invalid string')).toThrow();
    expect(() => v.parse(lanRelayMessageSchema, 12345)).toThrow();
  });
});
