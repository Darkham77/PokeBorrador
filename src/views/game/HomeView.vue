<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'
import { gsap } from 'gsap'
import HomePendingRewardsWidget from '@/components/home/HomePendingRewardsWidget.vue'
import HomeEventsSection from '@/components/home/HomeEventsSection.vue'
import EventMissions from '@/components/events/EventMissions.vue'
import HomeBreedingWidget from '@/components/home/HomeBreedingWidget.vue'
import HomeNotificationsFeed from '@/components/home/HomeNotificationsFeed.vue'
import HomeGymsProgress from '@/components/home/HomeGymsProgress.vue'
import HomeFactionWar from '@/components/home/HomeFactionWar.vue'
import HomeClassMissionsWidget from '@/components/home/HomeClassMissionsWidget.vue'
import HomeActiveBuffsWidget from '@/components/home/HomeActiveBuffsWidget.vue'
import HomeEconomyWidget from '@/components/home/HomeEconomyWidget.vue'
import HomeRankedWidget from '@/components/home/HomeRankedWidget.vue'
import HomePassiveDefenseWidget from '@/components/home/HomePassiveDefenseWidget.vue'
import { useBreedingStore } from '@/stores/breeding'
import { useLoadingStore } from '@/stores/loading'
import { useUnifiedRewards } from '@/composables/rewards/useUnifiedRewards'
import HomeCollapsibleWidget from '@/components/home/HomeCollapsibleWidget.vue'
import HomeWidgetMinimizeBtn from '@/components/home/HomeWidgetMinimizeBtn.vue'
import HomeWidgetRefreshBtn from '@/components/home/HomeWidgetRefreshBtn.vue'

const breedingStore = useBreedingStore()
const loadingStore = useLoadingStore()
const { unifiedRewards } = useUnifiedRewards()

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

  // Ensure DOM and child widgets are fully laid out and painted before releasing loading overlay
  void nextTick(() => {
    if (typeof requestAnimationFrame !== 'undefined') {
      requestAnimationFrame(() => {
        loadingStore.markAppMounted()
      })
    } else {
      loadingStore.markAppMounted()
    }
  })
})

onUnmounted(() => {
  if (gsapCtx) {
    gsapCtx.revert()
  }
})
</script>

