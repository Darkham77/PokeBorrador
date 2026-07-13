import { describe, it, expect } from 'vitest';
import { getShowdownNickname, findPokemonByShowdownName } from '../../../src/logic/battle/showdownUidMapper.ts';

describe('Showdown UID Mapper - Unit Tests', () => {
  
  describe('getShowdownNickname', () => {
    it('debería retornar los primeros 8 caracteres de un UID estándar UUID v4', () => {
      const uid = 'aba755ed-9c60-48b9-8400-da73ab30619b';
      const nickname = getShowdownNickname(uid);
      expect(nickname).toBe('aba755ed');
      expect(nickname.length).toBe(8);
    });

    it('debería manejar correctamente UIDs más cortos de 8 caracteres sin cortar', () => {
      const uid = 'short';
      const nickname = getShowdownNickname(uid);
      expect(nickname).toBe('short');
    });

    it('debería retornar un string vacío si el UID es vacío', () => {
      const nickname = getShowdownNickname('');
      expect(nickname).toBe('');
    });

    it('debería ignorar guiones y separar por el primer guión si es un UID estructurado', () => {
      const uid = 'p1-12345678-abcd';
      const nickname = getShowdownNickname(uid);
      expect(nickname).toBe('p1');
    });
  });

  describe('findPokemonByShowdownName', () => {
    const list = [
      { name: 'Mew', uid: '331ece0f-9c60-48b9-8400-da73ab30619b', hp: 342 },
      { name: 'Mew', uid: 'e9acf9ba-ddf2-4a4f-a358-892f56ccae7d', hp: 342 },
      { name: 'Mew', uid: 'd4ecd8df-fb7f-4c0f-9c89-06e2545abe72', hp: 150 },
      { name: 'Bulbasaur', uid: '5d9df1e7-fb7f-4c0f-9c89-06e2545abe72', hp: 100 },
      { name: 'short-uid', uid: 'abc-def', hp: 200 },
      { name: 'Mew', uid: '2a874cad-eff2-484e-9784-e5729a9ba576', hp: 0 }
    ];

    it('debería encontrar un Pokémon por su prefijo exacto de Showdown (8 caracteres)', () => {
      const matched = findPokemonByShowdownName('331ece0f', list);
      expect(matched).toBeDefined();
      expect(matched?.uid).toBe('331ece0f-9c60-48b9-8400-da73ab30619b');
      expect(matched?.name).toBe('Mew');
    });

    it('debería ser insensible a mayúsculas y minúsculas al buscar', () => {
      const matched = findPokemonByShowdownName('E9ACF9BA', list);
      expect(matched).toBeDefined();
      expect(matched?.uid).toBe('e9acf9ba-ddf2-4a4f-a358-892f56ccae7d');
    });

    it('debería encontrar Pokémon con UIDs más cortos', () => {
      const matched = findPokemonByShowdownName('abc-def', list);
      expect(matched).toBeDefined();
      expect(matched?.uid).toBe('abc-def');
    });

    it('debería retornar undefined si el prefijo no coincide con ningún Pokémon de la lista', () => {
      const matched = findPokemonByShowdownName('nonexistent', list);
      expect(matched).toBeUndefined();
    });

    it('debería retornar undefined si la lista está vacía', () => {
      const matched = findPokemonByShowdownName('331ece0f', []);
      expect(matched).toBeUndefined();
    });

    it('debería retornar undefined si el nombre esperado es vacío o nulo', () => {
      const matched = findPokemonByShowdownName('', list);
      expect(matched).toBeUndefined();
    });
  });

  describe('Integridad con Múltiples Pokémon Homónimos (Mismo Nombre y Raza)', () => {
    const list = [
      { name: 'Mew', uid: '331ece0f-9c60-48b9-8400-da73ab30619b', hp: 342 },
      { name: 'Mew', uid: 'e9acf9ba-ddf2-4a4f-a358-892f56ccae7d', hp: 342 },
      { name: 'Mew', uid: 'd4ecd8df-fb7f-4c0f-9c89-06e2545abe72', hp: 150 },
      { name: 'Mew', uid: '5d9df1e7-fb7f-4c0f-9c89-06e2545abe72', hp: 342 },
      { name: 'Mew', uid: 'b315a33e-eff2-484e-9784-e5729a9ba576', hp: 342 },
      { name: 'Mew', uid: '2a874cad-eff2-484e-9784-e5729a9ba576', hp: 0 }
    ];

    it('debería resolver inequívocamente al Mew #1 (HP 342) usando su prefijo de Showdown "331ece0f"', () => {
      const matched = findPokemonByShowdownName('331ece0f', list);
      expect(matched).toBeDefined();
      expect(matched?.uid).toBe('331ece0f-9c60-48b9-8400-da73ab30619b');
      expect(matched?.hp).toBe(342);
    });

    it('debería resolver inequívocamente al Mew #3 (HP 150) usando su prefijo de Showdown "d4ecd8df"', () => {
      const matched = findPokemonByShowdownName('d4ecd8df', list);
      expect(matched).toBeDefined();
      expect(matched?.uid).toBe('d4ecd8df-fb7f-4c0f-9c89-06e2545abe72');
      expect(matched?.hp).toBe(150);
    });

    it('debería resolver inequívocamente al Mew debilitado (#6, HP 0) usando su prefijo de Showdown "2a874cad"', () => {
      const matched = findPokemonByShowdownName('2a874cad', list);
      expect(matched).toBeDefined();
      expect(matched?.uid).toBe('2a874cad-eff2-484e-9784-e5729a9ba576');
      expect(matched?.hp).toBe(0);
    });

    it('debería retornar undefined si el prefijo es de otro Pokémon homónimo no incluido en el equipo', () => {
      const matched = findPokemonByShowdownName('ffffffaa', list);
      expect(matched).toBeUndefined();
    });
  });
});
