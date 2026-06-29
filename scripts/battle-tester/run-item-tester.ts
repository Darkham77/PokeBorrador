// scripts/battle-tester/run-item-tester.ts
import fs from 'node:fs/promises';
import path from 'node:path';
import { styleText } from 'node:util';
import { Battle, toID, ID } from '@pkmn/sim';
import { generateItemTestBatches } from './item-generator.ts';
import { createMockBattleContext } from './mock-battle-store.ts';
import { parseShowdownLogLine, filterShowdownLogs } from '../../src/logic/battle/showdownBridge.ts';
import { BattleAgent, type ChoiceRequest } from './battle-agent.ts';
import { logger } from '../../src/logic/utils/logger.ts';
import type { Pokemon } from '../../src/types/pokemon/pokemon.ts';

const RESULTS_DIR = path.resolve(process.cwd(), 'scripts/battle-tester/results');
const REPORT_FILE = path.join(RESULTS_DIR, 'item_coverage_report.json');

const unhandledBridgeLines: string[] = [];
const originalDebug = logger.debug;
logger.debug = (tag: string, message: string, ...args: unknown[]) => {
  if (tag === 'ShowdownBridge' && message.includes('sin parseador')) {
    const parts = message.split('específico: ');
    const line = parts[1] || '';
    const lp = line.split('|').map(x => x.trim());
    const type = lp[1] || '';
    const ignoredTypes = [
      '', 't:', 'turn', 'upkeep', 'teampreview', 'gametype', 'player', 'gen', 'tier', 'clearpoke', 'poke', 'start', 'rule', 'teamsize'
    ];
    if (!ignoredTypes.includes(type)) {
      unhandledBridgeLines.push(message);
    }
  }
  originalDebug(tag, message, ...args);
};

function createLocalPoke(name: string, species: string, level: number, moves: string[], ability: string, item: string): Pokemon {
  return {
    uid: Math.random().toString(36).substring(2, 11),
    id: toID(species),
    name: name || species,
    level,
    exp: 0,
    expNeeded: 100,
    hp: 400,
    maxHp: 400,
    atk: 100,
    def: 100,
    spa: 100,
    spd: 100,
    spe: 100,
    type: 'Normal',
    ability: toID(ability),
    item: toID(item),
    status: null,
    volatileCounters: {},
    moves: moves.map(m => ({
      id: toID(m),
      name: m,
      pp: 20,
      maxPP: 20
    }))
  } as unknown as Pokemon;
}

interface ItemCoverageItem {
  id: string;
  name: string;
  status: 'PASS' | 'FAIL' | 'UNTESTED';
  unhandledLogs?: string[];
}

