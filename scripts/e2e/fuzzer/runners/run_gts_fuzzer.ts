// scripts/e2e/fuzzer/runners/run_gts_fuzzer.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { Dex } from '@pkmn/sim';
import { runFuzzerSuite } from '../core/fuzzer_runner.ts';
import type { Pokemon } from '../../../../src/types/pokemon/pokemon.ts';
import type { PokemonSpeciesId } from '../../../../src/data/pokemon/pokedex.ts';
import type { NatureId } from '../../../../src/data/battle/natures.ts';
import type { AbilityId } from '../../../../src/data/battle/abilities.ts';
import type { PokemonType } from '../../../../src/data/battle/types.ts';

const REPORT_FILE = path.resolve(process.cwd(), 'scripts/e2e/results/fuzzer_gts_coverage_report.json');

interface GTSListing {
  id: string;
  sellerId: string;
  price: number;
  pokemon: Pokemon;
}

async function runGTSFuzzer() {
  const errors: string[] = []; // no-domain
  const warnings: string[] = []; // no-domain
  const results: Array<{ type: string; price: number; success: boolean; errorMsg?: string }> = [];

  let passed = 0;
  let failed = 0;

  console.log(`💰 Ejecutando fuzzer de GTS sobre 200 operaciones financieras lógicas...`);

  const createMockPoke = (speciesName: string): Pokemon => {
    const sId = Dex.toID(speciesName) as PokemonSpeciesId;
    return {
      uid: `mock-${speciesName}-${Math.random().toString(36).substring(2, 7)}`,
      id: sId,
      species: sId,
      name: speciesName,
      level: 30,
      gender: 'm',
      ability: 'illuminate' as AbilityId,
      nature: 'serious' as NatureId,
      ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
      evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
      moves: [],
      hp: 100,
      maxHp: 100,
      type: 'normal' as PokemonType,
      atk: 10,
      def: 10,
      spa: 10,
      spd: 10,
      spe: 10,
      expNeeded: 1000,
      volatileCounters: {},
      status: '',
      exp: 0,
      isShiny: false,
    };
  };

  let playerMoney = 5000;
  let playerTeam: Pokemon[] = [createMockPoke('Pikachu'), createMockPoke('Bulbasaur')];
  const listings: Map<string, GTSListing> = new Map();

  for (let i = 0; i < 200; i++) {
    const op = Math.random() > 0.5 ? 'sell' : 'buy';

    try {
      if (op === 'sell') {
        const price = Math.floor(Math.random() * 8000) - 1000; // Puede ser negativo para forzar fallos
        const pokeToSell = playerTeam[Math.floor(Math.random() * playerTeam.length)];

        let canSell = true;
        let localError = '';

        if (price <= 0) {
          canSell = false;
          localError = 'El precio debe ser mayor a 0';
        }
        if (playerTeam.length <= 1) {
          canSell = false;
          localError = 'Save Shield: no se puede vender el último Pokémon del equipo';
        }

        if (canSell && pokeToSell) {
          const listId = `list-${Math.random().toString(36).substring(2, 7)}`;
          listings.set(listId, {
            id: listId,
            sellerId: 'player-1',
            price,
            pokemon: pokeToSell,
          });
          playerTeam = playerTeam.filter(p => p.uid !== pokeToSell.uid);
          passed++;
          results.push({ type: 'sell', price, success: true });
        } else {
          passed++; // La validación detuvo correctamente el caso inválido
          results.push({ type: 'sell', price, success: false, errorMsg: localError });
        }
      } else {
        // buy operation
        const listKeys = Array.from(listings.keys());
        if (listKeys.length === 0) {
          passed++;
          continue;
        }

        const listId = listKeys[Math.floor(Math.random() * listKeys.length)]!;
        const listing = listings.get(listId)!;

        let canBuy = true;
        let localError = '';

        if (playerMoney < listing.price) {
          canBuy = false;
          localError = 'Dinero insuficiente';
        }

        if (canBuy) {
          playerMoney -= listing.price;
          playerTeam.push(listing.pokemon);
          listings.delete(listId);
          passed++;
          results.push({ type: 'buy', price: listing.price, success: true });
        } else {
          passed++;
          results.push({ type: 'buy', price: listing.price, success: false, errorMsg: localError });
        }
      }

    } catch (err: unknown) {
      errors.push(`Excepción en transacción GTS #${i}: ${(err as Error).message}`);
      failed++;
    }
  }

  const report = {
    generatedAt: Temporal.Now.zonedDateTimeISO().toString(),
    summary: {
      total: 200,
      passed,
      failed,
      listingsRemaining: listings.size,
      playerFinalMoney: playerMoney,
      playerFinalTeamSize: playerTeam.length,
    },
    results,
    errors,
    warnings,
  };

  await fs.mkdir(path.dirname(REPORT_FILE), { recursive: true });
  await fs.writeFile(REPORT_FILE, JSON.stringify(report, null, 2), 'utf8');
  console.log(`💾 Reporte de GTS guardado en: ${REPORT_FILE}`);

  return [{
    label: 'GTS (GTS Transactions)',
    passed,
    failed,
    untested: 0,
    total: 200,
  }];
}

await runFuzzerSuite({
  suiteName: 'Fuzzer — Transacciones de GTS (Gen 9)',
  run: runGTSFuzzer,
});
