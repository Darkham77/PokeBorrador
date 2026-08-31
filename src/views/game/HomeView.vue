<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'
import { gsap } from 'gsap'
import HomeEventsSection from '@/components/home/HomeEventsSection.vue'
import EventMissions from '@/components/events/EventMissions.vue'
import HomeBreedingWidget from '@/components/home/HomeBreedingWidget.vue'
import HomeNotificationsFeed from '@/components/home/HomeNotificationsFeed.vue'
import HomeGymsProgress from '@/components/home/HomeGymsProgress.vue'
import HomeFactionWar from '@/components/home/HomeFactionWar.vue'
import { useBreedingStore } from '@/stores/breeding'

const breedingStore = useBreedingStore()

const homeContainerRef = ref<HTMLElement | null>(null)
let gsapCtx: gsap.Context | null = null

onMounted(() => {
  breedingStore.loadDaycare()
  breedingStore.checkDailyReset()

  gsapCtx = gsap.context(() => {
    if (homeContainerRef.value) {
      gsap.fromTo(
        homeContainerRef.value,
        { opacity: 0, y: 10 },
        { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' }
      )
    }
  }, homeContainerRef.value || undefined)
})

onUnmounted(() => {
  if (gsapCtx) {
    gsapCtx.revert()
  }
})
</script>

<template>
  <div
    ref="homeContainerRef"
    class="home-view-container legacy-ui"
  >
    <!-- Layout de Flujo Continuo / Masonry (Columna Principal + Columna Lateral) -->
    <div class="home-masonry-layout">
      <!-- Columna Principal / Ancha (Izquierda en desktop) -->
      <main class="home-column-main">
        <div class="home-widget-block widget-events">
          <HomeEventsSection />
        </div>
        <div class="home-widget-block widget-gyms">
          <HomeGymsProgress />
        </div>
        <div class="home-widget-block widget-missions">
          <div class="home-section-card missions-card">
            <div class="card-header-bar">
              <div class="title-wrap">
                <span class="card-icon">📜</span>
                <h2 class="card-title">
                  MISIONES DIARIAS & DESPLIEGUES
                </h2>
              </div>
            </div>
            <div class="missions-body-wrap">
              <EventMissions />
            </div>
          </div>
        </div>
      </main>

      <!-- Columna Lateral / Widgets (Derecha en desktop) -->
      <aside class="home-column-sidebar">
        <div class="home-widget-block widget-breeding">
          <HomeBreedingWidget />
        </div>
        <div class="home-widget-block widget-faction">
          <HomeFactionWar />
        </div>
        <div class="home-widget-block widget-notifications">
          <HomeNotificationsFeed />
        </div>
      </aside>
    </div>
  </div>
</template>

<style scoped lang="scss">
@use "@/styles/core/_mixins" as *;

.home-view-container {
  width: 100%;
  max-width: 1600px;
  margin: 0 auto;
  padding: 8px 16px 40px;
  box-sizing: border-box;
}

.home-masonry-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 380px;
  gap: 20px;
  align-items: start;

  @media (max-width: 1100px) {
    display: flex;
    flex-direction: column;
    gap: 20px;

    .home-column-main,
    .home-column-sidebar {
      display: contents;
    }

    // Mobile single-column sequence (Breeding is 2nd right after Events)
    .widget-events {
      order: 1;
    }

    .widget-breeding {
      order: 2;
    }

    .widget-gyms {
      order: 3;
    }

    .widget-faction {
      order: 4;
    }

    .widget-missions {
      order: 5;
    }

    .widget-notifications {
      order: 6;
    }
  }
}

.home-column-main,
.home-column-sidebar {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.home-widget-block {
  min-width: 0;
  width: 100%;
}

.home-section-card {
  background: Rgba(18, 22, 34, 0.85);
  border: 1px solid Rgba(255, 255, 255, 0.08);
  border-radius: 12px;
  padding: 16px;
  box-shadow: 0 4px 16px Rgba(0, 0, 0, 0.4);
}

.card-header-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
  padding-bottom: 8px;
  border-bottom: 1px solid Rgba(255, 255, 255, 0.06);

  .title-wrap {
    display: flex;
    align-items: center;
    gap: 8px;
  }

  .card-icon {
    font-size: 18px;
  }

  .card-title {
    @include pixelated;
    font-size: 11px;
    color: var(--yellow, #facc15);
    margin: 0;
    letter-spacing: 1px;
  }
}

.missions-body-wrap {
  width: 100%;
}
</style>
