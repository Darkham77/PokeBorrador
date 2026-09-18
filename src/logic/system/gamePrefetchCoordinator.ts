/**
 * src/logic/system/gamePrefetchCoordinator.ts
 *
 * Parallel boot coordinator for asynchronous prefetching of child domain stores.
 * Extracted from gameStore to eliminate circular dependencies with domain feature stores.
 */

import { logger } from '@/logic/utils/logger'
import { gameBus } from '@/logic/events/gameBus.ts'

function setupGamePrefetchCoordinator(): void {
  gameBus.on('GAME_DATA_LOADED', (e: Event) => {
    const detail = (e as CustomEvent<{ userId?: string }>).detail
    void prefetchGameSubsystems(detail?.userId)
  })
}

// Auto-register listener upon import
setupGamePrefetchCoordinator()

async function prefetchGameSubsystems(userId?: string): Promise<void> {
  const prefetchPromises: Promise<unknown>[] = []

  // 1. War Data
  prefetchPromises.push(
    import('@/stores/war.ts').then(({ useWarStore }) => useWarStore().loadWarData()).catch(e => {
      logger.warn('Boot', `War data prefetch failed: ${(e as Error).message}`)
    })
  )

  // 2. Events Data
  prefetchPromises.push(
    import('@/stores/events.ts').then(({ useEventStore }) => useEventStore().fetchEvents()).catch(e => {
      logger.warn('Boot', `Events prefetch failed: ${(e as Error).message}`)
    })
  )

  // 3. Daycare Data
  prefetchPromises.push(
    import('@/stores/breeding.ts').then(({ useBreedingStore }) => useBreedingStore().loadDaycare()).catch(e => {
      logger.warn('Boot', `Daycare prefetch failed: ${(e as Error).message}`)
    })
  )

  // 4. GTS Listings
  prefetchPromises.push(
    import('@/stores/gts.ts').then(({ useGTSStore }) => useGTSStore().fetchListings()).catch(e => {
      logger.warn('Boot', `GTS prefetch failed: ${(e as Error).message}`)
    })
  )

  // 5. Social & Session Hub
  if (userId) {
    prefetchPromises.push(
      import('@/stores/social/social.ts').then(async ({ useSocialStore }) => {
        const socialStore = useSocialStore()
        await socialStore.loadSocialData()
        if (socialStore.pendingRequests.length > 0) {
          const { useUIStore } = await import('@/stores/ui.ts')
          const uiStore = useUIStore()
          uiStore.notify(`¡Tenés ${socialStore.pendingRequests.length} solicitud(es) de amistad pendiente(s)!`, '🤝')
        }
      }).catch(err => {
        logger.error('Social', `Error al cargar notificaciones iniciales: ${(err as Error).message}`)
      })
    )
  }

  await Promise.allSettled(prefetchPromises)
}
