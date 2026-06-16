/**
 * @vitest-environment jsdom
 */
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { mount } from '@vue/test-utils'
import { setActivePinia, createPinia } from 'pinia'
import BattleInfoCard from '@/components/battle/BattleInfoCard.vue'
import type { Pokemon } from '@/types/pokemon'

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

vi.mock('@/logic/utils/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'day')
}))

vi.mock('@/logic/weather/weatherRegistry', () => ({
  getMechanicalWeather: vi.fn((w) => w || 'clear'),
  WEATHER_MECHANICAL: {
    SUN: 'sun', RAIN: 'rain', SANDSTORM: 'sandstorm', SNOW: 'snow', HAIL: 'hail', FOG: 'fog', CLEAR: 'clear'
  },
  WEATHER_UI_METADATA: {},
  WEATHER_VISUAL_METADATA: {}
}))

import { mockLocalStorage } from '../../helpers/debugSetup.ts'

mockLocalStorage()

interface BattleInfoCardInstance {
  volatileStatuses: { icon: string; text: string }[];
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
        pokemon: mockPokemon as unknown as Pokemon,
        isPlayer: false
      }
    })

    // Find the ability badge (🧠)
    // We look for the badge that contains the brain emoji
    const badges = wrapper.findAll('.m-status-tag')
    const abilityBadge = badges.find(b => b.text().includes('🧠'))
    
    expect(abilityBadge).toBeDefined()
    
    // Check volatileStatuses text (which is passed to PVTooltip description)
    // Since we can't easily check the tooltip content if it's teleported or a portal,
    // we check the computed property or the prop passed to the tooltip.
    
    // In our component, volatileStatuses[0].text should contain the description
    const vm = wrapper.vm as unknown as BattleInfoCardInstance
    const vs = vm.volatileStatuses
    const abilityStatus = vs.find(s => s.icon === '🧠')
    
    expect(abilityStatus).toBeDefined()
    expect(abilityStatus!.text).toContain('HABILIDAD - PUNTO TÓXICO:')
    expect(abilityStatus!.text).toContain('• El contacto físico puede envenenar al rival (30%).')
  })

  it('should handle case-insensitive ability names', async () => {
    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: { ...mockPokemon, ability: 'punto tóxico' } as unknown as Pokemon, // Lowercase
        isPlayer: false
      }
    })

    const vm = wrapper.vm as unknown as BattleInfoCardInstance
    const vs = vm.volatileStatuses
    const abilityStatus = vs.find(s => s.icon === '🧠')
    
    expect(abilityStatus).toBeDefined()
    expect(abilityStatus!.text).toContain('HABILIDAD - PUNTO TÓXICO:')
    expect(abilityStatus!.text).toContain('• El contacto físico puede envenenar al rival (30%).')
  })

  it('should show "Sin descripción disponible" for unknown abilities', async () => {
    const wrapper = mount(BattleInfoCard, {
      props: {
        pokemon: { ...mockPokemon, ability: 'Habilidad Inventada' } as unknown as Pokemon,
        isPlayer: false
      }
    })

    const vm = wrapper.vm as unknown as BattleInfoCardInstance
    const vs = vm.volatileStatuses
    const abilityStatus = vs.find(s => s.icon === '🧠')
    
    expect(abilityStatus).toBeDefined()
    expect(abilityStatus!.text).toContain('Sin descripción disponible')
  })
})
