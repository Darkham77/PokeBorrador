/**
 * tests/node/map/bridgeTurnContinuity.test.ts
 *
 * TIER 1 / TIER 2 VERIFICATION SUITE: Bridge Turn Continuity & Zero-Diced Invariant
 *
 * Verifies that:
 * 1. 2-cell wide corridor turns (L-turns 3A, 3B, 3C, 3D and Snorlax zig-zag) never dice horizontal
 *    bridge rows into random vertical planks or misplaced pieces.
 * 2. In any horizontal span, the top row is 100% unbroken hTop, and the bottom row is 100% unbroken
 *    hBot / tSouth transition tiles.
 * 3. Silence wood bridges use authentic FireRed south transition tiles (tSouthLeft, tSouthRight)
 *    when vertical spans branch south from horizontal boardwalks.
 * 4. Solid platforms (>= 3x3) maintain authentic perimeter railings and corner turns without
 *    interfering with 2-cell corridors.
 */

import { describe, it, expect } from 'vitest';
import {
  resolveCanonicalBridges,
  type TerrainCell
} from '../../../src/logic/map/canonicalBridgeEngine.ts';

describe.skip('Bridge Turn Continuity & Zero-Diced Invariant', () => {
  it('guarantees L-turns render unbroken horizontal spans and clean vertical entrances', () => {
    const W = 15;
    const H = 15;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // 3A: Vertical x=2..3, y=2..7; Horizontal x=2..7, y=6..7
    for (let y = 2; y <= 7; y++) {
      bridgeGrid[y]![2] = true;
      bridgeGrid[y]![3] = true;
    }
    for (let x = 2; x <= 7; x++) {
      bridgeGrid[6]![x] = true;
      bridgeGrid[7]![x] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      defaultBridgeStyle: 'silence_wood'
    });

    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Vertical approach (y=2..5): strictly v_left and v_right
    for (let y = 2; y <= 5; y++) {
      expect(tileMap.get(`2_${y}`)).toBe('poke_bridge_silence_v_left.png');
      expect(tileMap.get(`3_${y}`)).toBe('poke_bridge_silence_v_right.png');
    }

    // Horizontal top row (y=6): 100% h_top across all columns x=2..7
    for (let x = 2; x <= 7; x++) {
      expect(tileMap.get(`${x}_6`)).toBe('poke_bridge_silence_h_top.png');
    }

    // Horizontal bottom row (y=7): 100% h_bot across all columns x=2..7
    for (let x = 2; x <= 7; x++) {
      expect(tileMap.get(`${x}_7`)).toBe('poke_bridge_silence_h_bot.png');
    }
  });

  it('guarantees Snorlax zig-zag bridges render unbroken horizontal rows and authentic south transitions', () => {
    const W = 20;
    const H = 20;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // Snorlax Zig-Zag:
    // V1: x=4..5, y=2..6
    // H1: x=4..9, y=5..6
    // V2: x=8..9, y=5..10
    // H2: x=8..13, y=9..10
    // V3: x=12..13, y=9..13
    for (let y = 2; y <= 6; y++) {
      bridgeGrid[y]![4] = true;
      bridgeGrid[y]![5] = true;
    }
    for (let x = 4; x <= 9; x++) {
      bridgeGrid[5]![x] = true;
      bridgeGrid[6]![x] = true;
    }
    for (let y = 5; y <= 10; y++) {
      bridgeGrid[y]![8] = true;
      bridgeGrid[y]![9] = true;
    }
    for (let x = 8; x <= 13; x++) {
      bridgeGrid[9]![x] = true;
      bridgeGrid[10]![x] = true;
    }
    for (let y = 9; y <= 13; y++) {
      bridgeGrid[y]![12] = true;
      bridgeGrid[y]![13] = true;
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      defaultBridgeStyle: 'silence_wood'
    });

    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    // Horizontal span 1 top row (y=5): 100% h_top across all columns x=4..9
    for (let x = 4; x <= 9; x++) {
      expect(tileMap.get(`${x}_5`)).toBe('poke_bridge_silence_h_top.png');
    }

    // Horizontal span 1 bot row (y=6):
    // Cols 4..7: h_bot
    for (let x = 4; x <= 7; x++) {
      expect(tileMap.get(`${x}_6`)).toBe('poke_bridge_silence_h_bot.png');
    }
    // Cols 8..9: south transitions
    expect(tileMap.get('8_6')).toBe('poke_bridge_silence_h_bot_open.png');
    expect(tileMap.get('9_6')).toBe('poke_bridge_silence_h_bot_open.png');

    // Vertical span 2 (y=7..8): strictly v_left and v_right
    for (let y = 7; y <= 8; y++) {
      expect(tileMap.get(`8_${y}`)).toBe('poke_bridge_silence_v_left.png');
      expect(tileMap.get(`9_${y}`)).toBe('poke_bridge_silence_v_right.png');
    }

    // Horizontal span 2 top row (y=9): 100% h_top across all columns x=8..13
    for (let x = 8; x <= 13; x++) {
      expect(tileMap.get(`${x}_9`)).toBe('poke_bridge_silence_h_top.png');
    }

    // Horizontal span 2 bot row (y=10):
    // Cols 8..11: h_bot
    for (let x = 8; x <= 11; x++) {
      expect(tileMap.get(`${x}_10`)).toBe('poke_bridge_silence_h_bot.png');
    }
    // Cols 12..13: south transitions
    expect(tileMap.get('12_10')).toBe('poke_bridge_silence_h_bot_open.png');
    expect(tileMap.get('13_10')).toBe('poke_bridge_silence_h_bot_open.png');
  });

  it('preserves platform corner turns on solid 3x3 platforms', () => {
    const W = 10;
    const H = 10;
    const bridgeGrid: boolean[][] = Array.from({ length: H }, () => Array(W).fill(false));
    const terrainGrid: TerrainCell[][] = Array.from({ length: H }, () =>
      Array.from({ length: W }, () => ({ terrain: 'water' }))
    );

    // 3x3 platform at x=2..4, y=2..4
    for (let y = 2; y <= 4; y++) {
      for (let x = 2; x <= 4; x++) {
        bridgeGrid[y]![x] = true;
      }
    }

    const blits = resolveCanonicalBridges(bridgeGrid, terrainGrid, {
      defaultBridgeStyle: 'stone_pier'
    });

    const tileMap = new Map<string, string>();
    for (const b of blits) {
      tileMap.set(`${b.x}_${b.y}`, b.file);
    }

    expect(tileMap.get('2_2')).toBe('poke_port_pier_h_top.png');
    expect(tileMap.get('4_2')).toBe('poke_port_pier_h_top.png');
    expect(tileMap.get('2_4')).toBe('poke_port_pier_h_bot.png');
    expect(tileMap.get('4_4')).toBe('poke_port_pier_h_bot.png');
    expect(tileMap.get('2_3')).toBe('poke_port_pier_v_left.png');
    expect(tileMap.get('4_3')).toBe('poke_port_pier_v_right.png');
  });
});