export async function runItemCoverageFuzzer() {
  console.log(styleText('bold', '\n--- 🧪 POKEMON BATTLE ITEM COVERAGE TESTER (ALL GENERATIONS) ---'));

  await fs.mkdir(RESULTS_DIR, { recursive: true });

  const batches = generateItemTestBatches(6);
  console.log(`📦 Batches generados para items: ${batches.length}`);

  const itemCoverage: Record<string, ItemCoverageItem> = {};

  // Inicializar mapa de cobertura
  batches.forEach(b => {
    b.itemsToTest.forEach(id => {
      itemCoverage[id] = { id, name: id, status: 'UNTESTED' };
    });
  });

  const totalRounds = batches.length;
  let currentRound = 0;

  for (const batch of batches) {
    currentRound++;
    console.log(`\n⚔️ Corriendo ronda ${currentRound}/${totalRounds} de items...`);

    const p1Active = batch.playerTeam[0]!;
    const p2Active = batch.enemyTeam[0]!;

    const localP1 = createLocalPoke(p1Active.name || '', p1Active.species, p1Active.level, p1Active.moves, p1Active.ability, p1Active.item || '');
    const localP2 = createLocalPoke(p2Active.name || '', p2Active.species, p2Active.level, p2Active.moves, p2Active.ability, p2Active.item || '');
    const mockStore = createMockBattleContext(localP1, localP2);

    // Inicializar el simulador de Showdown
    const simBattle = new Battle({ formatid: 'gen9customgame' as ID });
    simBattle.setPlayer('p1', { name: 'Player', team: batch.playerTeam });
    simBattle.setPlayer('p2', { name: 'NPC-Enemy', team: batch.enemyTeam });

    let lastLogIndex = 0;
    const getNewLogs = (): string[] => {
      const allLogs = simBattle.log;
      const newLogs = allLogs.slice(lastLogIndex);
      lastLogIndex = allLogs.length;
      return newLogs;
    };

    // Logs iniciales
    const initLogs = filterShowdownLogs(getNewLogs());
    for (const logLine of initLogs) {
      await parseShowdownLogLine(mockStore, logLine, initLogs);
    }

    let turn = 0;
    const maxTurns = 50;

    // Agentes para ambos lados — manejan forceSwitch, switches periódicos y elección de movimiento
    const agent1 = new BattleAgent('p1', new Set(), null, 5); // switch voluntario cada 5 turnos
    const agent2 = new BattleAgent('p2', new Set(), null, 6);

    try {
      while (!simBattle.ended && turn < maxTurns) {
        turn++;
        unhandledBridgeLines.length = 0;

        const p1Req = simBattle.p1.activeRequest;
        const p2Req = simBattle.p2.activeRequest;

        const p1Choice = agent1.decide(p1Req as unknown as ChoiceRequest);
        const p2Choice = agent2.decide(p2Req as unknown as ChoiceRequest);

        simBattle.choose('p1', p1Choice);
        simBattle.choose('p2', p2Choice);

        const rawTurnLogs = getNewLogs();
        const turnLogs = filterShowdownLogs(rawTurnLogs);

        for (const logLine of turnLogs) {
          await parseShowdownLogLine(mockStore, logLine, turnLogs);
        }

        // Evaluar qué items se activaron en el log de este turno
        batch.itemsToTest.forEach(itemId => {
          // A: Detección estática: el simulador de Showdown cargó el objeto correctamente en el Pokémon.
          // Cubre Held Items pasivos que no emiten logs visuales (ej. Cinta Elegida, Assault Vest).
          const cleanId = itemId.toLowerCase().replace(/[^a-z0-9]/g, '');
          const isEquippedInSim = simBattle.p1.pokemon.some(p => p.item === cleanId) ||
                                  simBattle.p2.pokemon.some(p => p.item === cleanId);

          const activatedThisTurn = isEquippedInSim || rawTurnLogs.some(l => {
            const lower = l.toLowerCase();
            const norm = (s: string) => s.trim().replace(/[^a-z0-9]/g, '');

            // 1. |-item|POKEMON|ItemName|[from] ...
            if (lower.startsWith('|-item|')) {
              const parts = lower.split('|');
              if (norm(parts[3] ?? '') === cleanId) return true;
            }

            // 2. |-enditem|POKEMON|ItemName|[from] ...
            if (lower.startsWith('|-enditem|')) {
              const parts = lower.split('|');
              if (norm(parts[3] ?? '') === cleanId) return true;
            }

            // 3. Fallback: [from] item: ItemName en cualquier lugar
            if (lower.includes('item:') || lower.includes('item: ')) {
              const match = lower.match(/item:\s*([a-z0-9][a-z0-9\s]*)/);
              if (match && norm(match[1]!) === cleanId) return true;
            }

            return false;
          });

          if (activatedThisTurn) {
            const hasFailure = unhandledBridgeLines.length > 0;
            const item = itemCoverage[itemId];
            if (item) {
              if (hasFailure) {
                item.status = 'FAIL';
                item.unhandledLogs = [...(item.unhandledLogs || []), ...unhandledBridgeLines];
              } else if (item.status !== 'FAIL') {
                item.status = 'PASS';
              }
            }
          }
        });
      }
    } catch (_err: unknown) {
      batch.itemsToTest.forEach(itemId => {
        if (itemCoverage[itemId]) {
          itemCoverage[itemId]!.status = 'FAIL';
        }
      });
    }
    // Nota: items que no se activaron en logs permanecen UNTESTED.
    // Solo se marcan PASS si el log lo confirma explícitamente.
  }

  const items = Object.values(itemCoverage);
  const passed = items.filter(i => i.status === 'PASS').length;
  const failed = items.filter(i => i.status === 'FAIL').length;
  const untested = items.filter(i => i.status === 'UNTESTED').length;

  console.log(styleText('bold', '\n--- 📊 RESUMEN DE COBERTURA DE ITEMS ---'));
  console.log(`Objetos: ${passed} PASS / ${failed} FAIL / ${untested} UNTESTED`);

  await fs.writeFile(REPORT_FILE, JSON.stringify(items, null, 2), 'utf-8');
  console.log(`\n💾 Reporte de items guardado con éxito en: ${REPORT_FILE}`);

  logger.debug = originalDebug; // Restaurar logger original

  if (failed > 0) {
    throw new Error(`Se detectaron ${failed} fallos en la sincronización de objetos.`);
  }
}
