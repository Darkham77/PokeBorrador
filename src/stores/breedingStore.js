import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { DBRouter } from '@/logic/dbRouter'
import { checkCompatibility, calculateInheritance, inheritNature, getEggSpecies } from '@/logic/breeding/breedingEngine'
import { EGG_SPAWN_INTERVAL_MS } from '@/logic/breeding/breedingData'

export const useBreedingStore = defineStore('breeding', () => {
  const daycareSlots = ref([])
  const playerEggs = ref([])
  const upgrades = ref({ egg_capacity: 1, slot_boost: 0 })
  const isLoading = ref(false)

  const hasPair = computed(() => {
    return daycareSlots.value.length === 2 && 
           daycareSlots.value[0].pokemon && 
           daycareSlots.value[1].pokemon
  })

  const currentCompatibility = computed(() => {
    if (!hasPair.value) return { level: 0 }
    return checkCompatibility(daycareSlots.value[0].pokemon, daycareSlots.value[1].pokemon)
  })

  async function loadDaycare() {
    isLoading.value = true
    try {
      // 1. Cargar Slots
      const slots = await DBRouter.from('daycare_slots').select('*').order('slot_index')
      daycareSlots.value = slots || []
      
      // 2. Cargar Huevos
      const eggs = await DBRouter.from('eggs').select('*').order('created_at')
      playerEggs.value = eggs || []
      
      // 3. Cargar Mejoras
      const upg = await DBRouter.from('daycare_upgrades').select('*').single()
      if (upg) upgrades.value = upg
    } catch (error) {
      console.error('[BreedingStore] Error loading daycare:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function depositPokemon(pokemon, slotIndex) {
    isLoading.value = true
    try {
      const now = new Date().toISOString()
      const data = {
        pokemon_id: pokemon.uid,
        slot_index: slotIndex,
        deposited_at: now
      }
      
      // Eliminar si ya hay algo en ese slot (upsert manual por seguridad)
      await DBRouter.from('daycare_slots').delete().eq('slot_index', slotIndex)
      await DBRouter.from('daycare_slots').insert(data)
      
      await loadDaycare()
    } catch (error) {
      console.error('[BreedingStore] Error depositing:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function withdrawPokemon(slotIndex) {
    isLoading.value = true
    try {
      await DBRouter.from('daycare_slots').delete().eq('slot_index', slotIndex)
      await loadDaycare()
    } catch (error) {
      console.error('[BreedingStore] Error withdrawing:', error)
    } finally {
      isLoading.value = false
    }
  }

  async function generateEgg() {
    if (!hasPair.value || currentCompatibility.value.level === 0) return

    const pA = daycareSlots.value[0].pokemon
    const pB = daycareSlots.value[1].pokemon
    const compat = currentCompatibility.value
    
    // Calcular herencia
    const ivs = calculateInheritance(pA, pB, pA.heldItem, pB.heldItem)
    const nature = inheritNature(pA, pB, pA.heldItem, pB.heldItem)
    
    const now = new Date()
    const spawnInterval = EGG_SPAWN_INTERVAL_MS[compat.level] || (1000 * 60 * 60 * 8)
    const hatchReadyTime = new Date(now.getTime() + spawnInterval).toISOString()

    const newEgg = {
      species: compat.eggSpecies,
      parent_a: pA.uid,
      parent_b: pB.uid,
      inherited_ivs: ivs,
      nature: nature,
      shiny_roll: Math.random() < (1 / 4096), // Probabilidad base Gen 3+
      hatch_ready_time: hatchReadyTime,
      created_at: now.toISOString()
    }

    try {
      await DBRouter.from('eggs').insert(newEgg)
      
      // Actualizar tiempo de deposito para el siguiente huevo
      await DBRouter.from('daycare_slots').update({ deposited_at: now.toISOString() })
      
      await loadDaycare()
    } catch (error) {
      console.error('[BreedingStore] Error generating egg:', error)
    }
  }

  return {
    daycareSlots,
    playerEggs,
    upgrades,
    isLoading,
    hasPair,
    currentCompatibility,
    loadDaycare,
    depositPokemon,
    withdrawPokemon,
    generateEgg
  }
})
