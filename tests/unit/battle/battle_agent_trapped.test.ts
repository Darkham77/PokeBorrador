import { test, expect } from 'vitest';
import { BattleAgent, type ChoiceRequest, type SidePokemon } from '../../../scripts/battle-tester/battle-agent.ts';

test('BattleAgent should not choose voluntary switches when active pokemon is trapped', () => {
  // Configurar agente de pruebas
  const movesToTest = new Set<string>(['acupressure']);
  const agent = new BattleAgent(
    'p2',
    movesToTest,
    null, // abilityTriggerMoveSlot
    4,    // periodicSwitchEvery (dispara switch en turno 4)
    false // useItemsEnabled
  );

  const pokemon: SidePokemon[] = [
    {
      ident: 'p2: Blissey',
      details: 'Blissey, F',
      condition: '553/714',
      active: true,
      stats: { hp: 714 },
      moves: ['thunderbolt', 'surf', 'flamethrower', 'bodyslam'],
      ability: 'naturalcure'
    },
    {
      ident: 'p2: Blissey',
      details: 'Blissey, M',
      condition: '714/714',
      active: false,
      stats: { hp: 714 },
      moves: ['thunderbolt', 'surf', 'flamethrower', 'bodyslam'],
      ability: 'naturalcure'
    }
  ];

  // Caso 1: Turno 4, el agente quiere rotar (periodicSwitchEvery = 4), pero el Pokémon está atrapado (trapped: true)
  const reqTrapped: ChoiceRequest = {
    active: [
      {
        moves: [
          { id: 'thunderbolt', move: 'Thunderbolt', pp: 24 },
          { id: 'surf', move: 'Surf', pp: 24 },
          { id: 'flamethrower', move: 'Flamethrower', pp: 24 },
          { id: 'bodyslam', move: 'Body Slam', pp: 24 }
        ],
        trapped: true
      }
    ],
    side: {
      pokemon
    }
  };

  // Forzar turno 4 en el agente para gatillar switch periódico
  for (let i = 0; i < 3; i++) {
    agent.decide({
      active: [{ moves: [{ id: 'thunderbolt', move: 'Thunderbolt', pp: 24 }] }],
      side: { pokemon }
    });
  }

  // En el turno 4, con trapped: true, debe elegir un movimiento en vez del switch
  const choiceTrapped = agent.decide(reqTrapped);
  expect(choiceTrapped).not.toContain('switch');
  expect(choiceTrapped).toContain('move');

  // Caso 2: Mismo escenario de turno 4, pero el Pokémon NO está atrapado (trapped: false)
  const agentFree = new BattleAgent(
    'p2',
    movesToTest,
    null,
    4,
    false
  );

  for (let i = 0; i < 3; i++) {
    agentFree.decide({
      active: [{ moves: [{ id: 'thunderbolt', move: 'Thunderbolt', pp: 24 }] }],
      side: { pokemon }
    });
  }

  const reqFree: ChoiceRequest = {
    active: [
      {
        moves: [
          { id: 'thunderbolt', move: 'Thunderbolt', pp: 24 },
          { id: 'surf', move: 'Surf', pp: 24 },
          { id: 'flamethrower', move: 'Flamethrower', pp: 24 },
          { id: 'bodyslam', move: 'Body Slam', pp: 24 }
        ],
        trapped: false
      }
    ],
    side: {
      pokemon
    }
  };

  const choiceFree = agentFree.decide(reqFree);
  expect(choiceFree).toBe('switch 2');
});
