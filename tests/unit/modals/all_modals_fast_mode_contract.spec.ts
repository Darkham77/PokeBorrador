// @vitest-environment jsdom
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { setActivePinia, createPinia } from 'pinia'
import { useModalStore } from '@/stores/modals'
import { useUIStore } from '@/stores/ui'
import { useBattleStore } from '@/stores/battle/battle'
import { MODAL_REGISTRY, type ModalRegistryKey } from '@/logic/modals/registry'
import { mockLocalStorage } from '../../helpers/debugSetup.ts'

mockLocalStorage()

describe('All Modals & Base Pages Fast Mode (Modo Rápido) Contract', () => {
  beforeEach(() => {
    mockLocalStorage()
    setActivePinia(createPinia())
    vi.clearAllMocks()
    if (typeof localStorage !== 'undefined') {
      localStorage.clear()
    }
  })

  describe('Modal Registry Complete Fast Mode Activation Contract', () => {
    const allModalKeys = Object.keys(MODAL_REGISTRY) as ModalRegistryKey[]

    it('should have at least 40 registered modals in MODAL_REGISTRY', () => {
      expect(allModalKeys.length).toBeGreaterThanOrEqual(40)
    })

    // Test every single modal in MODAL_REGISTRY to guarantee 100% contract compliance
    for (const modalKey of allModalKeys) {
      if (modalKey === 'Profile') {
        it(`[${modalKey}] should keep fast mode disabled for non-obscuring Profile modal`, () => {
          const modalStore = useModalStore()
          const uiStore = useUIStore()

          expect(uiStore.isFastMode).toBe(false)
          modalStore.open('Profile')
          expect(uiStore.isFastMode).toBe(false)

          modalStore.close('Profile')
          expect(uiStore.isFastMode).toBe(false)
        })
      } else {
        it(`[${modalKey}] should immediately activate Modo Rápido (isFastMode) upon opening and deactivate upon close`, () => {
          const modalStore = useModalStore()
          const uiStore = useUIStore()

          expect(uiStore.isAnyBlockingModalOpen).toBe(false)
          expect(uiStore.isFastMode).toBe(false)

          // 1. Inmediata activación al llamar open()
          modalStore.open(modalKey)
          expect(modalStore.isOpen(modalKey)).toBe(true)
          expect(uiStore.isAnyBlockingModalOpen).toBe(true)
          expect(uiStore.isFastMode).toBe(true)

          // 2. Inmediata desactivación al llamar close()
          modalStore.close(modalKey)
          expect(modalStore.isOpen(modalKey)).toBe(false)
          expect(uiStore.isAnyBlockingModalOpen).toBe(false)
          expect(uiStore.isFastMode).toBe(false)
        })
      }
    }
  })

  describe('Multi-Modal Stack Fast Mode Hierarchy', () => {
    it('should retain isFastMode = true until the last obscuring modal is closed', () => {
      const modalStore = useModalStore()
      const uiStore = useUIStore()

      expect(uiStore.isFastMode).toBe(false)

      modalStore.open('Shop')
      expect(uiStore.isFastMode).toBe(true)

      modalStore.open('Confirm', { title: 'Comprar?', message: 'Seguro?' })
      expect(uiStore.isFastMode).toBe(true)
      expect(modalStore.stack.length).toBe(2)

      // Cerrar el modal superior no desactiva el modo rápido si queda otro modal debajo
      modalStore.close('Confirm')
      expect(uiStore.isFastMode).toBe(true)

      // Al cerrar el último modal, el modo rápido se desactiva
      modalStore.close('Shop')
      expect(uiStore.isFastMode).toBe(false)
    })

    it('should ignore modals with overlay = none', () => {
      const modalStore = useModalStore()
      const uiStore = useUIStore()

      modalStore.open('Inventory', { overlay: 'none' } as Record<string, unknown>)
      expect(uiStore.isFastMode).toBe(false)

      modalStore.close('Inventory')
      expect(uiStore.isFastMode).toBe(false)
    })
  })

  describe('Battle Mode Background Suspension Contract', () => {
    it('should keep isFastMode false during active combat without modals and activate when modal opens on top', () => {
      const uiStore = useUIStore()
      const battleStore = useBattleStore()
      const modalStore = useModalStore()

      expect(battleStore.isBattleActive).toBe(false)
      expect(uiStore.isFastMode).toBe(false)

      // Activar combate sin modales: combate en primer plano debe permanecer en modo normal (60 FPS con clima)
      uiStore.setBattleActive(true)
      expect(uiStore.isFastMode).toBe(false)

      // Si se abre un modal durante el combate (ej. PokemonDetail), el combate de abajo entra a Modo Rápido
      modalStore.open('PokemonDetail')
      expect(uiStore.isFastMode).toBe(true)

      // Al cerrar el modal, el combate se restaura a modo normal
      modalStore.close('PokemonDetail')
      expect(uiStore.isFastMode).toBe(false)

      // Finalizar combate
      uiStore.setBattleActive(false)
      expect(uiStore.isFastMode).toBe(false)
    })
  })

  describe('Debug Fast Mode Toggle Contract', () => {
    it('should toggle isDebugFastMode and activate isFastMode directly', () => {
      const uiStore = useUIStore()

      expect(uiStore.isDebugFastMode).toBe(false)
      expect(uiStore.isFastMode).toBe(false)

      uiStore.toggleDebugFastMode()
      expect(uiStore.isDebugFastMode).toBe(true)
      expect(uiStore.isFastMode).toBe(true)

      // Compatibilidad con alias legacy
      expect(uiStore.isDebugPerformanceMode).toBe(true)
      expect(uiStore.isPerformanceMode).toBe(true)

      uiStore.toggleDebugFastMode()
      expect(uiStore.isDebugFastMode).toBe(false)
      expect(uiStore.isFastMode).toBe(false)
    })
  })
})
