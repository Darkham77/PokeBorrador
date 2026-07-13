import { describe, it, expect } from 'vitest';
import { ShowdownTeamResolver } from '@/logic/battle/showdownTeamResolver';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('ShowdownTeamResolver unit tests', () => {
  const p1Uid = 'charmeleon-uid-123';
  const p2Uid = 'charizard-uid-456';
  const p3Uid = 'blastoise-uid-789';

  const mockTeam: Pokemon[] = [
    { uid: p1Uid, name: 'Charmeleon', hp: 100, maxHp: 100, status: null } as unknown as Pokemon,
    { uid: p2Uid, name: 'Charizard', hp: 100, maxHp: 100, status: null } as unknown as Pokemon,
    { uid: p3Uid, name: 'Blastoise', hp: 80, maxHp: 100, status: null } as unknown as Pokemon,
  ];

  const mockRequest = {
    side: {
      pokemon: [
        { ident: 'p1: Charizard', details: 'Charizard', condition: '100/100', active: true, uid: p2Uid },
        { ident: 'p1: Charmeleon', details: 'Charmeleon', condition: '100/100', active: false, uid: p1Uid },
        { ident: 'p1: Blastoise', details: 'Blastoise', condition: '80/100', active: false, uid: p3Uid }
      ]
    }
  };

  it('debería resolver correctamente el slot a partir del UID (getShowdownSlotForUid)', () => {
    expect(ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, p2Uid)).toBe(1);
    expect(ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, p1Uid)).toBe(2);
    expect(ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, p3Uid)).toBe(3);
  });

  it('debería lanzar un error descriptivo si el UID no se encuentra en el request', () => {
    expect(() => ShowdownTeamResolver.getShowdownSlotForUid(mockRequest, 'invalid-uid')).toThrow(
      '[ShowdownTeamResolver] UID "invalid-uid" no encontrado en los UIDs del request'
    );
  });

  it('debería resolver correctamente el Pokémon a partir del slot de Showdown (getPokemonByShowdownSlot)', () => {
    const poke1 = ShowdownTeamResolver.getPokemonByShowdownSlot(mockTeam, mockRequest, 1);
    expect(poke1?.uid).toBe(p2Uid);

    const poke2 = ShowdownTeamResolver.getPokemonByShowdownSlot(mockTeam, mockRequest, 2);
    expect(poke2?.uid).toBe(p1Uid);
  });

  it('debería ordenar correctamente el equipo según Showdown (getShowdownOrder)', () => {
    const ordered = ShowdownTeamResolver.getShowdownOrder(mockTeam, mockRequest);
    expect(ordered[0].uid).toBe(p2Uid); // Activo primero
    expect(ordered[1].uid).toBe(p1Uid);
    expect(ordered[2].uid).toBe(p3Uid);
  });

  it('debería fallar si se busca un slot inexistente o inválido', () => {
    expect(() => ShowdownTeamResolver.getPokemonByShowdownSlot(mockTeam, mockRequest, 99)).toThrow(
      '[ShowdownTeamResolver] Slot de Showdown 99 no tiene un Pokémon válido'
    );
  });
});
