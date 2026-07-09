/**
 * tests/node/math_global.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Verifica las herramientas matemáticas globales y el PRNG centralizado en math.ts.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { mulberry32, hashString } from '../../../src/logic/utils/math.ts';

describe('Global Math Utilities (math.ts)', () => {
  describe('mulberry32 PRNG', () => {
    it('debe generar valores deterministas a partir de la misma semilla', () => {
      const prng1 = mulberry32(54321);
      const prng2 = mulberry32(54321);
      assert.strictEqual(prng1(), prng2());
      assert.strictEqual(prng1(), prng2());
    });

    it('debe generar valores dentro del rango [0, 1)', () => {
      const prng = mulberry32(10101);
      for (let i = 0; i < 100; i++) {
        const val = prng();
        assert.ok(val >= 0 && val < 1, `Valor fuera de rango: ${val}`);
      }
    });

    it('semillas diferentes deben producir secuencias diferentes', () => {
      const prng1 = mulberry32(111);
      const prng2 = mulberry32(222);
      assert.notStrictEqual(prng1(), prng2());
    });
  });

  describe('hashString DJB2', () => {
    it('debe ser determinista para la misma cadena', () => {
      assert.strictEqual(hashString('pallet_town'), hashString('pallet_town'));
    });

    it('cadenas diferentes deben producir hashes diferentes', () => {
      assert.notStrictEqual(hashString('route1'), hashString('route2'));
    });

    it('debe devolver un número entero sin signo de 32 bits', () => {
      const hash = hashString('viridian_forest');
      assert.ok(hash >= 0 && hash <= 4294967295, `Hash fuera de rango 32-bit: ${hash}`);
    });
  });
});
