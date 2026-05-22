import fs from 'node:fs';
import path from 'node:path';
import { Battle } from '@pkmn/sim';
import { parseShowdownLog } from './sandbox_db/ShowdownParser.ts';

const dbPath = path.resolve(import.meta.dirname, './sandbox_db/data/showdown_db.json');
const dbRaw = fs.readFileSync(dbPath, 'utf-8');
const showdownDB = JSON.parse(dbRaw);

interface ShowdownMove {
  id: string;
  name: string;
}

const allMoves = Object.values(showdownDB.moves) as ShowdownMove[];

let totalMovesTested = 0;
let failedMoves = 0;

const unhandledTypes = new Set<string>();
const englishTextIssues = new Set<string>();

const DUMMY_POKEMON_1 = {
  name: 'Smeargle',
  species: 'smeargle',
  level: 100,
  moves: [] as string[],
  item: '',
  ability: 'owntempo',
  nature: 'Hardy',
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  gender: 'M',
};
const DUMMY_POKEMON_2 = {
  name: 'Blissey',
  species: 'blissey',
  level: 100,
  moves: ['splash'],
  item: '',
  ability: 'naturalcure',
  nature: 'Hardy',
  evs: { hp: 0, atk: 0, def: 0, spa: 0, spd: 0, spe: 0 },
  ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 },
  gender: 'F',
};

for (const move of allMoves) {
  try {
    // Solo simulamos movimientos que hacen algo en combate
    if (move.id === 'struggle') continue; // Struggle es especial
    
    // Configurar la batalla
    const battle = new Battle({ formatid: 'gen3customgame' as never });
    
    battle.setPlayer('p1', {
      name: 'Player',
      team: [{ ...DUMMY_POKEMON_1, moves: [move.id] }],
    });
    battle.setPlayer('p2', {
      name: 'Enemy',
      team: [{ ...DUMMY_POKEMON_2 }],
    });

    // Simulamos el turno 1 (donde p1 usará el movimiento)
    battle.choose('p1', 'move 1');
    battle.choose('p2', 'move 1');

    // Extraer logs generados
    const logs = battle.log.filter(l => l.startsWith('|'));
    
    // Parsearlos usando nuestra función
    const parsedEvents = parseShowdownLog(logs);

    let moveFailed = false;

    for (const ev of parsedEvents) {
      if (ev.type === 'unhandled') {
        unhandledTypes.add(ev.text);
        moveFailed = true;
      } else {
        // Chequear si hay texto crudo en inglés que deberíamos haber traducido
        const lowerText = ev.text.toLowerCase();
        if (
          lowerText.includes('[from]') ||
          lowerText.includes('[of]') ||
          lowerText.includes('ability:') ||
          lowerText.includes('item:') ||
          lowerText.includes('move:') ||
          lowerText.includes('lockedmove') ||
          lowerText.includes('mustrecharge')
        ) {
          englishTextIssues.add(`[${move.name}] Text Issue: ${ev.text}`);
          moveFailed = true;
        }
      }
    }

    if (moveFailed) {
      failedMoves++;
    }
    totalMovesTested++;

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Error simulando movimiento ${move.name}:`, message);
  }
}

console.log('--- RESULTADOS DE STRESS-TEST DEL PARSER ---');
console.log(`Movimientos testeados: ${totalMovesTested}`);
console.log(`Movimientos con logs sin traducir o unhandled: ${failedMoves}`);

if (unhandledTypes.size > 0) {
  console.log('\n--- EVENTOS UNHANDLED ENCONTRADOS ---');
  unhandledTypes.forEach(t => console.log(t));
}

if (englishTextIssues.size > 0) {
  console.log('\n--- TEXTOS CON RESIDUOS EN INGLÉS ---');
  englishTextIssues.forEach(t => console.log(t));
}

if (failedMoves === 0) {
  console.log('\n¡ÉXITO! Todos los movimientos fueron parseados y traducidos correctamente.');
} else {
  console.log('\nSe requiere actualizar ShowdownParser.ts para cubrir estos casos.');
  process.exit(1);
}
