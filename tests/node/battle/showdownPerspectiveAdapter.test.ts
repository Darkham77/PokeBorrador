import { describe, it, expect } from 'vitest';
import { ShowdownPerspectiveAdapter } from '@/logic/battle/helpers/showdownPerspectiveAdapter';

describe('ShowdownPerspectiveAdapter', () => {
  it('should invert individual protocol lines between p1 and p2 seats', () => {
    const p1MoveLine = '|move|p1a: Charizard|Flamethrower|p2a: Blastoise';
    const invertedMove = ShowdownPerspectiveAdapter.invertLine(p1MoveLine);
    expect(invertedMove).toBe('|move|p2a: Charizard|Flamethrower|p1a: Blastoise');

    const damageLine = '|-damage|p2a: Blastoise|45/100';
    expect(ShowdownPerspectiveAdapter.invertLine(damageLine)).toBe('|-damage|p1a: Blastoise|45/100');

    const switchLine = '|switch|p1a: Pikachu|Pikachu, L50, M|100/100|[uids]p1a:Pikachu=pk-1';
    expect(ShowdownPerspectiveAdapter.invertLine(switchLine)).toBe(
      '|switch|p2a: Pikachu|Pikachu, L50, M|100/100|[uids]p2a:Pikachu=pk-1'
    );

    const winP1 = '|win|p1';
    expect(ShowdownPerspectiveAdapter.invertLine(winP1)).toBe('|win|p2');

    const winP2 = '|win|p2';
    expect(ShowdownPerspectiveAdapter.invertLine(winP2)).toBe('|win|p1');
  });

  it('should invert an array of stream lines cleanly without collisions', () => {
    const stream = [
      '|turn|1',
      '|move|p1a: Jolteon|Thunderbolt|p2a: Gyarados',
      '|-supereffective|p2a: Gyarados',
      '|-damage|p2a: Gyarados|0 fnt',
      '|faint|p2a: Gyarados',
      '|win|p1'
    ];

    const inverted = ShowdownPerspectiveAdapter.invertStream(stream);
    expect(inverted).toEqual([
      '|turn|1',
      '|move|p2a: Jolteon|Thunderbolt|p1a: Gyarados',
      '|-supereffective|p1a: Gyarados',
      '|-damage|p1a: Gyarados|0 fnt',
      '|faint|p1a: Gyarados',
      '|win|p2'
    ]);
  });

  it('should invert SideID correctly with 4-seat support', () => {
    expect(ShowdownPerspectiveAdapter.invertSide('p1')).toBe('p2');
    expect(ShowdownPerspectiveAdapter.invertSide('p2')).toBe('p1');
    expect(ShowdownPerspectiveAdapter.invertSide('p3')).toBe('p4');
    expect(ShowdownPerspectiveAdapter.invertSide('p4')).toBe('p3');
  });

  it('should map seat to local perspective and vice versa', () => {
    // For Host (seat = p1)
    expect(ShowdownPerspectiveAdapter.mapSeatToLocalSide('p1', 'p1')).toBe('player');
    expect(ShowdownPerspectiveAdapter.mapSeatToLocalSide('p2', 'p1')).toBe('enemy');
    expect(ShowdownPerspectiveAdapter.mapLocalSideToSeat('player', 'p1')).toBe('p1');
    expect(ShowdownPerspectiveAdapter.mapLocalSideToSeat('enemy', 'p1')).toBe('p2');

    // For Guest (seat = p2)
    expect(ShowdownPerspectiveAdapter.mapSeatToLocalSide('p2', 'p2')).toBe('player');
    expect(ShowdownPerspectiveAdapter.mapSeatToLocalSide('p1', 'p2')).toBe('enemy');
    expect(ShowdownPerspectiveAdapter.mapLocalSideToSeat('player', 'p2')).toBe('p2');
    expect(ShowdownPerspectiveAdapter.mapLocalSideToSeat('enemy', 'p2')).toBe('p1');
  });
});
