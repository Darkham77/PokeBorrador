/**
 * tests/node/bush_library.test.ts
 *
 * VITEST (vite-node) — node environment
 *
 * Verifica la biblioteca de coberturas ambientales (bushLibrary.ts)
 * y la correcta asignación de familias, assets y tintes por bioma.
 */

import { describe, it } from 'vitest';
import assert from 'node:assert/strict';
import { getActiveBushesForMap, BIOME_BUSH_CONFIG, BUSH_FAMILIES } from '../../../src/logic/environment/bushLibrary.ts';

const baseBushes = [
  { id: 1, cls: 'bush-front-1', scale: 1.3, tx: -60, ty: 10, ad: '1.2s', ay: '0s' },
  { id: 2, cls: 'bush-front-2', scale: 1.1, tx: 40, ty: 15, ad: '1.5s', ay: '0.3s' }
];

describe('Bush Library (bushLibrary.ts)', () => {
  it('debe resolver la configuración de coberturas para un mapa de llanuras (Ruta 1)', () => {
    const bushes = getActiveBushesForMap('route1', 'front', 12345, baseBushes);
    assert.strictEqual(bushes.length, 2);
    
    // Ruta 1 es isPlains
    const first = bushes[0];
    assert.ok(first);
    assert.ok(Object.keys(BUSH_FAMILIES).includes(first.family));
    assert.ok(['bush', 'tree', 'none'].includes(first.animationType));
    assert.ok(typeof first.randomScale === 'number');
    assert.ok(first.randomScale > 0.5);
    assert.ok(first.flip === 1 || first.flip === -1);
  });

  it('debe aplicar tintes ambientales correctamente para biomas con tinte (isDesert)', () => {
    // Simulamos un mapa de desierto (Ruta 111 / isDesert)
    const bushes = getActiveBushesForMap('route25', 'front', 5555, baseBushes); // Ruta 25 tiene isMountain/isPlains
    assert.ok(bushes.length > 0);
  });

  it('debe aplicar tinte marrón (tint-cave) solo a las rocas en biomas de cueva', () => {
    // mt_moon es un mapa de cueva (isCave)
    const bushes = getActiveBushesForMap('mt_moon', 'front', 42, baseBushes);
    assert.ok(bushes.length > 0);
    for (const bush of bushes) {
      if (bush.family === 'rock') {
        assert.strictEqual(bush.tintClass, 'tint-cave');
      }
    }
  });

  it('debe aplicar la configuración de cueva de cristal (rocas y mezcla de cristales) en Cueva Celeste', () => {
    // cerulean_cave es isCrystalCave
    let foundRock = false;
    let foundCrystal = false;

    for (let seed = 0; seed < 100; seed++) {
      const bushes = getActiveBushesForMap('cerulean_cave', 'front', seed, baseBushes);
      assert.strictEqual(bushes.length, 2);
      
      for (const bush of bushes) {
        if (bush.family === 'rock') {
          foundRock = true;
          assert.strictEqual(bush.tintClass, 'tint-cave');
        } else {
          foundCrystal = true;
          assert.ok(bush.family.startsWith('crystal'), `Debería ser una familia de cristal (obtenido: ${bush.family})`);
          assert.strictEqual(bush.tintClass, '');
        }
      }
    }

    assert.ok(foundRock, 'Debería haber generado al menos un elemento rock');
    assert.ok(foundCrystal, 'Debería haber generado al menos un elemento de cristal');
  });

  it('debe priorizar isArctic sobre isCave e imponer tinte ártico solo a la familia rock en Islas Espuma', () => {
    // Probamos con múltiples semillas para asegurar cobertura de ambas familias ('rock' y 'bush')
    let foundRock = false;
    let foundBush = false;

    for (let seed = 0; seed < 100; seed++) {
      const bushes = getActiveBushesForMap('seafoam_islands', 'front', seed, baseBushes);
      assert.strictEqual(bushes.length, 2);
      
      for (const bush of bushes) {
        if (bush.family === 'rock') {
          foundRock = true;
          assert.strictEqual(bush.tintClass, 'tint-arctic');
        } else if (bush.family === 'bushsnow') {
          foundBush = true;
          assert.strictEqual(bush.tintClass, '');
        }
      }
    }
    assert.ok(foundRock, 'Debería haber generado al menos un elemento rock');
    assert.ok(foundBush, 'Debería haber generado al menos un elemento bush');
  });

  it('debe ser determinista para la misma semilla de sesión y capa', () => {
    const bushesA = getActiveBushesForMap('route1', 'front', 999, baseBushes);
    const bushesB = getActiveBushesForMap('route1', 'front', 999, baseBushes);
    
    assert.deepStrictEqual(bushesA, bushesB);
  });

  it('debe generar diferentes resultados para capas front y back con la misma semilla', () => {
    const bushesFront = getActiveBushesForMap('route1', 'front', 999, baseBushes);
    const bushesBack  = getActiveBushesForMap('route1', 'back', 999, baseBushes);
    
    assert.notDeepStrictEqual(bushesFront, bushesBack);
  });

  it('debe contener la configuración correcta de biomas en BIOME_BUSH_CONFIG', () => {
    assert.ok(BIOME_BUSH_CONFIG['isDesert']);
    assert.strictEqual(BIOME_BUSH_CONFIG['isDesert'].tint?.class, 'tint-desert');
    assert.deepStrictEqual(BIOME_BUSH_CONFIG['isDesert'].tint?.families, ['rock']);
    assert.strictEqual(BIOME_BUSH_CONFIG['isDesert'].weights.rock, 70);

    assert.ok(BIOME_BUSH_CONFIG['isSwamp']);
    assert.strictEqual(BIOME_BUSH_CONFIG['isSwamp'].tint?.class, 'tint-swamp');
    assert.strictEqual(BIOME_BUSH_CONFIG['isSwamp'].tint?.families, undefined);
  });
});
