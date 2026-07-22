// tests/node/battle/showdownTeamMapper.test.ts
import { test, expect } from 'vitest';
import type { Battle } from '@pkmn/sim';
import { ShowdownTeamMapper } from '../../../src/logic/battle/helpers/showdownTeamMapper.ts';

test('ShowdownTeamMapper.injectUidsIntoRequest correctly maps and injects UIDs', () => {
  // Mock Battle instance
  const mockBattle = {
    p1: {
      pokemon: [
        { uid: '80be8f0b-85e6-4893-b550-2c6e8d63bc11', name: 'Mew' },
        { uid: '7507a15a-778c-4a16-8859-98c29c829b03', name: 'Mew' }
      ]
    }
  };

  // Mock Request with truncated nicknames in ident
  const mockRequest = {
    side: {
      pokemon: [
        { ident: 'p1a: 80be8f0b' },
        { ident: 'p1a: 7507a15a' }
      ]
    }
  };

  // Run mapper
  const result = ShowdownTeamMapper.injectUidsIntoRequest(mockBattle as unknown as Battle, 'p1', mockRequest);

  // Assert
  expect(result).toBeTruthy();
  if (result) {
    expect(result.side).toBeTruthy();
    expect(result.side!.pokemon[0]!.uid).toBe('80be8f0b-85e6-4893-b550-2c6e8d63bc11');
    expect(result.side!.pokemon[1]!.uid).toBe('7507a15a-778c-4a16-8859-98c29c829b03');
  }
});

test('ShowdownTeamMapper.injectUidsIntoRequest throws error on missing matching UID', () => {
  const mockBattle = {
    p1: {
      pokemon: [
        { uid: '80be8f0b-85e6-4893-b550-2c6e8d63bc11', name: 'Mew' }
      ]
    }
  };

  const mockRequest = {
    side: {
      pokemon: [
        { ident: 'p1a: 7507a15a' } // non-existent prefix
      ]
    }
  };

  expect(() => {
    ShowdownTeamMapper.injectUidsIntoRequest(mockBattle as unknown as Battle, 'p1', mockRequest);
  }).toThrow(/No UID found on simulator Pokemon instance/);
});
