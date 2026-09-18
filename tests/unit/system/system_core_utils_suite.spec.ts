// @vitest-environment jsdom
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import fs from 'node:fs'
import { setActivePinia, createPinia } from 'pinia'
import { formatPlayerClass, formatFaction } from '@/logic/utils/formatters'
import { useLibraryStore } from '@/stores/library'
import { useLoadingStore } from '@/stores/loading'
import { getPokemonTier } from '@/logic/pokemon/tierEngine'
import { getSellPrice, filterInventoryByCategory } from '@/logic/inventory/inventoryEngine'
import { some, none, fromNullable, unwrapOr, ok, err, matchResult } from '@/logic/utils/resultUtils'
import { generateMigrations } from '../../../scripts/database/generate_migrations.ts'
import { restoreSupabaseDb } from '../../../scripts/database/restore_supabase_db.ts'
import { updateSupabaseDb } from '../../../scripts/database/update_supabase_db.ts'
import { calculateDamageForTooltip } from '@/logic/battle/smogonAdapter'
import { calculateButtonHoverEnterVars } from '@/logic/hover/hoverEnterChildren'
import { resolveCssColor } from '@/logic/hover/hoverHelpers'
import { createTestDBRouter, cleanupTestDB } from '../../dbTestHelper.ts'
import { FuzzerRunnerLogger } from '../../../scripts/e2e/logging/fuzzer_runner_logger.ts'
import { SimulationRunnerLogger } from '../../../scripts/e2e/logging/simulation_runner_logger.ts'
import type { Pokemon, Move } from '@/types/pokemon/pokemon'

