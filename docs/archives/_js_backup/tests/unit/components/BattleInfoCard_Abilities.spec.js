/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BattleInfoCard from '@/components/battle/BattleInfoCard.vue'

vi.mock('@/stores/battle', () => ({
  useBattleStore: vi.fn(() => ({
    state: { weather: { type: 'clear' } },
    playerStages: {},
    enemyStages: {}
  }))
}))

vi.mock('@/stores/profile', () => ({
  useProfileStore: vi.fn(() => ({
    profileData: { isAdmin: false }
  }))
}))

// Mock components that might cause issues
vi.mock('@/components/shared/PokemonTypePills.vue', () => ({
  default: { template: '<div class="types-mock"></div>' }
}))

vi.mock('@/logic/services/assetService', () => ({
  getAssetUrl: vi.fn(),
  ASSET_TYPES: { ITEM: 'item' }
}))

vi.mock('@/logic/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'day')
}))

vi.mock('@/logic/battle/weatherMapper', () => ({
  getMechanicalWeather: vi.fn((w) => w || 'clear'),
  WEATHER_MECHANICAL: {
    SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', CLEAR: 'clear'
  },
  WEATHER_UI_METADATA: {},
  WEATHER_VISUAL_METADATA: {}
}))

// Mock localStorage for environments where it's missing
if (typeof localStorage === 'undefined') {
  const store = {}
  global.localStorage = {
    getItem: (key) => store[key] || null,
    setItem: (key, value) => { store[key] = value.toString() },
    clear: () => { for (const key in store) delete store[key] },
    removeItem: (key) => { delete store[key] }
  }
}

describe('BattleInfoCard - Ability Tooltips', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  const mockPokemon = {
    name: 'Nidorina',
    level: 16,
    hp: 159,
    maxHp: 159,
    gender: 'F',
    ability: 'Punto tóxico', // Mixed case as in ABILITY_DATA
    type: 'poison'
  }

  it('should display the ability description in the tooltip', async () => {
    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: mockPokemon,
        isPlayer: false
      }
    })

    // Find the ability badge (🧠)
    // We look for the badge that contains the brain emoji
    const badges = wrapper.findAll('.status-badge')
    const abilityBadge = badges.find(b => b.text().includes('🧠'))
    
    expect(abilityBadge).toBeDefined()
    
    // Check volatileStatuses text (which is passed to PVTooltip description)
    // Since we can't easily check the tooltip content if it's teleported or a portal,
    // we check the computed property or the prop passed to the tooltip.
    
    // In our component, volatileStatuses[0].text should contain the description
    const vs = wrapper.vm.volatileStatuses
    const abilityStatus = vs.find(s => s.icon === '🧠')
    
    expect(abilityStatus.text).toContain('HABILIDAD: PUNTO TÓXICO')
    expect(abilityStatus.text).toContain('Puede envenenar al objetivo al mínimo contacto')
  })

  it('should handle case-insensitive ability names', async () => {
    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: { ...mockPokemon, ability: 'punto tóxico' }, // Lowercase
        isPlayer: false
      }
    })

    const vs = wrapper.vm.volatileStatuses
    const abilityStatus = vs.find(s => s.icon === '🧠')
    
    expect(abilityStatus.text).toContain('HABILIDAD: PUNTO TÓXICO')
    expect(abilityStatus.text).toContain('Puede envenenar al objetivo al mínimo contacto')
  })

  it('should show "Sin descripción disponible" for unknown abilities', async () => {
    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: { ...mockPokemon, ability: 'Habilidad Inventada' },
        isPlayer: false
      }
    })

    const vs = wrapper.vm.volatileStatuses
    const abilityStatus = vs.find(s => s.icon === '🧠')
    
    expect(abilityStatus.text).toContain('Sin descripción disponible')
  })
})
