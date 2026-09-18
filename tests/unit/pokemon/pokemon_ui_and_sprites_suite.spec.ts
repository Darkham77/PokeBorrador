/**
 * tests/unit/pokemon/pokemon_ui_and_sprites_suite.spec.ts
 * Cohesive domain suite consolidating Pokemon detail UI components (stat bars, tooltips,
 * level progress), friendship seal badges, and sprite outline/silhouette canvas rendering.
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import PokemonStatBar from '@/components/pokemon-detail/PokemonStatBar.vue'
import PokemonStatusSection from '@/components/pokemon-detail/PokemonStatusSection.vue'
import FriendshipSealBadge from '@/components/pokemon/FriendshipSealBadge.vue'
import PVTooltip from '@/components/common/PVTooltip.vue'
import { getProcessedSprite, getProcessedAura } from '@/logic/utils/spriteOutliner'
import type { Pokemon } from '@/types/pokemon/pokemon'

interface CustomWindow extends Window {
  NATURE_DATA?: Record<string, { up: string | null; down: string | null; desc: string }>
  ABILITY_DATA?: Record<string, { desc: string }>
}

interface TooltipProps {
  description: string
}

describe('Pokemon UI & Sprites Domain Suite', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  describe('PokemonStatusSection - Tooltips & Progress', () => {
    const mockPokemon = {
      nature: 'bold',
      ability: 'poisonpoint',
      hp: 100,
      maxHp: 100,
      level: 50,
      exp: 0,
      expNeeded: 1000
    }

    it('should pass the correct nature description to the tooltip', () => {
      const wrapper = mount(PokemonStatusSection, {
        props: { pokemon: mockPokemon as unknown as Pokemon }
      })

      const tooltips = wrapper.findAllComponents({ name: 'PVTooltip' })
      const natureTooltip = tooltips.find(t => t.props('title') === 'NATURALEZA')
      
      expect(natureTooltip).toBeDefined()
      expect(natureTooltip!.props('description')).toContain('▲ +10% Defensa / ▼ -10% Ataque')
    })

    it('should pass the correct ability description to the tooltip', () => {
      const wrapper = mount(PokemonStatusSection, {
        props: { pokemon: mockPokemon as unknown as Pokemon }
      })

      const tooltips = wrapper.findAllComponents({ name: 'PVTooltip' })
      const abilityTooltip = tooltips.find(t => t.props('title') === 'HABILIDAD')
      
      expect(abilityTooltip).toBeDefined()
      expect(abilityTooltip!.props('description')).toContain('• El contacto físico puede envenenar al rival (30%).')
    })

    it('should render the level progress bar correctly according to MAX_POKEMON_LEVEL', () => {
      const wrapper = mount(PokemonStatusSection, {
        props: { pokemon: mockPokemon as unknown as Pokemon }
      })

      const levelBar = wrapper.find('.level-group')
      expect(levelBar.exists()).toBe(true)
      expect(levelBar.find('.bar-header span:first-child').text()).toBe('NIVEL')
      expect(levelBar.find('.level-text').text()).toBe('Nv. 50 / 100')

      const levelFill = wrapper.find('.level-fill')
      expect(levelFill.attributes('style')).toContain('width: 50%')

      const tooltips = wrapper.findAllComponents({ name: 'PVTooltip' })
      const levelTooltip = tooltips.find(t => t.props('title') === 'NIVEL 50 / 100')
      expect(levelTooltip).toBeDefined()
      expect(levelTooltip!.props('description')).toContain('Nivel actual: 50. Faltan 50 niveles para alcanzar el nivel máximo (100).')
    })
  })

  describe('Pokedex Detail UI Components', () => {
    beforeEach(() => {
      const cw = window as unknown as CustomWindow
      cw.NATURE_DATA = {
        'Serio': { up: null, down: null, desc: 'Naturaleza equilibrada.' }
      }
      cw.ABILITY_DATA = {
        'Presión': { desc: 'Aumenta el consumo de PP del rival.' }
      }
    })

    describe('PokemonStatBar', () => {
      it('renders in "full" mode by default (two tracks)', () => {
        const wrapper = mount(PokemonStatBar, {
          props: {
            label: 'HP',
            value: 100,
            max: 200,
            iv: 31,
            mode: 'full'
          }
        })
        
        expect(wrapper.find('.main-track').exists()).toBe(true)
        expect(wrapper.find('.iv-track').exists()).toBe(true)
        expect(wrapper.find('.iv-num').text()).toBe('31 IV')
      })

      it('renders only the main track in "stat" mode', () => {
        const wrapper = mount(PokemonStatBar, {
          props: {
            label: 'ATK',
            value: 50,
            max: 100,
            mode: 'stat'
          }
        })
        
        expect(wrapper.find('.main-track').exists()).toBe(true)
        expect(wrapper.find('.iv-track').exists()).toBe(false)
        expect(wrapper.find('.iv-num').exists()).toBe(false)
      })

      it('renders as IV bar in "iv" mode', () => {
        const wrapper = mount(PokemonStatBar, {
          props: {
            label: 'SPE',
            value: 31,
            max: 31,
            mode: 'iv'
          }
        })
        
        expect(wrapper.find('.main-track').exists()).toBe(true)
        const grade = wrapper.find('.grade')
        expect(grade.exists()).toBe(true)
        expect(grade.text()).toBe('S')
      })
    })

    describe('PokemonStatusSection Extended', () => {
      const mockPokemon = {
        hp: 10,
        maxHp: 20,
        level: 5,
        nature: 'serious',
        ability: 'pressure',
        vigor: 5,
        exp: 10,
        expNeeded: 100
      }

      it('displays HP and EXP bars', () => {
        const wrapper = mount(PokemonStatusSection, {
          props: { pokemon: mockPokemon as unknown as Pokemon, context: 'team' }
        })
        
        expect(wrapper.text()).toContain('10 / 20')
        expect(wrapper.text()).toContain('10 / 100')
      })

      it('contains Vigor description for breeding', () => {
        const wrapper = mount(PokemonStatusSection, {
          props: { pokemon: mockPokemon as unknown as Pokemon },
          global: { stubs: { PVTooltip: false } }
        })
        
        const vigorTooltip = wrapper.find('.vigor-card').getComponent(PVTooltip)
        expect((vigorTooltip.props() as unknown as TooltipProps).description).toContain('cuántas veces puede reproducirse')
        expect((vigorTooltip.props() as unknown as TooltipProps).description).toContain('NO se recupera')
      })

      it('renders nature and ability tooltips', () => {
        const wrapper = mount(PokemonStatusSection, {
          props: { pokemon: mockPokemon as unknown as Pokemon },
          global: { stubs: { PVTooltip: false } }
        })
        
        const natureTooltip = wrapper.find('.nature-card').getComponent(PVTooltip)
        const abilityTooltip = wrapper.find('.ability-card').getComponent(PVTooltip)
        
        expect((natureTooltip.props() as unknown as TooltipProps).description).toBe('Sin efecto en estadísticas.')
        expect((abilityTooltip.props() as unknown as TooltipProps).description).toContain('Fuerza al rival a consumir el doble de PP')
        expect((abilityTooltip.props() as unknown as TooltipProps).description).toContain('Campo:')
      })
    })
  })

  describe('FriendshipSealBadge Component', () => {
    it('renders distrust seal for 0 friendship', () => {
      const wrapper = mount(FriendshipSealBadge, {
        props: {
          friendship: 0,
          size: 'md',
        },
      })

      const badge = wrapper.find('.friendship-seal-badge')
      expect(badge.exists()).toBe(true)
      expect(badge.classes()).toContain('tier-distrust')
      expect(badge.find('.seal-icon').text()).toBe('⛓️')
    })

    it('renders sprout seal for 70 friendship (default)', () => {
      const wrapper = mount(FriendshipSealBadge, {
        props: {
          friendship: 70,
          size: 'sm',
        },
      })

      const badge = wrapper.find('.friendship-seal-badge')
      expect(badge.classes()).toContain('tier-sprout')
      expect(badge.find('.seal-icon').text()).toBe('🌱')
    })

    it('renders comrade seal for 120 friendship', () => {
      const wrapper = mount(FriendshipSealBadge, {
        props: {
          friendship: 120,
          size: 'md',
        },
      })

      const badge = wrapper.find('.friendship-seal-badge')
      expect(badge.classes()).toContain('tier-comrade')
      expect(badge.find('.seal-icon').text()).toBe('🤝')
    })

    it('renders radiant_prism seal for 180 friendship (evolution ready)', () => {
      const wrapper = mount(FriendshipSealBadge, {
        props: {
          friendship: 180,
          size: 'md',
        },
      })

      const badge = wrapper.find('.friendship-seal-badge')
      expect(badge.classes()).toContain('tier-radiant_prism')
      expect(badge.find('.seal-icon').text()).toBe('💎')
    })

    it('renders best_friends ribbon for 255 friendship (combat perks active)', () => {
      const wrapper = mount(FriendshipSealBadge, {
        props: {
          friendship: 255,
          size: 'lg',
        },
      })

      const badge = wrapper.find('.friendship-seal-badge')
      expect(badge.classes()).toContain('tier-best_friends')
      expect(badge.find('.seal-icon').text()).toBe('🎀')
    })
  })

  describe('SpriteOutliner Utility', () => {
    let originalImage: typeof globalThis.Image
    let originalCreateElement: typeof document.createElement

    beforeEach(() => {
      originalImage = globalThis.Image
      originalCreateElement = document.createElement

      class MockImage {
        onload: () => void = () => {}
        onerror: (err: unknown) => void = () => {}
        _src: string = ''
        naturalWidth: number = 64
        naturalHeight: number = 64

        set src(val: string) {
          this._src = val
          if (val.includes('error')) {
            setTimeout(() => this.onerror(new Error('Mock Image Error')), 0)
          } else {
            setTimeout(() => this.onload(), 0)
          }
        }

        get src() {
          return this._src
        }
      }

      vi.stubGlobal('Image', MockImage)

      const mockCtx = {
        drawImage: vi.fn(),
        fillRect: vi.fn(),
        filter: 'none',
        globalCompositeOperation: 'source-over',
        fillStyle: '',
      }

      const mockCanvas = {
        getContext: () => mockCtx,
        toDataURL: (format: string) => `data:image/png;base64,mocked_${format}_url`,
        width: 0,
        height: 0,
      }

      document.createElement = vi.fn().mockImplementation((tagName: string) => {
        if (tagName === 'canvas') {
          return mockCanvas as unknown as HTMLCanvasElement
        }
        return originalCreateElement.call(document, tagName)
      })
    })

    afterEach(() => {
      globalThis.Image = originalImage
      document.createElement = originalCreateElement
      vi.restoreAllMocks()
    })

    describe('Sprite Outline/Silhouette Processing', () => {
      it('debe generar y retornar un sprite pre-renderizado', async () => {
        const url = await getProcessedSprite('/assets/sprites/pokemon/25.webp', 'outline')
        expect(url).toBe('data:image/png;base64,mocked_image/png_url')
      })

      it('debe devolver la URL original como fallback en caso de error de carga de imagen', async () => {
        const originalUrl = '/assets/sprites/pokemon/error.webp'
        const url = await getProcessedSprite(originalUrl, 'outline')
        expect(url).toBe(originalUrl)
      })

      it('debe usar el cache para retornar la misma data URL en subsecuentes llamadas', async () => {
        const url1 = await getProcessedSprite('/assets/sprites/pokemon/1.webp', 'silhouette')
        const url2 = await getProcessedSprite('/assets/sprites/pokemon/1.webp', 'silhouette')
        expect(url1).toBe(url2)
      })
    })

    describe('Aura Processing', () => {
      it('debe generar y retornar un aura coloreada y difuminada', async () => {
        const url = await getProcessedAura('/assets/fx/flare_1.webp', 'rgba(255, 0, 0, 0.9)', 1.5)
        expect(url).toBe('data:image/png;base64,mocked_image/png_url')
      })

      it('debe usar el cache para auras idénticas', async () => {
        const url1 = await getProcessedAura('/assets/fx/flare_2.webp', 'rgba(0, 255, 255, 0.85)', 1.5)
        const url2 = await getProcessedAura('/assets/fx/flare_2.webp', 'rgba(0, 255, 255, 0.85)', 1.5)
        expect(url1).toBe(url2)
      })

      it('debe devolver la URL original como fallback ante errores', async () => {
        const originalUrl = '/assets/fx/error_flare.webp'
        const url = await getProcessedAura(originalUrl, 'rgba(0, 255, 255, 0.85)', 1.5)
        expect(url).toBe(originalUrl)
      })
    })
  })
})