describe('System Core Utilities Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.clearAllMocks()
  })

  afterEach(() => {
    cleanupTestDB()
  })

  describe('Formatters Logic', () => {
    describe('formatPlayerClass', () => {
      it('debe retornar "SIN CLASE" si la clase es nula, vacía o indefinida', () => {
        expect(formatPlayerClass(null)).toBe('SIN CLASE')
        expect(formatPlayerClass(undefined)).toBe('SIN CLASE')
        expect(formatPlayerClass('   ')).toBe('SIN CLASE')
        expect(formatPlayerClass('null')).toBe('SIN CLASE')
        expect(formatPlayerClass('undefined')).toBe('SIN CLASE')
      })

      it('debe formatear clases conocidas a su nombre visible', () => {
        expect(formatPlayerClass('entrenador')).toBe('Entrenador')
        expect(formatPlayerClass('rocket')).toBe('Equipo Rocket')
        expect(formatPlayerClass('cazabichos')).toBe('Cazabichos')
        expect(formatPlayerClass('criador')).toBe('Criador')
      })

      it('debe convertir clases desconocidas a mayúsculas', () => {
        expect(formatPlayerClass('profesor')).toBe('PROFESOR')
        expect(formatPlayerClass('admin')).toBe('ADMIN')
      })
    })

    describe('formatFaction', () => {
      it('debe retornar "SIN BANDO" si la facción es nula, vacía, indefinida o "none"', () => {
        expect(formatFaction(null)).toBe('SIN BANDO')
        expect(formatFaction(undefined)).toBe('SIN BANDO')
        expect(formatFaction('   ')).toBe('SIN BANDO')
        expect(formatFaction('none')).toBe('SIN BANDO')
        expect(formatFaction('null')).toBe('SIN BANDO')
      })

      it('debe formatear bandos conocidos', () => {
        expect(formatFaction('union')).toBe('Bando Unión')
        expect(formatFaction('poder')).toBe('Bando Poder')
      })

      it('debe convertir bandos desconocidos a mayúsculas', () => {
        expect(formatFaction('otro')).toBe('OTRO')
      })
    })
  })

  describe('LibraryStore', () => {
    it('should initialize with closed state', () => {
      const library = useLibraryStore()
      expect(library.isOpen).toBe(false)
      expect(library.currentTab).toBe('gimnasios')
    })

    it('should open and set tab', () => {
      const library = useLibraryStore()
      library.open('captura')
      expect(library.isOpen).toBe(true)
      expect(library.currentTab).toBe('captura')
    })

    it('should close', () => {
      const library = useLibraryStore()
      library.open()
      library.close()
      expect(library.isOpen).toBe(false)
    })

    it('should switch tabs', () => {
      const library = useLibraryStore()
      library.switchTab('clases')
      expect(library.currentTab).toBe('clases')
    })
  })

  describe('Loading Store', () => {
    it('should start a loading operation', () => {
      const store = useLoadingStore()
      store.start('test', 'Loading...')
      expect(store.isActive).toBe(true)
      expect(store.current!.id).toBe('test')
      expect(store.current!.message).toBe('Loading...')
    })

    it('should finish a loading operation', () => {
      const store = useLoadingStore()
      store.start('test', 'Loading...')
      store.finish('test')
      expect(store.isActive).toBe(false)
      expect(store.current).toBe(null)
    })

    it('should handle a stack of loading states', () => {
      const store = useLoadingStore()
      store.start('op1', 'First')
      store.start('op2', 'Second')
      expect(store.current!.id).toBe('op2')

      store.finish('op2')
      expect(store.current!.id).toBe('op1')
    })

    it('should prioritize global overlays', () => {
      const store = useLoadingStore()
      store.start('op1', 'Non-Global', 'Sub', false)
      store.start('op2', 'Global', 'Sub', true)
      store.start('op3', 'Most Recent Non-Global', 'Sub', false)

      expect(store.current!.id).toBe('op2')
    })

    it('should update progress', () => {
      const store = useLoadingStore()
      store.start('test', 'Initial')
      store.setProgress('test', 'Updated', 'Sub')
      expect(store.current!.message).toBe('Updated')
      expect(store.current!.subMessage).toBe('Sub')
    })
  })

  describe('Tier & Inventory Logic', () => {
    it('should calculate specific tiers correctly', () => {
      const perfectPoke = { ivs: { hp: 31, atk: 31, def: 31, spa: 31, spd: 31, spe: 31 } }
      expect(getPokemonTier(perfectPoke).tier).toBe('S+')

      const midPoke = { ivs: { hp: 20, atk: 20, def: 20, spa: 20, spd: 20, spe: 20 } }
      expect(getPokemonTier(midPoke).tier).toBe('B')

      const badPoke = { ivs: { hp: 1, atk: 1, def: 1, spa: 1, spd: 1, spe: 1 } }
      expect(getPokemonTier(badPoke).tier).toBe('F')

      const nulledPoke = { ivs: {} } as unknown as Partial<Pokemon>
      expect(getPokemonTier(nulledPoke as unknown as Pokemon).tier).toBe('F')
    })

    it('should calculate sell prices as half of buying price', () => {
      expect(getSellPrice('pokeball')).toBe(100)
      expect(getSellPrice('greatball')).toBe(250)
      expect(getSellPrice('objeto_imaginario' as unknown as import('@/data/inventory/items').ItemId)).toBe(0)
    })

    it('should filter inventory by category', () => {
      const inv = {
        'pokeball': 10,
        'potion': 5,
        'firestone': 1,
        'objeto_desconocido': 2,
      }

      const balls = filterInventoryByCategory(inv, 'pokeballs')
      expect(balls.length).toBe(1)
      expect(balls[0]![0]).toBe('pokeball')

      const potions = filterInventoryByCategory(inv, 'potions')
      expect(potions.length).toBe(1)
      expect(potions[0]![0]).toBe('potion')
    })
  })

  describe('Option & Result Monads', () => {
    describe('Option Monad', () => {
      it('creates some and none options', () => {
        const s = some('potion')
        const n = none()

        expect(s.kind).toBe('some')
        if (s.kind === 'some') expect(s.value).toBe('potion')
        expect(n.kind).toBe('none')
      })

      it('converts nullable values with fromNullable', () => {
        expect(fromNullable('item').kind).toBe('some')
        expect(fromNullable(null).kind).toBe('none')
        expect(fromNullable(undefined).kind).toBe('none')
      })

      it('unwraps values with unwrapOr fallback', () => {
        expect(unwrapOr(some('pokeball'), 'potion')).toBe('pokeball')
        expect(unwrapOr(none<string>(), 'potion')).toBe('potion')
      })
    })

    describe('Result Monad', () => {
      it('creates ok and err results', () => {
        const resOk = ok<number, string>(42)
        const resErr = err<number, string>('Invalid input')

        expect(resOk.ok).toBe(true)
        if (resOk.ok) expect(resOk.value).toBe(42)

        expect(resErr.ok).toBe(false)
        if (!resErr.ok) expect(resErr.error).toBe('Invalid input')
      })

      it('matches over results with matchResult', () => {
        const success = matchResult(
          ok(10),
          v => v * 2,
          _e => 0,
        )
        const failure = matchResult(
          err(new Error('Failed')),
          _v => '100',
          e => e.message,
        )

        expect(success).toBe(20)
        expect(failure).toBe('Failed')
      })
    })
  })

  describe('Utility Scripts Exports Coverage', () => {
    it('should export database utility functions', () => {
      expect(typeof generateMigrations).toBe('function')
      expect(typeof restoreSupabaseDb).toBe('function')
      expect(typeof updateSupabaseDb).toBe('function')
    })
  })

  describe('Smogon Adapter custom stats injection', () => {
    it('should use custom stats and not default species stats', () => {
      const attacker = {
        id: 'charmander',
        uid: 'att_1',
        level: 6,
        atk: 10,
        def: 7,
        spa: 10,
        spd: 7,
        spe: 10,
        maxHp: 13,
        hp: 13,
        type: 'fire',
        ability: 'blaze',
      } as unknown as Pokemon

      const defender = {
        id: 'charmander',
        uid: 'def_1',
        level: 6,
        atk: 10,
        def: 7,
        spa: 10,
        spd: 7,
        spe: 10,
        maxHp: 13,
        hp: 13,
        type: 'fire',
        ability: 'blaze',
      } as unknown as Pokemon

      const move = {
        id: 'scratch',
        name: 'Scratch',
        power: 40,
        type: 'normal',
        cat: 'physical',
      } as unknown as Move

      const result = calculateDamageForTooltip(attacker, defender, move, {}, {}, {})
      expect(result).not.toBeNull()
      expect(result!.minDmg).toBe(5)
      expect(result!.maxDmg).toBe(6)
    })
  })

  describe('hoverEnterChildren', () => {
    it('calculates hover vars for standard button', () => {
      const btn = document.createElement('button')
      const vars = calculateButtonHoverEnterVars(btn)

      expect(vars.scale).toBe(1.03)
      expect(vars.y).toBe(-1)
    })

    it('calculates hover vars for modal close button', () => {
      const closeBtn = document.createElement('button')
      closeBtn.className = 'modal-close-btn'
      const vars = calculateButtonHoverEnterVars(closeBtn)

      expect(vars.scale).toBe(1.1)
      expect(vars.y).toBe(0)
    })

    it('calculates hover vars for accordion toggle (no scale)', () => {
      const toggleBtn = document.createElement('button')
      toggleBtn.className = 'accordion-toggle'
      const vars = calculateButtonHoverEnterVars(toggleBtn)

      expect(vars.scale).toBe(1)
      expect(vars.y).toBe(0)
    })

    describe('resolveCssColor', () => {
      it('returns default fallback on empty string', () => {
        expect(resolveCssColor('')).toBe('#0a84ff')
      })

      it('resolves CSS variable names from fallback map', () => {
        expect(resolveCssColor('var(--red)')).toBe('#ff453a')
        expect(resolveCssColor('--yellow')).toBe('#ffd60a')
        expect(resolveCssColor('green')).toBe('#32d74b')
      })

      it('returns raw hex when given hex', () => {
        expect(resolveCssColor('#123456')).toBe('#123456')
      })
    })
  })

  describe('Trainer Rename Cooldown and Validation Logic', () => {
    it('should enforce name length rules (3 to 15 characters)', async () => {
      const db = await createTestDBRouter()

      let res = await db.rpc('change_username', { new_username: 'Ab' })
      expect(res.error).toBe('El nombre de entrenador debe tener entre 3 y 15 caracteres.')

      res = await db.rpc('change_username', { new_username: 'VeryLongTrainerName' })
      expect(res.error).toBe('El nombre de entrenador debe tener entre 3 y 15 caracteres.')

      res = await db.rpc('change_username', { new_username: 'ValidTrainer' })
      expect(res.error).toBeNull()
    })

    it('should prevent changing name if it is identical to the current name', async () => {
      const db = await createTestDBRouter()

      await db.rpc('change_username', { new_username: 'TrainerRed' })

      const res = await db.rpc('change_username', { new_username: 'TrainerRed' })
      expect(res.error).toBe('El nuevo nombre es idéntico al actual.')
    })

    it('should enforce the 30-day cooldown limit', async () => {
      const db = await createTestDBRouter()

      let res = await db.rpc('change_username', { new_username: 'TrainerBlue' })
      expect(res.error).toBeNull()

      res = await db.rpc('change_username', { new_username: 'TrainerYellow' })
      expect(res.error).toContain('Debes esperar al menos 30 días')
    })
  })

  describe('Runner Logging Framework (OOP Hierarchy)', () => {
    it('FuzzerRunnerLogger creates fuzzer_debug.log in reports dir and intercepts console debug', () => {
      const logger = new FuzzerRunnerLogger({ logName: 'test_fuzzer' })
      logger.startIntercepting()

      logger.progress('🚀 [FUZZER] Test Progress Start')
      console.debug('[DEBUG-UID-LOOKUP] Testing debug line')
      console.log('Noisy raw debug log line')

      logger.close()

      const debugPath = logger.getDebugFilePath()
      expect(fs.existsSync(debugPath)).toBe(true)

      const content = fs.readFileSync(debugPath, 'utf-8')
      expect(content).toContain('[PROGRESS] 🚀 [FUZZER] Test Progress Start')
      expect(content).toContain('[DEBUG] [DEBUG-UID-LOOKUP] Testing debug line')
      expect(content).toContain('[DEBUG] Noisy raw debug log line')

      // Cleanup test file
      fs.unlinkSync(debugPath)
    })

    it('SimulationRunnerLogger creates simulation_debug.log in reports dir', () => {
      const logger = new SimulationRunnerLogger({ logName: 'test_simulation' })
      logger.startIntercepting()

      logger.progress('🚀 DISPOSITIVO DE SIMULACIONES')
      console.debug('[E2E-GETPOKE] rawId: p1a')

      logger.close()

      const debugPath = logger.getDebugFilePath()
      expect(fs.existsSync(debugPath)).toBe(true)

      const content = fs.readFileSync(debugPath, 'utf-8')
      expect(content).toContain('[PROGRESS] 🚀 DISPOSITIVO DE SIMULACIONES')
      expect(content).toContain('[DEBUG] [E2E-GETPOKE] rawId: p1a')

      // Cleanup test file
      fs.unlinkSync(debugPath)
    })
  })
})
