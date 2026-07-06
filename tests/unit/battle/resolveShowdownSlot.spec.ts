import { describe, it, expect } from 'vitest';
import { resolveShowdownSlot } from '@/logic/battle/showdownAdapter';
import type { ResolveActiveBattleState } from '@/logic/battle/showdownAdapter';

describe('resolveShowdownSlot unit tests', () => {
  const p1Uid = 'charmeleon-uid-123';
  const p2Uid = 'charizard-uid-456';

  it('debería resolver correctamente el slot en orden estándar (1-based)', () => {
    const activeState: ResolveActiveBattleState = {
      playerRequest: {
        side: {
          pokemon: [
            { ident: 'p1: Charmeleon', details: 'Charmeleon', condition: '100/100', active: true, uid: p1Uid },
            { ident: 'p1: Charizard', details: 'Charizard', condition: '100/100', active: false, uid: p2Uid }
          ]
        }
      },
      enemyRequest: null
    };

    expect(resolveShowdownSlot(activeState, 'player', p1Uid)).toBe(1);
    expect(resolveShowdownSlot(activeState, 'player', p2Uid)).toBe(2);
  });

  it('debería resolver correctamente el slot cuando Showdown reordena la lista (active pokemon en index 0)', () => {
    // Si Charizard (p2Uid) entra al combate, Showdown lo moverá al índice 0 del request
    const activeState: ResolveActiveBattleState = {
      playerRequest: {
        side: {
          pokemon: [
            { ident: 'p1: Charizard', details: 'Charizard', condition: '100/100', active: true, uid: p2Uid },
            { ident: 'p1: Charmeleon', details: 'Charmeleon', condition: '100/100', active: false, uid: p1Uid }
          ]
        }
      },
      enemyRequest: null
    };

    // Ahora Charizard (p2Uid) está en slot 1 para el comando de Showdown, y Charmeleon (p1Uid) está en slot 2
    expect(resolveShowdownSlot(activeState, 'player', p2Uid)).toBe(1);
    expect(resolveShowdownSlot(activeState, 'player', p1Uid)).toBe(2);
  });

  it('debería lanzar un error explícito si el request de Showdown no tiene la lista de Pokémon', () => {
    const activeState: ResolveActiveBattleState = {
      playerRequest: null,
      enemyRequest: null
    };

    expect(() => resolveShowdownSlot(activeState, 'player', p1Uid)).toThrow(
      '[resolveShowdownSlot] Missing request Pokemon list for side player'
    );
  });

  it('debería lanzar un error explícito si el UID buscado no existe en la lista de Pokémon', () => {
    const activeState: ResolveActiveBattleState = {
      playerRequest: {
        side: {
          pokemon: [
            { ident: 'p1: Charmeleon', details: 'Charmeleon', condition: '100/100', active: true, uid: p1Uid }
          ]
        }
      },
      enemyRequest: null
    };

    expect(() => resolveShowdownSlot(activeState, 'player', 'invalid-uid')).toThrow(
      'UID invalid-uid not found in player request Pokemon UIDs'
    );
  });

  it('debería resolver correctamente el slot tras debilitaciones y cambios (faint seq)', () => {
    // Si algunos Pokémon están debilitados (0 fnt), Showdown los reordena en la lista
    const activeState: ResolveActiveBattleState = {
      playerRequest: {
        side: {
          pokemon: [
            { ident: 'p1: Mew 3', details: 'Mew', condition: '100/100', active: true, uid: 'mew-3-uid' },
            { ident: 'p1: Mew 4', details: 'Mew', condition: '100/100', active: false, uid: 'mew-4-uid' },
            { ident: 'p1: Mew 1', details: 'Mew', condition: '0 fnt', active: false, uid: p1Uid },
            { ident: 'p1: Mew 2', details: 'Mew', condition: '0 fnt', active: false, uid: p2Uid }
          ]
        }
      },
      enemyRequest: null
    };

    // Verificar que los slots resueltos (1-based de la lista actual en Showdown) coincidan
    expect(resolveShowdownSlot(activeState, 'player', 'mew-3-uid')).toBe(1);
    expect(resolveShowdownSlot(activeState, 'player', 'mew-4-uid')).toBe(2);
    expect(resolveShowdownSlot(activeState, 'player', p1Uid)).toBe(3);
    expect(resolveShowdownSlot(activeState, 'player', p2Uid)).toBe(4);
  });
});
