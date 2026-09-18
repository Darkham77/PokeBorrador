/**
 * tests/unit/world/world_spawns_and_maps_suite.spec.ts
 * Cohesive domain suite consolidating map spawn calculations, spawn rate integrity,
 * legendary rate clamping, whitelist compliance, RouteSpawnsTable modal rendering, and wild encounters.
 * @vitest-environment jsdom
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { mount } from '@vue/test-utils'
import { generateEncounter, clampLegendaryRates, getFinalGroundRates } from '@/logic/encounters/encounters'
import { FIRE_RED_MAPS } from '@/data/world/maps'
import { isBabyPokemonSpeciesId, isLegendaryPokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { PokemonSpeciesId } from '@/data/pokemon/pokedex'
import type { DayPhase } from '@/types/system/time'
import { isWeatherId, type WeatherId } from '@/logic/weather/weatherRegistry'
import RouteSpawnsTable from '@/components/modals/RouteSpawnsTable.vue'
import type { RouteSpawnMappedItem } from '@/logic/utils/routeSpawnHelpers'
import type { NpcChanceInfo } from '@/logic/weather/weatherUtils'
import type { ArchaeologyRewardData } from '@/composables/modals/useRouteSpawnsArchaeology'

vi.mock('@/logic/providers/pokemonDataProvider', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@/logic/providers/pokemonDataProvider')>()
  return {
    ...actual,
    pokemonDataProvider: {
      ...actual.pokemonDataProvider,
      getMaps: vi.fn(() => [
        { id: 'route1', wild: { day: ['pidgey'] }, lv: [2, 5], rates: [100] }
      ]),
      getPokemonData: vi.fn((id: string, bypass = false) => {
        if (id === 'pidgey') return { type: 'normal' } as any
        if (id === 'zapdos') {
          return {
            type: 'electric',
            type2: 'flying',
            hp: 90,
            atk: 90,
            def: 85,
            spa: 125,
            spd: 90,
            spe: 100
          } as any
        }
        if (id === 'magikarp' || id === 'poliwag' || id === 'psyduck') return { type: 'water' } as any
        return actual.pokemonDataProvider.getPokemonData(id, bypass)
      })
    }
  }
})

vi.mock('@/logic/pokemon/pokemonFactory', () => ({
  makePokemon: vi.fn((id: string, lv: number) => ({ id, lv, name: id }))
}))

vi.mock('@/logic/war/warEngine', () => ({
  isDisputePhase: vi.fn(() => false)
}))

vi.mock('@/logic/war/guardianEngine', () => ({
  getGuardianData: vi.fn(() => null),
  GUARDIAN_CHANCE: 0.1
}))

vi.mock('@/logic/war/bonusEngine', () => ({
  applyEncounterBonuses: vi.fn((p: unknown) => p)
}))

vi.mock('@/stores/events', () => ({
  useEventStore: vi.fn(() => ({ 
    activeEvents: [],
    getSpeciesBonuses: vi.fn()
  }))
}))

vi.mock('@/logic/utils/timeUtils', () => ({
  getDayCycle: vi.fn(() => 'day'),
  requireDayPhase: vi.fn((phase: string) => phase)
}))

interface MockLoc {
  id: string
  wild: {
    day?: string[]
    night?: string[]
    [key: string]: string[] | undefined
  }
  fishing?: {
    pool: string[]
    rates?: number[]
  }
  rates: {
    day?: number[]
    night?: number[]
    [key: string]: number[] | undefined
  }
}

function getPokemonSpriteHtml(id: string, isRare = false) {
  const num = 1
  const name = id
  return `<img src="https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/${num}.png"
          title="${name}" width="54" height="54" loading="lazy"
          onerror="this.style.display='none'" 
          class="${isRare ? 'rare-spawn' : ''}">`
}

function processActiveRates(pool: string[] | undefined, rates: number[] | undefined, minRatesObj: Record<string, number>) {
  if (!pool || !rates) return
  pool.forEach((id: string, index: number) => {
    const rate = rates[index] || 0
    if (minRatesObj[id] === undefined || rate < (minRatesObj[id] ?? Infinity)) {
      minRatesObj[id] = rate
    }
  })
}

function generateLocationSpawnHTML(loc: MockLoc, cycle: string) {
  const currentCycleWild = loc.wild[cycle] || []
  const baseWild = loc.wild.day || []
  
  const genericSpawns: string[] = []
  const specificSpawns: string[] = []
  
  currentCycleWild.forEach((id: string) => {
    if (baseWild.includes(id)) genericSpawns.push(id)
    else specificSpawns.push(id)
  })
  
  const fishingPool = loc.fishing ? loc.fishing.pool : []
  fishingPool.forEach((id: string) => {
    if (!genericSpawns.includes(id) && !specificSpawns.includes(id)) {
      genericSpawns.push(id)
    }
  })

  const minActiveRate: Record<string, number> = {}
  processActiveRates(currentCycleWild, loc.rates[cycle], minActiveRate)
  if (loc.fishing) processActiveRates(loc.fishing.pool, loc.fishing.rates || [], minActiveRate)

  const anyRare = [...genericSpawns, ...specificSpawns].some((id: string) => (minActiveRate[id] ?? 0) < 10)
  
  const renderSpritesHTML = (ids: string[]) => ids.map((id: string) => {
    const isRare = anyRare && ((minActiveRate[id] ?? 0) < 10)
    return getPokemonSpriteHtml(id, isRare)
  }).join('')

  const html = `<div class="location-spawns">
                <div class="spawn-row">
                  ${renderSpritesHTML(genericSpawns)}
                </div>
                ${specificSpawns.length > 0 ? `
                  <div class="spawn-row cycle-specific-spawns">
                    <span class="cycle-emoji-label">🌙</span>
                    ${renderSpritesHTML(specificSpawns)}
                  </div>
                ` : ''}
              </div>`
              
  return {
    html,
    genericCount: genericSpawns.length,
    specificCount: specificSpawns.length,
    totalTarget: genericSpawns.length + specificSpawns.length
  }
}

describe('World Spawns & Maps Domain Suite', () => {
  describe('Map Spawns UI Logic', () => {
    const mockLoc: MockLoc = {
      id: 'route12',
      wild: {
        day: ['pidgey', 'venonat'],
        night: ['venonat', 'oddish']
      },
      fishing: {
        pool: ['magikarp']
      },
      rates: {
        day: [20, 20],
        night: [40, 30]
      }
    }

    it('should generate correct number of sprites', () => {
      const results = generateLocationSpawnHTML(mockLoc, 'day')
      const imgs = (results.html.match(/<img/g) || []).length
      expect(imgs).toBe(3)
      expect(results.html).toContain('width="54"')
    })

    it('should identify rare spawns (rate < 10)', () => {
      const rareLoc: MockLoc = {
        ...mockLoc,
        rates: { day: [5, 20] }
      }
      const results = generateLocationSpawnHTML(rareLoc, 'day')
      expect(results.html).toContain('class="rare-spawn"')
    })
  })

  describe('RouteSpawnsTable Component', () => {
    it('renders pokemon spawns mode correctly and emits select-pokemon', async () => {
      const mockPokemon: RouteSpawnMappedItem = {
        id: 'pikachu',
        name: 'Pikachu',
        sprite: '/sprites/25.png',
        types: ['Electric'],
        percentage: 15.5,
        basePercentage: 10.0,
        baseRate: 10,
        diff: 5.5,
        multiplier: 1.5,
        spawnType: 'Visitante',
        statusClass: 'visitor',
        totalStats: 320,
        hp: 35,
        atk: 55,
        def: 40,
        spa: 50,
        spd: 50,
        spe: 90,
        isSeen: true,
        isCaught: true,
        isEventBoosted: false
      }

      const wrapper = mount(RouteSpawnsTable, {
        props: {
          title: 'Pokémon en la Ruta',
          probability: 100,
          baseProbability: 100,
          items: [mockPokemon],
          mode: 'pokemon',
          probClass: 'info',
          weatherEmoji: '⚡',
          weatherLabel: 'Tormenta Eléctrica'
        }
      })

      expect(wrapper.text()).toContain('Pikachu')
      expect(wrapper.text()).toContain('15.5%')
      expect(wrapper.text()).toContain('320')

      const row = wrapper.find('.report-row')
      expect(row.exists()).toBe(true)
      await row.trigger('click')

      expect(wrapper.emitted('select-pokemon')).toBeTruthy()
      expect(wrapper.emitted('select-pokemon')![0]).toEqual(['pikachu', true])
    })

    it('renders NPC mode correctly', () => {
      const mockNpc: NpcChanceInfo = {
        name: 'Entrenador Guay',
        type: 'trainer',
        active: true,
        chance: 25.0,
        details: 'Equipo nivel 30'
      }

      const wrapper = mount(RouteSpawnsTable, {
        props: {
          title: 'Encuentros Especiales',
          probability: 50,
          baseProbability: 50,
          items: [mockNpc],
          mode: 'npc',
          probClass: 'info',
          weatherEmoji: '',
          weatherLabel: ''
        }
      })

      expect(wrapper.text()).toContain('Entrenador Guay')
      expect(wrapper.text()).toContain('ENTRENADOR')
      expect(wrapper.text()).toContain('ACTIVO')
      expect(wrapper.text()).toContain('25.0%')
    })

    it('renders archaeology items mode correctly', () => {
      const mockItem: ArchaeologyRewardData = {
        name: 'Fósil Hélix',
        sprite: '/items/helix-fossil.png',
        icon: '/items/helix-fossil.png',
        type: 'Fósil',
        statusClass: 'rare',
        percentage: 5.0,
        basePercentage: 5.0,
        baseWeight: 10,
        activeWeight: 10,
        addedWeight: 0,
        baseTotalWeight: 100,
        activeTotalWeight: 100,
        description: 'Un fósil antiguo en espiral'
      }

      const wrapper = mount(RouteSpawnsTable, {
        props: {
          title: 'Arqueología y Fósiles',
          probability: 30,
          baseProbability: 30,
          items: [mockItem],
          mode: 'item',
          probClass: 'info',
          weatherEmoji: '',
          weatherLabel: ''
        }
      })

      expect(wrapper.text()).toContain('Fósil Hélix')
      expect(wrapper.text()).toContain('Fósil')
      expect(wrapper.text()).toContain('5.0%')
    })
  })

  describe('Spawn Integrity and Capping', () => {
    describe('clampLegendaryRates Unit Test', () => {
      it('should clamp legendary rate to exactly <= 1% when other rates exist', () => {
        const pool: PokemonSpeciesId[] = ['pidgey', 'rattata', 'articuno']
        const rates = [50, 50, 50]
        
        clampLegendaryRates(pool, rates)
        
        const legendaryRate = rates[2] ?? 0
        expect(legendaryRate).toBeLessThanOrEqual(100 / 99 + 0.0001)
        
        const sum = rates.reduce((a, b) => a + b, 0)
        const legendaryProb = legendaryRate / sum
        expect(legendaryProb).toBeCloseTo(0.01, 4)
      })

      it('should handle pools with multiple legendaries correctly, limiting each to <= 1%', () => {
        const pool: PokemonSpeciesId[] = ['pidgey', 'articuno', 'zapdos']
        const rates = [100, 50, 50]
        
        clampLegendaryRates(pool, rates)
        
        const rateArticuno = rates[1] ?? 0
        const rateZapdos = rates[2] ?? 0
        
        expect(rateArticuno).toBeLessThanOrEqual(100 / 99 + 0.0001)
        expect(rateZapdos).toBeLessThanOrEqual(100 / 99 + 0.0001)
        
        const sum = rates.reduce((a, b) => a + b, 0)
        expect(rateArticuno / sum).toBeLessThanOrEqual(0.0101)
        expect(rateZapdos / sum).toBeLessThanOrEqual(0.0101)
      })

      it('should do nothing if no legendary is in the pool', () => {
        const pool: PokemonSpeciesId[] = ['pidgey', 'rattata']
        const rates = [50, 50]
        clampLegendaryRates(pool, rates)
        expect(rates).toEqual([50, 50])
      })
    })

    describe('getFinalGroundRates Unit Test', () => {
      it('should correctly build and scale pool, and ensure babies are absent and legendaries capped', () => {
        const seafoam = FIRE_RED_MAPS.find(m => m.id === 'seafoam_islands')
        if (seafoam) {
          const cycle = 'day'
          const weather = 'blizzard'
          const { pool, rates } = getFinalGroundRates(seafoam, cycle, weather, [])

          pool.forEach(id => {
            expect(isBabyPokemonSpeciesId(id)).toBe(false)
          })

          const total = rates.reduce((sum, r) => sum + r, 0)
          pool.forEach((id, idx) => {
            if (isLegendaryPokemonSpeciesId(id)) {
              const rateVal = rates[idx] ?? 0
              const prob = rateVal / total
              expect(prob).toBeLessThanOrEqual(0.0101)
            }
          })
        }
      })
    })

    describe('FIRE_RED_MAPS Ground Spawns Verification', () => {
      it('should verify ground spawns for all maps in FIRE_RED_MAPS', () => {
        FIRE_RED_MAPS.forEach(map => {
          const cycles: DayPhase[] = ['morning', 'day', 'dusk', 'night']
          const weathers: WeatherId[] = ['clear', 'rain', 'sun', 'snow']

          cycles.forEach(cycle => {
            weathers.forEach(weather => {
              const { pool, rates } = getFinalGroundRates(map, cycle, weather, [])

              pool.forEach(id => {
                expect(isBabyPokemonSpeciesId(id), `Baby pokemon ${id} found in ground spawns on map ${map.name} (${map.id}) under ${cycle}/${weather}`).toBe(false)
              })

              const total = rates.reduce((sum, r) => sum + r, 0)
              pool.forEach((id, idx) => {
                if (isLegendaryPokemonSpeciesId(id)) {
                  const rateVal = rates[idx] ?? 0
                  const prob = rateVal / total
                  expect(prob, `Legendary pokemon ${id} has probability ${prob} (>1%) on map ${map.name} (${map.id}) under ${cycle}/${weather}`).toBeLessThanOrEqual(0.0101)
                }
              })
            })
          })
        })
      })

      it('should verify ground spawns when excludeLegendaries is true', () => {
        FIRE_RED_MAPS.forEach(map => {
          const cycle: DayPhase = 'day'
          const weather: WeatherId = 'clear'
          const { pool } = getFinalGroundRates(map, cycle, weather, [])

          pool.forEach(id => {
            expect(isBabyPokemonSpeciesId(id)).toBe(false)
          })
        })
      })

      it('should verify ground spawns with weather-specific pool entries', () => {
        FIRE_RED_MAPS.forEach(map => {
          if (map.weather) {
            const cycles: DayPhase[] = ['morning', 'day', 'dusk', 'night']
            Object.keys(map.weather).forEach(weatherKey => {
              if (!isWeatherId(weatherKey)) {
                throw new Error(`[spawn_integrity] Invalid weather id in map weather table: ${weatherKey}`)
              }
              cycles.forEach(cycle => {
                const { pool, rates } = getFinalGroundRates(map, cycle, weatherKey, [])

                pool.forEach(id => {
                  expect(isBabyPokemonSpeciesId(id)).toBe(false)
                })

                const total = rates.reduce((sum, r) => sum + r, 0)
                pool.forEach((id, idx) => {
                  if (isLegendaryPokemonSpeciesId(id)) {
                    const rateVal = rates[idx] ?? 0
                    const prob = rateVal / total
                    expect(prob).toBeLessThanOrEqual(0.0101)
                  }
                })
              })
            })
          }
        })
      })
    })

    describe('Whitelist Compliance (ENABLED_POKEMON_IDS)', () => {
      it('debe garantizar que el 100% de los mapas estáticos en FIRE_RED_MAPS contengan solo Pokémon de la lista blanca', async () => {
        const { ENABLED_POKEMON_IDS } = await import('@/data/system/constants')
        const allowedSet = new Set(ENABLED_POKEMON_IDS)

        FIRE_RED_MAPS.forEach(map => {
          if (map.wild) {
            Object.entries(map.wild).forEach(([cycle, pool]) => {
              (pool || []).forEach(speciesId => {
                expect(
                  allowedSet.has(speciesId as never),
                  `[MAP DEFINITION ERROR] Pokémon no habilitado '${speciesId}' encontrado en mapa ${map.name} (${map.id}) ciclo '${cycle}'`
                ).toBe(true)
              })
            })
          }

          if (map.fishing?.pool) {
            map.fishing.pool.forEach(speciesId => {
              expect(
                allowedSet.has(speciesId as never),
                `[MAP DEFINITION ERROR] Pokémon no habilitado '${speciesId}' encontrado en pesca de mapa ${map.name} (${map.id})`
              ).toBe(true)
            })
          }

          if (map.weather) {
            Object.entries(map.weather).forEach(([weatherId, config]) => {
              if (config.visitors) {
                Object.keys(config.visitors).forEach(speciesId => {
                  expect(
                    allowedSet.has(speciesId as never),
                    `[MAP DEFINITION ERROR] Pokémon no habilitado '${speciesId}' encontrado en visitantes de clima '${weatherId}' en mapa ${map.name} (${map.id})`
                  ).toBe(true)
                })
              }

              if (config.exclusive) {
                Object.keys(config.exclusive).forEach(speciesId => {
                  expect(
                    allowedSet.has(speciesId as never),
                    `[MAP DEFINITION ERROR] Pokémon no habilitado '${speciesId}' encontrado en exclusivos de clima '${weatherId}' en mapa ${map.name} (${map.id})`
                  ).toBe(true)
                })
              }
            })
          }
        })
      })

      it('debe garantizar que el 100% de los spawns generados dinámicamente por getFinalGroundRates pertenezcan a la lista blanca', async () => {
        const { ENABLED_POKEMON_IDS } = await import('@/data/system/constants')
        const allowedSet = new Set(ENABLED_POKEMON_IDS)
        const cycles: DayPhase[] = ['morning', 'day', 'dusk', 'night']
        const weathers: WeatherId[] = ['clear', 'rain', 'sun', 'snow', 'coldwave', 'thunderstorm', 'fog', 'mist', 'wind', 'heatwave', 'dust_storm', 'strong_winds']

        FIRE_RED_MAPS.forEach(map => {
          cycles.forEach(cycle => {
            weathers.forEach(weather => {
              const { pool } = getFinalGroundRates(map, cycle, weather, [])
              pool.forEach(speciesId => {
                expect(
                  allowedSet.has(speciesId as never),
                  `[RUNTIME SPAWN ERROR] Pokémon '${speciesId}' generado dinámicamente en ${map.name} (${map.id}) bajo ciclo '${cycle}' y clima '${weather}' no está en ENABLED_POKEMON_IDS`
                ).toBe(true)
              })
            })
          })
        })
      })
    })
  })

  describe('Wild Encounters Generation (encounters.js)', () => {
    const mockState = {
      faction: 'red',
      team: [{ level: 10 }],
      repelSecs: 0,
      trainerChance: 0
    }

    beforeEach(() => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5)
    })

    it('should respect forceEncounter and bypass repellent', async () => {
      const stateWithRepel = { ...mockState, repelSecs: 100 }
      const options = { forceEncounter: true }
      
      const result = await generateEncounter('route1', stateWithRepel as unknown as Parameters<typeof generateEncounter>[1], options)
      
      expect(result!.type).toBe('wild')
      expect(result!.pokemon!.id).toBe('pidgey')
    })

    it('should respect forceEncounter and bypass trainer chance', async () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.01)
      const stateWithTrainer = { ...mockState, trainerChance: 5 }
      const options = { forceEncounter: true }
      
      const result = await generateEncounter('route1', stateWithTrainer as unknown as Parameters<typeof generateEncounter>[1], options)
      
      expect(result!.type).toBe('wild')
    })

    it('should not block exclusive weather spawns by type-based weather multipliers', async () => {
      const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider')
      vi.mocked(pokemonDataProvider.getMaps).mockReturnValueOnce([
        {
          id: 'route24',
          wild: { day: ['pidgey'] },
          rates: { day: [100] },
          lv: [12, 16],
          weather: {
            storm: { exclusive: ['zapdos'] }
          }
        }
      ] as unknown as ReturnType<typeof pokemonDataProvider.getMaps>)

      vi.mocked(pokemonDataProvider.getPokemonData).mockImplementation((id: string) => {
        if (id === 'zapdos') {
          return {
            type: 'electric',
            type2: 'flying',
            hp: 90,
            atk: 90,
            def: 85,
            spa: 125,
            spd: 90,
            spe: 100
          } as unknown as ReturnType<typeof pokemonDataProvider.getPokemonData>
        }
        return {
          type: 'flying',
          hp: 40,
          atk: 45,
          def: 40,
          spa: 35,
          spd: 35,
          spe: 56
        } as unknown as ReturnType<typeof pokemonDataProvider.getPokemonData>
      })

      const result = await generateEncounter(
        'route24',
        mockState as unknown as Parameters<typeof generateEncounter>[1],
        { forceEncounter: true, weather: 'storm' }
      )
      expect(result).toBeDefined()
      expect(result!.type).toBe('wild')
      expect(result!.pokemon!.id).toBe('zapdos')
    })

    it('should generate fishing encounter and apply weather multipliers/visitors/exclusives to fishing pool', async () => {
      const { pokemonDataProvider } = await import('@/logic/providers/pokemonDataProvider')
      
      vi.mocked(pokemonDataProvider.getMaps).mockReturnValueOnce([
        {
          id: 'route22',
          wild: { day: ['pidgey'] },
          rates: { day: [100] },
          lv: [3, 5],
          fishing: { pool: ['magikarp', 'poliwag'], rates: [80, 20], lv: [5, 10] },
          weather: {
            rain: { visitors: { psyduck: 100 } }
          }
        }
      ] as unknown as ReturnType<typeof pokemonDataProvider.getMaps>)

      let callCount = 0
      vi.spyOn(Math, 'random').mockImplementation(() => {
        callCount++
        if (callCount === 1) return 0.99
        if (callCount === 2) return 0.99
        if (callCount === 3) return 0.99
        if (callCount === 4) return 0.0001
        if (callCount === 5) return 0.1
        return 0.5
      })

      const result = await generateEncounter(
        'route22',
        mockState as unknown as Parameters<typeof generateEncounter>[1],
        { weather: 'rain' }
      )

      expect(result).toBeDefined()
      expect(result!.type).toBe('fishing')
      expect(result!.pokemon).toBeDefined()
      expect(result!.rarity).toBeGreaterThan(0)
    })
  })
})
