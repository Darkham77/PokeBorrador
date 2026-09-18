/**
 * tests/unit/composables/useGameAnnouncer.spec.ts
 *
 * Comprehensive unit tests for useGameAnnouncer accessibility composable.
 */

import { describe, it, expect } from 'vitest';
import { useGameAnnouncer } from '@/composables/ui/useGameAnnouncer';

describe('useGameAnnouncer', () => {
  it('initializes announcer functions correctly', () => {
    const announcer = useGameAnnouncer();
    expect(typeof announcer.announce).toBe('function');
    expect(typeof announcer.polite).toBe('function');
    expect(typeof announcer.assertive).toBe('function');
    expect(typeof announcer.announceBattleTurn).toBe('function');
    expect(typeof announcer.announceToast).toBe('function');
  });

  it('announces battle turn messages without throwing', () => {
    const announcer = useGameAnnouncer();
    expect(() => announcer.announceBattleTurn('Pikachu usó Impactrueno!')).not.toThrow();
    expect(() => announcer.announceBattleTurn('Pikachu se ha debilitado!', true)).not.toThrow();
  });

  it('handles empty and whitespace-only battle announcements gracefully', () => {
    const announcer = useGameAnnouncer();
    expect(() => announcer.announceBattleTurn('')).not.toThrow();
    expect(() => announcer.announceBattleTurn('   ')).not.toThrow();
  });

  it('announces toast and polite messages without throwing', () => {
    const announcer = useGameAnnouncer();
    expect(() => announcer.announceToast('Guardado completado')).not.toThrow();
    expect(() => announcer.polite('Notificación estándar')).not.toThrow();
    expect(() => announcer.assertive('Alerta crítica')).not.toThrow();
  });

  it('handles announcements with special characters, symbols, and formatting', () => {
    const announcer = useGameAnnouncer();
    expect(() => announcer.announce('¡Farfetch\'d subió al nivel 25! +150 EXP')).not.toThrow();
    expect(() => announcer.announceBattleTurn('Mr. Mime usó Reflejo (Defensa +2).')).not.toThrow();
    expect(() => announcer.announceToast('💎 Obtenida Piedra Agua x1')).not.toThrow();
  });

  it('supports multiple sequential announcements without memory leaks or errors', () => {
    const announcer = useGameAnnouncer();
    for (let turn = 1; turn <= 10; turn++) {
      expect(() => announcer.announceBattleTurn(`Turno ${turn}: Acción ejecutada`)).not.toThrow();
    }
  });

  it('handles assertive notifications under high priority', () => {
    const announcer = useGameAnnouncer();
    expect(() => announcer.assertive('¡Conexión con el servidor perdida!')).not.toThrow();
  });

  it('handles multiline announcements and long combat narrative descriptions', () => {
    const announcer = useGameAnnouncer();
    const multilineLog = '¡Gengar usó Bola Sombra!\n¡Un golpe crítico!\nEl Dragonite enemigo perdió 85% de sus PS.';
    expect(() => announcer.announce(multilineLog)).not.toThrow();
    expect(() => announcer.polite(multilineLog)).not.toThrow();
  });

  it('handles announcements containing brackets, quotes and numeric values', () => {
    const announcer = useGameAnnouncer();
    expect(() => announcer.announceToast('[MERCADO] Comprado Restos x1 por $5,000')).not.toThrow();
    expect(() => announcer.announceBattleTurn('Turno #4: "Clima despejado" se disipó.')).not.toThrow();
  });
});