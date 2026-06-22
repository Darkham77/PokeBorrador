import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useMapStore } from '@/stores/map'
import { computed, ref } from 'vue'

describe('Decoupled Battle Weather Flow', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('debe priorizar clima del combate y luego restaurar al clima actual del mapa (avanzando la hora)', () => {
    const mapStore = useMapStore()
    
    // 1. Estado inicial del mapa fuera de combate: Clima Natural A
    const mapWeatherSource = ref('clear')
    mapStore.setGlobalWeather(null) // Usar dinámico

    // Simulación del estado del combate activo
    const battleState = ref({
      weather: { type: 'clear', visual: 'clear', turns: -1 },
      locationId: 'route1'
    })

    // Propiedad computada idéntica a la de las vistas de la Arena de Combate
    const computedWeather = computed(() => {
      if (battleState.value?.weather && battleState.value.weather.type !== 'clear' && battleState.value.weather.type !== 'none') {
        return battleState.value.weather.visual || battleState.value.weather.type
      }
      // Simula el retorno del clima actual del mapa (natural o forzado)
      return mapStore.globalWeather || mapWeatherSource.value
    })

    // Al inicio, el clima en combate coincide con el clima actual del mapa
    expect(computedWeather.value).toBe('clear')

    // 2. Se ejecuta un movimiento en combate (ej: Danza Lluvia)
    battleState.value.weather = { type: 'rain', visual: 'rain', turns: 5 }
    
    // El clima del combate cambia a lluvia (el mapa NO se modifica)
    expect(computedWeather.value).toBe('rain')
    expect(mapStore.globalWeather).toBeNull() // Mapa permanece limpio e intacto

    // 3. Durante el combate, transcurre el tiempo y el clima del mapa cambia (ej: son las 12 en punto y pasa a tormenta de arena)
    mapWeatherSource.value = 'sandstorm'

    // Mientras el combate siga con el movimiento activo, se sigue viendo el clima de combate (lluvia)
    expect(computedWeather.value).toBe('rain')

    // 4. El combate finaliza (o el movimiento expira), limpiando el clima temporal
    battleState.value.weather = { type: 'clear', visual: 'clear', turns: -1 }

    // El clima visual se restaura al clima actual del mapa, que ahora es Tormenta de Arena (no el inicial 'clear')
    expect(computedWeather.value).toBe('sandstorm')
  })
})
