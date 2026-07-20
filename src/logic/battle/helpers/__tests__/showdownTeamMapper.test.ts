// src/logic/battle/helpers/__tests__/showdownTeamMapper.test.ts
import test from 'node:test';
import assert from 'node:assert';
import type { Battle } from '@pkmn/sim';
import { ShowdownTeamMapper } from '../showdownTeamMapper.ts';

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
  assert.ok(result);
  assert.ok(result.side);
  assert.strictEqual(result.side!.pokemon[0]!.uid, '80be8f0b-85e6-4893-b550-2c6e8d63bc11');
  assert.strictEqual(result.side!.pokemon[1]!.uid, '7507a15a-778c-4a16-8859-98c29c829b03');
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

  assert.throws(() => {
    ShowdownTeamMapper.injectUidsIntoRequest(mockBattle as unknown as Battle, 'p1', mockRequest);
  }, /No UID found on simulator Pokemon instance/);
});