<template>
  <div
    id="home-view-container"
    ref="homeContainerRef"
    class="home-view-container legacy-ui"
  >
    <!-- Layout de Flujo Continuo / Masonry (Columna Principal + Columna Lateral) -->
    <div class="home-masonry-layout">
      <!-- Columna Principal / Ancha (Izquierda en desktop) -->
      <main class="home-column-main">
        <div
          v-if="unifiedRewards.length > 0"
          id="widget-pending-rewards-section"
          class="home-widget-block widget-pending-rewards"
        >
          <HomeCollapsibleWidget
            widget-id="pending_rewards"
            title="RECOMPENSAS PENDIENTES"
            icon="🎁"
            :badge="unifiedRewards.length"
          >
            <HomePendingRewardsWidget />
          </HomeCollapsibleWidget>
        </div>
        <div
          id="widget-events-section"
          class="home-widget-block widget-events"
        >
          <HomeCollapsibleWidget
            widget-id="events"
            title="EVENTOS MUNDIALES"
            icon="🏆"
          >
            <HomeEventsSection />
          </HomeCollapsibleWidget>
        </div>
        <div
          id="widget-gyms-progress"
          class="home-widget-block widget-gyms"
        >
          <HomeCollapsibleWidget
            widget-id="gyms"
            title="GIMNASIOS DE KANTO"
            icon="🏆"
          >
            <HomeGymsProgress />
          </HomeCollapsibleWidget>
        </div>
        <div
          id="widget-coliseum-dual-section"
          class="home-widget-block widget-coliseum-dual"
        >
          <div class="dual-widgets-grid">
            <HomeCollapsibleWidget
              widget-id="ranked"
              title="ARENA CLASIFICATORIA"
              icon="🏆"
            >
              <HomeRankedWidget />
            </HomeCollapsibleWidget>
            <HomeCollapsibleWidget
              widget-id="defense"
              title="DEFENSA PASIVA"
              icon="🛡️"
            >
              <HomePassiveDefenseWidget />
            </HomeCollapsibleWidget>
          </div>
        </div>
        <div
          id="widget-daily-missions"
          class="home-widget-block widget-missions"
        >
          <HomeCollapsibleWidget
            widget-id="missions"
            title="MISIONES DIARIAS & DESPLIEGUES"
            icon="📜"
          >
            <div class="home-section-card missions-card">
              <div class="card-header-bar">
                <div class="title-wrap">
                  <span class="emoji card-icon">📜</span>
                  <h2 class="card-title">
                    MISIONES DIARIAS & DESPLIEGUES
                  </h2>
                </div>
                <div class="header-actions">
                  <span class="refresh-count-badge">Refrescos: {{ breedingStore.missionRefreshes }}/3</span>
                  <HomeWidgetRefreshBtn
                    id="home-missions-refresh-btn"
                    :disabled="breedingStore.missionRefreshes <= 0"
                    @click="breedingStore.refreshMissions()"
                  />
                  <HomeWidgetMinimizeBtn widget-id="missions" />
                </div>
              </div>
              <div class="missions-body-wrap">
                <EventMissions :hide-refresh="true" />
              </div>
            </div>
          </HomeCollapsibleWidget>
        </div>
        <div
          id="widget-class-missions"
          class="home-widget-block widget-class"
        >
          <HomeCollapsibleWidget
            widget-id="class"
            title="MAESTRÍA DE CLASE"
            icon="🎓"
          >
            <HomeClassMissionsWidget />
          </HomeCollapsibleWidget>
        </div>
      </main>

      <!-- Columna Lateral / Widgets (Derecha en desktop) -->
      <aside class="home-column-sidebar">
        <div
          id="widget-buffs-section"
          class="home-widget-block widget-buffs"
        >
          <HomeCollapsibleWidget
            widget-id="buffs"
            title="POTENCIADORES & AURAS"
            icon="⚡"
          >
            <HomeActiveBuffsWidget />
          </HomeCollapsibleWidget>
        </div>
        <div
          id="widget-breeding-section"
          class="home-widget-block widget-breeding"
        >
          <HomeCollapsibleWidget
            widget-id="breeding"
            title="EN CAMINATA & CRIANZA"
            icon="🥚"
          >
            <HomeBreedingWidget />
          </HomeCollapsibleWidget>
        </div>
        <div
          id="widget-economy-section"
          class="home-widget-block widget-economy"
        >
          <HomeCollapsibleWidget
            widget-id="economy"
            title="MERCADO GTS"
            icon="🏪"
          >
            <HomeEconomyWidget />
          </HomeCollapsibleWidget>
        </div>
        <div
          id="widget-faction-section"
          class="home-widget-block widget-faction"
        >
          <HomeCollapsibleWidget
            widget-id="faction"
            title="GUERRA TERRITORIAL DE FACCIONES"
            icon="⚔️"
          >
            <HomeFactionWar />
          </HomeCollapsibleWidget>
        </div>
        <div
          id="widget-notifications-section"
          class="home-widget-block widget-notifications"
        >
          <HomeCollapsibleWidget
            widget-id="notifications"
            title="HISTORIAL DE ACTIVIDAD"
            icon="🔔"
          >
            <HomeNotificationsFeed />
          </HomeCollapsibleWidget>
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

    // Mobile single-column sequence
    .widget-pending-rewards {
      order: 0;
    }

    .widget-events {
      order: 1;
    }

    .widget-buffs {
      order: 2;
    }

    .widget-breeding {
      order: 3;
    }

    .widget-economy {
      order: 4;
    }

    .widget-coliseum-dual {
      order: 5;
    }

    .widget-faction {
      order: 6;
    }

    .widget-missions {
      order: 7;
    }

    .widget-gyms {
      order: 8;
    }

    .widget-class {
      order: 9;
    }

    .widget-notifications {
      order: 10;
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

.widget-coliseum-dual {
  container-type: inline-size;
  container-name: dual-slot;

  .dual-widgets-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 16px;
    align-items: stretch;

    @container dual-slot (max-width: 820px) {
      grid-template-columns: 1fr;
    }

    @media (max-width: 900px) {
      grid-template-columns: 1fr;
    }
  }
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

  .header-actions {
    @include widget-header-actions;

    .refresh-count-badge {
      @include pixelated;
      font-size: 10px;
      color: var(--gray, #94a3b8);
      background: Rgba(255, 255, 255, 0.05);
      border: 1px solid Rgba(255, 255, 255, 0.08);
      border-radius: 6px;
      padding: 3px 8px;
      margin-right: 2px;
      white-space: nowrap;
    }
  }
}

.missions-body-wrap {
  width: 100%;
}
</style>
