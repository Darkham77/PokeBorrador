import type { SideID } from '@pkmn/sim';

/**
 * ShowdownPerspectiveAdapter
 * Translates Showdown protocol lines, seats, and choices between authoritative seats
 * (p1/p2) and local client perspective (player/enemy).
 */
export class ShowdownPerspectiveAdapter {
  /**
   * Inverts a single Showdown protocol line between p1 and p2.
   */
  static invertLine(line: string): string {
    if (!line) return line;

    // Use placeholders to avoid collision during two-way swap
    const P1A_PLACEHOLDER = '__SWAP_P1A__';
    const P2A_PLACEHOLDER = '__SWAP_P2A__';
    const P1_PLACEHOLDER = '__SWAP_P1__';
    const P2_PLACEHOLDER = '__SWAP_P2__';

    let result = line;

    // Swap p1a: and p2a:
    result = result.replaceAll('p1a:', P1A_PLACEHOLDER);
    result = result.replaceAll('p2a:', P2A_PLACEHOLDER);
    result = result.replaceAll(P1A_PLACEHOLDER, 'p2a:');
    result = result.replaceAll(P2A_PLACEHOLDER, 'p1a:');

    // Swap p1b: and p2b: (for doubles / 4 seats compatibility)
    result = result.replaceAll('p1b:', '__SWAP_P1B__');
    result = result.replaceAll('p2b:', '__SWAP_P2B__');
    result = result.replaceAll('__SWAP_P1B__', 'p2b:');
    result = result.replaceAll('__SWAP_P2B__', 'p1b:');

    // Swap p1: and p2:
    result = result.replaceAll('p1:', P1_PLACEHOLDER);
    result = result.replaceAll('p2:', P2_PLACEHOLDER);
    result = result.replaceAll(P1_PLACEHOLDER, 'p2:');
    result = result.replaceAll(P2_PLACEHOLDER, 'p1:');

    // Swap |win|p1 and |win|p2
    if (result.startsWith('|win|p1')) {
      result = '|win|p2';
    } else if (result.startsWith('|win|p2')) {
      result = '|win|p1';
    }

    return result;
  }

  /**
   * Inverts a stream of Showdown protocol lines.
   */
  static invertStream(lines: string[]): string[] {
    return lines.map((line) => this.invertLine(line));
  }

  /**
   * Inverts a SideID between p1 and p2 (or p3 and p4 for 4-seat compatibility).
   */
  static invertSide(side: SideID): SideID {
    if (side === 'p1') return 'p2';
    if (side === 'p2') return 'p1';
    if (side === 'p3') return 'p4';
    if (side === 'p4') return 'p3';
    return side;
  }

  /**
   * Maps a Showdown seat (p1..p4) to local perspective ('player' | 'enemy') given the local client's seat.
   */
  static mapSeatToLocalSide(seat: SideID, mySeat: SideID): 'player' | 'enemy' {
    return seat === mySeat ? 'player' : 'enemy';
  }

  /**
   * Maps a local perspective ('player' | 'enemy') to Showdown seat given the local client's seat.
   */
  static mapLocalSideToSeat(side: 'player' | 'enemy', mySeat: SideID): SideID {
    if (side === 'player') return mySeat;
    return this.invertSide(mySeat);
  }
}
