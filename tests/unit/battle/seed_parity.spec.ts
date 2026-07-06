import { describe, it, expect } from 'vitest';
import { PRNG, Battle, type ID } from '@pkmn/sim';

describe('PRNG Seed Parity unit tests', () => {
  const seedNums = [12345, 6789, 24680, 13579] as [number, number, number, number];
  const seedString = '12345,6789,24680,13579';

  it('debería generar la misma secuencia aleatoria usando array vs string en la clase PRNG', () => {
    // PRNG instanciado con array de números
    const prngFromArray = new PRNG(seedNums as unknown as `${number},${string}`);
    // PRNG instanciado con el string mapeado
    const prngFromString = new PRNG(seedString as unknown as `${number},${string}`);

    // Generar 50 números aleatorios y verificar que coincidan exactamente en orden y valor
    for (let i = 0; i < 50; i++) {
      const valArray = prngFromArray.random();
      const valString = prngFromString.random();
      expect(valArray).toBe(valString);
    }
  });

  it('debería inicializar combates de @pkmn/sim con resultados idénticos usando semilla string vs array', () => {
    const battleFromArray = new Battle({
      formatid: 'gen9customgame' as ID,
      seed: seedNums as unknown as `${number},${string}`
    });

    const battleFromString = new Battle({
      formatid: 'gen9customgame' as ID,
      seed: seedString as unknown as `${number},${string}`
    });

    // Verificar que el generador de números aleatorios interno de ambas batallas empiece con el mismo estado
    for (let i = 0; i < 10; i++) {
      expect(battleFromArray.prng.random()).toBe(battleFromString.prng.random());
    }
  });
});
