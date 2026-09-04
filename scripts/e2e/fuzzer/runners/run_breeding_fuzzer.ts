// scripts/e2e/fuzzer/runners/run_breeding_fuzzer.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { checkCompatibility, getEggSpecies, calculateInheritance, inheritNature, inheritMoves } from '../../../../src/logic/breeding/breedingEngine.ts';
import { Dex } from '@pkmn/sim';
import type { Pokemon, PokemonGender, PokemonIVs } from '../../../../src/types/pokemon/pokemon.ts';
import { requirePokemonSpeciesId, isPokemonSpeciesId } from '../../../../src/data/pokemon/pokedex.ts';

const REPORT_FILE = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_breeding_coverage_report.json');

async function runBreedingFuzzer() {
  const errors: string[] = []; // no-domain: Non-domain utility collection or data structure
  const warnings: string[] = []; // no-domain: Non-domain utility collection or data structure
  
  // Obtener todas las especies válidas en nuestro Pokédex que tienen grupos de huevo definidos
  const speciesList = Array.from(Dex.species.all()).filter(s => s.exists && s.eggGroups && isPokemonSpeciesId(Dex.toID(s.name)));
  
  let totalSimulations = 0;
  let compatibleCount = 0;
  let incompatibleCount = 0;
  let passed = 0;
  let failed = 0;

  console.log(`🧬 Iniciando Fuzzer Matricial Completo: Cruzando todas las ${speciesList.length} especies entre sí (${speciesList.length * speciesList.length} combinaciones)...`);

  const createMockPoke = (speciesName: string, gender: PokemonGender, customId: number): Pokemon => {
    const speciesId = requirePokemonSpeciesId(Dex.toID(speciesName));
    const ivs: PokemonIVs = customId === 1
      ? { hp: 31, atk: 30, def: 29, spa: 28, spd: 27, spe: 26 }
      : { hp: 5, atk: 6, def: 7, spa: 8, spd: 9, spe: 10 };
    return {
      uid: `mock-${speciesName}-${customId}`,
      id: speciesId,
      species: speciesId,
      name: speciesName,
      level: 50,
      gender,
      ability: customId === 1 ? 'overgrow' : 'blaze',
      nature: customId === 1 ? 'adamant' : 'modest',
      ivs,
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [{ id: 'pound', name: 'Destructor', pp: 35, maxPP: 35 }],
      hp: 100,
      maxHp: 100,
      atk: 50,
      def: 50,
      spa: 50,
      spd: 50,
      spe: 50,
      status: '',
      exp: 0,
      expNeeded: 100,
      isShiny: false,
      type: 'normal',
    };
  };

  // Matriz completa: cruzamos todas las especies de la base de datos entre sí
  for (let i = 0; i < speciesList.length; i++) {
    const sA = speciesList[i]!;
    
    for (let j = 0; j < speciesList.length; j++) {
      const sB = speciesList[j]!;
      totalSimulations++;

      let genderA: PokemonGender = 'm';
      let genderB: PokemonGender = 'f';

      if (sA.id === 'ditto') {
        genderA = null;
        genderB = sB.gender === 'N' ? null : 'm';
      } else if (sB.id === 'ditto') {
        genderA = sA.gender === 'N' ? null : 'f';
        genderB = null;
      } else {
        genderA = 'm';
        genderB = 'f';
      }

      const pA = createMockPoke(sA.name, genderA, 1);
      const pB = createMockPoke(sB.name, genderB, 2);

      try {
        const comp = checkCompatibility(pA, pB);
        const isDittoA = pA.id === 'ditto';
        const isDittoB = pB.id === 'ditto';

        if (comp.level > 0) {
          compatibleCount++;

          // Consistencia de género en compatibles
          if (pA.gender === pB.gender && !isDittoA && !isDittoB) {
            errors.push(`[Error] Cruce compatible con mismo género sin Ditto: ${pA.name} x ${pB.name}`);
            failed++;
            continue;
          }

          // Especie de Huevo
          const eggSpecies = getEggSpecies(isDittoA ? pB.id : pA.id);
          if (!eggSpecies) {
            errors.push(`[Error] Especie de huevo indefinida para madre compatible: ${pA.name} x ${pB.name}`);
            failed++;
            continue;
          }

          // Validar que la especie de huevo sea válida en el Dex de Showdown
          const dexSpecies = Dex.species.get(eggSpecies);
          if (!dexSpecies.exists) {
            errors.push(`[Error] Especie de huevo resultante '${eggSpecies}' no existe en el Dex de Showdown: ${pA.name} x ${pB.name}`);
            failed++;
            continue;
          }

          // Validación Genética Rápida en Cruces Exitosos
          // 1. Everstone
          const nat = inheritNature(pA, pB, 'everstone', '');
          if (nat !== pA.nature) {
            errors.push(`[Error] Everstone falló: esperado '${pA.nature}', obtenido '${nat}' en cruce ${pA.name} x ${pB.name}`);
            failed++;
            continue;
          }

          // 2. Power Items
          const ivs = calculateInheritance(pA, pB, 'powerweight', 'powerbracer') as Record<string, number>; // open-record: Generic key-value data dictionary container
          if (ivs.hp !== pA.ivs.hp || ivs.atk !== pB.ivs.atk) {
            errors.push(`[Error] Power items fallaron en cruce ${pA.name} x ${pB.name}`);
            failed++;
            continue;
          }

          // Validar límites numéricos de todos los IVs resultantes [0, 31]
          const stats = ['hp', 'atk', 'def', 'spa', 'spd', 'spe']; // no-domain: Non-domain utility collection or data structure
          let ivsRangeValid = true;
          for (const s of stats) {
            const val = ivs[s];
            if (val !== undefined && (val < 0 || val > 31)) {
              errors.push(`[Error] IV fuera de rango [0-31] en stat '${s}': valor ${val} en cruce ${pA.name} x ${pB.name}`);
              ivsRangeValid = false;
              failed++;
              break;
            }
          }
          if (!ivsRangeValid) continue;

          // 3. Validar movimientos heredados
          const inheritedMoves = inheritMoves(pA, pB, requirePokemonSpeciesId(eggSpecies));
          if (inheritedMoves.length > 4) {
            errors.push(`[Error] Demasiados movimientos heredados (${inheritedMoves.length}) en cruce ${pA.name} x ${pB.name}`);
            failed++;
            continue;
          }
          let movesValid = true;
          for (const mId of inheritedMoves) {
            const move = Dex.moves.get(mId);
            if (!move.exists) {
              errors.push(`[Error] Movimiento heredado '${mId}' no existe en el Dex de Showdown en cruce ${pA.name} x ${pB.name}`);
              movesValid = false;
              failed++;
              break;
            }
          }
          if (!movesValid) continue;

          passed++;
        } else {
          incompatibleCount++;
          passed++; // Las incompatibilidades lógicas correctas son un éxito para el fuzzer
        }
      } catch (err: unknown) {
        errors.push(`[Excepción] Falló cruce ${pA.name} x ${pB.name}: ${(err as Error).message}`);
        failed++;
      }
    }
  }

  const report = {
    generatedAt: Temporal.Now.zonedDateTimeISO().toString(),
    summary: {
      total: totalSimulations,
      passed,
      failed,
      compatibleCount,
      incompatibleCount,
    },
    errors: errors.slice(0, 100), // Guardar las primeras 100 fallas para análisis
    warnings,
  };

  await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');

  console.log(`💾 Reporte matricial guardado en: ${REPORT_FILE}`);
  console.log(`  Crianza Matricial Completa :  ${passed} PASS / ${failed} FAIL / 0 UNTESTED`);
  console.log(`  └─ Total cruces analizados: ${totalSimulations}`);
  console.log(`  └─ Compatibles: ${compatibleCount} | Incompatibles: ${incompatibleCount}`);

  if (failed > 0 || errors.length > 0) {
    throw new Error(`Fuzzer Matricial de Breeding falló con ${failed} errores.`);
  }
}

if (process.argv[1] === import.meta.filename) {
  runBreedingFuzzer().catch(err => {
    console.error(err);
    process.exit(1);
  });
}
export { runBreedingFuzzer };
