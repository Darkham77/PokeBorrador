/**
 * tests/unit/system/system_infrastructure_and_schemas_suite.spec.ts
 * Cohesive domain suite consolidating Database Isolation, Server Infrastructure,
 * Daycare Missions Integrity, and Validation Schemas.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { createTestDBRouter, cleanupTestDB } from '../../dbTestHelper.ts'
import { executeAtomicSaveTransaction, queryLocal } from '@/logic/db/sqliteEngine'
import { OFFICIAL_SERVERS, DEFAULT_SERVER } from '@/data/system/official_servers'
import { getFriendlyErrorMessage } from '@/logic/utils/friendlyErrors'
import { switchServer, supabase } from '@/logic/db/supabase'
import { setupLocalStorageMock } from './localStorageMock.ts'
import { useDaycareMissionsStore } from '@/stores/daycareMissions'
import { useGameStore } from '@/stores/game'
import { logger } from '@/logic/utils/logger'
import { INITIAL_STATE } from '@/stores/gameInitialState'
import type { DaycareMission } from '@/types/breeding/breeding'
import { 
  validateUserProfile, 
  validateNetworkAction, 
  validateTrainerName, 
  validateChatMessage, 
  validateTradeOffer,
  validateGtsListing,
  validateAuthLogin,
  validateAuthRegister,
  validateAuthPasswordReset,
  validateSaveData
} from '@/logic/validation/schemas'

setupLocalStorageMock()

describe('System Infrastructure, Database & Schemas Suite', () => {
  describe('Database Isolation Policy', () => {
    beforeEach(() => {
      if (!window.indexedDB) {
        window.indexedDB = { open: vi.fn() } as unknown as IDBFactory
      }
      vi.spyOn(window.indexedDB, 'open')
    })

    afterEach(() => {
      cleanupTestDB()
      vi.clearAllMocks()
    })

    it('should initialize in-memory without touching IndexedDB', async () => {
      const db = await createTestDBRouter()
      
      expect(window.indexedDB.open).not.toHaveBeenCalled()
      expect(db.options.inMemory).toBe(true)
    })

    it('should allow querying isolated tables', async () => {
      const db = await createTestDBRouter()
      
      const query = db.from('profiles').select('*').eq('id', 'test')
      expect(query.router.options.inMemory).toBe(true)
    })

    describe('Mock Time Synchronization', () => {
      it('supports datetime-local format without timezone (YYYY-MM-DDTHH:mm)', async () => {
        const db = await createTestDBRouter()
        expect(() => db.setMockTime('2026-08-27T18:49')).not.toThrow()
        expect(typeof db.getTimeOffset()).toBe('number')
      })

      it('supports date-only format (YYYY-MM-DD)', async () => {
        const db = await createTestDBRouter()
        expect(() => db.setMockTime('2026-01-01')).not.toThrow()
        expect(typeof db.getTimeOffset()).toBe('number')
      })

      it('supports full ISO instant with UTC indicator (Z)', async () => {
        const db = await createTestDBRouter()
        expect(() => db.setMockTime('2026-08-27T18:49:00Z')).not.toThrow()
        expect(typeof db.getTimeOffset()).toBe('number')
      })

      it('supports full ISO instant with timezone offset', async () => {
        const db = await createTestDBRouter()
        expect(() => db.setMockTime('2026-08-27T18:49:00-03:00')).not.toThrow()
        expect(typeof db.getTimeOffset()).toBe('number')
      })

      it('supports resetting time offset to 0', async () => {
        const db = await createTestDBRouter()
        db.setMockTime('2026-08-27T18:49')
        db.resetTime()
        expect(db.getTimeOffset()).toBe(0)
      })

      it('throws descriptive error on malformed date string', async () => {
        const db = await createTestDBRouter()
        expect(() => db.setMockTime('not-a-valid-time-format')).toThrow(
          /\[DBRouter\] Invalid mock time format 'not-a-valid-time-format'/
        )
      })
    })

    describe('Atomic Save Transaction Guard', () => {
      it('successfully executes multi-table atomic queries inside transaction', async () => {
        await createTestDBRouter();
        (window as unknown as { initSqlJs: () => Promise<{ Database: new () => { run: (sql: string) => void; exec: (sql: string) => { columns: string[]; values: unknown[][] }[]; export: () => Uint8Array } }> }).initSqlJs = vi.fn().mockResolvedValue({
          Database: class {
            run(sql: string) {
              if (sql.includes('INVALID SQL SYNTAX ATOMIC FAIL')) {
                throw new Error('SQLite syntax error mock')
              }
            }
            exec(sql: string) {
              if (sql.includes('PRAGMA table_info')) {
                return [{ columns: ['cid', 'name'], values: [[0, 'id'], [1, 'created_at'], [2, 'senderid'], [3, 'value']] }]
              }
              return [{ columns: ['id'], values: [['a']] }]
            }
            export() {
              return new Uint8Array([1, 2, 3])
            }
          }
        })

        const queries = [
          { sql: "CREATE TABLE IF NOT EXISTS test_table (id TEXT PRIMARY KEY, val INT);" },
          { sql: "INSERT INTO test_table (id, val) VALUES ('a', 10);" },
          { sql: "INSERT INTO test_table (id, val) VALUES ('b', 20);" }
        ]

        await executeAtomicSaveTransaction(queries)

        const rows = await queryLocal("SELECT * FROM test_table ORDER BY id ASC")
        expect(rows).toBeDefined()
      })

      it('triggers ROLLBACK and throws when a query fails inside transaction', async () => {
        await createTestDBRouter();
        (window as unknown as { initSqlJs: () => Promise<{ Database: new () => { run: (sql: string) => void; exec: (sql: string) => { columns: string[]; values: unknown[][] }[]; export: () => Uint8Array } }> }).initSqlJs = vi.fn().mockResolvedValue({
          Database: class {
            run(sql: string) {
              if (sql.includes('INVALID SQL SYNTAX ATOMIC FAIL')) {
                throw new Error('SQLite syntax error mock')
              }
            }
            exec(sql: string) {
              if (sql.includes('PRAGMA table_info')) {
                return [{ columns: ['cid', 'name'], values: [[0, 'id'], [1, 'created_at'], [2, 'senderid'], [3, 'value']] }]
              }
              return [{ columns: ['id'], values: [['a']] }]
            }
            export() {
              return new Uint8Array([1, 2, 3])
            }
          }
        })

        const failingQueries = [
          { sql: "INSERT INTO rollback_test (id) VALUES ('valid_second');" },
          { sql: "INVALID SQL SYNTAX ATOMIC FAIL;" }
        ]

        await expect(executeAtomicSaveTransaction(failingQueries)).rejects.toThrow()
      })
    })
  })

  describe('Infraestructura de Servidores y Errores', () => {
    beforeEach(() => {
      window.localStorage.clear()
      vi.clearAllMocks()
    })

    describe('Friendly Error Mapping', () => {
      it('debe identificar falta de internet cuando navigator.onLine es false', () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)
        const msg = getFriendlyErrorMessage(new Error('Cualquier error'))
        expect(msg).toContain('No tienes conexión a Internet')
      })

      it('debe traducir errores de red a "servidor tomando una siesta"', () => {
        vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(true)
        const msg = getFriendlyErrorMessage(new Error('Failed to fetch'))
        expect(msg).toContain('tomando una siesta')
      })

      it('debe detectar mantenimiento (503)', () => {
        const msg = getFriendlyErrorMessage({ message: 'Service Unavailable (503)' })
        expect(msg).toContain('Mantenimiento')
      })

      it('debe manejar errores de credenciales inválidas', () => {
        const msg = getFriendlyErrorMessage({ message: 'Invalid login credentials' })
        expect(msg).toContain('incorrectos')
      })
    })

    describe('Configuración de Servidores', () => {
      it('debe tener al menos un servidor oficial y uno por defecto', () => {
        expect(OFFICIAL_SERVERS.length).toBeGreaterThan(0)
        expect(DEFAULT_SERVER).toBeDefined()
        expect(DEFAULT_SERVER.id).toBe('official_prod')
      })

      it('debe persistir la selección del servidor en localStorage', () => {
        const targetServer = OFFICIAL_SERVERS.find(s => s.id === 'local-docker')
        if (targetServer) {
          switchServer(targetServer.id)
          expect(localStorage.setItem).toHaveBeenCalledWith('pokevicio_selected_server_id', targetServer.id)
        }
      })

      it('debe actualizar la configuración del DBRouter al cambiar de servidor', () => {
        const targetServer = OFFICIAL_SERVERS.find(s => s.id === 'local-docker')
        if (targetServer) {
          const spy = vi.spyOn(supabase, 'updateConfig')
          switchServer(targetServer.id)
          expect(spy).toHaveBeenCalledWith({ url: targetServer.url, key: targetServer.anonKey })
        }
      })
    })
  })

  describe('Daycare Missions Integrity & Self-Repair', () => {
    beforeEach(() => {
      setActivePinia(createPinia())
      const gameStore = useGameStore()
      gameStore.state = JSON.parse(JSON.stringify(INITIAL_STATE))
      gameStore.state.trainerLevel = 25
    })

    it('should preserve valid missions', () => {
      const gameStore = useGameStore()
      const missionsStore = useDaycareMissionsStore()

      const validMission: DaycareMission = {
        date: '2026-08-24',
        targetId: 'pikachu',
        requirement: { type: 'level', minLevel: 10 },
        reqText: 'Nv. 10+',
        reward: { id: 'berrybronze', name: 'Baya de Bronce', qty: 2, icon: '🥉' },
        completed: false,
        trainerType: 'caza_bichos',
        trainerName: 'Cazabichos Juan',
        trainerSprite: 'bugcatcher',
        dialogue: '¡Busco un Pikachu!'
      }

      gameStore.state.daycare_missions = [validMission]

      const missions = missionsStore.dailyMissions
      expect(missions).toHaveLength(1)
      expect(missions[0]?.targetId).toBe('pikachu')
      expect(missions[0]?.trainerSprite).toBe('bugcatcher')
    })

    it('should detect corrupted mission (missing trainerSprite) and auto-repair by regenerating', () => {
      const gameStore = useGameStore()
      const missionsStore = useDaycareMissionsStore()
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      const corruptedMission = {
        date: '2026-08-24',
        targetId: 'pidgey',
        requirement: { type: 'level', minLevel: 15 },
        reqText: 'Nv. 15+',
        reward: { id: 'berrysilver', name: 'Baya de Plata', qty: 2, icon: '🥈' },
        completed: false,
        trainerType: 'cientifico',
        trainerName: 'Científico'
      } as unknown as DaycareMission

      gameStore.state.daycare_missions = [corruptedMission]

      missionsStore.checkDailyReset()
      const missions = missionsStore.dailyMissions

      expect(loggerSpy).toHaveBeenCalledWith(
        'daycareMissions',
        expect.stringContaining('Corrupted daycare mission detected')
      )
      expect(missions).toHaveLength(2)
      expect(missions[0]?.trainerSprite).toBeTruthy()
      expect(missions[1]?.trainerSprite).toBeTruthy()
      expect(missions[0]?.targetId).toBeTruthy()

      loggerSpy.mockRestore()
    })

    it('should detect corrupted mission with invalid reward ID (e.g. berry_silver) and auto-repair with warning log', () => {
      const gameStore = useGameStore()
      const missionsStore = useDaycareMissionsStore()
      const warnSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      const missionWithLegacyItem = {
        date: '2026-08-24',
        targetId: 'pidgey',
        requirement: { type: 'level', minLevel: 15 },
        reqText: 'Nv. 15+',
        reward: { id: 'berry_silver', name: 'Baya de Plata', qty: 2, icon: '🥈' },
        completed: false,
        trainerType: 'cientifico',
        trainerName: 'Científico',
        trainerSprite: 'scientist',
        dialogue: '¡Investigación urgente!'
      } as unknown as DaycareMission

      gameStore.state.daycare_missions = [missionWithLegacyItem]

      missionsStore.checkDailyReset()
      const missions = missionsStore.dailyMissions

      expect(warnSpy).toHaveBeenCalledWith(
        'daycareMissions',
        expect.stringContaining('Corrupted daycare mission detected')
      )
      expect(missions).toHaveLength(2)
      expect(missions[0]?.reward.id).toBeDefined()
      expect(missions[0]?.reward.id).not.toBe('berry_silver')
      expect(missions[1]?.reward.id).toBeDefined()
      expect(missions[1]?.reward.id).not.toBe('berry_silver')

      warnSpy.mockRestore()
    })

    it('should regenerate missions on checkDailyReset when corrupted missions exist', () => {
      const gameStore = useGameStore()
      const missionsStore = useDaycareMissionsStore()
      const loggerSpy = vi.spyOn(logger, 'warn').mockImplementation(() => {})

      gameStore.state.daycare_missions = [{
        date: Temporal.Now.plainDateISO().toString(),
        targetId: 'caterpie'
      } as unknown as DaycareMission]

      missionsStore.checkDailyReset()

      expect(loggerSpy).toHaveBeenCalledWith(
        'daycareMissions',
        expect.stringContaining('Corrupted daycare mission detected')
      )
      expect(gameStore.state.daycare_missions).toHaveLength(2)
      expect(gameStore.state.daycare_missions[0]?.trainerSprite).toBeTruthy()

      loggerSpy.mockRestore()
    })

    it('calculates fulfillableMissionsCount correctly using isPokemonEligibleForMission', () => {
      const gameStore = useGameStore()
      const missionsStore = useDaycareMissionsStore()

      gameStore.state.daycare_missions = [
        {
          date: '2026-08-24',
          targetId: 'pikachu',
          requirement: { type: 'level', minLevel: 10 },
          reqText: 'Nv. 10+',
          reward: { id: 'berrybronze', name: 'Baya de Bronce', qty: 2, icon: '🥉' },
          completed: false,
          trainerType: 'caza_bichos',
          trainerName: 'Cazabichos Juan',
          trainerSprite: 'bugcatcher',
          dialogue: '¡Busco un Pikachu!'
        },
        {
          date: '2026-08-24',
          targetId: 'charizard',
          requirement: { type: 'level', minLevel: 50 },
          reqText: 'Nv. 50+',
          reward: { id: 'berrygold', name: 'Baya de Oro', qty: 2, icon: '🥇' },
          completed: false,
          trainerType: 'caza_bichos',
          trainerName: 'Cazabichos Pedro',
          trainerSprite: 'bugcatcher',
          dialogue: '¡Busco un Charizard!'
        }
      ]

      gameStore.state.team = [
        { id: 'pikachu', level: 15, onMission: false, inDaycare: false, onDefense: false, isIllegal: false } as any,
        { id: 'charizard', level: 30, onMission: false, inDaycare: false, onDefense: false, isIllegal: false } as any
      ]

      expect(missionsStore.fulfillableMissionsCount).toBe(1)
    })
  })

  describe('Validation Schemas (Unit)', () => {
    describe('UserProfile Schema', () => {
      it('should validate correct user profile data', () => {
        const data = {
          id: 'user_123',
          username: 'AshKetchum',
          level: 50,
          is_banned: false,
          coins: 1000
        }
        const result = validateUserProfile(data)
        expect(result.success).toBe(true)
      })

      it('should reject profiles with invalid types or constraints', () => {
        const invalidUsername = {
          id: 'user_123',
          username: 'A',
          level: 50,
          is_banned: false,
          coins: 1000
        }
        expect(validateUserProfile(invalidUsername).success).toBe(false)

        const invalidLevel = {
          id: 'user_123',
          username: 'AshKetchum',
          level: 150,
          is_banned: false,
          coins: 1000
        }
        expect(validateUserProfile(invalidLevel).success).toBe(false)
      })
    })

    describe('TrainerName Schema', () => {
      it('should validate names between 3 and 15 characters', () => {
        expect(validateTrainerName('Red').success).toBe(true)
        expect(validateTrainerName('GaryOak').success).toBe(true)
        expect(validateTrainerName('Ro').success).toBe(false)
        expect(validateTrainerName('VeryLongTrainerName').success).toBe(false)
      })
    })

    describe('Auth Schemas', () => {
      it('validates auth login correctly', () => {
        expect(validateAuthLogin({ email: 'trainer@kanto.org', password: 'password123' }).success).toBe(true)
        expect(validateAuthLogin({ email: 'invalid-email', password: 'password123' }).success).toBe(false)
      })

      it('validates auth register correctly', () => {
        expect(validateAuthRegister({ email: 'trainer@kanto.org', password: 'password123', username: 'Kanto_Ash' }).success).toBe(true)
        expect(validateAuthRegister({ email: 'trainer@kanto.org', password: 'password123', username: 'Ash!' }).success).toBe(false)
      })

      it('validates auth password reset', () => {
        expect(validateAuthPasswordReset({ password: 'newPassword123', confirmPassword: 'newPassword123' }).success).toBe(true)
      })
    })

    describe('Network & Social Schemas', () => {
      it('validates network action', () => {
        const action = {
          type: 'CHAT_SEND',
          payload: { msg: 'Hello' },
          timestamp: Date.now()
        }
        expect(validateNetworkAction(action).success).toBe(true)
      })

      it('validates chat message', () => {
        const chat = {
          id: 'msg_1',
          user_id: 'usr_1',
          username: 'Ash',
          message: 'Let us battle!',
          trainer_level: 10
        }
        expect(validateChatMessage(chat).success).toBe(true)
      })
    })

    describe('SaveData Schema', () => {
      it('validates minimal valid save data', () => {
        const save = {
          trainer: 'Ash',
          gender: 'h' as const,
          badges: 0,
          balls: 5,
          money: 1000,
          battleCoins: 0,
          trainerLevel: 1,
          trainerExp: 0,
          trainerExpNeeded: 100,
          inventory: {},
          team: [],
          box: [],
          pokedex: [],
          seenPokedex: [],
          defeatedGyms: [],
          starterChosen: true,
          eloRating: 1000,
          pvpStats: { wins: 0, losses: 0, draws: 0 },
          rankedMaxElo: 1000,
          passiveTeamActive: false,
          daycare_mission_refreshes: 3,
          boxCount: 4,
          classLevel: 1,
          classXP: 0,
          classData: {
            captureStreak: 0,
            longestStreak: 0,
            reputation: 0,
            blackMarketSales: 0,
            criminality: 0
          },
          warCoins: 0,
          warCoinsSpent: 0,
          lastPokemonCenterHeal: 0,
          playtime: 0
        }
        expect(validateSaveData(save).success).toBe(true)
      })
    })

    describe('GTS & Trade Schemas', () => {
      it('validates item GTS listing', () => {
        const listing = {
          id: 'gts-item-1',
          seller_id: 'user_1',
          price: 500,
          status: 'active' as const,
          listing_type: 'item' as const,
          data: { id: 'pokeball', qty: 5 },
          created_at: '2026-08-18T00:00:00.000Z'
        }
        expect(validateGtsListing(listing).success).toBe(true)
      })

      it('should validate correct trade offers', () => {
        const data = {
          id: 'trade_456',
          sender_id: 'user_1',
          receiver_id: 'user_2',
          offer_pokemon: null,
          offer_items: { pokeball: 5 },
          offer_money: 500,
          request_pokemon: null,
          request_items: {},
          request_money: 0,
          message: 'Let us trade!',
          status: 'pending' as const,
          created_at: Temporal.Now.instant().toString()
        }
        expect(validateTradeOffer(data).success).toBe(true)
      })
    })
  })
})
