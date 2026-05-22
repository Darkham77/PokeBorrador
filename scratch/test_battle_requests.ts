import { Battle } from '@pkmn/sim';

const battle = new Battle({ formatid: 'gen3customgame' as never });

battle.setPlayer('p1', {
  name: 'Player',
  team: [
    { species: 'charizard', moves: ['flamethrower'], level: 100 }
  ],
});
battle.setPlayer('p2', {
  name: 'Enemy',
  team: [
    { species: 'pikachu', moves: ['growl'], level: 1, evs: { hp: 0 }, ivs: { hp: 0 } },
    { species: 'mewtwo', moves: ['earthquake'], level: 100 }
  ],
});

if (!battle.started) {
  battle.start();
}

function getOptimalCounterIndexForBot(battleInstance: Battle): number {
  const team = battleInstance.p2.pokemon;
  for (let i = 1; i < team.length; i++) {
    const poke = team[i];
    if (poke && !poke.fainted && poke.hp > 0) {
      return i;
    }
  }
  return -1;
}

function handleBotDecisions(battleInstance: Battle) {
  let iterations = 0;
  // Bucle para procesar decisiones automáticas de la IA cuando corresponda
  while (battleInstance.p2.activeRequest && !battleInstance.ended && iterations < 5) {
    iterations++;
    const req = battleInstance.p2.activeRequest;
    
    // Si la IA está en wait, no tiene que elegir nada
    if (req.wait) {
      break;
    }
    
    // Si la IA tiene forceSwitch y el jugador humano está en wait
    if (req.forceSwitch) {
      console.log(`[IA Autodecide] IA requiere relevo obligatorio. Ejecutando switch...`);
      const bestSwitchIndex = getOptimalCounterIndexForBot(battleInstance);
      if (bestSwitchIndex !== -1) {
        battleInstance.choose('p2', `switch ${bestSwitchIndex + 1}`);
      } else {
        battleInstance.choose('p2', 'default');
      }
    } else {
      // Si por alguna razón la IA tiene otra solicitud activa pero el jugador está en wait, podemos elegir default
      const p1Req = battleInstance.p1.activeRequest;
      if (p1Req && p1Req.wait) {
        console.log(`[IA Autodecide] Jugador en wait pero IA tiene solicitud activa. Ejecutando default...`);
        battleInstance.choose('p2', 'default');
      } else {
        break;
      }
    }
  }
}

console.log('--- TURNO 1 INICIO ---');
battle.choose('p1', 'move 1');
battle.choose('p2', 'move 1');

console.log('--- TURNO 1 FIN (Pikachu de p2 debilitado) ---');
console.log('p1 activeRequest:', JSON.stringify(battle.p1.activeRequest));
console.log('p2 activeRequest:', JSON.stringify(battle.p2.activeRequest));

console.log('Procesando decisiones de la IA automáticas...');
handleBotDecisions(battle);

console.log('--- Después de procesar decisiones automáticas de la IA ---');
console.log('p1 activeRequest:', JSON.stringify(battle.p1.activeRequest));
console.log('p2 activeRequest:', JSON.stringify(battle.p2.activeRequest));
console.log('Active Pokémon p2:', battle.p2.active[0]?.name);
console.log('Battle logs generados:', battle.log.length);
