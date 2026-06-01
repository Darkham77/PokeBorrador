import { ref, watch, onMounted, type Ref } from 'vue'
import { getProcessedSprite, getProcessedAura } from '@/logic/utils/spriteOutliner'

export interface ProcessedSpawn {
  id: string | null
  key: string
  sprite?: string
  isCaught?: boolean
}

export interface ProcessedGuardian {
  id: string
  sprite?: string
  isCaught?: boolean
}

export function useMapCardSprites(
  processedGrid: Ref<ProcessedSpawn[]>,
  processedGuardian: Ref<ProcessedGuardian | null>,
  flare1Url: string,
  flare2Url: string
) {
  const processedSprites = ref<Record<string, string>>({})
  const guardianProcessedSprite = ref<string>('')
  const processedRareAura = ref<string>('')
  const processedAtmosAura = ref<string>('')

  onMounted(() => {
    // Pre-render global auras for spawns
    try {
      getProcessedAura(flare2Url, 'rgba(255, 0, 0, 0.9)', 1.5).then(url => {
        processedRareAura.value = url
      })
      getProcessedAura(flare1Url, 'rgba(0, 255, 255, 0.85)', 1.5).then(url => {
        processedAtmosAura.value = url
      })
    } catch (e) {
      console.warn('[MapCardSprites] Failed to pre-render auras:', e)
    }
  })

  // Watch spawn grid to process and cache outlines
  watch(
    () => processedGrid.value,
    (newGrid) => {
      if (!newGrid) return
      newGrid.forEach(async (item) => {
        if (!item.id || !item.sprite) return
        const key = `${item.key}-${item.isCaught}`
        if (processedSprites.value[key]) return

        const type = !item.isCaught ? 'silhouette' : 'outline'
        try {
          const processed = await getProcessedSprite(item.sprite, type)
          processedSprites.value[key] = processed
        } catch (e) {
          console.warn('[MapCardSprites] Failed to process outline for spawn:', item.id, e)
        }
      })
    },
    { immediate: true, deep: true }
  )

  // Watch guardian to process outline
  watch(
    () => processedGuardian.value,
    async (newGuardian) => {
      if (!newGuardian || !newGuardian.sprite) {
        guardianProcessedSprite.value = ''
        return
      }
      const type = !newGuardian.isCaught ? 'silhouette' : 'outline'
      try {
        const processed = await getProcessedSprite(newGuardian.sprite, type)
        guardianProcessedSprite.value = processed
      } catch (e) {
        console.warn('[MapCardSprites] Failed to process outline for guardian:', newGuardian.id, e)
      }
    },
    { immediate: true }
  )

  return {
    processedSprites,
    guardianProcessedSprite,
    processedRareAura,
    processedAtmosAura
  }
}
