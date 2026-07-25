import { describe, it, expect, beforeEach } from 'vitest';
import { ref } from 'vue';
import { parseShowdownLogLine } from '@/logic/battle/showdownBridge';
import { useGameStore } from '@/stores/game';
import type { BattleContext } from '@/types/battle/battleContext';
import type { Pokemon } from '@/types/pokemon/pokemon';

describe('Showdown Bridge Combat Log Messages Parity', () => {
  let logs: Array<{ text: string; style: string; source?: unknown }>;
  let mockStore: BattleContext;
  let playerMon: Pokemon;
  let enemyMon: Pokemon;

  beforeEach(() => {
    logs = [];
    playerMon = {
      uid: 'p1-12345678',
      name: 'Pikachu',
      hp: 100,
      maxHp: 100,
      status: null,
      volatileCounters: {}
    } as unknown as Pokemon;

    enemyMon = {
      uid: 'p2-12345678',
      name: 'Charizard',
      hp: 120,
      maxHp: 120,
      status: null,
      volatileCounters: {}
    } as unknown as Pokemon;

    const gameStore = useGameStore();
    gameStore.state = {
      ...gameStore.state,
      team: [playerMon]
    } as unknown as typeof gameStore.state;

    mockStore = {
      activeBattle: ref({
        player: playerMon,
        enemy: enemyMon,
        playerTeam: [playerMon],
        enemyTeam: [enemyMon],
        weather: { type: 'clear', visual: 'clear', turns: -1 }
      }),
      addLog: (text: string, style: string, source?: unknown) => {
        logs.push({ text, style, source });
      },
      playerStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 }),
      enemyStages: ref({ atk: 0, def: 0, spa: 0, spd: 0, spe: 0, accuracy: 0, evasion: 0 }),
      attackerSide: ref(null),
      activeMove: ref(null),
    } as unknown as BattleContext;
  });

  it('generates localized status messages for -status', async () => {
    await parseShowdownLogLine(mockStore, '|-status|p1a: Pikachu|brn|[uids]p1a:Pikachu=p1-12345678');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.text).toBe('¡Pikachu fue quemado!');
    expect(playerMon.status).toBe('brn');

    await parseShowdownLogLine(mockStore, '|-status|p2a: Charizard|slp|[uids]p2a:Charizard=p2-12345678');
    expect(logs).toHaveLength(2);
    expect(logs[1]?.text).toBe('¡Charizard se quedó dormido!');
    expect(enemyMon.status).toBe('slp');
  });

  it('generates localized status cure messages for -curestatus', async () => {
    playerMon.status = 'slp';
    await parseShowdownLogLine(mockStore, '|-curestatus|p1a: Pikachu|slp|[uids]p1a:Pikachu=p1-12345678');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.text).toBe('¡Pikachu se despertó!');
    expect(playerMon.status).toBe('');
  });

  it('differentiates damage sources for -damage', async () => {
    await parseShowdownLogLine(mockStore, '|-damage|p1a: Pikachu|80/100|[from] psn|[uids]p1a:Pikachu=p1-12345678');
    expect(logs[0]?.text).toBe('¡Pikachu sufrió daño por el veneno!');

    await parseShowdownLogLine(mockStore, '|-damage|p1a: Pikachu|70/100|[from] Sandstorm|[uids]p1a:Pikachu=p1-12345678');
    expect(logs[1]?.text).toBe('¡Pikachu sufrió daño por la tormenta de arena!');

    await parseShowdownLogLine(mockStore, '|-damage|p1a: Pikachu|60/100|[from] Leech Seed|[uids]p1a:Pikachu=p1-12345678');
    expect(logs[2]?.text).toBe('¡Pikachu fue dañado por las Drenadoras!');

    await parseShowdownLogLine(mockStore, '|-damage|p1a: Pikachu|50/100|[from] Stealth Rock|[uids]p1a:Pikachu=p1-12345678');
    expect(logs[3]?.text).toBe('¡Pikachu sufrió daño por las trampa(s)!');
  });

  it('logs charging message for two-turn moves via -prepare', async () => {
    await parseShowdownLogLine(mockStore, '|-prepare|p1a: Pikachu|Solar Beam|[uids]p1a:Pikachu=p1-12345678');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.text).toBe('¡Pikachu está cargando Rayo Solar!');
  });

  it('logs volatile status start and end messages', async () => {
    await parseShowdownLogLine(mockStore, '|-start|p1a: Pikachu|confusion|[uids]p1a:Pikachu=p1-12345678');
    expect(logs[0]?.text).toBe('¡Pikachu se confundió!');

    await parseShowdownLogLine(mockStore, '|-end|p1a: Pikachu|confusion|[uids]p1a:Pikachu=p1-12345678');
    expect(logs[1]?.text).toBe('¡Pikachu ya no está confundido!');
  });

  it('logs protection singleturn moves (-singleturn/-singlemove)', async () => {
    await parseShowdownLogLine(mockStore, '|-singleturn|p1a: Pikachu|Protect|[uids]p1a:Pikachu=p1-12345678');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.text).toBe('¡Pikachu se protegió!');
  });

  it('logs specific field conditions for -fieldstart and -fieldend', async () => {
    await parseShowdownLogLine(mockStore, '|-fieldstart|move: Trick Room');
    expect(logs[0]?.text).toBe('¡Espacio Raro distorsionó el tiempo!');

    await parseShowdownLogLine(mockStore, '|-fieldend|move: Trick Room');
    expect(logs[1]?.text).toBe('¡Espacio Raro volvió a la normalidad!');
  });

  it('logs switch in messages when not silent', async () => {
    await parseShowdownLogLine(mockStore, '|switch|p1a: Pikachu|Pikachu, L50|100/100|[uids]p1a:Pikachu=p1-12345678');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.text).toContain('¡Adelante, Pikachu!');
  });

  it('logs court change swap side conditions', async () => {
    await parseShowdownLogLine(mockStore, '|-swapsideconditions|');
    expect(logs).toHaveLength(1);
    expect(logs[0]?.text).toBe('¡Los efectos de ambos lados del campo fueron intercambiados!');
  });

  it('logs no target, hint, and custom message lines', async () => {
    await parseShowdownLogLine(mockStore, '|-notarget|p1a: Pikachu|[uids]p1a:Pikachu=p1-12345678');
    expect(logs[0]?.text).toContain('¡No hay objetivo');

    await parseShowdownLogLine(mockStore, '|-hint|Sleep Clause Activated');
    expect(logs[1]?.text).toBe('Sleep Clause Activated');
  });
});
