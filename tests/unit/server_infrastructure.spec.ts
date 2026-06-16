/**
 * tests/unit/server_infrastructure.spec.ts
 * Pruebas unitarias para la gestión de servidores oficiales y errores amigables.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { OFFICIAL_SERVERS, DEFAULT_SERVER } from '@/data/official_servers';
import { getFriendlyErrorMessage } from '@/logic/utils/friendlyErrors';
import { switchServer, supabase } from '@/logic/db/supabase';

// Mock de localStorage para entorno Node/JSDOM
const localStorageMock = (() => {
  let store: Record<string, string> = {}
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => { store[key] = value.toString() }),
    removeItem: vi.fn((key: string) => { delete store[key] }),
    clear: vi.fn(() => { store = {} })
  }
})()
Object.defineProperty(window, 'localStorage', { value: localStorageMock })

describe('Infraestructura de Servidores y Errores', () => {
  
  beforeEach(() => {
    window.localStorage.clear();
    vi.clearAllMocks();
  });

  describe('Friendly Error Mapping', () => {
    it('debe identificar falta de internet cuando navigator.onLine es false', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false);
      const msg = getFriendlyErrorMessage(new Error('Cualquier error'));
      expect(msg).toContain('No tienes conexión a Internet');
    });

    it('debe traducir errores de red a "servidor tomando una siesta"', () => {
      vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true);
      const msg = getFriendlyErrorMessage(new Error('Failed to fetch'));
      expect(msg).toContain('tomando una siesta');
    });

    it('debe detectar mantenimiento (503)', () => {
      const msg = getFriendlyErrorMessage({ message: 'Service Unavailable (503)' });
      expect(msg).toContain('Mantenimiento');
    });

    it('debe manejar errores de credenciales inválidas', () => {
      const msg = getFriendlyErrorMessage({ message: 'Invalid login credentials' });
      expect(msg).toContain('incorrectos');
    });
  });

  describe('Configuración de Servidores', () => {
    it('debe tener al menos un servidor oficial y uno por defecto', () => {
      expect(OFFICIAL_SERVERS.length).toBeGreaterThan(0);
      expect(DEFAULT_SERVER).toBeDefined();
      expect(DEFAULT_SERVER.id).toBe('official_prod');
    });

    it('debe persistir la selección del servidor en localStorage', () => {
      const targetServer = OFFICIAL_SERVERS.find(s => s.id === 'local-docker');
      if (targetServer) {
        switchServer(targetServer.id);
        expect(localStorage.setItem).toHaveBeenCalledWith('pokevicio_selected_server_id', targetServer.id);
      }
    });

    it('debe actualizar la configuración del DBRouter al cambiar de servidor', () => {
      const targetServer = OFFICIAL_SERVERS.find(s => s.id === 'local-docker');
      if (targetServer) {
        const spy = vi.spyOn(supabase, 'updateConfig');
        switchServer(targetServer.id);
        expect(spy).toHaveBeenCalledWith({ url: targetServer.url, key: targetServer.anonKey });
      }
    });
  });
});
